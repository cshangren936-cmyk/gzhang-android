import type { AppData } from "../types";
import { makeId } from "../core/id";

const DB_NAME = "gzhang.attachments";
const STORE_NAME = "images";
const PREFIX = "idb://";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putWithId(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(dataUrl, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  db.close();
}

export async function storeAttachment(dataUrl: string): Promise<string> {
  if (!dataUrl || dataUrl.startsWith(PREFIX)) return dataUrl;
  const id = makeId("attachment");
  await putWithId(id, dataUrl);
  return `${PREFIX}${id}`;
}

export async function resolveAttachment(reference?: string): Promise<string> {
  if (!reference || !reference.startsWith(PREFIX)) return reference ?? "";
  const id = reference.slice(PREFIX.length);
  const db = await openDb();
  const result = await new Promise<string>((resolve, reject) => {
    const request = db
      .transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(id);
    request.onsuccess = () => resolve((request.result as string) ?? "");
    request.onerror = () => reject(request.error);
  });
  db.close();
  return result;
}

function attachmentReferences(data: AppData): string[] {
  return [
    ...data.transactions.map((item) => item.receiptImage),
    ...data.electronicAssets.map((item) => item.receiptImage),
    ...data.smartDrafts.map((item) => item.receiptImage),
  ].filter((value): value is string => !!value && value.startsWith(PREFIX));
}

export async function exportAttachments(
  data: AppData,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const reference of new Set(attachmentReferences(data))) {
    const value = await resolveAttachment(reference);
    if (value) result[reference.slice(PREFIX.length)] = value;
  }
  return result;
}

export async function importAttachments(
  attachments: Record<string, string>,
): Promise<void> {
  for (const [id, dataUrl] of Object.entries(attachments)) {
    await putWithId(id, dataUrl);
  }
}

export async function migrateInlineAttachments(
  data: AppData,
): Promise<AppData | null> {
  let changed = false;
  async function migrate(reference?: string): Promise<string | undefined> {
    if (!reference?.startsWith("data:")) return reference;
    changed = true;
    return storeAttachment(reference);
  }
  const transactions = [];
  for (const transaction of data.transactions) {
    transactions.push({
      ...transaction,
      receiptImage: await migrate(transaction.receiptImage),
    });
  }
  const electronicAssets = [];
  for (const asset of data.electronicAssets) {
    electronicAssets.push({
      ...asset,
      receiptImage: await migrate(asset.receiptImage),
    });
  }
  const smartDrafts = [];
  for (const draft of data.smartDrafts) {
    smartDrafts.push({
      ...draft,
      receiptImage: await migrate(draft.receiptImage),
    });
  }
  return changed
    ? { ...data, transactions, electronicAssets, smartDrafts }
    : null;
}

