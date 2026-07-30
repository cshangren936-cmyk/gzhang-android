import { useMemo, useState } from "react";
import { useApp } from "../AppContext";
import { askConfiguredAi } from "../ai/openAiCompatible";
import { currentMonth } from "../core/date";
import { Modal } from "./Modal";

export function AiAssistantSheet({ onClose }: { onClose: () => void }) {
  const { data, setData, t, activeBookId } = useApp();
  const [prompt, setPrompt] = useState(t("aiDefaultPrompt"));
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const month = currentMonth();
  const localSummary = useMemo(() => {
    const transactions = data.transactions.filter(
      (item) => item.bookId === activeBookId && item.date.startsWith(month),
    );
    const expense = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const categoryTotals = data.categories
      .map((category) => ({
        name:
          data.settings.language === "zh" ? category.zh : category.en,
        amount: transactions
          .filter(
            (item) =>
              item.type === "expense" && item.categoryId === category.id,
          )
          .reduce((sum, item) => sum + item.amount, 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
    return JSON.stringify({
      month,
      baseCurrency: data.settings.currency,
      income,
      expense,
      transactionCount: transactions.length,
      topExpenseCategories: categoryTotals,
    });
  }, [
    activeBookId,
    data.categories,
    data.settings.currency,
    data.settings.language,
    data.transactions,
    month,
  ]);

  function patch(patchValue: Partial<typeof data.aiSettings>) {
    setData((current) => ({
      ...current,
      aiSettings: { ...current.aiSettings, ...patchValue },
    }));
  }

  async function ask() {
    setBusy(true);
    setAnswer("");
    try {
      setAnswer(await askConfiguredAi(data.aiSettings, prompt, localSummary));
    } catch {
      setAnswer(t("aiRequestFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={t("aiAssistant")} onClose={onClose} className="ai-sheet">
      <p className="privacy-note">{t("aiPrivacy")}</p>
      <label className="toggle-row">
        <span>{t("enableAi")}</span>
        <input
          type="checkbox"
          checked={data.aiSettings.enabled}
          onChange={(event) => patch({ enabled: event.target.checked })}
        />
      </label>
      <label className="field">
        <span>{t("aiEndpoint")}</span>
        <input
          value={data.aiSettings.endpoint}
          placeholder="https://.../v1"
          onChange={(event) => patch({ endpoint: event.target.value })}
        />
      </label>
      <div className="two-column">
        <label className="field">
          <span>{t("aiModel")}</span>
          <input
            value={data.aiSettings.model}
            onChange={(event) => patch({ model: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{t("apiKey")}</span>
          <input
            type="password"
            value={data.aiSettings.apiKey}
            onChange={(event) => patch({ apiKey: event.target.value })}
          />
        </label>
      </div>
      <label className="field">
        <span>{t("askAi")}</span>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      </label>
      <button
        className="primary-button full-width"
        disabled={
          busy ||
          !data.aiSettings.enabled ||
          !data.aiSettings.endpoint ||
          !data.aiSettings.model
        }
        onClick={ask}
      >
        {busy ? t("thinking") : t("analyzeNow")}
      </button>
      {answer && <div className="ai-answer">{answer}</div>}
    </Modal>
  );
}
