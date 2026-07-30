import type { Category, TransactionType } from "../types";

export interface ParsedTransactionDraft {
  type: TransactionType;
  amount: number;
  categoryId?: string;
  note: string;
  date?: string;
}

export interface SpendingInsight {
  title: string;
  message: string;
  severity: "info" | "warning" | "positive";
}

export interface AiProvider {
  readonly enabled: boolean;
  categorize(note: string, categories: Category[]): Promise<string | null>;
  parseNaturalLanguage(input: string): Promise<ParsedTransactionDraft | null>;
  analyze(localSummary: string): Promise<SpendingInsight[]>;
}

/**
 * Safe default for the fully-offline release.
 * A future on-device model or opt-in API provider can implement the same contract.
 */
export class OfflineAiPlaceholder implements AiProvider {
  readonly enabled = false;

  async categorize(): Promise<null> {
    return null;
  }

  async parseNaturalLanguage(): Promise<null> {
    return null;
  }

  async analyze(): Promise<SpendingInsight[]> {
    return [];
  }
}
