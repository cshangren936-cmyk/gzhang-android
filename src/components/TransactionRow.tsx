import { useApp } from "../AppContext";
import { useState } from "react";
import { formatPrivateMoney } from "../core/money";
import type { Transaction } from "../types";
import { AppIcon } from "./AppIcon";
import { CategoryIcon } from "./CategoryIcon";
import { AttachmentImage } from "./AttachmentImage";

export function TransactionRow({
  transaction,
  onDelete,
  onRefund,
  onOpen,
}: {
  transaction: Transaction;
  onDelete?: () => void;
  onRefund?: () => void;
  onOpen?: () => void;
}) {
  const { data, t } = useApp();
  const [showReceipt, setShowReceipt] = useState(false);
  const category = data.categories.find(
    (item) => item.id === transaction.categoryId,
  );
  const account = data.accounts.find(
    (item) => item.id === transaction.accountId,
  );
  const toAccount = data.accounts.find(
    (item) => item.id === transaction.toAccountId,
  );
  const language = data.settings.language;
  const refunded = data.transactions
    .filter(
      (item) =>
        item.type === "refund" &&
        item.linkedTransactionId === transaction.id,
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const title =
    transaction.type === "transfer"
      ? `${account?.name ?? "—"} → ${toAccount?.name ?? "—"}`
      : transaction.type === "adjustment"
        ? transaction.note || t("adjustment")
        : transaction.type === "refund"
          ? transaction.note || t("refund")
      : transaction.note ||
        (category ? (language === "zh" ? category.zh : category.en) : t(transaction.type));

  return (
    <div className="transaction-row">
      {transaction.receiptImage ? (
        <button
          className="receipt-thumb"
          onClick={() => setShowReceipt(true)}
        >
          <AttachmentImage
            reference={transaction.receiptImage}
            alt={t("receipt")}
          />
        </button>
      ) : transaction.type === "transfer" || transaction.type === "adjustment" ? (
        <span className="category-icon transfer-icon">
          <AppIcon
            name={transaction.type === "transfer" ? "ArrowLeftRight" : "SlidersHorizontal"}
            size={20}
          />
        </span>
      ) : (
        <CategoryIcon category={category} />
      )}
      <button className="transaction-main row-open" onClick={onOpen}>
        <strong>{title}</strong>
        <span>
          {transaction.date} · {account?.name}
          {refunded > 0
            ? ` · ${t("refunded")} ${formatPrivateMoney(
                refunded,
                language,
                data.settings.hideAmounts,
                data.settings.currency,
              )}`
            : ""}
        </span>
      </button>
      <div className={`transaction-amount ${transaction.type}`}>
        <strong>
          {transaction.type === "income" || transaction.type === "refund"
            ? "+"
            : transaction.type === "expense"
              ? "−"
              : transaction.type === "adjustment" &&
                  (transaction.adjustmentDelta ?? 0) < 0
                ? "−"
              : ""}
          {formatPrivateMoney(
            transaction.type === "adjustment"
              ? Math.abs(transaction.adjustmentDelta ?? transaction.amount)
              : transaction.amount,
            language,
            data.settings.hideAmounts,
            data.settings.currency,
          )}
        </strong>
        <span>{t(transaction.type)}</span>
      </div>
      {onDelete && (
        <button className="icon-button danger subtle row-delete" onClick={onDelete}>
          <AppIcon name="Trash2" size={17} />
        </button>
      )}
      {onRefund && transaction.type === "expense" && refunded < transaction.amount && (
        <button className="row-refund" onClick={onRefund}>
          {t("refund")}
        </button>
      )}
      {showReceipt && transaction.receiptImage && (
        <div
          className="receipt-lightbox"
          onClick={() => setShowReceipt(false)}
        >
          <AttachmentImage
            reference={transaction.receiptImage}
            alt={t("receipt")}
          />
          <button onClick={() => setShowReceipt(false)}>
            <AppIcon name="X" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
