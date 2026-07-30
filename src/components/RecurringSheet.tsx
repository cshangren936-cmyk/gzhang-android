import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { localDate, nextMonthlyDate } from "../core/date";
import { makeId } from "../core/id";
import { generateRecurringEntries } from "../core/schedules";
import type { RecurringRule } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

function firstDueDate(day: number): string {
  const today = localDate();
  const [year, month] = today.split("-");
  const candidate = `${year}-${month}-${String(day).padStart(2, "0")}`;
  return candidate >= today ? candidate : nextMonthlyDate(candidate, day);
}

export function RecurringSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(
    data.accounts.find((item) => item.bookId === activeBookId)?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState("bills");
  const [day, setDay] = useState("1");
  const [note, setNote] = useState("");
  const rules = data.recurringRules.filter(
    (rule) => rule.bookId === activeBookId,
  );
  const accounts = data.accounts.filter(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const categories = data.categories.filter(
    (category) => category.kind === "expense",
  );

  function submit(event: FormEvent) {
    event.preventDefault();
    const numeric = Number(amount);
    const dayNumber = Math.max(1, Math.min(28, Number(day) || 1));
    if (!name.trim() || numeric <= 0) return;
    const rule: RecurringRule = {
      id: makeId("recurring"),
      bookId: activeBookId,
      name: name.trim(),
      type: "expense",
      amount: numeric,
      accountId,
      categoryId,
      frequency: "monthly",
      dayOfMonth: dayNumber,
      nextDueDate: firstDueDate(dayNumber),
      note,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setData((current) => {
      const generated = generateRecurringEntries(
        [rule, ...current.recurringRules],
        current.pendingEntries,
        localDate(),
      );
      return {
        ...current,
        recurringRules: generated.rules,
        pendingEntries: generated.entries,
      };
    });
    setCreating(false);
    setName("");
    setAmount("");
  }

  return (
    <Modal title={t("recurring")} onClose={onClose} className="tool-sheet">
      {!creating ? (
        <>
          <button
            className="primary-button full-width"
            onClick={() => setCreating(true)}
          >
            <AppIcon name="Plus" size={17} />
            {t("addRecurring")}
          </button>
          <div className="tool-list">
            {rules.map((rule) => (
              <article className="tool-list-card" key={rule.id}>
                <span className="debt-direction recurring">
                  <AppIcon name="Repeat2" size={19} />
                </span>
                <div>
                  <strong>{rule.name}</strong>
                  <small>
                    {t("due")} {rule.nextDueDate} · {t("monthlyDay")}{" "}
                    {rule.dayOfMonth}
                  </small>
                </div>
                <div className="tool-card-value">
                  <b>{data.settings.currency} {rule.amount.toFixed(2)}</b>
                  <button
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        recurringRules: current.recurringRules.map((item) =>
                          item.id === rule.id
                            ? { ...item, active: !item.active }
                            : item,
                        ),
                      }))
                    }
                  >
                    {rule.active ? t("active") : "Off"}
                  </button>
                </div>
              </article>
            ))}
            {!rules.length && <div className="empty-state">{t("noData")}</div>}
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <label className="field">
            <span>{t("accountName")}</span>
            <input
              autoFocus
              required
              value={name}
              placeholder="Netflix / iCloud / Rent"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="two-column">
            <label className="field">
              <span>{t("amount")}</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("monthlyDay")}</span>
              <input
                type="number"
                min="1"
                max="28"
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
            </label>
          </div>
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
            <span>{t("category")}</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>
                  {data.settings.language === "zh" ? category.zh : category.en}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("note")}</span>
            <input value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setCreating(false)}
            >
              {t("cancel")}
            </button>
            <button className="primary-button" type="submit">
              {t("save")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
