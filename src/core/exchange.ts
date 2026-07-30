import type { ExchangeRateCache } from "../types";
import { roundMoney } from "./money";

export const SUPPORTED_CURRENCIES = [
  "MYR",
  "USD",
  "SGD",
  "CNY",
  "JPY",
  "EUR",
  "GBP",
  "AUD",
  "THB",
  "IDR",
  "KRW",
  "HKD",
  "TWD",
  "PHP",
  "VND",
  "INR",
] as const;

interface FrankfurterLatestResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export async function fetchLatestRates(
  base: string,
): Promise<ExchangeRateCache> {
  const normalizedBase = base.toUpperCase();
  const response = await fetch(
    `https://api.frankfurter.dev/v1/latest?base=${encodeURIComponent(normalizedBase)}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`RATE_HTTP_${response.status}`);
  const payload = (await response.json()) as FrankfurterLatestResponse;
  if (!payload.rates || !payload.date) throw new Error("INVALID_RATE_DATA");
  return {
    base: payload.base || normalizedBase,
    date: payload.date,
    fetchedAt: new Date().toISOString(),
    rates: { ...payload.rates, [normalizedBase]: 1 },
  };
}

export function convertMoney(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  cache: ExchangeRateCache | null,
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return roundMoney(amount);
  if (!cache) throw new Error("NO_RATE_CACHE");
  const base = cache.base.toUpperCase();
  const fromRate = from === base ? 1 : cache.rates[from];
  const toRate = to === base ? 1 : cache.rates[to];
  if (!fromRate || !toRate) throw new Error("RATE_NOT_FOUND");
  return roundMoney((amount / fromRate) * toRate);
}

export function isRateCacheStale(
  cache: ExchangeRateCache | null,
  base: string,
  now = Date.now(),
): boolean {
  if (!cache || cache.base !== base) return true;
  return now - new Date(cache.fetchedAt).getTime() > 12 * 60 * 60 * 1000;
}

