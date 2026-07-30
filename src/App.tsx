import { useEffect, useState } from "react";
import { useApp } from "./AppContext";
import type { AppTab, TransactionType } from "./types";
import { AppIcon } from "./components/AppIcon";
import { AccountSheet } from "./components/AccountSheet";
import { BookSheet } from "./components/BookSheet";
import { BudgetSheet } from "./components/BudgetSheet";
import { RecordsSheet } from "./components/RecordsSheet";
import { TransactionSheet } from "./components/TransactionSheet";
import { AdjustBalanceSheet } from "./components/AdjustBalanceSheet";
import { DebtHubSheet } from "./components/DebtHubSheet";
import { RecurringSheet } from "./components/RecurringSheet";
import { PendingEntriesSheet } from "./components/PendingEntriesSheet";
import { InstallmentSheet } from "./components/InstallmentSheet";
import { SplitBillSheet } from "./components/SplitBillSheet";
import { SmartEntrySheet } from "./components/SmartEntrySheet";
import { SplitBillHistorySheet } from "./components/SplitBillHistorySheet";
import { ExchangeRatesSheet } from "./components/ExchangeRatesSheet";
import { SyncSheet } from "./components/SyncSheet";
import { AiAssistantSheet } from "./components/AiAssistantSheet";
import { AccountsScreen } from "./screens/AccountsScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { MoreScreen } from "./screens/MoreScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { AssetsScreen } from "./screens/AssetsScreen";
import { consumePendingCapture } from "./native/smartCapture";
import { parseReceiptText } from "./core/receiptParser";
import { makeId } from "./core/id";
import { storeAttachment } from "./data/attachments";
import { inferExpenseCategory } from "./core/autoCategory";

const navItems: { id: AppTab; icon: string }[] = [
  { id: "home", icon: "House" },
  { id: "accounts", icon: "WalletCards" },
  { id: "stats", icon: "ChartNoAxesCombined" },
  { id: "assets", icon: "PackageCheck" },
  { id: "more", icon: "Settings2" },
];

interface TransactionModalState {
  type: TransactionType;
  toAccountId?: string;
}

