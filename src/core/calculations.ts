import type {
  Account,
  BnplPlan,
  Budget,
  Category,
  Debt,
  Transaction,
} from "../types";
import { roundMoney } from "./money";

export function isLiability(account: Account): boolean {
  return account.type === "credit" || account.type === "bnpl";
}

export function accountBalance(
  account: Account,
  transactions: Transaction[],
): number {
  let balance = account.openingBalance;

  for (const transaction of transactions) {
    const amount = transaction.amount;
    const fee = transaction.fee ?? 0;

    if (
      transaction.type === "adjustment" &&
      transaction.accountId === account.id
    ) {
      balance += transaction.adjustmentDelta ?? 0;
      continue;
    }

    if (!isLiability(account)) {
      if (
        transaction.type === "refund" &&
        transaction.accountId === account.id
      ) {
        balance += amount;
      }
      if (
        transaction.type === "income" &&
        transaction.accountId === account.id
      ) {
        balance += amount;
      }
      if (
        transaction.type === "expense" &&
        transaction.accountId === account.id
      ) {
        balance -= amount;
      }
      if (transaction.type === "transfer") {
        if (transaction.accountId === account.id) balance -= amount + fee;
        if (transaction.toAccountId === account.id) balance += amount;
      }
    } else {
      if (
        transaction.type === "refund" &&
        transaction.accountId === account.id
      ) {
        balance -= amount;
      }
      if (
        transaction.type === "expense" &&
        transaction.accountId === account.id
      ) {
        balance += amount;
      }
      if (
        transaction.type === "income" &&
        transaction.accountId === account.id
      ) {
        balance -= amount;
      }
      if (transaction.type === "transfer") {
        if (transaction.accountId === account.id) balance += amount + fee;
        if (transaction.toAccountId === account.id) balance -= amount;
      }
    }
  }

  return roundMoney(balance);
}

export function accountTotals(
  accounts: Account[],
  transactions: Transaction[],
  debts: Debt[] = [],
): { assets: number; liabilities: number; netWorth: number } {
  const receivables = debts
    .filter((debt) => debt.direction === "owed_to_me")
    .reduce((sum, debt) => sum + debt.outstandingAmount, 0);
  const payables = debts
    .filter((debt) => debt.direction === "i_owe")
    .reduce((sum, debt) => sum + debt.outstandingAmount, 0);
  const assets =
    accounts
    .filter((account) => !isLiability(account) && !account.archived)
    .reduce(
      (sum, account) => sum + accountBalance(account, transactions),
      0,
    ) + receivables;
  const liabilities =
    accounts
    .filter((account) => isLiability(account) && !account.archived)
    .reduce(
      (sum, account) =>
        sum + Math.max(0, accountBalance(account, transactions)),
      0,
    ) + payables;

  return {
    assets: roundMoney(assets),
    liabilities: roundMoney(liabilities),
    netWorth: roundMoney(assets - liabilities),
  };
}

export function monthTransactions(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.date.startsWith(month));
}

export function monthSummary(
  transactions: Transaction[],
  month: string,
): { income: number; expense: number; balance: number } {
  const inMonth = monthTransactions(transactions, month);
  const income = inMonth
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = inMonth
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const refunds = inMonth
    .filter((transaction) => transaction.type === "refund")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  return {
    income: roundMoney(income),
    expense: roundMoney(expense - refunds),
    balance: roundMoney(income - expense + refunds),
  };
}

export interface CategoryTotal {
  category: Category;
  amount: number;
  percentage: number;
}

export function expenseByCategory(
  transactions: Transaction[],
  categories: Category[],
  month: string,
): CategoryTotal[] {
  const expense = monthTransactions(transactions, month).filter(
    (transaction) =>
      transaction.type === "expense" || transaction.type === "refund",
  );
  const total = expense.reduce(
    (sum, transaction) =>
      sum +
      (transaction.type === "refund"
        ? -transaction.amount
        : transaction.amount),
    0,
  );
  const amounts = new Map<string, number>();
  for (const transaction of expense) {
    if (!transaction.categoryId) continue;
    const signedAmount =
      transaction.type === "refund" ? -transaction.amount : transaction.amount;
    amounts.set(
      transaction.categoryId,
      (amounts.get(transaction.categoryId) ?? 0) + signedAmount,
    );
  }

  return [...amounts.entries()]
    .map(([categoryId, amount]) => ({
      category: categories.find((category) => category.id === categoryId)!,
      amount: roundMoney(amount),
      percentage: total ? Math.max(0, Math.round((amount / total) * 100)) : 0,
    }))
    .filter((item) => item.category && item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function budgetProgress(
  budget: Budget,
  transactions: Transaction[],
): number {
  const spent = transactions
    .filter(
      (transaction) =>
        transaction.type === "expense" &&
        transaction.categoryId === budget.categoryId &&
        transaction.bookId === budget.bookId &&
        transaction.date.startsWith(budget.month),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const refunded = transactions
    .filter(
      (transaction) =>
        transaction.type === "refund" &&
        transaction.categoryId === budget.categoryId &&
        transaction.bookId === budget.bookId &&
        transaction.date.startsWith(budget.month),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  return budget.amount > 0 ? (spent - refunded) / budget.amount : 0;
}

export function remainingPlanAmount(plan: BnplPlan): number {
  return roundMoney(Math.max(0, plan.totalAmount - plan.paidAmount));
}

export function allocateBnplPayment(
  plans: BnplPlan[],
  accountId: string,
  payment: number,
): BnplPlan[] {
  let remainingPayment = payment;
  return [...plans]
    .sort((a, b) => a.firstDueDate.localeCompare(b.firstDueDate))
    .map((plan) => {
      if (plan.accountId !== accountId || remainingPayment <= 0) return plan;
      const remaining = remainingPlanAmount(plan);
      const applied = Math.min(remaining, remainingPayment);
      remainingPayment = roundMoney(remainingPayment - applied);
      return { ...plan, paidAmount: roundMoney(plan.paidAmount + applied) };
    });
}

export function reconcileBnplPayments(
  plans: BnplPlan[],
  transactions: Transaction[],
  accounts: Account[],
): BnplPlan[] {
  let reconciled = plans.map((plan) => ({ ...plan, paidAmount: 0 }));
  const repayments = transactions
    .filter((transaction) => {
      if (transaction.type !== "transfer" || !transaction.toAccountId) return false;
      const destination = accounts.find(
        (account) => account.id === transaction.toAccountId,
      );
      return destination?.type === "bnpl";
    })
    .sort((a, b) =>
      `${a.date}${a.createdAt}`.localeCompare(`${b.date}${b.createdAt}`),
    );

  for (const repayment of repayments) {
    reconciled = allocateBnplPayment(
      reconciled,
      repayment.toAccountId!,
      repayment.amount,
    );
  }
  return reconciled;
}
