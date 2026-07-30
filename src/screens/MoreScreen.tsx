import { useRef } from "react";
import { useApp } from "../AppContext";
import {
  downloadText,
  transactionsToCsv,
} from "../data/storage";
import {
  createPortableBackup,
  restorePortableBackup,
} from "../data/portableBackup";
import { AppIcon } from "../components/AppIcon";

export function MoreScreen({
  onAddBook,
  onDebts,
  onRecurring,
  onPending,
  onInstallments,
  onSplitHistory,
  onRates,
  onSync,
  onAi,
}: {
  onAddBook: () => void;
  onDebts: () => void;
  onRecurring: () => void;
  onPending: () => void;
  onInstallments: () => void;
  onSplitHistory: () => void;
  onRates: () => void;
  onSync: () => void;
  onAi: () => void;
}) {
  const { data, setData, t } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  async function exportBackup() {
    downloadText(
      `jizhang-backup-${new Date().toISOString().slice(0, 10)}.json`,
      await createPortableBackup(data),
      "application/json",
    );
  }

  function exportCsv() {
    downloadText(
      `jizhang-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      transactionsToCsv(data),
      "text/csv;charset=utf-8",
    );
  }

  async function restore(file?: File) {
    if (!file) return;
    try {
      const restored = await restorePortableBackup(await file.text());
      setData(restored);
    } catch {
      window.alert(t("invalidBackup"));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="screen more-screen">
      <section className="ai-card">
        <div className="ai-orb">
          <AppIcon name="Sparkles" size={26} />
        </div>
        <div>
          <span className="ai-chip">{t("aiReserved")}</span>
          <h2>{t("aiAssistant")}</h2>
          <p>{t("aiDescription")}</p>
        </div>
        <button onClick={onAi}>
          <AppIcon name="Bot" size={18} />
          AI
        </button>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("financialTools")}</h2>
        </div>
        <div className="tool-grid">
          <button onClick={onDebts}>
            <span className="settings-icon orange">
              <AppIcon name="Users" size={20} />
            </span>
            <strong>{t("debts")}</strong>
          </button>
          <button onClick={onRecurring}>
            <span className="settings-icon purple">
              <AppIcon name="Repeat2" size={20} />
            </span>
            <strong>{t("recurring")}</strong>
          </button>
          <button onClick={onPending}>
            <span className="settings-icon green">
              <AppIcon name="Check" size={20} />
            </span>
            <strong>{t("pendingEntries")}</strong>
            {(data.pendingEntries.some((entry) => entry.status === "pending") ||
              data.smartDrafts.some(
                (draft) =>
                  draft.bookId === data.settings.activeBookId &&
                  draft.status === "pending",
              )) && (
              <i>
                {
                  data.pendingEntries.filter(
                    (entry) =>
                      entry.bookId === data.settings.activeBookId &&
                      entry.status === "pending",
                  ).length +
                    data.smartDrafts.filter(
                      (draft) =>
                        draft.bookId === data.settings.activeBookId &&
                        draft.status === "pending",
                    ).length
                }
              </i>
            )}
          </button>
          <button onClick={onInstallments}>
            <span className="settings-icon blue">
              <AppIcon name="CreditCard" size={20} />
            </span>
            <strong>{t("installment")}</strong>
          </button>
          <button onClick={onSplitHistory}>
            <span className="settings-icon orange">
              <AppIcon name="ArrowLeftRight" size={20} />
            </span>
            <strong>{t("splitHistory")}</strong>
          </button>
          <button onClick={onRates}>
            <span className="settings-icon green">
              <AppIcon name="BadgeDollarSign" size={20} />
            </span>
            <strong>{t("exchangeRates")}</strong>
          </button>
          <button onClick={onSync}>
            <span className="settings-icon blue">
              <AppIcon name="CloudUpload" size={20} />
            </span>
            <strong>{t("cloudSync")}</strong>
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("books")}</h2>
          <button className="text-button" onClick={onAddBook}>
            <AppIcon name="Plus" size={16} />
            {t("addBook")}
          </button>
        </div>
        <div className="book-grid">
          {data.books.map((book) => {
            const active = data.settings.activeBookId === book.id;
            return (
              <button
                key={book.id}
                className={active ? "active" : ""}
                onClick={() =>
                  setData((current) => ({
                    ...current,
                    settings: { ...current.settings, activeBookId: book.id },
                  }))
                }
              >
                <span style={{ backgroundColor: book.color }}>
                  <AppIcon name="BookOpen" size={19} />
                </span>
                <strong>{book.name}</strong>
                {active && <i />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>{t("backup")}</h2>
        </div>
        <div className="settings-card">
          <button onClick={exportBackup}>
            <span className="settings-icon purple">
              <AppIcon name="FileDown" size={20} />
            </span>
            <strong>{t("exportBackup")}</strong>
            <AppIcon name="ChevronRight" size={18} />
          </button>
          <button onClick={exportCsv}>
            <span className="settings-icon green">
              <AppIcon name="ChartNoAxesCombined" size={20} />
            </span>
            <strong>{t("exportCsv")}</strong>
            <AppIcon name="ChevronRight" size={18} />
          </button>
          <button onClick={() => fileRef.current?.click()}>
            <span className="settings-icon orange">
              <AppIcon name="RotateCcw" size={20} />
            </span>
            <strong>{t("restoreBackup")}</strong>
            <AppIcon name="ChevronRight" size={18} />
          </button>
          <input
            ref={fileRef}
            className="hidden-input"
            type="file"
            accept=".json,application/json"
            onChange={(event) => restore(event.target.files?.[0])}
          />
        </div>
      </section>

      <section className="section">
        <div className="settings-card">
          <div className="settings-info">
            <span className="settings-icon orange">
              <AppIcon name="ScanLine" size={20} />
            </span>
            <div>
              <strong>{t("receiptShortcut")}</strong>
              <small>{t("receiptShortcutDetail")}</small>
            </div>
          </div>
          <label className="settings-number">
            <span>{t("warrantyReminder")}</span>
            <input
              type="number"
              min="1"
              max="365"
              value={data.settings.warrantyReminderDays}
              onChange={(event) =>
                setData((current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    warrantyReminderDays: Math.max(
                      1,
                      Math.min(365, Number(event.target.value || 30)),
                    ),
                  },
                }))
              }
            />
          </label>
        </div>
      </section>

      <section className="section">
        <div className="settings-card">
          <button
            onClick={() =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  language:
                    current.settings.language === "zh" ? "en" : "zh",
                },
              }))
            }
          >
            <span className="settings-icon blue">
              <AppIcon name="Languages" size={20} />
            </span>
            <strong>{t("language")}</strong>
            <span className="setting-value">
              {data.settings.language === "zh" ? "中文" : "English"}
            </span>
          </button>
          <button
            onClick={() =>
              setData((current) => ({
                ...current,
                settings: {
                  ...current.settings,
                  theme: current.settings.theme === "light" ? "dark" : "light",
                },
              }))
            }
          >
            <span className="settings-icon purple">
              <AppIcon name="Moon" size={20} />
            </span>
            <strong>{t("darkMode")}</strong>
            <span
              className={`toggle ${
                data.settings.theme === "dark" ? "active" : ""
              }`}
            >
              <i />
            </span>
          </button>
          <div className="settings-info">
            <span className="settings-icon green">
              <AppIcon name="LockKeyhole" size={20} />
            </span>
            <div>
              <strong>{t("privacy")}</strong>
              <small>{t("privacyDetail")}</small>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
