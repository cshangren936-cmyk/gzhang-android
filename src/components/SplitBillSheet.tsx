import { useMemo, useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { calculateAaSettlement } from "../core/aa";
import { localDate } from "../core/date";
import { makeId } from "../core/id";
import { roundMoney } from "../core/money";
import { convertMoney, SUPPORTED_CURRENCIES } from "../core/exchange";
import type { AaParticipant, SplitBill } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

function blankParticipant(name = "", currency = "MYR"): AaParticipant {
  return {
    id: makeId("person"),
    name,
    consumedAmount: 0,
    paidAmount: 0,
    consumedCurrency: currency,
    paidCurrency: currency,
  };
}

export function SplitBillSheet({
  onClose,
  splitBill: editingSplitBill,
}: {
  onClose: () => void;
  splitBill?: SplitBill;
}) {
  const { data, setData, t, activeBookId } = useApp();
  const [title, setTitle] = useState(editingSplitBill?.title ?? "");
  const [date, setDate] = useState(editingSplitBill?.date ?? localDate());
  const [tax, setTax] = useState(
    editingSplitBill ? String(editingSplitBill.taxAmount) : "",
  );
  const [serviceCharge, setServiceCharge] = useState(
    editingSplitBill ? String(editingSplitBill.serviceCharge) : "",
  );
  const [discount, setDiscount] = useState(
    editingSplitBill ? String(editingSplitBill.discountAmount) : "",
  );
  const [note, setNote] = useState(editingSplitBill?.note ?? "");
  const [currency, setCurrency] = useState(
    editingSplitBill?.currency ?? data.settings.currency,
  );
  const [participants, setParticipants] = useState<AaParticipant[]>(
    editingSplitBill?.participants.map((item) => ({ ...item })) ?? [
      blankParticipant("A", data.settings.currency),
      blankParticipant("B", data.settings.currency),
      blankParticipant("C", data.settings.currency),
    ],
  );
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState("");
  const converted = useMemo(() => {
    try {
      return {
        rateError: false,
        participants: participants.map((participant) => ({
          ...participant,
          consumedAmount: convertMoney(
            participant.consumedAmount,
            participant.consumedCurrency ?? currency,
            currency,
            data.exchangeRates,
          ),
          paidAmount: convertMoney(
            participant.paidAmount,
            participant.paidCurrency ?? currency,
            currency,
            data.exchangeRates,
          ),
        })),
      };
    } catch {
      return { rateError: true, participants };
    }
  }, [currency, data.exchangeRates, participants]);
  const result = useMemo(
    () =>
      calculateAaSettlement(
        converted.participants,
        Number(tax || 0),
        Number(serviceCharge || 0),
        Number(discount || 0),
      ),
    [converted.participants, discount, serviceCharge, tax],
  );
  const participantById = new Map(
    participants.map((participant) => [participant.id, participant]),
  );
  const consumedTotal = roundMoney(
    converted.participants.reduce(
      (sum, participant) => sum + participant.consumedAmount,
      0,
    ),
  );
  const billTotal = roundMoney(
    consumedTotal +
      Number(tax || 0) +
      Number(serviceCharge || 0) -
      Number(discount || 0),
  );
  const paidTotal = roundMoney(
    converted.participants.reduce(
      (sum, participant) => sum + participant.paidAmount,
      0,
    ),
  );

  function updateParticipant(
    id: string,
    patch: Partial<AaParticipant>,
  ) {
    setParticipants((current) =>
      current.map((participant) =>
        participant.id === id ? { ...participant, ...patch } : participant,
      ),
    );
  }

  function save(event: FormEvent) {
    event.preventDefault();
    setShowResult(true);
    if (!title.trim() || participants.some((person) => !person.name.trim())) {
      setError(t("participant"));
      return;
    }
    if (converted.rateError) {
      setError(t("rateUnavailable"));
      return;
    }
    if (result.difference !== 0 || billTotal <= 0) {
      setError(t("paidTotalMismatch"));
      return;
    }
    const now = new Date().toISOString();
    const splitBill: SplitBill = {
      id: editingSplitBill?.id ?? makeId("split"),
      bookId: activeBookId,
      title: title.trim(),
      date,
      currency,
      participants,
      taxAmount: roundMoney(Number(tax || 0)),
      serviceCharge: roundMoney(Number(serviceCharge || 0)),
      discountAmount: roundMoney(Number(discount || 0)),
      shares: result.shares,
      transfers: result.transfers,
      note,
      createdAt: editingSplitBill?.createdAt ?? now,
    };
    setData((current) => ({
      ...current,
      splitBills: editingSplitBill
        ? current.splitBills.map((item) =>
            item.id === editingSplitBill.id ? splitBill : item,
          )
        : [splitBill, ...current.splitBills],
    }));
    onClose();
  }

  return (
    <Modal
      title={editingSplitBill ? t("editSplitBill") : t("splitBill")}
      onClose={onClose}
      className="split-sheet"
    >
      <form onSubmit={save}>
        <div className="two-column">
          <label className="field">
            <span>{t("note")}</span>
            <input
              autoFocus
              value={title}
              placeholder="Dinner / Trip"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("date")}</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("settlementCurrency")}</span>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {SUPPORTED_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="aa-table">
          <div className="aa-table-head">
            <span>{t("participant")}</span>
            <span>{t("consumed")}</span>
            <span>{t("paid")}</span>
            <span>{t("currency")}</span>
            <span />
          </div>
          {participants.map((participant) => (
            <div className="aa-row" key={participant.id}>
              <input
                value={participant.name}
                onChange={(event) =>
                  updateParticipant(participant.id, {
                    name: event.target.value,
                  })
                }
              />
              <div className="aa-currencies">
                <select
                  aria-label={`${t("consumed")} ${t("currency")}`}
                  value={participant.consumedCurrency ?? currency}
                  onChange={(event) =>
                    updateParticipant(participant.id, {
                      consumedCurrency: event.target.value,
                    })
                  }
                >
                  {SUPPORTED_CURRENCIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`${t("paid")} ${t("currency")}`}
                  value={participant.paidCurrency ?? currency}
                  onChange={(event) =>
                    updateParticipant(participant.id, {
                      paidCurrency: event.target.value,
                    })
                  }
                >
                  {SUPPORTED_CURRENCIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              <input
                aria-label={t("consumed")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={participant.consumedAmount || ""}
                onChange={(event) =>
                  updateParticipant(participant.id, {
                    consumedAmount: roundMoney(
                      Math.max(0, Number(event.target.value || 0)),
                    ),
                  })
                }
              />
              <input
                aria-label={t("paid")}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={participant.paidAmount || ""}
                onChange={(event) =>
                  updateParticipant(participant.id, {
                    paidAmount: roundMoney(
                      Math.max(0, Number(event.target.value || 0)),
                    ),
                  })
                }
              />
              <button
                type="button"
                disabled={participants.length <= 2}
                onClick={() =>
                  setParticipants((current) =>
                    current.filter((item) => item.id !== participant.id),
                  )
                }
              >
                <AppIcon name="X" size={15} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="add-row-button"
          type="button"
          onClick={() =>
            setParticipants((current) => [
              ...current,
              blankParticipant(
                String.fromCharCode(65 + Math.min(25, current.length)),
                currency,
              ),
            ])
          }
        >
          <AppIcon name="Plus" size={16} />
          {t("addParticipant")}
        </button>

        <div className="three-column">
          <label className="field">
            <span>{t("tax")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("serviceCharge")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={serviceCharge}
              onChange={(event) => setServiceCharge(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("discount")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </label>
        </div>

        <div className="aa-total-note">
          <span>
            Total {currency} {billTotal.toFixed(2)}
          </span>
          <span>
            {t("paid")} {currency} {paidTotal.toFixed(2)}
          </span>
        </div>

        <button
          className="secondary-button full-width"
          type="button"
          onClick={() => {
            setShowResult(true);
            setError(
              result.difference === 0 ? "" : t("paidTotalMismatch"),
            );
          }}
        >
          {t("calculate")}
        </button>

        {showResult && result.difference === 0 && (
          <section className="settlement-card">
            <strong>{t("settlement")}</strong>
            <div className="share-breakdown">
              {result.shares.map((share) => (
                <span key={share.participantId}>
                  {participantById.get(share.participantId)?.name}: {currency}{" "}
                  {share.total.toFixed(2)}
                  <small>
                    ({t("tax")} {share.tax.toFixed(2)} ·{" "}
                    {t("serviceCharge")} {share.serviceCharge.toFixed(2)})
                  </small>
                </span>
              ))}
            </div>
            {result.transfers.length ? (
              result.transfers.map((transfer, index) => (
                <div className="transfer-result" key={`${index}`}>
                  <b>
                    {participantById.get(transfer.fromParticipantId)?.name}
                  </b>
                  <span>{t("pays")}</span>
                  <b>
                    {participantById.get(transfer.toParticipantId)?.name}
                  </b>
                  <strong>{currency} {transfer.amount.toFixed(2)}</strong>
                </div>
              ))
            ) : (
              <p>{t("settled")}</p>
            )}
          </section>
        )}

        <label className="field">
          <span>{t("note")}</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
