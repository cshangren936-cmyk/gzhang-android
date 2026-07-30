import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { compressReceipt } from "../core/image";
import { makeId } from "../core/id";
import { parseReceiptText } from "../core/receiptParser";
import { roundMoney } from "../core/money";
import { recognizeImage } from "../native/smartCapture";
import type { BillItem } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";
import { storeAttachment } from "../data/attachments";
import { AttachmentImage } from "./AttachmentImage";
import { inferExpenseCategory } from "../core/autoCategory";

type ReceiptForm = ReturnType<typeof parseReceiptText>;

const EMPTY_RECEIPT: ReceiptForm = {
  merchant: "",
  date: new Date().toISOString().slice(0, 10),
  total: 0,
  tax: 0,
  serviceCharge: 0,
  items: [],
  confidence: 0,
};

export function SmartEntrySheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const accounts = data.accounts.filter(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(
    data.categories.find((category) => category.kind === "expense")?.id ?? "",
  );
  const [receiptImage, setReceiptImage] = useState("");
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ReceiptForm>(EMPTY_RECEIPT);
  const [recognizing, setRecognizing] = useState(false);
  const [error, setError] = useState("");

  function applyParsed(next: ReceiptForm) {
    setParsed(next);
    setCategoryId(
      inferExpenseCategory(
        `${next.merchant} ${rawText}`,
        data.categories,
      ) ?? categoryId,
    );
    setError("");
  }

  async function attachAndRecognize(file?: File) {
    if (!file) return;
    setRecognizing(true);
    setError("");
    try {
      const dataUrl = await compressReceipt(file);
      setReceiptImage(dataUrl);
      const nativeResult = await recognizeImage(dataUrl);
      setRawText(nativeResult.rawText);
      applyParsed(parseReceiptText(nativeResult.rawText));
    } catch {
      setError(t("ocrUnavailable"));
    } finally {
      setRecognizing(false);
    }
  }

  function updateItem(id: string, patch: Partial<BillItem>) {
    setParsed((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (!accountId || parsed.total <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    const now = new Date().toISOString();
    const draftId = makeId("smart");
    const storedReceiptImage = receiptImage
      ? await storeAttachment(receiptImage)
      : "";
    setData((current) => ({
      ...current,
      smartDrafts: [
        {
          id: draftId,
          bookId: activeBookId,
          source: "receipt",
          merchant: parsed.merchant,
          date: parsed.date,
          total: parsed.total,
          tax: parsed.tax,
          serviceCharge: parsed.serviceCharge,
          categoryId,
          items: parsed.items,
          rawText,
          ...(storedReceiptImage
            ? { receiptImage: storedReceiptImage }
            : {}),
          confidence: parsed.confidence,
          status: "confirmed",
          createdAt: now,
        },
        ...current.smartDrafts,
      ],
      transactions: [
        {
          id: makeId("tx"),
          bookId: activeBookId,
          type: "expense",
          amount: roundMoney(parsed.total),
          accountId,
          categoryId,
          ...(storedReceiptImage
            ? { receiptImage: storedReceiptImage }
            : {}),
          receiptName: parsed.merchant || t("receipt"),
          items: parsed.items,
          source: "receipt",
          date: parsed.date,
          note: parsed.merchant,
          createdAt: now,
        },
        ...current.transactions,
      ],
    }));
    onClose();
  }

  return (
    <Modal title={t("smartEntry")} onClose={onClose} className="smart-sheet">
      <form onSubmit={confirm}>
        <label className="smart-photo-drop">
          {receiptImage ? (
            <AttachmentImage reference={receiptImage} alt={t("receipt")} />
          ) : (
            <>
              <AppIcon name="ScanLine" size={34} />
              <strong>{t("recognizeReceipt")}</strong>
              <span>{t("uploadPhoto")}</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => attachAndRecognize(event.target.files?.[0])}
          />
        </label>
        {recognizing && <p className="ocr-status">{t("recognizing")}</p>}
        {receiptImage && (
          <label className="photo-button compact">
            <AppIcon name="RotateCcw" size={16} />
            {t("recognizeAgain")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => attachAndRecognize(event.target.files?.[0])}
            />
          </label>
        )}

        <details className="ocr-text">
          <summary>OCR text</summary>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder="Paste OCR text here"
          />
          <button
            type="button"
            className="secondary-button full-width"
            onClick={() => applyParsed(parseReceiptText(rawText))}
          >
            {t("calculate")}
          </button>
        </details>

        <div className="two-column">
          <label className="field">
            <span>{t("merchant")}</span>
            <input
              value={parsed.merchant}
              onChange={(event) =>
                setParsed((current) => ({
                  ...current,
                  merchant: event.target.value,
                }))
              }
            />
          </label>
          <label className="field">
            <span>{t("date")}</span>
            <input
              type="date"
              value={parsed.date}
              onChange={(event) =>
                setParsed((current) => ({
                  ...current,
                  date: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <label className="amount-field compact-amount">
          <span>{data.settings.currency}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={parsed.total || ""}
            onChange={(event) =>
              setParsed((current) => ({
                ...current,
                total: roundMoney(Number(event.target.value || 0)),
              }))
            }
          />
        </label>
        <div className="two-column">
          <label className="field">
            <span>{t("account")}</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("category")}</span>
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {data.categories
                .filter((category) => category.kind === "expense")
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {data.settings.language === "zh"
                      ? category.zh
                      : category.en}
                  </option>
                ))}
            </select>
          </label>
        </div>

        {parsed.items.length > 0 && (
          <section className="recognized-items">
            <strong>{t("itemized")}</strong>
            {parsed.items.map((item) => (
              <div key={item.id}>
                <input
                  value={item.name}
                  onChange={(event) =>
                    updateItem(item.id, { name: event.target.value })
                  }
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.amount}
                  onChange={(event) => {
                    const amount = roundMoney(
                      Number(event.target.value || 0),
                    );
                    updateItem(item.id, {
                      amount,
                      unitPrice: amount,
                    });
                  }}
                />
              </div>
            ))}
          </section>
        )}
        {parsed.confidence > 0 && (
          <div className="confidence-line">
            <span>{t("confidence")}</span>
            <b>{parsed.confidence}%</b>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-width" type="submit">
          {t("confirmExpense")}
        </button>
      </form>
    </Modal>
  );
}
