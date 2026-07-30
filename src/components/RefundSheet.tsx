import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { localDate } from "../core/date";
import { makeId } from "../core/id";
import { formatMoney, roundMoney } from "../core/money";
import type { Transaction } from "../types";
import { Modal } from "./Modal";

export function RefundSheet({
  transaction,
  onClose,
}: {
  transaction: Transaction;
  onClose: () => void;
}) {
  const { data, setData, t } = useApp();
  const refunded = useMemo(
    () =>
      data.transactions
        .filter(
          (item) =>
            item.type === "refund" &&
            item.linkedTransactionId === transaction.id,
        )
        .reduce((sum, item) => sum + item.amount, 0),
    [data.transactions, transaction.id],
  );
  const remaining = roundMoney(transaction.amount - refunded);
  const accounts = data.accounts.filter(
    (account) => account.bookId === transaction.bookId && !account.archived,
  );
  const [amount, setAmount] = useState(String(remaining));
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [date, setDate] = useState(localDate());
  const [note, setNote] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const numeric = roundMoney(Math.min(Number(amount), remaining));
    if (numeric <= 0) return;
    setData((current) => ({
      ...current,
      transactions: [
        {
          id: makeId("tx"),
          bookId: transaction.bookId,
          type: "refund",
          amount: numeric,
          accountId,
          categoryId: transaction.categoryId,
          subcategoryId: transaction.subcategoryId,
          tagIds: transaction.tagIds,
          linkedTransactionId: transaction.id,
          date,
          note: note || `${t("refund")} · ${transaction.note}`,
          createdAt: new Date().toISOString(),
        },
        ...current.transactions,
      ],
    }));
    onClose();
  }

  return (
    <Modal title={t("linkedRefund")} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="balance-adjust-summary">
          <span>{transaction.note || t("expense")}</span>
          <small>{t("outstanding")}</small>
          <strong>
            {formatMoney(
              remaining,
              data.settings.language,
              data.settings.currency,
            )}
          </strong>
        </div>
        <label className="field">
          <span>{t("refundAmount")}</span>
          <input
            autoFocus
            type="number"
            min="0.01"
            max={remaining}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("account")}</span>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((account) => (
              <option value={account.id} key={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("date")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="field">
          <span>{t("note")}</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
