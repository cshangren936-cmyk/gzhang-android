import { CapacitorHttp } from "@capacitor/core";
import type { AiSettings } from "../types";

function completionUrl(endpoint: string): string {
  const trimmed = endpoint.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions")
    ? trimmed
    : `${trimmed}/chat/completions`;
}

export async function askConfiguredAi(
  settings: AiSettings,
  prompt: string,
  localSummary: string,
): Promise<string> {
  if (!settings.enabled || !settings.endpoint || !settings.model) {
    throw new Error("AI_NOT_CONFIGURED");
  }
  const response = await CapacitorHttp.request({
    method: "POST",
    url: completionUrl(settings.endpoint),
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey
        ? { Authorization: `Bearer ${settings.apiKey}` }
        : {}),
    },
    data: {
      model: settings.model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a concise personal bookkeeping assistant. Never invent transactions. Explain trends and give practical, non-judgmental suggestions.",
        },
        {
          role: "user",
          content: `${prompt}\n\nLocal bookkeeping summary:\n${localSummary}`,
        },
      ],
    },
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`AI_HTTP_${response.status}`);
  }
  const content = (
    response.data as {
      choices?: Array<{ message?: { content?: string } }>;
    }
  ).choices?.[0]?.message?.content;
  if (!content) throw new Error("AI_EMPTY_RESPONSE");
  return content;
}

