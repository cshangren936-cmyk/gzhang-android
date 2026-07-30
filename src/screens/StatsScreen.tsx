import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import {
  budgetProgress,
  expenseByCategory,
  monthSummary,
} from "../core/calculations";
import { currentMonth, monthLabel, shiftMonth } from "../core/date";
import { formatPrivateMoney } from "../core/money";
import { AppIcon } from "../components/AppIcon";
import { CategoryIcon } from "../components/CategoryIcon";

export function StatsScreen({ onAddBudget }: { onAddBudget: (month: string) => void }) {
  const { data, t, activeBookId } = useApp();
  const [month, setMonth] = useState(currentMonth());
  const language = data.settings.language;
  const transactions = useMemo(
    () =>
      data.transactions.filter(
        (transaction) => transaction.bookId === activeBookId,
      ),
    [activeBookId, data.transactions],
  );
  const summary = monthSummary(transactions, month);
  const previousSummary = monthSummary(transactions, shiftMonth(month, -1));
  const [selectedYear, selectedMonth] = month.split("-").map(Number);
  const lastYearMonth = `${selectedYear - 1}-${String(selectedMonth).padStart(
    2,
    "0",
  )}`;
  const lastYearSummary = monthSummary(transactions, lastYearMonth);
  const categoryTotals = expenseByCategory(
    transactions,
    data.categories,
    month,
  );
  const budgets = data.budgets.filter(
    (budget) => budget.bookId === activeBookId && budget.month === month,
  );
  const money = (amount: number) =>
    formatPrivateMoney(
      amount,
      language,
      data.settings.hideAmounts,
      data.settings.currency,
    );
  const percentChange = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
  };
  const monthExpenses = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" && transaction.date.startsWith(month),
    )
    .sort((a, b) => b.amount - a.amount);
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstWeekday = new Date(selectedYear, selectedMonth - 1, 1).getDay();
  const dailySpend = new Map<number, number>();
  transactions
    .filter(
      (transaction) =>
        (transaction.type === "expense" || transaction.type === "refund") &&
        transaction.date.startsWith(month),
    )
    .forEach((transaction) => {
      const day = Number(transaction.date.slice(8, 10));
      dailySpend.set(
        day,
        (dailySpend.get(day) ?? 0) +
          (transaction.type === "refund"
            ? -transaction.amount
            : transaction.amount),
      );
    });

  let angle = 0;
  const gradient = categoryTotals.length
    ? `conic-gradient(${categoryTotals
        .map((item) => {
          const from = angle;
          angle += item.percentage;
          return `${item.category.color} ${from}% ${angle}%`;
        })
        .join(", ")})`
    : "conic-gradient(#E9EAF1 0 100%)";

  return (
    <div className="screen stats-screen">
      <div className="month-selector">
        <button onClick={() => setMonth(shiftMonth(month, -1))}>
          <AppIcon name="ChevronLeft" size={20} />
        </button>
        <strong>{monthLabel(month, language)}</strong>
        <button
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={month >= currentMonth()}
        >
          <AppIcon name="ChevronRight" size={20} />
        </button>
      </div>

      <section className="card report-card">
        <div className="section-header">
          <h2>{t("monthlyReport")}</h2>
        </div>
        <div className="report-summary">
          <div className="donut" style={{ background: gradient }}>
            <div>
              <small>{t("monthExpense")}</small>
              <strong>{money(summary.expense)}</strong>
            </div>
          </div>
          <div className="report-numbers">
            <p>
              <span className="dot income" />
              <small>{t("income")}</small>
              <b>{money(summary.income)}</b>
            </p>
            <p>
              <span className="dot expense" />
              <small>{t("expense")}</small>
              <b>{money(summary.expense)}</b>
            </p>
            <p>
              <span className="dot balance" />
              <small>{t("monthlyBalance")}</small>
              <b>{money(summary.balance)}</b>
            </p>
          </div>
        </div>
      </section>

      <section className="comparison-grid">
        {[
          {
            label: t("comparedLastMonth"),
            value: percentChange(summary.expense, previousSummary.expense),
          },
          {
            label: t("comparedLastYear"),
            value: percentChange(summary.expense, lastYearSummary.expense),
          },
        ].map((item) => (
          <div key={item.label} className={item.value > 0 ? "up" : "down"}>
            <span>{item.label}</span>
            <strong>
              {item.value > 0 ? "+" : ""}
              {item.value}%
            </strong>
          </div>
        ))}
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("categorySpending")}</h2>
        </div>
        <div className="card category-report-list">
          {categoryTotals.length ? (
            categoryTotals.map((item) => (
              <div className="category-report-row" key={item.category.id}>
                <CategoryIcon category={item.category} size={40} />
                <div>
                  <strong>
                    {language === "zh" ? item.category.zh : item.category.en}
                  </strong>
                  <span className="report-progress">
                    <i
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.category.color,
                      }}
                    />
                  </span>
                </div>
                <p>
                  <b>{money(item.amount)}</b>
                  <small>{item.percentage}%</small>
                </p>
              </div>
            ))
          ) : (
            <div className="empty-state">{t("noData")}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("budgetUsage")}</h2>
          <button className="text-button" onClick={() => onAddBudget(month)}>
            <AppIcon name="Plus" size={16} />
            {t("addBudget")}
          </button>
        </div>
        <div className="card budget-list">
          {budgets.length ? (
            budgets.map((budget) => {
              const category = data.categories.find(
                (item) => item.id === budget.categoryId,
              );
              const progress = budgetProgress(budget, transactions);
              return (
                <div className="budget-row" key={budget.id}>
                  <CategoryIcon category={category} size={40} />
                  <div>
                    <p>
                      <strong>
                        {category
                          ? language === "zh"
                            ? category.zh
                            : category.en
                          : t("budget")}
                      </strong>
                      <span>
                        {Math.round(progress * 100)}% ·{" "}
                        {money(budget.amount)}
                      </span>
                    </p>
                    <span className={`budget-progress ${progress > 1 ? "over" : ""}`}>
                      <i style={{ width: `${Math.min(progress, 1) * 100}%` }} />
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state">{t("noData")}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("ranking")}</h2>
        </div>
        <div className="card ranking-list">
          {monthExpenses.slice(0, 5).map((transaction, index) => {
            const category = data.categories.find(
              (item) => item.id === transaction.categoryId,
            );
            return (
              <div key={transaction.id} className="ranking-row">
                <span>{index + 1}</span>
                <CategoryIcon category={category} size={36} />
                <div>
                  <strong>
                    {transaction.note ||
                      (category
                        ? language === "zh"
                          ? category.zh
                          : category.en
                        : t("expense"))}
                  </strong>
                  <small>{transaction.date}</small>
                </div>
                <b>{money(transaction.amount)}</b>
              </div>
            );
          })}
          {!monthExpenses.length && (
            <div className="empty-state">{t("noData")}</div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("calendar")}</h2>
        </div>
        <div className="card spending-calendar">
          <div className="calendar-weekdays">
            {(language === "zh"
              ? ["日", "一", "二", "三", "四", "五", "六"]
              : ["S", "M", "T", "W", "T", "F", "S"]
            ).map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const spent = dailySpend.get(day) ?? 0;
              return (
                <span key={day} className={spent > 0 ? "spent" : ""}>
                  {day}
                  {spent > 0 && <i />}
                </span>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
