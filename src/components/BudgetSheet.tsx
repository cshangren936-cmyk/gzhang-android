import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { currentMonth } from "../core/date";
import { makeId } from "../core/id";
import { Modal } from "./Modal";

export function BudgetSheet({
  onClose,
  month = currentMonth(),
}: {
  onClose: () => void;
  month?: string;
}) {
  const { data, setData, t, activeBookId } = useApp();
  const categories = useMemo(
    () => data.categories.filter((category) => category.kind === "expense"),
    [data.categories],
  );
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("500");

  function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) return;
    setData((current) => {
      const existing = current.budgets.find(
        (budget) =>
          budget.bookId === activeBookId &&
          budget.month === month &&
          budget.categoryId === categoryId,
      );
      return {
        ...current,
        budgets: existing
          ? current.budgets.map((budget) =>
              budget.id === existing.id
                ? { ...budget, amount: numericAmount }
                : budget,
            )
          : [
              ...current.budgets,
              {
                id: makeId("budget"),
                bookId: activeBookId,
                month,
                categoryId,
                amount: numericAmount,
              },
            ],
      };
    });
    onClose();
  }

  return (
    <Modal title={t("addBudget")} onClose={onClose}>
      <form onSubmit={submit}>
        <label className="field">
          <span>{t("category")}</span>
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {data.settings.language === "zh" ? category.zh : category.en}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("amount")}</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
