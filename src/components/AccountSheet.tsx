import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { makeId } from "../core/id";
import type { AccountType } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

const accountOptions: { type: AccountType; icon: string; color: string }[] = [
  { type: "cash", icon: "Banknote", color: "#31C7A4" },
  { type: "bank", icon: "Building2", color: "#6C5CE7" },
  { type: "ewallet", icon: "Smartphone", color: "#4B9AFA" },
  { type: "savings", icon: "CircleDollarSign", color: "#35BFA3" },
  { type: "credit", icon: "CreditCard", color: "#FFB14A" },
  { type: "bnpl", icon: "HandCoins", color: "#FF7F68" },
];

export function AccountSheet({ onClose }: { onClose: () => void }) {
  const { setData, t, activeBookId } = useApp();
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("bank");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [creditLimit, setCreditLimit] = useState("1500");
  const [dueDay, setDueDay] = useState("15");

  const liability = type === "credit" || type === "bnpl";
  const selected = accountOptions.find((option) => option.type === type)!;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setData((current) => ({
      ...current,
      accounts: [
        ...current.accounts,
        {
          id: makeId("account"),
          bookId: activeBookId,
          name: name.trim(),
          type,
          openingBalance: Number(openingBalance) || 0,
          color: selected.color,
          ...(liability
            ? {
                creditLimit: Number(creditLimit) || 0,
                dueDay: Math.max(1, Math.min(31, Number(dueDay) || 1)),
              }
            : {}),
          createdAt: new Date().toISOString(),
        },
      ],
    }));
    onClose();
  }

  return (
    <Modal title={t("addAccount")} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="account-type-grid">
          {accountOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              className={option.type === type ? "selected" : ""}
              onClick={() => setType(option.type)}
            >
              <span
                className="account-type-icon"
                style={{ color: option.color, background: `${option.color}18` }}
              >
                <AppIcon name={option.icon} size={22} />
              </span>
              {t(option.type)}
            </button>
          ))}
        </div>
        <label className="field">
          <span>{t("accountName")}</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span>{liability ? t("used") : t("openingBalance")}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
          />
        </label>
        {liability && (
          <div className="two-column">
            <label className="field">
              <span>{t("creditLimit")}</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={creditLimit}
                onChange={(event) => setCreditLimit(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("dueDay")}</span>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(event) => setDueDay(event.target.value)}
              />
            </label>
          </div>
        )}
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
