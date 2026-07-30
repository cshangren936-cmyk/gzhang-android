import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { TransactionType } from "../types";
import { reconcileBnplPayments } from "../core/calculations";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";
import { TransactionRow } from "./TransactionRow";
import { RefundSheet } from "./RefundSheet";
import { TransactionSheet } from "./TransactionSheet";
import type { Transaction } from "../types";

export function RecordsSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortAmount, setSortAmount] = useState(false);
  const [refundTransaction, setRefundTransaction] =
    useState<Transaction | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const language = data.settings.language;

  const transactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return data.transactions
      .filter((transaction) => transaction.bookId === activeBookId)
      .filter((transaction) => filter === "all" || transaction.type === filter)
      .filter(
        (transaction) =>
          !accountId ||
          transaction.accountId === accountId ||
          transaction.toAccountId === accountId,
      )
      .filter(
        (transaction) =>
          !categoryId || transaction.categoryId === categoryId,
      )
      .filter((transaction) => !dateFrom || transaction.date >= dateFrom)
      .filter((transaction) => !dateTo || transaction.date <= dateTo)
      .filter((transaction) => {
        if (!normalized) return true;
        const account = data.accounts.find(
          (item) => item.id === transaction.accountId,
        );
        const category = data.categories.find(
          (item) => item.id === transaction.categoryId,
        );
        return [
          transaction.note,
          transaction.date,
          String(transaction.amount),
          account?.name,
          category?.zh,
          category?.en,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((a, b) =>
        sortAmount
          ? b.amount - a.amount
          : `${b.date}${b.createdAt}`.localeCompare(
              `${a.date}${a.createdAt}`,
            ),
      );
  }, [
    activeBookId,
    data.accounts,
    data.categories,
    data.transactions,
    accountId,
    categoryId,
    dateFrom,
    dateTo,
    filter,
    query,
    sortAmount,
  ]);

  function remove(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setData((current) => {
      const transactions = current.transactions.filter(
        (transaction) => transaction.id !== id,
      );
      const plans = current.bnplPlans.filter(
        (plan) => plan.transactionId !== id,
      );
      return {
        ...current,
        transactions,
        bnplPlans: reconcileBnplPayments(
          plans,
          transactions,
          current.accounts,
        ),
      };
    });
  }

  return (
    <Modal title={t("records")} onClose={onClose} className="records-sheet">
      <label className="search-field">
        <AppIcon name="Search" size={18} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("search")}
        />
      </label>
      <div className="filter-pills">
        {(
          [
            "all",
            "expense",
            "income",
            "transfer",
            "refund",
            "adjustment",
          ] as const
        ).map((item) => (
          <button
            key={item}
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {t(item)}
          </button>
        ))}
      </div>
      <div className="record-filter-grid">
        <label className="field">
          <span>{t("account")}</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">{t("allAccounts")}</option>
            {data.accounts
              .filter((account) => account.bookId === activeBookId)
              .map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>{t("category")}</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{t("allCategories")}</option>
            {data.categories.map((category) => (
              <option value={category.id} key={category.id}>
                {language === "zh" ? category.zh : category.en}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("dateFrom")}</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("dateTo")}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </label>
      </div>
      <button
        className={`sort-button ${sortAmount ? "active" : ""}`}
        onClick={() => setSortAmount((value) => !value)}
      >
        <AppIcon name="SlidersHorizontal" size={15} />
        {t("sortAmount")}
      </button>
      <div className="transaction-list with-delete" lang={language}>
        {transactions.length ? (
          transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              onOpen={() => setEditingTransaction(transaction)}
              onDelete={() => remove(transaction.id)}
              onRefund={
                transaction.type === "expense"
                  ? () => setRefundTransaction(transaction)
                  : undefined
              }
            />
          ))
        ) : (
          <div className="empty-state">{t("noData")}</div>
        )}
      </div>
      {refundTransaction && (
        <RefundSheet
          transaction={refundTransaction}
          onClose={() => setRefundTransaction(null)}
        />
      )}
      {editingTransaction && (
        <TransactionSheet
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
        />
      )}
    </Modal>
  );
}
