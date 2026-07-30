import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { addMonths, localDate } from "../core/date";
import { makeId } from "../core/id";
import { roundMoney } from "../core/money";
import { compressReceipt } from "../core/image";
import { allocateBnplPayment, isLiability } from "../core/calculations";
import { evaluateExpression } from "../core/calculator";
import { convertMoney, SUPPORTED_CURRENCIES } from "../core/exchange";
import type { BillItem, Transaction, TransactionType } from "../types";
import { CategoryIcon } from "./CategoryIcon";
import { Modal } from "./Modal";
import { AppIcon } from "./AppIcon";
import { storeAttachment } from "../data/attachments";
import { AttachmentImage } from "./AttachmentImage";

interface TransactionSheetProps {
  onClose: () => void;
  initialType?: TransactionType;
  initialToAccountId?: string;
  transaction?: Transaction;
}

export function TransactionSheet({
  onClose,
  initialType = "expense",
  initialToAccountId,
  transaction: editingTransaction,
}: TransactionSheetProps) {
  const { data, setData, t, activeBookId } = useApp();
  const activeAccounts = data.accounts.filter(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const defaultAsset =
    activeAccounts.find((account) => !isLiability(account)) ?? activeAccounts[0];
  const defaultTarget =
    activeAccounts.find((account) => account.id === initialToAccountId) ??
    activeAccounts.find((account) => account.id !== defaultAsset?.id);

  const [type, setType] = useState<TransactionType>(
    editingTransaction?.type ?? initialType,
  );
  const [amount, setAmount] = useState(
    editingTransaction
      ? String(editingTransaction.originalAmount ?? editingTransaction.amount)
      : "",
  );
  const [currency, setCurrency] = useState(
    editingTransaction?.currency ?? data.settings.currency,
  );
  const [accountId, setAccountId] = useState(
    editingTransaction?.accountId ?? defaultAsset?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(
    editingTransaction?.toAccountId ?? defaultTarget?.id ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    editingTransaction?.categoryId ?? "food",
  );
  const [date, setDate] = useState(editingTransaction?.date ?? localDate());
  const [note, setNote] = useState(editingTransaction?.note ?? "");
  const [subcategory, setSubcategory] = useState(
    data.subcategories.find(
      (item) => item.id === editingTransaction?.subcategoryId,
    )?.zh ?? "",
  );
  const [tags, setTags] = useState(
    (editingTransaction?.tagIds ?? [])
      .map((id) => data.tags.find((tag) => tag.id === id)?.name)
      .filter(Boolean)
      .join(", "),
  );
  const [receiptImage, setReceiptImage] = useState(
    editingTransaction?.receiptImage ?? "",
  );
  const [receiptName, setReceiptName] = useState(
    editingTransaction?.receiptName ?? "",
  );
  const [fee, setFee] = useState(
    editingTransaction?.fee ? String(editingTransaction.fee) : "",
  );
  const [installments, setInstallments] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState(addMonths(localDate(), 1));
  const [error, setError] = useState("");
  const [showCalculator, setShowCalculator] = useState(false);
  const [expression, setExpression] = useState("");
  const [items, setItems] = useState<BillItem[]>(
    editingTransaction?.items?.map((item) => ({ ...item })) ?? [],
  );
  const [memoryCreatedForCurrent, setMemoryCreatedForCurrent] = useState(false);

  const categories = useMemo(
    () =>
      data.categories.filter(
        (category) =>
          category.kind === (type === "income" ? "income" : "expense"),
      ),
    [data.categories, type],
  );
  const selectedAccount = activeAccounts.find(
    (account) => account.id === accountId,
  );
  const isBnplPurchase = type === "expense" && selectedAccount?.type === "bnpl";

  function changeType(nextType: TransactionType) {
    setType(nextType);
    setError("");
    if (nextType === "income") {
      setCategoryId(
        data.categories.find((category) => category.kind === "income")?.id ?? "",
      );
    } else if (nextType === "expense") {
      setCategoryId(
        data.categories.find((category) => category.kind === "expense")?.id ?? "",
      );
    }
  }

  async function attachReceipt(file?: File) {
    if (!file) return;
    try {
      setReceiptImage(await compressReceipt(file));
      setReceiptName(file.name);
    } catch {
      setError(t("invalidBackup"));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const originalAmount = roundMoney(Number(amount));
    let numericAmount = originalAmount;
    try {
      numericAmount =
        type === "transfer"
          ? originalAmount
          : convertMoney(
              originalAmount,
              currency,
              data.settings.currency,
              data.exchangeRates,
            );
    } catch {
      setError(t("rateUnavailable"));
      return;
    }
    const numericFee = roundMoney(Number(fee || 0));
    if (!originalAmount || originalAmount <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    if (type === "transfer" && accountId === toAccountId) {
      setError(t("selectDifferentAccounts"));
      return;
    }

    const now = new Date().toISOString();
    const transactionId = editingTransaction?.id ?? makeId("tx");
    const storedReceiptImage = receiptImage
      ? await storeAttachment(receiptImage)
      : "";
    setData((current) => {
      let subcategories = current.subcategories;
      let subcategoryId: string | undefined;
      const normalizedSubcategory = subcategory.trim();
      if (type !== "transfer" && normalizedSubcategory) {
        const existing = current.subcategories.find(
          (item) =>
            item.categoryId === categoryId &&
            [item.zh, item.en].some(
              (name) =>
                name.toLocaleLowerCase() ===
                normalizedSubcategory.toLocaleLowerCase(),
            ),
        );
        subcategoryId = existing?.id ?? makeId("subcategory");
        if (!existing) {
          subcategories = [
            ...subcategories,
            {
              id: subcategoryId,
              categoryId,
              zh: normalizedSubcategory,
              en: normalizedSubcategory,
            },
          ];
        }
      }

      let currentTags = current.tags;
      const tagIds =
        type === "transfer"
          ? []
          : tags
              .split(/[,，#]/)
              .map((name) => name.trim())
              .filter(Boolean)
              .map((name, index) => {
                const existing = currentTags.find(
                  (tag) =>
                    tag.bookId === activeBookId &&
                    tag.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
                );
                if (existing) return existing.id;
                const id = makeId("tag");
                currentTags = [
                  ...currentTags,
                  {
                    id,
                    bookId: activeBookId,
                    name,
                    color: ["#6C5CE7", "#31C7A4", "#FF8C61", "#4B9AFA"][
                      index % 4
                    ],
                  },
                ];
                return id;
              });
      const transaction = {
        id: transactionId,
        bookId: activeBookId,
        type,
        amount: numericAmount,
        accountId,
        ...(type === "transfer" ? { toAccountId, fee: numericFee } : {}),
        ...(type !== "transfer"
          ? { categoryId, subcategoryId, tagIds }
          : {}),
        ...(storedReceiptImage
          ? { receiptImage: storedReceiptImage, receiptName }
          : {}),
        ...(items.length ? { items } : {}),
        currency: type === "transfer" ? data.settings.currency : currency,
        originalAmount,
        exchangeRate:
          originalAmount > 0 ? roundMoney(numericAmount / originalAmount) : 1,
        source: editingTransaction?.source ?? "manual",
        date,
        note,
        createdAt: editingTransaction?.createdAt ?? now,
      } satisfies Transaction;

      let bnplPlans = current.bnplPlans;
      if (isBnplPurchase && !editingTransaction) {
        const count = Math.max(1, Math.min(36, Number(installments) || 1));
        bnplPlans = [
          ...bnplPlans,
          {
            id: makeId("plan"),
            bookId: activeBookId,
            accountId,
            transactionId,
            merchant: note || t("bnpl"),
            totalAmount: numericAmount,
            paidAmount: 0,
            installments: count,
            firstDueDate,
            createdAt: now,
          },
        ];
      }

      const destination = current.accounts.find(
        (account) => account.id === toAccountId,
      );
      if (type === "transfer" && destination?.type === "bnpl") {
        bnplPlans = allocateBnplPayment(
          bnplPlans,
          destination.id,
          numericAmount,
        );
      }

      return {
        ...current,
        subcategories,
        tags: currentTags,
        transactions: editingTransaction
          ? current.transactions.map((item) =>
              item.id === editingTransaction.id ? transaction : item,
            )
          : [transaction, ...current.transactions],
        bnplPlans,
        calculatorMemory:
          current.calculatorMemory && !memoryCreatedForCurrent
          ? {
              ...current.calculatorMemory,
              allocatedAmount: roundMoney(
                current.calculatorMemory.allocatedAmount + numericAmount,
              ),
              remainingAmount: roundMoney(
                Math.max(
                  0,
                  current.calculatorMemory.remainingAmount - numericAmount,
                ),
              ),
              updatedAt: now,
            }
          : current.calculatorMemory,
      };
    });
    onClose();
  }

  return (
    <Modal
      title={editingTransaction ? t("editRecord") : t("add")}
      onClose={onClose}
      className="transaction-sheet"
    >
      <form onSubmit={submit}>
        <div className="segmented-control transaction-tabs">
          {(["expense", "income", "transfer"] as TransactionType[]).map(
            (item) => (
              <button
                key={item}
                type="button"
                className={type === item ? "active" : ""}
                onClick={() => changeType(item)}
              >
                {t(item)}
              </button>
            ),
          )}
        </div>

        <label className="amount-field">
          {type === "transfer" ? (
            <span>{data.settings.currency}</span>
          ) : (
            <select
              aria-label={t("currency")}
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        {type !== "transfer" &&
          currency !== data.settings.currency &&
          Number(amount) > 0 && (
            <small className="exchange-preview">
              {t("convertedAmount")}:{" "}
              {(() => {
                try {
                  return `${data.settings.currency} ${convertMoney(
                    Number(amount),
                    currency,
                    data.settings.currency,
                    data.exchangeRates,
                  ).toFixed(2)}`;
                } catch {
                  return t("rateUnavailable");
                }
              })()}
            </small>
          )}

        {data.calculatorMemory &&
          data.calculatorMemory.remainingAmount > 0 && (
            <div className="calculator-memory">
              <div>
                <small>{t("memoryRemaining")}</small>
                <strong>
                  {data.settings.currency}{" "}
                  {data.calculatorMemory.remainingAmount.toFixed(2)}
                </strong>
              </div>
              <button
                type="button"
                onClick={() =>
                  setAmount(data.calculatorMemory!.remainingAmount.toFixed(2))
                }
              >
                {t("useMemory")}
              </button>
              <button
                type="button"
                className="subtle"
                onClick={() =>
                  setData((current) => ({
                    ...current,
                    calculatorMemory: null,
                  }))
                }
              >
                {t("clearMemory")}
              </button>
            </div>
          )}

        <button
          className="tool-toggle"
          type="button"
          onClick={() => setShowCalculator((current) => !current)}
        >
          <AppIcon name="Calculator" size={18} />
          {t("calculator")}
          <AppIcon
            name={showCalculator ? "ChevronDown" : "ChevronRight"}
            size={16}
          />
        </button>
        {showCalculator && (
          <div className="inline-tool-card calculator-card">
            <input
              inputMode="decimal"
              value={expression}
              placeholder={t("calculatorHint")}
              onChange={(event) => setExpression(event.target.value)}
            />
            <div className="calculator-actions">
              <button
                type="button"
                onClick={() => {
                  try {
                    setAmount(evaluateExpression(expression).toFixed(2));
                    setError("");
                  } catch {
                    setError(t("invalidAmount"));
                  }
                }}
              >
                {t("useResult")}
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const result = evaluateExpression(expression);
                    const originalAmount =
                      Number(expression.match(/\d+(?:\.\d+)?/)?.[0]) ||
                      result;
                    const usedAmount = roundMoney(Number(amount || 0));
                    setData((current) => ({
                      ...current,
                      calculatorMemory: {
                        originalAmount,
                        allocatedAmount: usedAmount,
                        remainingAmount: roundMoney(
                          Math.max(0, originalAmount - usedAmount),
                        ),
                        updatedAt: new Date().toISOString(),
                      },
                    }));
                    setMemoryCreatedForCurrent(true);
                    setError("");
                  } catch {
                    setError(t("invalidAmount"));
                  }
                }}
              >
                {t("rememberRemainder")}
              </button>
            </div>
          </div>
        )}

        {type !== "transfer" ? (
          <>
            <div className="field-group">
              <span className="field-label">{t("category")}</span>
              <div className="category-grid">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`category-choice ${
                      categoryId === category.id ? "selected" : ""
                    }`}
                    onClick={() => setCategoryId(category.id)}
                  >
                    <CategoryIcon category={category} size={44} />
                    <span>
                      {data.settings.language === "zh"
                        ? category.zh
                        : category.en}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span>{t("account")}</span>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="two-column">
              <label className="field">
                <span>{t("subcategory")}</span>
                <input
                  list="subcategory-options"
                  value={subcategory}
                  onChange={(event) => setSubcategory(event.target.value)}
                />
                <datalist id="subcategory-options">
                  {data.subcategories
                    .filter((item) => item.categoryId === categoryId)
                    .map((item) => (
                      <option
                        key={item.id}
                        value={
                          data.settings.language === "zh" ? item.zh : item.en
                        }
                      />
                    ))}
                </datalist>
              </label>
              <label className="field">
                <span>{t("tags")}</span>
                <input
                  value={tags}
                  placeholder="#Travel, #Friends"
                  onChange={(event) => setTags(event.target.value)}
                />
              </label>
            </div>
            <div className="itemized-card">
              <div className="itemized-heading">
                <strong>{t("itemized")}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setItems((current) => [
                      ...current,
                      {
                        id: makeId("item"),
                        name: "",
                        quantity: 1,
                        unitPrice: 0,
                        amount: 0,
                      },
                    ])
                  }
                >
                  <AppIcon name="Plus" size={15} />
                  {t("addItem")}
                </button>
              </div>
              {items.map((item) => (
                <div className="itemized-row" key={item.id}>
                  <input
                    value={item.name}
                    placeholder={t("itemName")}
                    onChange={(event) =>
                      setItems((current) =>
                        current.map((currentItem) =>
                          currentItem.id === item.id
                            ? { ...currentItem, name: event.target.value }
                            : currentItem,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={t("quantity")}
                    type="number"
                    inputMode="numeric"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(event) => {
                      const quantity = Math.max(
                        0,
                        Number(event.target.value || 0),
                      );
                      setItems((current) =>
                        current.map((currentItem) =>
                          currentItem.id === item.id
                            ? {
                                ...currentItem,
                                quantity,
                                amount: roundMoney(
                                  quantity * currentItem.unitPrice,
                                ),
                              }
                            : currentItem,
                        ),
                      );
                    }}
                  />
                  <input
                    aria-label={t("unitPrice")}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ""}
                    onChange={(event) => {
                      const unitPrice = Math.max(
                        0,
                        Number(event.target.value || 0),
                      );
                      setItems((current) =>
                        current.map((currentItem) =>
                          currentItem.id === item.id
                            ? {
                                ...currentItem,
                                unitPrice,
                                amount: roundMoney(
                                  currentItem.quantity * unitPrice,
                                ),
                              }
                            : currentItem,
                        ),
                      );
                    }}
                  />
                  <button
                    type="button"
                    aria-label={t("delete")}
                    onClick={() =>
                      setItems((current) =>
                        current.filter(
                          (currentItem) => currentItem.id !== item.id,
                        ),
                      )
                    }
                  >
                    <AppIcon name="X" size={15} />
                  </button>
                </div>
              ))}
              {items.length > 0 && (
                <button
                  type="button"
                  className="item-total-button"
                  onClick={() =>
                    setAmount(
                      roundMoney(
                        items.reduce(
                          (sum, item) => sum + item.amount,
                          0,
                        ),
                      ).toFixed(2),
                    )
                  }
                >
                  {t("useItemTotal")} · {currency}{" "}
                  {roundMoney(
                    items.reduce((sum, item) => sum + item.amount, 0),
                  ).toFixed(2)}
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="two-column">
            <label className="field">
              <span>{t("fromAccount")}</span>
              <select
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("toAccount")}</span>
              <select
                value={toAccountId}
                onChange={(event) => setToAccountId(event.target.value)}
              >
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {isBnplPurchase && (
          <div className="bnpl-form-card">
            <div className="form-card-title">{t("bnpl")}</div>
            <div className="two-column">
              <label className="field">
                <span>{t("installments")}</span>
                <select
                  value={installments}
                  onChange={(event) => setInstallments(event.target.value)}
                >
                  {[1, 2, 3, 4, 6, 12].map((count) => (
                    <option key={count} value={count}>
                      {count === 1 ? t("oneTime") : `${count}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("firstDueDate")}</span>
                <input
                  type="date"
                  value={firstDueDate}
                  onChange={(event) => setFirstDueDate(event.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        <div className="two-column">
          <label className="field">
            <span>{t("date")}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          {type === "transfer" && (
            <label className="field">
              <span>{t("transferFee")}</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={fee}
                onChange={(event) => setFee(event.target.value)}
              />
            </label>
          )}
        </div>

        <label className="field">
          <span>{isBnplPurchase ? t("merchant") : t("note")}</span>
          <input
            value={note}
            placeholder={t("notePlaceholder")}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="receipt-uploader">
          <span className="field-label">{t("receipt")}</span>
          {receiptImage ? (
            <div className="receipt-preview">
              <AttachmentImage
                reference={receiptImage}
                alt={receiptName || t("receipt")}
              />
              <button
                type="button"
                onClick={() => {
                  setReceiptImage("");
                  setReceiptName("");
                }}
              >
                <AppIcon name="Trash2" size={16} />
                {t("removePhoto")}
              </button>
            </div>
          ) : (
            <label className="photo-button">
              <AppIcon name="Camera" size={18} />
              {t("uploadPhoto")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => attachReceipt(event.target.files?.[0])}
              />
            </label>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
