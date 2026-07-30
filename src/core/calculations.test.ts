import assert from "node:assert/strict";
import test from "node:test";
import type { Account, BnplPlan, Transaction } from "../types";
import {
  accountBalance,
  accountTotals,
  allocateBnplPayment,
  monthSummary,
  reconcileBnplPayments,
} from "./calculations";

const now = "2026-07-28T00:00:00.000Z";
const asset: Account = {
  id: "bank",
  bookId: "book",
  name: "Bank",
  type: "bank",
  openingBalance: 1000,
  color: "#000",
  createdAt: now,
};
const bnpl: Account = {
  ...asset,
  id: "bnpl",
  name: "BNPL",
  type: "bnpl",
  openingBalance: 0,
};
const transactions: Transaction[] = [
  {
    id: "purchase",
    bookId: "book",
    type: "expense",
    amount: 300,
    accountId: "bnpl",
    categoryId: "shopping",
    date: "2026-07-01",
    note: "",
    createdAt: now,
  },
  {
    id: "repay",
    bookId: "book",
    type: "transfer",
    amount: 100,
    accountId: "bank",
    toAccountId: "bnpl",
    date: "2026-07-20",
    note: "",
    createdAt: now,
  },
];

test("BNPL purchase creates debt and repayment reduces it", () => {
  assert.equal(accountBalance(bnpl, transactions), 200);
  assert.equal(accountBalance(asset, transactions), 900);
});

test("repayment is not counted as another expense", () => {
  assert.deepEqual(monthSummary(transactions, "2026-07"), {
    income: 0,
    expense: 300,
    balance: -300,
  });
});

test("payment allocates to the earliest BNPL plan", () => {
  const plans: BnplPlan[] = [
    {
      id: "later",
      bookId: "book",
      accountId: "bnpl",
      transactionId: "t2",
      merchant: "Later",
      totalAmount: 100,
      paidAmount: 0,
      installments: 1,
      firstDueDate: "2026-09-01",
      createdAt: now,
    },
    {
      id: "earlier",
      bookId: "book",
      accountId: "bnpl",
      transactionId: "t1",
      merchant: "Earlier",
      totalAmount: 80,
      paidAmount: 0,
      installments: 1,
      firstDueDate: "2026-08-01",
      createdAt: now,
    },
  ];
  const updated = allocateBnplPayment(plans, "bnpl", 100);
  assert.equal(updated.find((plan) => plan.id === "earlier")?.paidAmount, 80);
  assert.equal(updated.find((plan) => plan.id === "later")?.paidAmount, 20);
});

test("BNPL allocation is recalculated after deleting a repayment", () => {
  const plan: BnplPlan = {
    id: "plan",
    bookId: "book",
    accountId: "bnpl",
    transactionId: "purchase",
    merchant: "Store",
    totalAmount: 300,
    paidAmount: 100,
    installments: 3,
    firstDueDate: "2026-08-01",
    createdAt: now,
  };
  const reconciled = reconcileBnplPayments([plan], [transactions[0]], [asset, bnpl]);
  assert.equal(reconciled[0].paidAmount, 0);
});

test("balance adjustment changes balance without becoming income", () => {
  const adjusted: Transaction[] = [
    ...transactions,
    {
      id: "adjust",
      bookId: "book",
      type: "adjustment",
      amount: 150,
      adjustmentDelta: 150,
      accountId: "bank",
      date: "2026-07-21",
      note: "",
      createdAt: now,
    },
  ];
  assert.equal(accountBalance(asset, adjusted), 1050);
  assert.equal(monthSummary(adjusted, "2026-07").income, 0);
});

test("linked refund restores account balance and reduces monthly expense", () => {
  const withRefund: Transaction[] = [
    ...transactions,
    {
      id: "refund",
      bookId: "book",
      type: "refund",
      amount: 50,
      accountId: "bank",
      categoryId: "shopping",
      linkedTransactionId: "purchase",
      date: "2026-07-25",
      note: "",
      createdAt: now,
    },
  ];
  assert.equal(accountBalance(asset, withRefund), 950);
  assert.equal(monthSummary(withRefund, "2026-07").expense, 250);
});

test("personal debts are included in net worth", () => {
  const totals = accountTotals([asset], [], [
    {
      id: "receivable",
      bookId: "book",
      direction: "owed_to_me",
      person: "A",
      originalAmount: 200,
      outstandingAmount: 200,
      note: "",
      createdAt: now,
    },
    {
      id: "payable",
      bookId: "book",
      direction: "i_owe",
      person: "B",
      originalAmount: 80,
      outstandingAmount: 80,
      note: "",
      createdAt: now,
    },
  ]);
  assert.deepEqual(totals, {
    assets: 1200,
    liabilities: 80,
    netWorth: 1120,
  });
});
