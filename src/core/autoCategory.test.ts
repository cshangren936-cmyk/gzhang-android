import assert from "node:assert/strict";
import test from "node:test";
import { inferExpenseCategory } from "./autoCategory";
import { defaultCategories } from "../data/seed";

test("recognizes common food merchants", () => {
  assert.equal(
    inferExpenseCategory("Nasi Lemak Restaurant", defaultCategories),
    "food",
  );
});

test("recognizes ride and fuel merchants", () => {
  assert.equal(
    inferExpenseCategory("Grab ride receipt", defaultCategories),
    "transport",
  );
});

