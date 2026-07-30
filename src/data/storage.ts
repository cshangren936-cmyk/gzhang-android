import type { AppData } from "../types";
import { createInitialData } from "./seed";

const STORAGE_KEY = "jizhang.offline.data.v1";

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AppData>;
  return (
    candidate.version === 4 &&
    !!candidate.settings &&
    !!candidate.aiSettings &&
    !!candidate.syncSettings &&
    Array.isArray(candidate.books) &&
    Array.isArray(candidate.sharedMembers) &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.categories) &&
    Array.isArray(candidate.subcategories) &&
    Array.isArray(candidate.tags) &&
    Array.isArray(candidate.transactions) &&
    Array.isArray(candidate.bnplPlans) &&
    Array.isArray(candidate.budgets) &&
    Array.isArray(candidate.debts) &&
    Array.isArray(candidate.debtPayments) &&
    Array.isArray(candidate.recurringRules) &&
    Array.isArray(candidate.installmentPlans) &&
    Array.isArray(candidate.pendingEntries) &&
    Array.isArray(candidate.electronicAssets) &&
    Array.isArray(candidate.assetEvents) &&
    Array.isArray(candidate.splitBills) &&
    Array.isArray(candidate.smartDrafts)
  );
}

function migrateV3Data(value: unknown): AppData | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, unknown>;
  if (
    legacy.version !== 3 ||
    !legacy.settings ||
    !Array.isArray(legacy.books) ||
    !Array.isArray(legacy.accounts) ||
    !Array.isArray(legacy.categories) ||
    !Array.isArray(legacy.subcategories) ||
    !Array.isArray(legacy.tags) ||
    !Array.isArray(legacy.transactions) ||
    !Array.isArray(legacy.bnplPlans) ||
    !Array.isArray(legacy.budgets) ||
    !Array.isArray(legacy.debts) ||
    !Array.isArray(legacy.debtPayments) ||
    !Array.isArray(legacy.recurringRules) ||
    !Array.isArray(legacy.installmentPlans) ||
    !Array.isArray(legacy.pendingEntries) ||
    !Array.isArray(legacy.electronicAssets) ||
    !Array.isArray(legacy.splitBills) ||
    !Array.isArray(legacy.smartDrafts)
  ) {
    return null;
  }

  const settings = legacy.settings as AppData["settings"];
  const firstBookId =
    (legacy.books as AppData["books"])[0]?.id ?? settings.activeBookId;
  return {
    version: 4,
    settings: {
      ...settings,
      currency: settings.currency || "MYR",
    },
    aiSettings: {
      enabled: false,
      endpoint: settings.aiEndpoint || "",
      model: "",
      apiKey: "",
    },
    syncSettings: {
      provider: "none",
      endpoint: "",
      username: "",
      password: "",
      remotePath: "gzhang-backup.json",
      autoSync: false,
    },
    exchangeRates: null,
    books: legacy.books as AppData["books"],
    sharedMembers: [
      {
        id: "member_owner",
        bookId: firstBookId,
        name: "我",
        role: "owner",
        color: "#D96852",
        createdAt: new Date().toISOString(),
      },
    ],
    accounts: legacy.accounts as AppData["accounts"],
    categories: legacy.categories as AppData["categories"],
    subcategories: legacy.subcategories as AppData["subcategories"],
    tags: legacy.tags as AppData["tags"],
    transactions: legacy.transactions as AppData["transactions"],
    bnplPlans: legacy.bnplPlans as AppData["bnplPlans"],
    budgets: legacy.budgets as AppData["budgets"],
    debts: legacy.debts as AppData["debts"],
    debtPayments: legacy.debtPayments as AppData["debtPayments"],
    recurringRules: legacy.recurringRules as AppData["recurringRules"],
    installmentPlans: legacy.installmentPlans as AppData["installmentPlans"],
    pendingEntries: legacy.pendingEntries as AppData["pendingEntries"],
    calculatorMemory:
      (legacy.calculatorMemory as AppData["calculatorMemory"]) ?? null,
    electronicAssets: (legacy.electronicAssets as AppData["electronicAssets"]).map(
      (asset) => ({ ...asset, status: asset.status ?? "active" }),
    ),
    assetEvents: [],
    splitBills: legacy.splitBills as AppData["splitBills"],
    smartDrafts: legacy.smartDrafts as AppData["smartDrafts"],
  };
}

