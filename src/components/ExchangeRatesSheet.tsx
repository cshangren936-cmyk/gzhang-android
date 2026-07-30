import { useState } from "react";
import { useApp } from "../AppContext";
import {
  fetchLatestRates,
  SUPPORTED_CURRENCIES,
} from "../core/exchange";
import { AppIcon } from "./AppIcon";
import { Modal } from "./Modal";

export function ExchangeRatesSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t } = useApp();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh(base = data.settings.currency) {
    setBusy(true);
    setMessage("");
    try {
      const exchangeRates = await fetchLatestRates(base);
      setData((current) => ({
        ...current,
        settings: { ...current.settings, currency: base },
        exchangeRates,
      }));
      setMessage(t("ratesUpdated"));
    } catch {
      setMessage(t("offlineRatesUsed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={t("exchangeRates")} onClose={onClose} className="rates-sheet">
      <label className="field">
        <span>{t("baseCurrency")}</span>
        <select
          value={data.settings.currency}
          onChange={(event) => refresh(event.target.value)}
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>
      <div className="rate-status">
        <div>
          <strong>{data.exchangeRates?.date ?? "—"}</strong>
          <span>
            {data.exchangeRates
              ? `${t("lastUpdated")} ${new Date(
                  data.exchangeRates.fetchedAt,
                ).toLocaleString()}`
              : t("noRateCache")}
          </span>
        </div>
        <button disabled={busy} onClick={() => refresh()}>
          <AppIcon name="RefreshCw" size={16} />
          {busy ? t("updating") : t("updateRates")}
        </button>
      </div>
      {message && <p className="settings-message">{message}</p>}
      <div className="rate-list">
        {SUPPORTED_CURRENCIES.filter(
          (currency) => currency !== data.exchangeRates?.base,
        ).map((currency) => (
          <div key={currency}>
            <span>1 {data.exchangeRates?.base ?? data.settings.currency}</span>
            <strong>
              {data.exchangeRates?.rates[currency]?.toFixed(6) ?? "—"}{" "}
              {currency}
            </strong>
          </div>
        ))}
      </div>
      <small>{t("rateSource")}</small>
    </Modal>
  );
}

