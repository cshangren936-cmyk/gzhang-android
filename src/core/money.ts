export function formatMoney(
  value: number,
  language: "zh" | "en" = "zh",
  currency = "MYR",
): string {
  return new Intl.NumberFormat(language === "zh" ? "zh-MY" : "en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatPrivateMoney(
  value: number,
  language: "zh" | "en",
  hidden: boolean,
  currency = "MYR",
): string {
  return hidden ? `${currency} ****` : formatMoney(value, language, currency);
}
