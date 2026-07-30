import { useMemo, type CSSProperties } from "react";
import { useApp } from "../AppContext";
import {
  accountBalance,
  accountTotals,
  monthSummary,
  remainingPlanAmount,
} from "../core/calculations";
import { currentMonth } from "../core/date";
import { formatPrivateMoney } from "../core/money";
import type { TransactionType } from "../types";
import { AppIcon } from "../components/AppIcon";
import { TransactionRow } from "../components/TransactionRow";

export function HomeScreen({
  onAdd,
  onShowRecords,
  onShowAccounts,
  onScan,
  onSplitBill,
}: {
  onAdd: (type: TransactionType) => void;
  onShowRecords: () => void;
  onShowAccounts: () => void;
  onScan: () => void;
  onSplitBill: () => void;
}) {
  const { data, setData, t, activeBookId } = useApp();
  const language = data.settings.language;
  const activeTransactions = useMemo(
    () =>
      data.transactions
        .filter((transaction) => transaction.bookId === activeBookId)
        .sort((a, b) =>
          `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`),
        ),
    [activeBookId, data.transactions],
  );
  const summary = monthSummary(activeTransactions, currentMonth());
  const activeAccounts = data.accounts.filter(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const totals = accountTotals(
    activeAccounts,
    activeTransactions,
    data.debts.filter((debt) => debt.bookId === activeBookId),
  );
  const openPlans = data.bnplPlans
    .filter(
      (plan) =>
        plan.bookId === activeBookId && remainingPlanAmount(plan) > 0,
    )
    .sort((a, b) => a.firstDueDate.localeCompare(b.firstDueDate));

  return (
    <div className="screen home-screen">
      <section className="balance-card">
        <span className="paper-tape balance-tape" />
        <div className="balance-card-top">
          <div>
            <span>{t("netWorth")}</span>
            <strong>
              {formatPrivateMoney(
                totals.netWorth,
                language,
                data.settings.hideAmounts,
                data.settings.currency,
              )}
            </strong>
          </div>
          <button
            className="privacy-chip"
            onClick={() =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  hideAmounts: !current.settings.hideAmounts,
                },
              }))
            }
          >
            <AppIcon
              name={data.settings.hideAmounts ? "EyeOff" : "Eye"}
              size={15}
            />
            {data.settings.hideAmounts ? t("showAmounts") : t("hideAmounts")}
          </button>
        </div>
        <div className="balance-breakdown">
          <div>
            <span className="mini-icon income">
              <AppIcon name="ArrowDownLeft" size={16} />
            </span>
            <div>
              <small>{t("monthIncome")}</small>
              <b>
                {formatPrivateMoney(
                  summary.income,
                  language,
                  data.settings.hideAmounts,
                  data.settings.currency,
                )}
              </b>
            </div>
          </div>
          <div>
            <span className="mini-icon expense">
              <AppIcon name="ArrowUpRight" size={16} />
            </span>
            <div>
              <small>{t("monthExpense")}</small>
              <b>
                {formatPrivateMoney(
                  summary.expense,
                  language,
                  data.settings.hideAmounts,
                  data.settings.currency,
                )}
              </b>
            </div>
          </div>
        </div>
      </section>

      <section className="quick-actions">
        <button onClick={() => onAdd("expense")}>
          <span className="action-icon expense">
            <AppIcon name="ArrowUpRight" />
          </span>
          {t("expense")}
        </button>
        <button onClick={() => onAdd("income")}>
          <span className="action-icon income">
            <AppIcon name="ArrowDownLeft" />
          </span>
          {t("income")}
        </button>
        <button onClick={() => onAdd("transfer")}>
          <span className="action-icon transfer">
            <AppIcon name="ArrowLeftRight" />
          </span>
          {t("transfer")}
        </button>
        <button onClick={onScan}>
          <span className="action-icon scan">
            <AppIcon name="ScanLine" />
          </span>
          {t("scanReceipt")}
        </button>
      </section>

      <button className="split-entry-card" onClick={onSplitBill}>
        <span>
          <AppIcon name="Users" size={21} />
        </span>
        <div>
          <strong>{t("splitBill")}</strong>
          <small>Unequal shares · Tax · Minimum transfers</small>
        </div>
        <AppIcon name="ChevronRight" size={18} />
      </button>

      <section className="section wallet-preview">
        <div className="section-header">
          <h2>{t("wallet")}</h2>
          <button className="text-button" onClick={onShowAccounts}>
            {t("seeAll")}
            <AppIcon name="ChevronRight" size={16} />
          </button>
        </div>
        <div className="mini-wallet-stack">
          {activeAccounts.slice(0, 3).map((account, index) => (
            <article
              key={account.id}
              style={{
                "--wallet-color": account.color,
                "--wallet-index": index,
              } as CSSProperties}
            >
              <span>{account.name}</span>
              <b>
                {formatPrivateMoney(
                  Math.max(0, accountBalance(account, activeTransactions)),
                  language,
                  data.settings.hideAmounts,
                  data.settings.currency,
                )}
              </b>
            </article>
          ))}
        </div>
      </section>

      {openPlans.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>{t("duePlans")}</h2>
            <span className="count-badge">{openPlans.length}</span>
          </div>
          <div className="due-carousel">
            {openPlans.slice(0, 3).map((plan) => {
              const account = data.accounts.find(
                (item) => item.id === plan.accountId,
              );
              return (
                <article className="due-card" key={plan.id}>
                  <div className="due-card-icon">
                    <AppIcon name="HandCoins" size={19} />
                  </div>
                  <div>
                    <strong>{plan.merchant}</strong>
                    <span>
                      {t("due")} {plan.firstDueDate} · {account?.name}
                    </span>
                  </div>
                  <b>
                    {formatPrivateMoney(
                      remainingPlanAmount(plan),
                      language,
                      data.settings.hideAmounts,
                      data.settings.currency,
                    )}
                  </b>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2>{t("recent")}</h2>
          <button className="text-button" onClick={onShowRecords}>
            {t("seeAll")}
            <AppIcon name="ChevronRight" size={16} />
          </button>
        </div>
        <div className="card transaction-list">
          {activeTransactions.length ? (
            activeTransactions
              .slice(0, 6)
              .map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))
          ) : (
            <div className="empty-state">{t("noTransactions")}</div>
          )}
        </div>
      </section>
    </div>
  );
}
