import assert from "node:assert/strict";
import test from "node:test";
import type { AaParticipant, ElectronicAsset } from "../types";
import { calculateAaSettlement } from "./aa";
import { assetMetrics } from "./assets";
import { evaluateExpression } from "./calculator";
import { parseReceiptText } from "./receiptParser";

test("calculator handles precedence and parentheses", () => {
  assert.equal(evaluateExpression("100 - 90"), 10);
  assert.equal(evaluateExpression("(12.5 + 2.5) * 2"), 30);
});

test("AA tax and service charge follow actual consumption", () => {
  const participants: AaParticipant[] = [
    { id: "a", name: "A", consumedAmount: 10, paidAmount: 11.6 },
    { id: "b", name: "B", consumedAmount: 20, paidAmount: 23.2 },
    { id: "c", name: "C", consumedAmount: 70, paidAmount: 81.2 },
  ];
  const result = calculateAaSettlement(participants, 6, 10, 0);
  assert.deepEqual(
    result.shares.map((share) => share.total),
    [11.6, 23.2, 81.2],
  );
  assert.equal(result.difference, 0);
  assert.equal(result.transfers.length, 0);
});

test("AA settlement produces a minimal two-transfer result", () => {
  const participants: AaParticipant[] = [
    { id: "a", name: "A", consumedAmount: 10, paidAmount: 100 },
    { id: "b", name: "B", consumedAmount: 20, paidAmount: 0 },
    { id: "c", name: "C", consumedAmount: 70, paidAmount: 0 },
  ];
  const result = calculateAaSettlement(participants, 0, 0, 0);
  assert.equal(result.transfers.length, 2);
  assert.equal(
    result.transfers.reduce((sum, transfer) => sum + transfer.amount, 0),
    90,
  );
});

test("asset metrics calculate daily cost and warranty countdown", () => {
  const asset: ElectronicAsset = {
    id: "phone",
    bookId: "book",
    name: "Phone",
    purchaseAmount: 1200,
    purchaseDate: "2026-07-01",
    warrantyEndDate: "2027-07-01",
    targetDailyCost: 50,
    note: "",
    createdAt: "2026-07-01T00:00:00.000Z",
  };
  const metrics = assetMetrics(asset, "2026-07-31");
  assert.equal(metrics.usedDays, 30);
  assert.equal(metrics.dailyCost, 40);
  assert.equal(metrics.warrantyDaysLeft, 335);
  assert.equal(metrics.paidBack, true);
});

test("receipt parser extracts merchant, total, tax and items", () => {
  const parsed = parseReceiptText(`
ABC RESTAURANT
29/07/2026
NASI LEMAK RM 12.90
TEH O RM 2.10
SST RM 0.90
GRAND TOTAL RM 15.90
`);
  assert.equal(parsed.merchant, "ABC RESTAURANT");
  assert.equal(parsed.date, "2026-07-29");
  assert.equal(parsed.total, 15.9);
  assert.equal(parsed.tax, 0.9);
  assert.equal(parsed.items.length, 2);
});

