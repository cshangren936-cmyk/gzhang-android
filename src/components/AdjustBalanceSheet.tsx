import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { accountBalance } from "../core/calculations";
import { localDate } from "../core/date";
import { makeId } from "../core/id";
import { formatMoney, roundMoney } from "../core/money";
import { Modal } from "./Modal";

export function AdjustBalanceSheet({
  accountId,
  onClose,
}: {
  accountId: string;
  onClose: () => void;
}) {
  const { data, setData, t } = useApp();
  const account = data.accounts.find((item) => item.id === accountId);
  const transactions = useMemo(
    () => data.transactions.filter((item) => item.bookId === account?.bookId),
    [account?.bookId, data.transactions],
  );
  const current = account ? accountBalance(account, transactions) : 0;
  const [newBalance, setNewBalance] = useState(String(current));
  const [note, setNote] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!account) return;
    const target = roundMoney(Number(newBalance));
    if (!Number.isFinite(target)) return;
    const delta = roundMoney(target - current);
    if (delta === 0) return onClose();
    setData((state) => ({
      ...state,
      transactions: [
        {
          id: makeId("tx"),
          bookId: account.bookId,
          type: "adjustment",
          amount: Math.abs(delta),
          adjustmentDelta: delta,
          accountId: account.id,
          date: localDate(),
          note: note || t("adjustment"),
          createdAt: new Date().toISOString(),
        },
        ...state.transactions,
      ],
    }));
    onClose();
  }

  return (
    <Modal title={t("editBalance")} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="balance-adjust-summary">
          <span>{account?.name}</span>
          <small>{t("currentBalance")}</small>
          <strong>
            {formatMoney(
              current,
              data.settings.language,
              data.settings.currency,
            )}
          </strong>
        </div>
        <label className="field">
          <span>{t("newBalance")}</span>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            step="0.01"
            value={newBalance}
            onChange={(event) => setNewBalance(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("note")}</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
