import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppData } from "./types";
import { loadData, saveData } from "./data/storage";
import { localDate } from "./core/date";
import { refreshSchedules } from "./core/schedules";
import { fetchLatestRates, isRateCacheStale } from "./core/exchange";
import { createTranslator, type MessageKey } from "./i18n";
import { syncNativeReminders } from "./native/reminders";
import { migrateInlineAttachments } from "./data/attachments";

interface AppContextValue {
  data: AppData;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  t: (key: MessageKey) => string;
  activeBookId: string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() =>
    refreshSchedules(loadData(), localDate()),
  );
  const attachmentMigrationStarted = useRef(false);

  useEffect(() => {
    if (attachmentMigrationStarted.current) return;
    attachmentMigrationStarted.current = true;
    migrateInlineAttachments(data)
      .then((migrated) => {
        if (migrated) setData(migrated);
      })
      .catch(() => undefined);
  }, [data]);

  useEffect(() => {
    saveData(data);
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.lang = data.settings.language;
  }, [data]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      syncNativeReminders(data).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [data]);

  useEffect(() => {
    if (
      !navigator.onLine ||
      !isRateCacheStale(data.exchangeRates, data.settings.currency)
    ) {
      return;
    }
    let cancelled = false;
    fetchLatestRates(data.settings.currency)
      .then((exchangeRates) => {
        if (!cancelled) {
          setData((current) => ({ ...current, exchangeRates }));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [data.exchangeRates, data.settings.currency]);

  const translator = useMemo(
    () => createTranslator(data.settings.language),
    [data.settings.language],
  );
  const t = useCallback(
    (key: MessageKey) => translator(key),
    [translator],
  );

  const value = useMemo(
    () => ({
      data,
      setData,
      t,
      activeBookId: data.settings.activeBookId,
    }),
    [data, t],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
