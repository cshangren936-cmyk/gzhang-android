import { useMemo } from "react";
import { useApp } from "../AppContext";
import {
  accountBalance,
  accountTotals,
  isLiability,
  remainingPlanAmount,
  monthSummary,
} from "../core/calculations";
import { currentMonth } from "../core/date";
import { formatPrivateMoney } from "../core/money";
import { AppIcon } from "../components/AppIcon";
import type { CSSProperties } from "react";

const accountIcons: Record<string, string> = {
  cash: "Banknote",
  bank: "Building2",
  ewallet: "Smartphone",
  savings: "CircleDollarSign",
  credit: "CreditCard",
  bnpl: "HandCoins",
};

export function AccountsScreen({
  onAddAccount,
  onTransfer,
  onRepay,
  onAdjust,
}: {
  onAddAccount: () => void;
  onTransfer: () => void;
  onRepay: (accountId: string) => void;
  onAdjust: (accountId: string) => void;
}) {
  const { data, t, activeBookId } = useApp();
  const language = data.settings.language;
  const transactions = useMemo(
    () =>
      data.transactions.filter(
        (transaction) => transaction.bookId === activeBookId,
      ),
    [activeBookId, data.transactions],
  );
  const accounts = data.accounts.filter(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const totals = accountTotals(
    accounts,
    transactions,
    data.debts.filter((debt) => debt.bookId === activeBookId),
  );
  const month = monthSummary(transactions, currentMonth());
  const money = (amount: number) =>
    formatPrivateMoney(
      amount,
      language,
      data.settings.hideAmounts,
      data.settings.currency,
    );

  return (
    <div className="screen accounts-screen">
      <section className="net-worth-card">
        <span>{t("netWorth")}</span>
        <strong>{money(totals.netWorth)}</strong>
        <div>
          <p>
            <small>{t("assets")}</small>
            <b>{money(totals.assets)}</b>
          </p>
          <p>
            <small>{t("liabilities")}</small>
            <b>{money(totals.liabilities)}</b>
          </p>
          <p>
            <small>{t("monthIncome")}</small>
            <b>{money(month.income)}</b>
          </p>
          <p>
            <small>{t("monthExpense")}</small>
            <b>{money(month.expense)}</b>
          </p>
        </div>
      </section>

      <div className="inline-actions">
        <button className="secondary-button" onClick={onTransfer}>
          <AppIcon name="ArrowLeftRight" size={18} />
          {t("transfer")}
        </button>
        <button className="primary-button" onClick={onAddAccount}>
          <AppIcon name="Plus" size={18} />
          {t("addAccount")}
        </button>
      </div>

      <section className="account-list wallet-account-list">
        {accounts.map((account, index) => {
          const balance = accountBalance(account, transactions);
          const liability = isLiability(account);
          const limit = account.creditLimit ?? 0;
          const usedRatio = limit ? Math.min(1, Math.max(0, balance / limit)) : 0;
          const plans = data.bnplPlans.filter(
            (plan) =>
              plan.accountId === account.id && remainingPlanAmount(plan) > 0,
          );
          return (
            <article
              className={`account-card ${liability ? "liability" : ""}`}
              key={account.id}
              style={
                {
                  "--wallet-index": index,
                  "--wallet-color": account.color,
                } as CSSProperties
              }
            >
              <div
                className="account-icon"
                style={{
                  color: account.color,
                  backgroundColor: `${account.color}18`,
                }}
              >
                <AppIcon name={accountIcons[account.type]} size={23} />
              </div>
              <div className="account-card-main">
                <div className="account-card-heading">
                  <div>
                    <strong>{account.name}</strong>
                    <span>{t(account.type)}</span>
                  </div>
                  <b>{money(Math.max(0, balance))}</b>
                </div>
                {liability && limit > 0 && (
                  <>
                    <div className="credit-progress">
                      <span style={{ width: `${usedRatio * 100}%` }} />
                    </div>
                    <div className="credit-meta">
                      <span>
                        {t("available")}{" "}
                        {money(Math.max(0, limit - balance))}
                      </span>
                      <span>
                        {account.type === "bnpl" && plans.length
                          ? `${plans.length} ${t("duePlans")}`
                          : `${t("due")} ${account.dueDay ?? "—"}`}
                      </span>
                    </div>
                  </>
                )}
                <div className="account-card-actions">
                  <button
                    className="small-button neutral"
                    onClick={() => onAdjust(account.id)}
                  >
                    {t("editBalance")}
                  </button>
                  {liability && balance > 0 && (
                    <button
                      className="small-button"
                      onClick={() => onRepay(account.id)}
                    >
                      {t("repay")}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
