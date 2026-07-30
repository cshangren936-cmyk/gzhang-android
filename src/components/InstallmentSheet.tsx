import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { isLiability } from "../core/calculations";
import { addMonths, localDate } from "../core/date";
import { makeId } from "../core/id";
import { formatMoney, roundMoney } from "../core/money";
import { generateInstallmentEntries } from "../core/schedules";
import type { InstallmentPlan } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

export function InstallmentSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [fee, setFee] = useState("0");
  const [months, setMonths] = useState("12");
  const creditAccounts = data.accounts.filter(
    (account) =>
      account.bookId === activeBookId &&
      !account.archived &&
      isLiability(account),
  );
  const assetAccounts = data.accounts.filter(
    (account) =>
      account.bookId === activeBookId &&
      !account.archived &&
      !isLiability(account),
  );
  const [creditAccountId, setCreditAccountId] = useState(
    creditAccounts[0]?.id ?? "",
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    assetAccounts[0]?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState("shopping");
  const [purchaseDate, setPurchaseDate] = useState(localDate());
  const [firstDueDate, setFirstDueDate] = useState(addMonths(localDate(), 1));
  const plans = data.installmentPlans.filter(
    (plan) => plan.bookId === activeBookId,
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const amount = roundMoney(Number(principal));
    const totalFee = roundMoney(Number(fee));
    const count = Math.max(2, Math.min(60, Number(months) || 2));
    if (!name.trim() || amount <= 0 || !creditAccountId) return;
    const now = new Date().toISOString();
    const plan: InstallmentPlan = {
      id: makeId("installment"),
      bookId: activeBookId,
      name: name.trim(),
      totalPrincipal: amount,
      totalFee,
      months: count,
      creditAccountId,
      paymentAccountId: paymentAccountId || undefined,
      categoryId,
      purchaseDate,
      firstDueDate,
      createdAt: now,
    };
    setData((current) => ({
      ...current,
      installmentPlans: [plan, ...current.installmentPlans],
      pendingEntries: [
        ...generateInstallmentEntries(plan),
        ...current.pendingEntries,
      ],
      transactions: [
        {
          id: makeId("tx"),
          bookId: activeBookId,
          type: "expense",
          amount: roundMoney(amount + totalFee),
          accountId: creditAccountId,
          categoryId,
          date: purchaseDate,
          note: name.trim(),
          createdAt: now,
        },
        ...current.transactions,
      ],
    }));
    setCreating(false);
    setName("");
    setPrincipal("");
  }

  return (
    <Modal title={t("installment")} onClose={onClose} className="tool-sheet">
      {!creating ? (
        <>
          <button
            className="primary-button full-width"
            onClick={() => setCreating(true)}
            disabled={!creditAccounts.length}
          >
            <AppIcon name="Plus" size={17} />
            {t("addInstallment")}
          </button>
          <div className="tool-list">
            {plans.map((plan) => (
              <article className="tool-list-card" key={plan.id}>
                <span className="debt-direction installment">
                  <AppIcon name="CreditCard" size={19} />
                </span>
                <div>
                  <strong>{plan.name}</strong>
                  <small>
                    {plan.months} {t("months")} · {t("due")} {plan.firstDueDate}
                  </small>
                </div>
                <div className="tool-card-value">
                  <b>
                    {formatMoney(
                      plan.totalPrincipal + plan.totalFee,
                      data.settings.language,
                      data.settings.currency,
                    )}
                  </b>
                </div>
              </article>
            ))}
            {!plans.length && <div className="empty-state">{t("noData")}</div>}
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <label className="field">
            <span>{t("note")}</span>
            <input
              autoFocus
              required
              value={name}
              placeholder="Laptop / Phone"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="two-column">
            <label className="field">
              <span>{t("totalPrincipal")}</span>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={principal}
                onChange={(event) => setPrincipal(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("totalFee")}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
              />
            </label>
          </div>
          <label className="field">
            <span>{t("months")}</span>
            <select value={months} onChange={(event) => setMonths(event.target.value)}>
              {[3, 6, 12, 18, 24, 36].map((count) => (
                <option value={count} key={count}>
                  {count}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("creditAccount")}</span>
            <select
              value={creditAccountId}
              onChange={(event) => setCreditAccountId(event.target.value)}
            >
              {creditAccounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("paymentAccount")}</span>
            <select
              value={paymentAccountId}
              onChange={(event) => setPaymentAccountId(event.target.value)}
            >
              {assetAccounts.map((account) => (
                <option value={account.id} key={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("category")}</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {data.categories
                .filter((category) => category.kind === "expense")
                .map((category) => (
                  <option value={category.id} key={category.id}>
                    {data.settings.language === "zh" ? category.zh : category.en}
                  </option>
                ))}
            </select>
          </label>
          <div className="two-column">
            <label className="field">
              <span>{t("date")}</span>
              <input
                type="date"
                value={purchaseDate}
                onChange={(event) => setPurchaseDate(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("firstDueDate")}</span>
              <input
                type="date"
                value={firstDueDate}
                onChange={(event) => setFirstDueDate(event.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setCreating(false)}
            >
              {t("cancel")}
            </button>
            <button type="submit" className="primary-button">
              {t("save")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
