import { useApp } from "../AppContext";
import { allocateBnplPayment } from "../core/calculations";
import { makeId } from "../core/id";
import { formatMoney } from "../core/money";
import type { PendingEntry } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

export function PendingEntriesSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const pending = data.pendingEntries
    .filter(
      (entry) =>
        entry.bookId === activeBookId && entry.status === "pending",
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const smartPending = data.smartDrafts
    .filter(
      (draft) =>
        draft.bookId === activeBookId && draft.status === "pending",
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const defaultAccount = data.accounts.find(
    (account) => account.bookId === activeBookId && !account.archived,
  );
  const defaultCategory = data.categories.find(
    (category) => category.kind === "expense",
  );

  function update(entry: PendingEntry, confirm: boolean) {
    setData((current) => {
      let bnplPlans = current.bnplPlans;
      if (confirm && entry.type === "transfer" && entry.toAccountId) {
        const destination = current.accounts.find(
          (account) => account.id === entry.toAccountId,
        );
        if (destination?.type === "bnpl") {
          bnplPlans = allocateBnplPayment(
            bnplPlans,
            destination.id,
            entry.amount,
          );
        }
      }
      return {
        ...current,
        bnplPlans,
        pendingEntries: current.pendingEntries.map((item) =>
          item.id === entry.id
            ? { ...item, status: confirm ? "confirmed" : "skipped" }
            : item,
        ),
        transactions: confirm
          ? [
              {
                id: makeId("tx"),
                bookId: entry.bookId,
                type: entry.type,
                amount: entry.amount,
                accountId: entry.accountId,
                toAccountId: entry.toAccountId,
                categoryId: entry.categoryId,
                subcategoryId: entry.subcategoryId,
                tagIds: entry.tagIds,
                date: entry.dueDate,
                note: entry.title,
                createdAt: new Date().toISOString(),
              },
              ...current.transactions,
            ]
          : current.transactions,
      };
    });
  }

  function updateSmart(draftId: string, confirm: boolean) {
    const draft = data.smartDrafts.find((item) => item.id === draftId);
    if (!draft) return;
    setData((current) => ({
      ...current,
      smartDrafts: current.smartDrafts.map((item) =>
        item.id === draftId
          ? {
              ...item,
              status: confirm ? "confirmed" : "discarded",
            }
          : item,
      ),
      transactions:
        confirm && defaultAccount && draft.total > 0
          ? [
              {
                id: makeId("tx"),
                bookId: draft.bookId,
                type: "expense",
                amount: draft.total,
                accountId: defaultAccount.id,
                categoryId: draft.categoryId ?? defaultCategory?.id,
                date: draft.date,
                note: draft.merchant,
                items: draft.items,
                source: "screenshot",
                receiptImage: draft.receiptImage,
                receiptName: draft.merchant || t("receipt"),
                createdAt: new Date().toISOString(),
              },
              ...current.transactions,
            ]
          : current.transactions,
    }));
  }

  return (
    <Modal title={t("pendingEntries")} onClose={onClose} className="tool-sheet">
      <div className="tool-list pending-list">
        {pending.map((entry) => (
          <article className="pending-card" key={entry.id}>
            <span className={`pending-source ${entry.sourceType}`}>
              <AppIcon
                name={entry.sourceType === "recurring" ? "Repeat2" : "CreditCard"}
                size={19}
              />
            </span>
            <div>
              <strong>{entry.title}</strong>
              <small>
                {t("due")} {entry.dueDate}
              </small>
              <b>
                {formatMoney(
                  entry.amount,
                  data.settings.language,
                  data.settings.currency,
                )}
              </b>
            </div>
            <div>
              <button className="confirm" onClick={() => update(entry, true)}>
                <AppIcon name="Check" size={15} />
                {t("confirmEntry")}
              </button>
              <button onClick={() => update(entry, false)}>{t("skipEntry")}</button>
            </div>
          </article>
        ))}
        {smartPending.map((draft) => (
          <article className="pending-card smart-pending" key={draft.id}>
            <span className="pending-source screenshot">
              <AppIcon name="ScanLine" size={19} />
            </span>
            <div>
              <strong>{draft.merchant || t("smartEntry")}</strong>
              <small>
                {draft.date} · {t("confidence")} {draft.confidence}%
              </small>
              <b>
                {formatMoney(
                  draft.total,
                  data.settings.language,
                  data.settings.currency,
                )}
              </b>
            </div>
            <div>
              <button
                className="confirm"
                disabled={!defaultAccount || draft.total <= 0}
                onClick={() => updateSmart(draft.id, true)}
              >
                <AppIcon name="Check" size={15} />
                {t("confirmEntry")}
              </button>
              <button onClick={() => updateSmart(draft.id, false)}>
                {t("skipEntry")}
              </button>
            </div>
          </article>
        ))}
        {!pending.length && !smartPending.length && (
          <div className="empty-state">{t("noPending")}</div>
        )}
      </div>
    </Modal>
  );
}
