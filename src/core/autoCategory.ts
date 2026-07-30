import type { Category } from "../types";

const RULES: Array<{ categoryId: string; words: string[] }> = [
  {
    categoryId: "food",
    words: [
      "restaurant",
      "cafe",
      "coffee",
      "food",
      "mart",
      "mcd",
      "kfc",
      "nasi",
      "餐",
      "饭",
      "茶",
      "咖啡",
      "面",
    ],
  },
  {
    categoryId: "transport",
    words: ["grab", "taxi", "petrol", "shell", "parking", "toll", "车", "油", "停车"],
  },
  {
    categoryId: "shopping",
    words: ["store", "shop", "uniqlo", "shopee", "lazada", "购物", "商场"],
  },
  {
    categoryId: "bills",
    words: ["netflix", "icloud", "unifi", "bill", "subscription", "电费", "水费", "账单"],
  },
  {
    categoryId: "health",
    words: ["pharmacy", "clinic", "hospital", "guardian", "watsons", "药", "诊所", "医院"],
  },
  {
    categoryId: "study",
    words: ["book", "school", "tuition", "course", "书", "学校", "课程"],
  },
];

export function inferExpenseCategory(
  text: string,
  categories: Category[],
): string | undefined {
  const normalized = text.toLocaleLowerCase();
  const match = RULES.find((rule) =>
    rule.words.some((word) => normalized.includes(word)),
  );
  if (match && categories.some((category) => category.id === match.categoryId)) {
    return match.categoryId;
  }
  return categories.find((category) => category.kind === "expense")?.id;
}