function migrateV2Data(value: unknown): AppData | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, unknown>;
  if (
    legacy.version !== 2 ||
    !legacy.settings ||
    !Array.isArray(legacy.books) ||
    !Array.isArray(legacy.accounts) ||
    !Array.isArray(legacy.categories) ||
    !Array.isArray(legacy.subcategories) ||
    !Array.isArray(legacy.tags) ||
    !Array.isArray(legacy.transactions) ||
    !Array.isArray(legacy.bnplPlans) ||
    !Array.isArray(legacy.budgets) ||
    !Array.isArray(legacy.debts) ||
    !Array.isArray(legacy.debtPayments) ||
    !Array.isArray(legacy.recurringRules) ||
    !Array.isArray(legacy.installmentPlans) ||
    !Array.isArray(legacy.pendingEntries)
  ) {
    return null;
  }

  const settings = legacy.settings as AppData["settings"];
  return {
    version: 4,
    settings: {
      ...settings,
      hideAmounts: settings.hideAmounts ?? false,
      warrantyReminderDays: 30,
    },
    aiSettings: {
      enabled: false,
      endpoint: settings.aiEndpoint || "",
      model: "",
      apiKey: "",
    },
    syncSettings: {
      provider: "none",
      endpoint: "",
      username: "",
      password: "",
      remotePath: "gzhang-backup.json",
      autoSync: false,
    },
    exchangeRates: null,
    books: legacy.books as AppData["books"],
    sharedMembers: [],
    accounts: legacy.accounts as AppData["accounts"],
    categories: legacy.categories as AppData["categories"],
    subcategories: legacy.subcategories as AppData["subcategories"],
    tags: legacy.tags as AppData["tags"],
    transactions: (legacy.transactions as AppData["transactions"]).map(
      (transaction) => ({ ...transaction, source: transaction.source ?? "manual" }),
    ),
    bnplPlans: legacy.bnplPlans as AppData["bnplPlans"],
    budgets: legacy.budgets as AppData["budgets"],
    debts: legacy.debts as AppData["debts"],
    debtPayments: legacy.debtPayments as AppData["debtPayments"],
    recurringRules: legacy.recurringRules as AppData["recurringRules"],
    installmentPlans: legacy.installmentPlans as AppData["installmentPlans"],
    pendingEntries: legacy.pendingEntries as AppData["pendingEntries"],
    calculatorMemory: null,
    electronicAssets: [],
    assetEvents: [],
    splitBills: [],
    smartDrafts: [],
  };
}

function migrateV1Data(value: unknown): AppData | null {
  if (!value || typeof value !== "object") return null;
  const legacy = value as Record<string, unknown>;
  if (
    legacy.version !== 1 ||
    !legacy.settings ||
    !Array.isArray(legacy.books) ||
    !Array.isArray(legacy.accounts) ||
    !Array.isArray(legacy.categories) ||
    !Array.isArray(legacy.transactions) ||
    !Array.isArray(legacy.bnplPlans) ||
    !Array.isArray(legacy.budgets)
  ) {
    return null;
  }

  const settings = legacy.settings as AppData["settings"];
  return {
    version: 4,
    settings: {
      ...settings,
      hideAmounts: false,
      warrantyReminderDays: 30,
    },
    aiSettings: {
      enabled: false,
      endpoint: settings.aiEndpoint || "",
      model: "",
      apiKey: "",
    },
    syncSettings: {
      provider: "none",
      endpoint: "",
      username: "",
      password: "",
      remotePath: "gzhang-backup.json",
      autoSync: false,
    },
    exchangeRates: null,
    books: legacy.books as AppData["books"],
    sharedMembers: [],
    accounts: legacy.accounts as AppData["accounts"],
    categories: legacy.categories as AppData["categories"],
    subcategories: [],
    tags: [],
    transactions: legacy.transactions as AppData["transactions"],
    bnplPlans: legacy.bnplPlans as AppData["bnplPlans"],
    budgets: legacy.budgets as AppData["budgets"],
    debts: [],
    debtPayments: [],
    recurringRules: [],
    installmentPlans: [],
    pendingEntries: [],
    calculatorMemory: null,
    electronicAssets: [],
    assetEvents: [],
    splitBills: [],
    smartDrafts: [],
  };
}

export function loadData(): AppData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createInitialData();
    const parsed: unknown = JSON.parse(saved);
    if (isAppData(parsed)) return parsed;
    return (
      migrateV3Data(parsed) ??
      migrateV2Data(parsed) ??
      migrateV1Data(parsed) ??
      createInitialData()
    );
  } catch {
    return createInitialData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function serializeBackup(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function parseBackup(text: string): AppData {
  const parsed: unknown = JSON.parse(text);
  const migrated = isAppData(parsed)
    ? parsed
    : migrateV3Data(parsed) ?? migrateV2Data(parsed) ?? migrateV1Data(parsed);
  if (!migrated) {
    throw new Error("INVALID_BACKUP");
  }
  return migrated;
}

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function transactionsToCsv(data: AppData): string {
  const header = [
    "Date",
    "Type",
    `Amount (${data.settings.currency})`,
    "Account",
    "To Account",
    "Category",
    "Note",
  ];
  const rows = data.transactions.map((transaction) => {
    const account = data.accounts.find((item) => item.id === transaction.accountId);
    const toAccount = data.accounts.find(
      (item) => item.id === transaction.toAccountId,
    );
    const category = data.categories.find(
      (item) => item.id === transaction.categoryId,
    );
    return [
      transaction.date,
      transaction.type,
      transaction.amount.toFixed(2),
      account?.name ?? "",
      toAccount?.name ?? "",
      category?.en ?? "",
      transaction.note,
    ]
      .map(csvCell)
      .join(",");
  });
  return [header.map(csvCell).join(","), ...rows].join("\n");
}

export function downloadText(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
