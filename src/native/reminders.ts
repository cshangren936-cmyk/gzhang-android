import { Capacitor, registerPlugin } from "@capacitor/core";
import type { AppData } from "../types";

interface ReminderItem {
  id: string;
  kind: "due" | "warranty";
  title: string;
  message: string;
  dueDate: string;
  reminderDays?: number;
}

interface FinanceReminderPlugin {
  schedule(options: { items: ReminderItem[] }): Promise<void>;
}

const FinanceReminder =
  registerPlugin<FinanceReminderPlugin>("FinanceReminder");

export async function syncNativeReminders(data: AppData): Promise<void> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "android") {
    return;
  }
  const language = data.settings.language;
  const pending: ReminderItem[] = data.pendingEntries
    .filter(
      (entry) =>
        entry.bookId === data.settings.activeBookId &&
        entry.status === "pending",
    )
    .map((entry) => ({
      id: `pending_${entry.id}`,
      kind: "due",
      title: language === "zh" ? "待确认账目" : "Pending entry",
      message: `${entry.title} · ${data.settings.currency} ${entry.amount.toFixed(
        2,
      )} · ${entry.dueDate}`,
      dueDate: entry.dueDate,
    }));
  const recurring: ReminderItem[] = data.recurringRules
    .filter(
      (rule) =>
        rule.bookId === data.settings.activeBookId && rule.active,
    )
    .map((rule) => ({
      id: `recurring_${rule.id}`,
      kind: "due",
      title: language === "zh" ? "周期账目即将到期" : "Recurring item due",
      message: `${rule.name} · ${data.settings.currency} ${rule.amount.toFixed(
        2,
      )} · ${rule.nextDueDate}`,
      dueDate: rule.nextDueDate,
    }));
  const warranties: ReminderItem[] = data.electronicAssets
    .filter(
      (asset) =>
        asset.bookId === data.settings.activeBookId &&
        !asset.archived &&
        asset.warrantyEndDate &&
        (asset.status ?? "active") === "active",
    )
    .map((asset) => ({
      id: `warranty_${asset.id}`,
      kind: "warranty",
      title: language === "zh" ? "保修期提醒" : "Warranty reminder",
      message:
        language === "zh"
          ? `${asset.name} 的保修期将在 ${asset.warrantyEndDate} 到期，建议提前检查。`
          : `${asset.name}'s warranty ends on ${asset.warrantyEndDate}. Consider checking it in advance.`,
      dueDate: asset.warrantyEndDate!,
      reminderDays: data.settings.warrantyReminderDays,
    }));
  await FinanceReminder.schedule({
    items: [...pending, ...recurring, ...warranties],
  });
}