export default function App() {
  const { data, setData, t } = useApp();
  const [tab, setTab] = useState<AppTab>("home");
  const [transactionModal, setTransactionModal] =
    useState<TransactionModalState | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [budgetMonth, setBudgetMonth] = useState<string | null>(null);
  const [adjustAccountId, setAdjustAccountId] = useState<string | null>(null);
  const [showDebts, setShowDebts] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [showSmartEntry, setShowSmartEntry] = useState(false);
  const [showSplitHistory, setShowSplitHistory] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const activeBook =
    data.books.find((book) => book.id === data.settings.activeBookId) ??
    data.books[0];

  useEffect(() => {
    consumePendingCapture()
      .then(async (capture) => {
        if (!capture.available || !capture.rawText) return;
        const parsed = parseReceiptText(capture.rawText);
        const now = new Date().toISOString();
        const receiptImage = capture.imageDataUrl
          ? await storeAttachment(capture.imageDataUrl)
          : "";
        setData((current) => ({
          ...current,
          smartDrafts: [
            {
              id: makeId("smart"),
              bookId: current.settings.activeBookId,
              source: "screenshot",
              merchant: parsed.merchant,
              date: parsed.date,
              total: parsed.total,
              tax: parsed.tax,
              serviceCharge: parsed.serviceCharge,
              categoryId: inferExpenseCategory(
                `${parsed.merchant} ${capture.rawText}`,
                current.categories,
              ),
              items: parsed.items,
              rawText: capture.rawText,
              ...(receiptImage ? { receiptImage } : {}),
              confidence: parsed.confidence,
              status: "pending",
              createdAt: now,
            },
            ...current.smartDrafts,
          ],
        }));
      })
      .catch(() => undefined);
  }, [setData]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark">
          <span>G.</span>
        </div>
        <label className="book-select header-book-select">
          <select
            aria-label={t("book")}
            value={activeBook?.id}
            onChange={(event) =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  activeBookId: event.target.value,
                },
              }))
            }
          >
            {data.books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>
          <AppIcon name="ChevronDown" size={14} />
        </label>
        <time className="header-date">
          {new Intl.DateTimeFormat(
            data.settings.language === "zh" ? "zh-MY" : "en-MY",
            { month: "short", day: "2-digit", weekday: "short" },
          ).format(new Date())}
        </time>
        <button
          className="language-button"
          onClick={() =>
            setData((current) => ({
              ...current,
              settings: {
                ...current.settings,
                language: current.settings.language === "zh" ? "en" : "zh",
              },
            }))
          }
        >
          {data.settings.language === "zh" ? "EN" : "中"}
        </button>
      </header>

      <div className="app-content">
        {tab === "home" && (
          <HomeScreen
            onAdd={(type) => setTransactionModal({ type })}
            onShowRecords={() => setShowRecords(true)}
            onShowAccounts={() => setTab("accounts")}
            onScan={() => setShowSmartEntry(true)}
            onSplitBill={() => setShowSplitBill(true)}
          />
        )}
        {tab === "accounts" && (
          <AccountsScreen
            onAddAccount={() => setShowAccount(true)}
            onTransfer={() => setTransactionModal({ type: "transfer" })}
            onRepay={(toAccountId) =>
              setTransactionModal({ type: "transfer", toAccountId })
            }
            onAdjust={(accountId) => setAdjustAccountId(accountId)}
          />
        )}
        {tab === "stats" && (
          <StatsScreen onAddBudget={(month) => setBudgetMonth(month)} />
        )}
        {tab === "assets" && <AssetsScreen />}
        {tab === "more" && (
          <MoreScreen
            onAddBook={() => setShowBook(true)}
            onDebts={() => setShowDebts(true)}
            onRecurring={() => setShowRecurring(true)}
            onPending={() => setShowPending(true)}
            onInstallments={() => setShowInstallments(true)}
            onSplitHistory={() => setShowSplitHistory(true)}
            onRates={() => setShowRates(true)}
            onSync={() => setShowSync(true)}
            onAi={() => setShowAi(true)}
          />
        )}
      </div>

      <button
        className="fab"
        aria-label={t("add")}
        onClick={() => setTransactionModal({ type: "expense" })}
      >
        <AppIcon name="Plus" size={28} />
      </button>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <AppIcon name={item.icon} size={22} />
            <span>{t(item.id)}</span>
          </button>
        ))}
      </nav>

      {transactionModal && (
        <TransactionSheet
          initialType={transactionModal.type}
          initialToAccountId={transactionModal.toAccountId}
          onClose={() => setTransactionModal(null)}
        />
      )}
      {showAccount && <AccountSheet onClose={() => setShowAccount(false)} />}
      {showBook && <BookSheet onClose={() => setShowBook(false)} />}
      {showRecords && <RecordsSheet onClose={() => setShowRecords(false)} />}
      {budgetMonth && (
        <BudgetSheet
          month={budgetMonth}
          onClose={() => setBudgetMonth(null)}
        />
      )}
      {adjustAccountId && (
        <AdjustBalanceSheet
          accountId={adjustAccountId}
          onClose={() => setAdjustAccountId(null)}
        />
      )}
      {showDebts && <DebtHubSheet onClose={() => setShowDebts(false)} />}
      {showRecurring && (
        <RecurringSheet onClose={() => setShowRecurring(false)} />
      )}
      {showPending && (
        <PendingEntriesSheet onClose={() => setShowPending(false)} />
      )}
      {showInstallments && (
        <InstallmentSheet onClose={() => setShowInstallments(false)} />
      )}
      {showSplitBill && (
        <SplitBillSheet onClose={() => setShowSplitBill(false)} />
      )}
      {showSmartEntry && (
        <SmartEntrySheet onClose={() => setShowSmartEntry(false)} />
      )}
      {showSplitHistory && (
        <SplitBillHistorySheet onClose={() => setShowSplitHistory(false)} />
      )}
      {showRates && (
        <ExchangeRatesSheet onClose={() => setShowRates(false)} />
      )}
      {showSync && <SyncSheet onClose={() => setShowSync(false)} />}
      {showAi && <AiAssistantSheet onClose={() => setShowAi(false)} />}
    </main>
  );
}
