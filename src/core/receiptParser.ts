import type { BillItem } from "../types";
import { makeId } from "./id";
import { localDate } from "./date";
import { roundMoney } from "./money";

export interface ParsedReceipt {
  merchant: string;
  date: string;
  total: number;
  tax: number;
  serviceCharge: number;
  items: BillItem[];
  confidence: number;
}

const amountPattern = /(?:RM|MYR|\$)?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2})\b/i;
const excludedItemPattern =
  /\b(sub\s*total|subtotal|total|jumlah|tax|sst|cukai|service|rounding|change|cash|visa|master|payment|paid|balance|discount)\b/i;

function amountFromLine(line: string): number | null {
  const matches = [...line.matchAll(new RegExp(amountPattern.source, "gi"))];
  const match = matches.at(-1);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(",", ""));
  return Number.isFinite(amount) ? roundMoney(amount) : null;
}

function parseDate(lines: string[]): string {
  for (const line of lines) {
    const iso = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }
    const local = line.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
    if (local) {
      return `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
    }
  }
  return localDate();
}

function findKeywordAmount(lines: string[], pattern: RegExp): number {
  for (const line of [...lines].reverse()) {
    if (!pattern.test(line)) continue;
    const amount = amountFromLine(line);
    if (amount !== null) return Math.max(0, amount);
  }
  return 0;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const merchant =
    lines.find(
      (line) =>
        /[A-Za-z\u3400-\u9FFF]/.test(line) &&
        !excludedItemPattern.test(line) &&
        amountFromLine(line) === null,
    ) ?? "";
  const total = findKeywordAmount(
    lines.filter((line) => !/\bsub\s*total\b/i.test(line)),
    /\b(grand\s*total|total|jumlah|amount\s*(?:paid|due)|net\s*total)\b/i,
  );
  const tax = findKeywordAmount(lines, /\b(sst|tax|cukai)\b/i);
  const serviceCharge = findKeywordAmount(
    lines,
    /\b(service\s*(?:charge|tax)|svc)\b/i,
  );
  const items = lines
    .filter((line) => !excludedItemPattern.test(line))
    .map((line) => {
      const amount = amountFromLine(line);
      if (amount === null || amount <= 0) return null;
      const name = line
        .replace(new RegExp(amountPattern.source, "i"), "")
        .replace(/[.:·\-]+$/, "")
        .trim();
      if (!name || !/[A-Za-z\u3400-\u9FFF]/.test(name)) return null;
      return {
        id: makeId("item"),
        name,
        quantity: 1,
        unitPrice: amount,
        amount,
      } satisfies BillItem;
    })
    .filter((item): item is BillItem => !!item)
    .slice(0, 30);
  const confidenceParts = [
    merchant ? 1 : 0,
    total > 0 ? 1 : 0,
    parseDate(lines) !== localDate() ? 1 : 0,
    items.length > 0 ? 1 : 0,
  ];
  return {
    merchant,
    date: parseDate(lines),
    total,
    tax,
    serviceCharge,
    items,
    confidence: Math.round(
      (confidenceParts.reduce((sum, value) => sum + value, 0) /
        confidenceParts.length) *
        100,
    ),
  };
}

