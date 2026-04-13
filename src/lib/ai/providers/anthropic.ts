import { BUILT_IN_AI_PROVIDERS } from "@/lib/ai/catalog";
import type { AIProviderAdapter } from "@/lib/ai/providers/base";
import type { AITextRequest, AITextResult, NormalizedUsage, ProviderResolvedConfig } from "@/lib/ai/types";

function getDefaultModel(config: ProviderResolvedConfig) {
  return config.defaultModel || "claude-3-5-haiku-latest";
}

function estimate(config: ProviderResolvedConfig, usage: NormalizedUsage, model?: string) {
  const catalog = BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === "anthropic");
  const pricing = catalog?.models.find((entry) => entry.modelId === (model || getDefaultModel(config)))?.pricing;
  if (!pricing) return usage.estimatedCostMicros;
  return Math.ceil((usage.inputTokens / 1000) * (pricing.inputMicrosPer1k || 0)) +
    Math.ceil((usage.outputTokens / 1000) * (pricing.outputMicrosPer1k || 0));
}

async function callAnthropic(config: ProviderResolvedConfig, request: AITextRequest, forceJson = false) {
  if (!config.apiKey) throw new Error(`No API key configured for ${config.displayName}`);

  const model = request.model || getDefaultModel(config);
  const response = await fetch(`${config.baseUrl || "https://api.anthropic.com/v1"}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: Number(request.options?.max_tokens || 800),
      system: forceJson
        ? `${request.systemPrompt || ""}\nReturn only valid JSON.`.trim()
        : request.systemPrompt,
      messages: [{ role: "user", content: request.prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const text = Array.isArray(payload?.content)
    ? payload.content
        .filter((block: { type?: string }) => block.type === "text")
        .map((block: { text?: string }) => block.text)
        .join("\n")
    : "";
  const usage: NormalizedUsage = {
    inputTokens: Number(payload?.usage?.input_tokens ?? 0),
    outputTokens: Number(payload?.usage?.output_tokens ?? 0),
    imageCount: 0,
    videoSeconds: 0,
    estimatedCostMicros: 0,
    actualCostMicros: null,
    currency: "USD",
  };
  usage.estimatedCostMicros = estimate(config, usage, model);
  return { payload, model, text, usage };
}

export const anthropicAdapter: AIProviderAdapter = {
  slug: "anthropic",
  capabilities: { text: true, structured: true, image: false, video: false, streaming: true },
  async validateCredentials(config) {
    try {
      await callAnthropic(config, { routeKey: "studio.copy", prompt: "Reply with OK" });
      return { ok: true, message: "Connected successfully." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  },
  async listModels() {
    return BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === "anthropic")?.models.map((model) => model.modelId) || [];
  },
  async generateText(config, request): Promise<AITextResult> {
    const { payload, model, text, usage } = await callAnthropic(config, request);
    return {
      text,
      providerId: config.id,
      providerSlug: "anthropic",
      model,
      usage,
      raw: payload,
    };
  },
  async generateStructured<T = Record<string, unknown>>(config: ProviderResolvedConfig, request: AITextRequest) {
    const { payload, model, text, usage } = await callAnthropic(config, request, true);
    return {
      text,
      object: JSON.parse(text || "{}") as T,
      providerId: config.id,
      providerSlug: "anthropic",
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
      input_tokens?: number;
      output_tokens?: number;
    };
    return {
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      imageCount: 0,
      videoSeconds: 0,
      estimatedCostMicros: 0,
      actualCostMicros: null,
      currency: "USD",
    };
  },
};
