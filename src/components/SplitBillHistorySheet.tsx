import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import type { SplitBill } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";
import { SplitBillSheet } from "./SplitBillSheet";

function settlementText(splitBill: SplitBill): string {
  const names = new Map(
    splitBill.participants.map((person) => [person.id, person.name]),
  );
  const lines = splitBill.transfers.map(
    (transfer) =>
      `${names.get(transfer.fromParticipantId)} → ${names.get(
        transfer.toParticipantId,
      )}: ${splitBill.currency} ${transfer.amount.toFixed(2)}`,
  );
  return [
    splitBill.title,
    splitBill.date,
    ...lines,
    splitBill.note,
  ]
    .filter(Boolean)
    .join("\n");
}

export function SplitBillHistorySheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [editing, setEditing] = useState<SplitBill | null>(null);
  const bills = useMemo(
    () =>
      data.splitBills
        .filter((bill) => bill.bookId === activeBookId)
        .sort((a, b) => `${b.date}${b.createdAt}`.localeCompare(`${a.date}${a.createdAt}`)),
    [activeBookId, data.splitBills],
  );

  async function share(bill: SplitBill) {
    const text = settlementText(bill);
    if (navigator.share) {
      await navigator.share({ title: bill.title, text }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(text);
      window.alert(t("copied"));
    }
  }

  return (
    <Modal title={t("splitHistory")} onClose={onClose} className="split-history-sheet">
      <div className="split-history-list">
        {bills.length ? (
          bills.map((bill) => {
            const names = new Map(
              bill.participants.map((person) => [person.id, person.name]),
            );
            return (
              <article className="paper-list-card" key={bill.id}>
                <button className="paper-list-main" onClick={() => setEditing(bill)}>
                  <strong>{bill.title}</strong>
                  <span>
                    {bill.date} · {bill.currency} · {bill.participants.length}{" "}
                    {t("participant")}
                  </span>
                  {bill.transfers.map((transfer, index) => (
                    <small key={`${bill.id}_${index}`}>
                      {names.get(transfer.fromParticipantId)} →{" "}
                      {names.get(transfer.toParticipantId)}{" "}
                      {bill.currency} {transfer.amount.toFixed(2)}
                    </small>
                  ))}
                </button>
                <div className="paper-list-actions">
                  <button onClick={() => share(bill)}>
                    <AppIcon name="Share2" size={16} />
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      setData((current) => ({
                        ...current,
                        splitBills: current.splitBills.filter(
                          (item) => item.id !== bill.id,
                        ),
                      }))
                    }
                  >
                    <AppIcon name="Trash2" size={16} />
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state">{t("noSplitHistory")}</div>
        )}
      </div>
      {editing && (
        <SplitBillSheet
          splitBill={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Modal>
  );
}
