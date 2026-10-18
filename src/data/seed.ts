
import type { AppData, Category } from "../types";

export const defaultCategories: Category[] = [
  { id: "food", kind: "expense", zh: "餐饮", en: "Food", icon: "Utensils", color: "#FF8C61" },
  { id: "transport", kind: "expense", zh: "交通", en: "Transport", icon: "Car", color: "#5B8DEF" },
  { id: "shopping", kind: "expense", zh: "购物", en: "Shopping", icon: "ShoppingBag", color: "#A66CFF" },
  { id: "bills", kind: "expense", zh: "账单", en: "Bills", icon: "ReceiptText", color: "#FFB84D" },
  { id: "home", kind: "expense", zh: "居家", en: "Home", icon: "House", color: "#35BFA3" },
  { id: "health", kind: "expense", zh: "健康", en: "Health", icon: "HeartPulse", color: "#FF6B7A" },
  { id: "study", kind: "expense", zh: "学习", en: "Education", icon: "BookOpen", color: "#5966D9" },
  { id: "fun", kind: "expense", zh: "娱乐", en: "Leisure", icon: "Gamepad2", color: "#E370D6" },
  { id: "other_expense", kind: "expense", zh: "其他", en: "Other", icon: "Ellipsis", color: "#8A93A5" },
  { id: "salary", kind: "income", zh: "薪资", en: "Salary", icon: "BriefcaseBusiness", color: "#25B99A" },
  { id: "bonus", kind: "income", zh: "奖金", en: "Bonus", icon: "Gift", color: "#F2A93B" },
  { id: "investment", kind: "income", zh: "投资", en: "Investment", icon: "TrendingUp", color: "#5478E4" },
  { id: "refund", kind: "income", zh: "退款", en: "Refund", icon: "RotateCcw", color: "#7C70E8" },
  { id: "other_income", kind: "income", zh: "其他", en: "Other", icon: "Ellipsis", color: "#8A93A5" },
];

export function createInitialData(): AppData {
  const now = new Date().toISOString();
  const bookId = "book_personal";

  return {
    version: 4,

    settings: {
      language: "zh",
      theme: "light",
      currency: "MYR",
      activeBookId: bookId,
      aiEndpoint: "",
      hideAmounts: false,
      warrantyReminderDays: 30,
    },

    aiSettings: {
      enabled: false,
      endpoint: "",
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

    books: [
      {
        id: bookId,
        name: "个人账簿",
        color: "#6C5CE7",
        createdAt: now,
      },
    ],

    sharedMembers: [
      {
        id: "member_owner",
        bookId,
        name: "我",
        role: "owner",
        color: "#D96852",
        createdAt: now,
      },
    ],

    accounts: [
      {
        id: "account_cash",
        bookId,
        name: "现金",
        type: "cash",
        openingBalance: 0,
        color: "#31C7A4",
        createdAt: now,
      },
      {
        id: "account_bank",
        bookId,
        name: "银行账户",
        type: "bank",
        openingBalance: 0,
        color: "#6C5CE7",
        createdAt: now,
      },
      {
        id: "account_bnpl",
        bookId,
        name: "先用后付",
        type: "bnpl",
        openingBalance: 0,
        creditLimit: 0,
        dueDay: 15,
        color: "#FF8C61",
        createdAt: now,
      },
    ],

    categories: defaultCategories,

    subcategories: [
      { id: "sub_takeaway", categoryId: "food", zh: "外卖", en: "Delivery" },
      { id: "sub_restaurant", categoryId: "food", zh: "餐馆", en: "Restaurant" },
      { id: "sub_snacks", categoryId: "food", zh: "零食", en: "Snacks" },
      { id: "sub_ride", categoryId: "transport", zh: "打车", en: "Ride-hailing" },
      { id: "sub_fuel", categoryId: "transport", zh: "油费", en: "Fuel" },
      { id: "sub_subscription", categoryId: "bills", zh: "订阅", en: "Subscription" },
    ],

    tags: [],
    transactions: [],
    bnplPlans: [],
    budgets: [],
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
