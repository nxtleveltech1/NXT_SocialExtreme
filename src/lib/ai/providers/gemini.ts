import { BUILT_IN_AI_PROVIDERS } from "@/lib/ai/catalog";
import type { AIProviderAdapter } from "@/lib/ai/providers/base";
import type { AITextRequest, AITextResult, NormalizedUsage, ProviderResolvedConfig } from "@/lib/ai/types";

function defaultModel(config: ProviderResolvedConfig) {
  return config.defaultModel || "gemini-2.0-flash";
}

function estimate(config: ProviderResolvedConfig, usage: NormalizedUsage, model?: string) {
  const catalog = BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === "gemini");
  const pricing = catalog?.models.find((entry) => entry.modelId === (model || defaultModel(config)))?.pricing;
  if (!pricing) return usage.estimatedCostMicros;
  return Math.ceil((usage.inputTokens / 1000) * (pricing.inputMicrosPer1k || 0)) +
    Math.ceil((usage.outputTokens / 1000) * (pricing.outputMicrosPer1k || 0));
}

const GEMINI_TIMEOUT_MS = 60_000;

async function callGemini(config: ProviderResolvedConfig, request: AITextRequest, forceJson = false) {
  if (!config.apiKey) throw new Error(`No API key configured for ${config.displayName}`);

  const model = request.model || defaultModel(config);
  const url = `${config.baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${model}:generateContent?key=${config.apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: request.systemPrompt
        ? {
            parts: [
              {
                text: forceJson ? `${request.systemPrompt}\nReturn only valid JSON.` : request.systemPrompt,
              },
            ],
          }
        : undefined,
      contents: [
        {
          role: "user",
          parts: [{ text: request.prompt }],
        },
      ],
      generationConfig: {
        temperature: Number(request.options?.temperature ?? 0.7),
        maxOutputTokens: Number(request.options?.max_tokens ?? 800),
        responseMimeType: forceJson ? "application/json" : undefined,
      },
    }),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });

  if (!response.ok) {
    let errorBody = "";
    try { errorBody = await response.text(); } catch { /* ignore */ }
    const detail = errorBody ? ` — ${errorBody.slice(0, 300)}` : "";
    throw new Error(`Gemini request failed with status ${response.status}${detail}`);
  }

  const payload = await response.json();
  const parts = (payload?.candidates?.[0]?.content?.parts || []) as Array<{ text?: string }>;
  const text = parts.map((part) => part.text || "").join("\n");
  const usage: NormalizedUsage = {
    inputTokens: Number(payload?.usageMetadata?.promptTokenCount ?? 0),
    outputTokens: Number(payload?.usageMetadata?.candidatesTokenCount ?? 0),
    imageCount: 0,
    videoSeconds: 0,
    estimatedCostMicros: 0,
    actualCostMicros: null,
    currency: "USD",
  };
  usage.estimatedCostMicros = estimate(config, usage, model);
  return { payload, model, text, usage };
}

export const geminiAdapter: AIProviderAdapter = {
  slug: "gemini",
  capabilities: { text: true, structured: true, image: false, video: false, streaming: false },
  async validateCredentials(config) {
    try {
      await callGemini(config, { routeKey: "studio.copy", prompt: "Reply with OK" });
      return { ok: true, message: "Connected successfully." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  },
  async listModels() {
    return BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === "gemini")?.models.map((model) => model.modelId) || [];
  },
  async generateText(config, request): Promise<AITextResult> {
    const { payload, model, text, usage } = await callGemini(config, request);
    return {
      text,
      providerId: config.id,
      providerSlug: "gemini",
      model,
      usage,
      raw: payload,
    };
  },
  async generateStructured<T = Record<string, unknown>>(config: ProviderResolvedConfig, request: AITextRequest) {
    const { payload, model, text, usage } = await callGemini(config, request, true);
    let object: T;
    try {
      object = JSON.parse(text || "{}") as T;
    } catch (parseError) {
      console.error(
        `[AI:gemini] Failed to parse structured JSON from model "${model}". Raw text (first 500 chars):`,
        (text || "").slice(0, 500)
      );
      throw new Error(
        `Gemini returned malformed JSON. Model: ${model}. ` +
        `Parse error: ${parseError instanceof Error ? parseError.message : "unknown"}`
      );
    }
    return {
      text,
      object,
      providerId: config.id,
      providerSlug: "gemini",
      model,
      usage,
      raw: payload,
    };
  },
  estimateCost(usage, config, model) {
    return estimate(config, usage, model);
  },
  normalizeUsage(rawUsage) {
    const usage = (rawUsage || {}) as {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
    return {
      inputTokens: Number(usage.promptTokenCount ?? 0),
      outputTokens: Number(usage.candidatesTokenCount ?? 0),
      imageCount: 0,
      videoSeconds: 0,
      estimatedCostMicros: 0,
      actualCostMicros: null,
      currency: "USD",
    };
  },
};
