import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { localDate } from "../core/date";
import { makeId } from "../core/id";
import { formatMoney, roundMoney } from "../core/money";
import type { Debt } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

type Mode = "list" | "create" | "payment";

export function DebtHubSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [mode, setMode] = useState<Mode>("list");
  const [direction, setDirection] = useState<Debt["direction"]>("owed_to_me");
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const accounts = data.accounts.filter(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const debts = useMemo(
    () =>
      data.debts
        .filter(
          (debt) =>
            debt.bookId === activeBookId && debt.outstandingAmount > 0,
        )
        .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
    [activeBookId, data.debts],
  );
  const selectedDebt = debts.find((debt) => debt.id === selectedDebtId);

  function resetToList() {
    setMode("list");
    setAmount("");
    setNote("");
    setSelectedDebtId("");
  }

  function createDebt(event: FormEvent) {
    event.preventDefault();
    const numeric = roundMoney(Number(amount));
    if (!person.trim() || numeric <= 0) return;
    const now = new Date().toISOString();
    const debtId = makeId("debt");
    setData((current) => {
      const adjustment =
        accountId === ""
          ? []
          : [
              {
                id: makeId("tx"),
                bookId: activeBookId,
                type: "adjustment" as const,
                amount: numeric,
                adjustmentDelta: direction === "owed_to_me" ? -numeric : numeric,
                accountId,
                date: localDate(),
                note: `${person.trim()} · ${t(
                  direction === "owed_to_me" ? "owedToMe" : "iOwe",
                )}`,
                createdAt: now,
              },
            ];
      return {
        ...current,
        debts: [
          {
            id: debtId,
            bookId: activeBookId,
            direction,
            person: person.trim(),
            originalAmount: numeric,
            outstandingAmount: numeric,
            accountId: accountId || undefined,
            dueDate: dueDate || undefined,
            note,
            createdAt: now,
          },
          ...current.debts,
        ],
        transactions: [...adjustment, ...current.transactions],
      };
    });
    setPerson("");
    setDueDate("");
    resetToList();
  }

  function recordPayment(event: FormEvent) {
    event.preventDefault();
    if (!selectedDebt || !accountId) return;
    const numeric = roundMoney(
      Math.min(Number(amount), selectedDebt.outstandingAmount),
    );
    if (numeric <= 0) return;
    const now = new Date().toISOString();
    setData((current) => ({
      ...current,
      debts: current.debts.map((debt) =>
        debt.id === selectedDebt.id
          ? {
              ...debt,
              outstandingAmount: roundMoney(
                debt.outstandingAmount - numeric,
              ),
            }
          : debt,
      ),
      debtPayments: [
        {
          id: makeId("debtpay"),
          debtId: selectedDebt.id,
          amount: numeric,
          accountId,
          date: localDate(),
          note,
          createdAt: now,
        },
        ...current.debtPayments,
      ],
      transactions: [
        {
          id: makeId("tx"),
          bookId: activeBookId,
          type: "adjustment",
          amount: numeric,
          adjustmentDelta:
            selectedDebt.direction === "owed_to_me" ? numeric : -numeric,
          accountId,
          date: localDate(),
          note: `${selectedDebt.person} · ${t("recordPayment")}`,
          createdAt: now,
        },
        ...current.transactions,
      ],
    }));
    resetToList();
  }

  function openPayment(debt: Debt) {
    setSelectedDebtId(debt.id);
    setAmount(String(debt.outstandingAmount));
    setAccountId(debt.accountId ?? accounts[0]?.id ?? "");
    setMode("payment");
  }

  return (
    <Modal title={t("debts")} onClose={onClose} className="tool-sheet">
      {mode === "list" && (
        <>
          <div className="debt-summary-grid">
            {(["owed_to_me", "i_owe"] as const).map((item) => {
              const total = debts
                .filter((debt) => debt.direction === item)
                .reduce((sum, debt) => sum + debt.outstandingAmount, 0);
              return (
                <div key={item} className={item}>
                  <span>{t(item === "owed_to_me" ? "owedToMe" : "iOwe")}</span>
                  <strong>
                    {formatMoney(
                      total,
                      data.settings.language,
                      data.settings.currency,
                    )}
                  </strong>
                </div>
              );
            })}
          </div>
          <button
            className="primary-button full-width"
            onClick={() => setMode("create")}
          >
            <AppIcon name="Plus" size={17} />
            {t("addDebt")}
          </button>
          <div className="tool-list">
            {debts.map((debt) => (
              <article key={debt.id} className="tool-list-card">
                <span className={`debt-direction ${debt.direction}`}>
                  <AppIcon name="Users" size={19} />
                </span>
                <div>
                  <strong>{debt.person}</strong>
                  <small>
                    {t(debt.direction === "owed_to_me" ? "owedToMe" : "iOwe")}
                    {debt.dueDate ? ` · ${t("due")} ${debt.dueDate}` : ""}
                  </small>
                </div>
                <div className="tool-card-value">
                  <b>
                    {formatMoney(
                      debt.outstandingAmount,
                      data.settings.language,
                      data.settings.currency,
                    )}
                  </b>
                  <button onClick={() => openPayment(debt)}>{t("repay")}</button>
                </div>
              </article>
            ))}
            {!debts.length && <div className="empty-state">{t("noData")}</div>}
          </div>
        </>
      )}

      {mode === "create" && (
        <form onSubmit={createDebt}>
          <div className="segmented-control two-segments">
            {(["owed_to_me", "i_owe"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={direction === item ? "active" : ""}
                onClick={() => setDirection(item)}
              >
                {t(item === "owed_to_me" ? "owedToMe" : "iOwe")}
              </button>
            ))}
          </div>
          <label className="field">
            <span>{t("person")}</span>
            <input
              autoFocus
              required
              value={person}
              onChange={(event) => setPerson(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("amount")}</span>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("relatedAccount")}</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              <option value="">—</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("dueDate")}</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("note")}</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={resetToList}>
              {t("cancel")}
            </button>
            <button type="submit" className="primary-button">
              {t("save")}
            </button>
          </div>
        </form>
      )}

      {mode === "payment" && selectedDebt && (
        <form onSubmit={recordPayment}>
          <div className="balance-adjust-summary">
            <span>{selectedDebt.person}</span>
            <small>{t("outstanding")}</small>
            <strong>
              {formatMoney(
                selectedDebt.outstandingAmount,
                data.settings.language,
                data.settings.currency,
              )}
            </strong>
          </div>
          <label className="field">
            <span>{t("paymentAmount")}</span>
            <input
              autoFocus
              type="number"
              min="0.01"
              max={selectedDebt.outstandingAmount}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("account")}</span>
            <select
              required
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("note")}</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="form-actions">
            <button type="button" className="secondary-button" onClick={resetToList}>
              {t("cancel")}
            </button>
            <button type="submit" className="primary-button">
              {Number(amount) >= selectedDebt.outstandingAmount
                ? t("settleAll")
                : t("recordPayment")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
