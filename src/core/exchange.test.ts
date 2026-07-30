import assert from "node:assert/strict";
import test from "node:test";
import { convertMoney, isRateCacheStale } from "./exchange";

const cache = {
  base: "MYR",
  date: "2026-07-30",
  fetchedAt: "2026-07-30T00:00:00.000Z",
  rates: { MYR: 1, USD: 0.25, SGD: 0.3 },
};

test("converts a foreign amount back to the base currency", () => {
  assert.equal(convertMoney(25, "USD", "MYR", cache), 100);
});

test("converts between two quoted currencies through the base", () => {
  assert.equal(convertMoney(25, "USD", "SGD", cache), 30);
});

test("keeps same-currency values without a cache", () => {
  assert.equal(convertMoney(12.345, "MYR", "MYR", null), 12.35);
});

test("detects a base mismatch", () => {
  assert.equal(isRateCacheStale(cache, "USD", Date.parse("2026-07-30")), true);
});

