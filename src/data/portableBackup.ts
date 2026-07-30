import type { AppData } from "../types";
import { parseBackup } from "./storage";
import { exportAttachments, importAttachments } from "./attachments";

interface PortableEnvelope {
  format: "gzhang-portable-v1";
  createdAt: string;
  data: AppData;
  attachments: Record<string, string>;
}

export async function createPortableBackup(data: AppData): Promise<string> {
  const envelope: PortableEnvelope = {
    format: "gzhang-portable-v1",
    createdAt: new Date().toISOString(),
    data,
    attachments: await exportAttachments(data),
  };
  return JSON.stringify(envelope, null, 2);
}

export async function restorePortableBackup(text: string): Promise<AppData> {
  const parsed = JSON.parse(text) as Partial<PortableEnvelope>;
  if (parsed.format === "gzhang-portable-v1" && parsed.data) {
    await importAttachments(parsed.attachments ?? {});
    return parseBackup(JSON.stringify(parsed.data));
  }
  return parseBackup(text);
}

