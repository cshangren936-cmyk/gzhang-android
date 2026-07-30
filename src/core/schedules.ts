import type {
  AppData,
  InstallmentPlan,
  PendingEntry,
  RecurringRule,
} from "../types";
import { addMonths, nextMonthlyDate } from "./date";
import { makeId } from "./id";
import { roundMoney } from "./money";

export function generateRecurringEntries(
  rules: RecurringRule[],
  existing: PendingEntry[],
  today: string,
): { entries: PendingEntry[]; rules: RecurringRule[] } {
  const entries = [...existing];
  const updatedRules = rules.map((rule) => {
    if (!rule.active) return rule;
    let nextDueDate = rule.nextDueDate;
    while (nextDueDate <= today) {
      const alreadyExists = entries.some(
        (entry) =>
          entry.sourceType === "recurring" &&
          entry.sourceId === rule.id &&
          entry.dueDate === nextDueDate,
      );
      if (!alreadyExists) {
        entries.push({
          id: makeId("pending"),
          bookId: rule.bookId,
          sourceType: "recurring",
          sourceId: rule.id,
          title: rule.name,
          type: rule.type,
          amount: rule.amount,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          subcategoryId: rule.subcategoryId,
          tagIds: rule.tagIds,
          dueDate: nextDueDate,
          note: rule.note,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
      nextDueDate = nextMonthlyDate(nextDueDate, rule.dayOfMonth);
    }
    return { ...rule, nextDueDate };
  });
  return { entries, rules: updatedRules };
}

export function generateInstallmentEntries(
  plan: InstallmentPlan,
): PendingEntry[] {
  const total = roundMoney(plan.totalPrincipal + plan.totalFee);
  const regular = roundMoney(total / plan.months);
  let allocated = 0;
  return Array.from({ length: plan.months }, (_, index) => {
    const amount =
      index === plan.months - 1 ? roundMoney(total - allocated) : regular;
    allocated = roundMoney(allocated + amount);
    return {
      id: makeId("pending"),
      bookId: plan.bookId,
      sourceType: "installment",
      sourceId: plan.id,
      title: `${plan.name} ${index + 1}/${plan.months}`,
      type: plan.paymentAccountId ? "transfer" : "expense",
      amount,
      accountId: plan.paymentAccountId ?? plan.creditAccountId,
      toAccountId: plan.paymentAccountId ? plan.creditAccountId : undefined,
      categoryId: plan.paymentAccountId ? undefined : plan.categoryId,
      dueDate: addMonths(plan.firstDueDate, index),
      note: `Installment ${index + 1}/${plan.months}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  });
}

export function refreshSchedules(data: AppData, today: string): AppData {
  const generated = generateRecurringEntries(
    data.recurringRules,
    data.pendingEntries,
    today,
  );
  return {
    ...data,
    recurringRules: generated.rules,
    pendingEntries: generated.entries,
  };
}
