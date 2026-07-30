export function localDate(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function currentMonth(date = new Date()): string {
  return localDate(date).slice(0, 7);
}

export function addMonths(dateString: string, count: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1 + count, day);
  return localDate(date);
}

export function nextMonthlyDate(dateString: string, dayOfMonth: number): string {
  const [year, month] = dateString.split("-").map(Number);
  const targetMonth = new Date(year, month, 1);
  const lastDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();
  const safeDay = Math.min(Math.max(1, dayOfMonth), lastDay);
  return `${targetMonth.getFullYear()}-${String(
    targetMonth.getMonth() + 1,
  ).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function monthLabel(month: string, language: "zh" | "en"): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-MY", {
    year: "numeric",
    month: "long",
  }).format(new Date(year, monthNumber - 1, 1));
}

export function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(year, monthNumber - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}
