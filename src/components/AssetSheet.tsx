import { useState, type FormEvent } from "react";
import { useApp } from "../AppContext";
import { compressReceipt } from "../core/image";
import { makeId } from "../core/id";
import { localDate } from "../core/date";
import { roundMoney } from "../core/money";
import type { AssetEvent, ElectronicAsset } from "../types";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";
import { storeAttachment } from "../data/attachments";
import { AttachmentImage } from "./AttachmentImage";

export function AssetSheet({
  asset,
  onClose,
}: {
  asset?: ElectronicAsset;
  onClose: () => void;
}) {
  const { data, setData, t, activeBookId } = useApp();
  const [name, setName] = useState(asset?.name ?? "");
  const [purchaseAmount, setPurchaseAmount] = useState(
    asset?.purchaseAmount.toString() ?? "",
  );
  const [purchaseDate, setPurchaseDate] = useState(
    asset?.purchaseDate ?? localDate(),
  );
  const [warrantyEndDate, setWarrantyEndDate] = useState(
    asset?.warrantyEndDate ?? "",
  );
  const [targetDailyCost, setTargetDailyCost] = useState(
    asset?.targetDailyCost?.toString() ?? "",
  );
  const [serialNumber, setSerialNumber] = useState(
    asset?.serialNumber ?? "",
  );
  const [note, setNote] = useState(asset?.note ?? "");
  const [receiptImage, setReceiptImage] = useState(
    asset?.receiptImage ?? "",
  );
  const [linkedTransactionId, setLinkedTransactionId] = useState(
    asset?.linkedTransactionId ?? "",
  );
  const [residualValue, setResidualValue] = useState(
    asset?.residualValue?.toString() ?? "",
  );
  const [status, setStatus] = useState<ElectronicAsset["status"]>(
    asset?.status ?? "active",
  );
  const [soldAmount, setSoldAmount] = useState(
    asset?.soldAmount?.toString() ?? "",
  );
  const [soldDate, setSoldDate] = useState(asset?.soldDate ?? "");
  const [eventType, setEventType] =
    useState<AssetEvent["type"]>("maintenance");
  const [eventDate, setEventDate] = useState(localDate());
  const [eventAmount, setEventAmount] = useState("");
  const [eventNote, setEventNote] = useState("");
  const [error, setError] = useState("");
  const expenses = data.transactions
    .filter(
      (transaction) =>
        transaction.bookId === activeBookId &&
        transaction.type === "expense",
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  async function attachPhoto(file?: File) {
    if (!file) return;
    try {
      setReceiptImage(await compressReceipt(file));
    } catch {
      setError(t("invalidBackup"));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = roundMoney(Number(purchaseAmount));
    if (!name.trim() || amount <= 0) {
      setError(t("invalidAmount"));
      return;
    }
    const storedReceiptImage = receiptImage
      ? await storeAttachment(receiptImage)
      : "";
    const next: ElectronicAsset = {
      id: asset?.id ?? makeId("asset"),
      bookId: activeBookId,
      name: name.trim(),
      purchaseAmount: amount,
      purchaseDate,
      ...(warrantyEndDate ? { warrantyEndDate } : {}),
      ...(Number(targetDailyCost) > 0
        ? { targetDailyCost: roundMoney(Number(targetDailyCost)) }
        : {}),
      note: note.trim(),
      ...(serialNumber.trim() ? { serialNumber: serialNumber.trim() } : {}),
      ...(storedReceiptImage ? { receiptImage: storedReceiptImage } : {}),
      ...(linkedTransactionId ? { linkedTransactionId } : {}),
      ...(Number(residualValue) >= 0
        ? { residualValue: roundMoney(Number(residualValue || 0)) }
        : {}),
      status,
      ...(status === "sold" && Number(soldAmount) >= 0
        ? {
            soldAmount: roundMoney(Number(soldAmount || 0)),
            soldDate: soldDate || localDate(),
          }
        : {}),
      createdAt: asset?.createdAt ?? new Date().toISOString(),
    };
    setData((current) => ({
      ...current,
      electronicAssets: asset
        ? current.electronicAssets.map((item) =>
            item.id === asset.id ? next : item,
          )
        : [next, ...current.electronicAssets],
    }));
    onClose();
  }

  function addEvent() {
    if (!asset || !eventNote.trim()) return;
    const nextEvent: AssetEvent = {
      id: makeId("asset_event"),
      assetId: asset.id,
      type: eventType,
      date: eventDate,
      amount: roundMoney(Math.max(0, Number(eventAmount || 0))),
      note: eventNote.trim(),
      createdAt: new Date().toISOString(),
    };
    setData((current) => ({
      ...current,
      assetEvents: [nextEvent, ...current.assetEvents],
      electronicAssets:
        eventType === "resale"
          ? current.electronicAssets.map((item) =>
              item.id === asset.id
                ? {
                    ...item,
                    status: "sold",
                    soldAmount: nextEvent.amount,
                    soldDate: eventDate,
                  }
                : item,
            )
          : current.electronicAssets,
    }));
    setEventAmount("");
    setEventNote("");
  }

  return (
    <Modal
      title={asset ? t("electronicAssets") : t("addAsset")}
      onClose={onClose}
      className="asset-sheet"
    >
      <form onSubmit={submit}>
        <label className="field">
          <span>{t("assetName")}</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <div className="two-column">
          <label className="field">
            <span>{t("purchaseAmount")}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={purchaseAmount}
              onChange={(event) => setPurchaseAmount(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("purchaseDate")}</span>
            <input
              type="date"
              value={purchaseDate}
              onChange={(event) => setPurchaseDate(event.target.value)}
            />
          </label>
        </div>
        <div className="two-column">
          <label className="field">
            <span>{t("residualValue")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={residualValue}
              onChange={(event) => setResidualValue(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("assetStatus")}</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ElectronicAsset["status"])
              }
            >
              <option value="active">{t("assetActive")}</option>
              <option value="sold">{t("assetSold")}</option>
              <option value="retired">{t("assetRetired")}</option>
            </select>
          </label>
        </div>
        {status === "sold" && (
          <div className="two-column">
            <label className="field">
              <span>{t("soldAmount")}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={soldAmount}
                onChange={(event) => setSoldAmount(event.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("soldDate")}</span>
              <input
                type="date"
                value={soldDate}
                onChange={(event) => setSoldDate(event.target.value)}
              />
            </label>
          </div>
        )}
        <div className="two-column">
          <label className="field">
            <span>{t("warrantyEnd")}</span>
            <input
              type="date"
              value={warrantyEndDate}
              onChange={(event) => setWarrantyEndDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("targetDailyCost")}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={targetDailyCost}
              onChange={(event) => setTargetDailyCost(event.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>{t("serialNumber")}</span>
          <input
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("linkedBill")}</span>
          <select
            value={linkedTransactionId}
            onChange={(event) => setLinkedTransactionId(event.target.value)}
          >
            <option value="">{t("noLinkedBill")}</option>
            {expenses.slice(0, 100).map((transaction) => (
              <option key={transaction.id} value={transaction.id}>
                {transaction.date} · {transaction.note || t("expense")} ·{" "}
                {data.settings.currency}{" "}
                {transaction.amount.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("note")}</span>
          <textarea
            value={note}
            placeholder={t("assetNotePlaceholder")}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <div className="receipt-uploader">
          <span className="field-label">{t("receipt")}</span>
          {receiptImage ? (
            <div className="receipt-preview">
              <AttachmentImage reference={receiptImage} alt={t("receipt")} />
              <button type="button" onClick={() => setReceiptImage("")}>
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
                onChange={(event) => attachPhoto(event.target.files?.[0])}
              />
            </label>
          )}
        </div>
        {asset && (
          <section className="asset-lifecycle">
            <div className="section-header">
              <h3>{t("assetLifecycle")}</h3>
            </div>
            <div className="asset-event-form">
              <select
                value={eventType}
                onChange={(event) =>
                  setEventType(event.target.value as AssetEvent["type"])
                }
              >
                <option value="maintenance">{t("maintenance")}</option>
                <option value="repair">{t("repair")}</option>
                <option value="accessory">{t("accessory")}</option>
                <option value="resale">{t("resale")}</option>
                <option value="note">{t("note")}</option>
              </select>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={t("amount")}
                value={eventAmount}
                onChange={(event) => setEventAmount(event.target.value)}
              />
              <input
                placeholder={t("note")}
                value={eventNote}
                onChange={(event) => setEventNote(event.target.value)}
              />
              <button type="button" onClick={addEvent}>
                <AppIcon name="Plus" size={15} />
                {t("addLifecycleEvent")}
              </button>
            </div>
            <div className="asset-event-list">
              {data.assetEvents
                .filter((item) => item.assetId === asset.id)
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => (
                  <div key={item.id}>
                    <span>{item.date}</span>
                    <strong>{t(item.type)}</strong>
                    <p>{item.note}</p>
                    {item.amount > 0 && (
                      <b>
                        {data.settings.currency} {item.amount.toFixed(2)}
                      </b>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setData((current) => ({
                          ...current,
                          assetEvents: current.assetEvents.filter(
                            (event) => event.id !== item.id,
                          ),
                        }))
                      }
                    >
                      <AppIcon name="Trash2" size={14} />
                    </button>
                  </div>
                ))}
            </div>
          </section>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button full-width" type="submit">
          {t("save")}
        </button>
      </form>
    </Modal>
  );
}
