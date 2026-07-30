export type Language = "zh" | "en";
export type Theme = "light" | "dark";
export type TransactionType =
  | "expense"
  | "income"
  | "transfer"
  | "adjustment"
  | "refund";
export type AccountType =
  | "cash"
  | "bank"
  | "ewallet"
  | "savings"
  | "credit"
  | "bnpl";

export interface Settings {
  language: Language;
  theme: Theme;
  currency: string;
  activeBookId: string;
  aiEndpoint: string;
  hideAmounts: boolean;
  warrantyReminderDays: number;
}

export interface ExchangeRateCache {
  base: string;
  date: string;
  fetchedAt: string;
  rates: Record<string, number>;
}

export interface AiSettings {
  enabled: boolean;
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface SyncSettings {
  provider: "none" | "webdav";
  endpoint: string;
  username: string;
  password: string;
  remotePath: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export interface Book {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface SharedMember {
  id: string;
  bookId: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  color: string;
  createdAt: string;
}

export interface Account {
  id: string;
  bookId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  creditLimit?: number;
  dueDay?: number;
  archived?: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  kind: "expense" | "income";
  zh: string;
  en: string;
  icon: string;
  color: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  zh: string;
  en: string;
}

export interface Tag {
  id: string;
  bookId: string;
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  bookId: string;
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  tagIds?: string[];
  fee?: number;
  adjustmentDelta?: number;
  linkedTransactionId?: string;
  receiptImage?: string;
  receiptName?: string;
  items?: BillItem[];
  source?: "manual" | "receipt" | "screenshot";
  currency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface BillItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CalculatorMemory {
  originalAmount: number;
  allocatedAmount: number;
  remainingAmount: number;
  updatedAt: string;
}

export interface ElectronicAsset {
  id: string;
  bookId: string;
  name: string;
  purchaseAmount: number;
  purchaseDate: string;
  warrantyEndDate?: string;
  targetDailyCost?: number;
  note: string;
  serialNumber?: string;
  receiptImage?: string;
  linkedTransactionId?: string;
  residualValue?: number;
  soldAmount?: number;
  soldDate?: string;
  status?: "active" | "sold" | "retired";
  archived?: boolean;
  createdAt: string;
}

export interface AssetEvent {
  id: string;
  assetId: string;
  type: "maintenance" | "repair" | "accessory" | "resale" | "note";
  date: string;
  amount: number;
  note: string;
  createdAt: string;
}

export interface AaParticipant {
  id: string;
  name: string;
  consumedAmount: number;
  paidAmount: number;
  consumedCurrency?: string;
  paidCurrency?: string;
}

export interface AaShare {
  participantId: string;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  balance: number;
}

export interface AaTransfer {
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
}

export interface SplitBill {
  id: string;
  bookId: string;
  title: string;
  date: string;
  currency: string;
  participants: AaParticipant[];
  taxAmount: number;
  serviceCharge: number;
  discountAmount: number;
  shares: AaShare[];
  transfers: AaTransfer[];
  note: string;
  createdAt: string;
}

export interface SmartDraft {
  id: string;
  bookId: string;
  source: "receipt" | "screenshot";
  merchant: string;
  date: string;
  total: number;
  tax: number;
  serviceCharge: number;
  categoryId?: string;
  items: BillItem[];
  rawText: string;
  receiptImage?: string;
  confidence: number;
  status: "pending" | "confirmed" | "discarded";
  createdAt: string;
}

export interface BnplPlan {
  id: string;
  bookId: string;
  accountId: string;
  transactionId: string;
  merchant: string;
  totalAmount: number;
  paidAmount: number;
  installments: number;
  firstDueDate: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  bookId: string;
  month: string;
  categoryId: string;
  amount: number;
}

export interface Debt {
  id: string;
  bookId: string;
  direction: "owed_to_me" | "i_owe";
  person: string;
  originalAmount: number;
  outstandingAmount: number;
  accountId?: string;
  dueDate?: string;
  note: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  accountId: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface RecurringRule {
  id: string;
  bookId: string;
  name: string;
  type: "expense" | "income";
  amount: number;
  accountId: string;
  categoryId: string;
  subcategoryId?: string;
  tagIds?: string[];
  frequency: "monthly";
  dayOfMonth: number;
  nextDueDate: string;
  note: string;
  active: boolean;
  createdAt: string;
}

export interface InstallmentPlan {
  id: string;
  bookId: string;
  name: string;
  totalPrincipal: number;
  totalFee: number;
  months: number;
  creditAccountId: string;
  paymentAccountId?: string;
  categoryId: string;
  purchaseDate: string;
  firstDueDate: string;
  createdAt: string;
}

export interface PendingEntry {
  id: string;
  bookId: string;
  sourceType: "recurring" | "installment";
  sourceId: string;
  title: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  subcategoryId?: string;
  tagIds?: string[];
  dueDate: string;
  note: string;
  status: "pending" | "confirmed" | "skipped";
  createdAt: string;
}

export interface AppData {
  version: 4;
  settings: Settings;
  aiSettings: AiSettings;
  syncSettings: SyncSettings;
  exchangeRates: ExchangeRateCache | null;
  books: Book[];
  sharedMembers: SharedMember[];
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
  transactions: Transaction[];
  bnplPlans: BnplPlan[];
  budgets: Budget[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  recurringRules: RecurringRule[];
  installmentPlans: InstallmentPlan[];
  pendingEntries: PendingEntry[];
  calculatorMemory: CalculatorMemory | null;
  electronicAssets: ElectronicAsset[];
  assetEvents: AssetEvent[];
  splitBills: SplitBill[];
  smartDrafts: SmartDraft[];
}

export type AppTab = "home" | "accounts" | "stats" | "assets" | "more";
