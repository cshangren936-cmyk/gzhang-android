import assert from "node:assert/strict";
import test from "node:test";
import type { InstallmentPlan, RecurringRule } from "../types";
import {
  generateInstallmentEntries,
  generateRecurringEntries,
} from "./schedules";

const now = "2026-07-01T00:00:00.000Z";

test("monthly rule generates one pending entry and advances due date", () => {
  const rule: RecurringRule = {
    id: "rule",
    bookId: "book",
    name: "Netflix",
    type: "expense",
    amount: 55,
    accountId: "bank",
    categoryId: "bills",
    frequency: "monthly",
    dayOfMonth: 15,
    nextDueDate: "2026-07-15",
    note: "",
    active: true,
    createdAt: now,
  };
  const generated = generateRecurringEntries(
    [rule],
    [],
    "2026-07-29",
  );
  assert.equal(generated.entries.length, 1);
  assert.equal(generated.entries[0].dueDate, "2026-07-15");
  assert.equal(generated.rules[0].nextDueDate, "2026-08-15");
});

test("recurring generation does not duplicate an existing occurrence", () => {
  const rule: RecurringRule = {
    id: "rule",
    bookId: "book",
    name: "iCloud",
    type: "expense",
    amount: 12,
    accountId: "bank",
    categoryId: "bills",
    frequency: "monthly",
    dayOfMonth: 15,
    nextDueDate: "2026-07-15",
    note: "",
    active: true,
    createdAt: now,
  };
  const first = generateRecurringEntries([rule], [], "2026-07-29");
  const second = generateRecurringEntries(
    [{ ...rule, nextDueDate: "2026-07-15" }],
    first.entries,
    "2026-07-29",
  );
  assert.equal(second.entries.length, 1);
});

test("installment schedule preserves exact principal plus fees", () => {
  const plan: InstallmentPlan = {
    id: "plan",
    bookId: "book",
    name: "Laptop",
    totalPrincipal: 6000,
    totalFee: 120,
    months: 12,
    creditAccountId: "credit",
    paymentAccountId: "bank",
    categoryId: "shopping",
    purchaseDate: "2026-07-29",
    firstDueDate: "2026-08-29",
    createdAt: now,
  };
  const entries = generateInstallmentEntries(plan);
  assert.equal(entries.length, 12);
  assert.equal(
    entries.reduce((sum, entry) => sum + entry.amount, 0),
    6120,
  );
  assert.equal(entries[11].dueDate, "2027-07-29");
});
