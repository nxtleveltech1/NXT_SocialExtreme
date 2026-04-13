import { BUILT_IN_AI_PROVIDERS } from "@/lib/ai/catalog";
import type { AIProviderAdapter } from "@/lib/ai/providers/base";
import type { AIMediaResult, AITextResult, NormalizedUsage, ProviderResolvedConfig } from "@/lib/ai/types";

function krevUrl(config: ProviderResolvedConfig, endpointKey: "textEndpoint" | "imageEndpoint" | "videoEndpoint", fallback: string) {
  const endpoint = String(config.settings?.[endpointKey] || "").trim();
  if (endpoint) {
    if (endpoint.startsWith("http")) return endpoint;
    return `${config.baseUrl || "https://api.krev.ai"}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }
  return `${config.baseUrl || "https://api.krev.ai"}${fallback}`;
}

function estimate(config: ProviderResolvedConfig, usage: NormalizedUsage, model?: string) {
  const catalog = BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === "krev");
  const pricing = catalog?.models.find((entry) => entry.modelId === (model || config.defaultModel || "creative-agent"))?.pricing;
  if (!pricing) return usage.estimatedCostMicros;
  return Math.ceil((usage.inputTokens / 1000) * (pricing.inputMicrosPer1k || 0)) +
    Math.ceil((usage.outputTokens / 1000) * (pricing.outputMicrosPer1k || 0)) +
    usage.imageCount * (pricing.imageMicrosPerUnit || 0) +
    usage.videoSeconds * (pricing.videoMicrosPerSecond || 0);
}

async function krevRequest(config: ProviderResolvedConfig, endpointUrl: string, body: Record<string, unknown>) {
  if (!config.apiKey) throw new Error(`No API key configured for ${config.displayName}`);

  const response = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Krev request failed with status ${response.status}`);
  }

  return response.json();
}

export const krevAdapter: AIProviderAdapter = {
  slug: "krev",
  capabilities: { text: true, structured: false, image: true, video: true, streaming: false },
  async validateCredentials(config) {
    try {
      const healthUrl = `${config.baseUrl || "https://api.krev.ai"}/health`;
      const response = await fetch(healthUrl, {
        headers: config.apiKey ? { authorization: `Bearer ${config.apiKey}` } : undefined,
      });
      if (response.ok) {
        return { ok: true, message: "Connected successfully." };
      }
    } catch {
      // Fall back to a lightweight text request.
    }

    try {
      await krevRequest(config, krevUrl(config, "textEndpoint", "/v1/text"), {
        model: config.defaultModel || "creative-agent",
        prompt: "Reply with OK",
      });
      return { ok: true, message: "Connected successfully." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  },
  async listModels() {
    return BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === "krev")?.models.map((model) => model.modelId) || ["creative-agent"];
  },
  async generateText(config, request): Promise<AITextResult> {
    const model = request.model || config.defaultModel || "creative-agent";
    const payload = await krevRequest(config, krevUrl(config, "textEndpoint", "/v1/text"), {
      model,
      prompt: request.prompt,
      systemPrompt: request.systemPrompt,
      options: request.options,
    });
    const usage: NormalizedUsage = {
      inputTokens: Number(payload?.usage?.inputTokens ?? 0),
      outputTokens: Number(payload?.usage?.outputTokens ?? 0),
      imageCount: 0,
      videoSeconds: 0,
      estimatedCostMicros: 0,
      actualCostMicros: null,
      currency: "USD",
    };
    usage.estimatedCostMicros = estimate(config, usage, model);
    return {
      text: payload?.text || payload?.content || "",
      providerId: config.id,
      providerSlug: "krev",
      model,
      usage,
      raw: payload,
    };
  },
  async generateStructured() {
    throw new Error("Structured JSON mode is not supported by the Krev adapter.");
  },
  async generateImage(config, request): Promise<AIMediaResult> {
    const model = request.model || config.defaultModel || "creative-agent";
    const payload = await krevRequest(config, krevUrl(config, "imageEndpoint", "/v1/images"), {
      model,
      prompt: request.prompt,
      inputImageUrl: request.inputImageUrl,
      options: request.options,
    });
    const usage: NormalizedUsage = {
      inputTokens: Number(payload?.usage?.inputTokens ?? 0),
      outputTokens: Number(payload?.usage?.outputTokens ?? 0),
      imageCount: 1,
      videoSeconds: 0,
      estimatedCostMicros: 0,
      actualCostMicros: null,
      currency: "USD",
    };
    usage.estimatedCostMicros = estimate(config, usage, model);
    return {
      providerId: config.id,
      providerSlug: "krev",
      model,
      url: payload?.url || payload?.assetUrl,
      b64Json: payload?.b64Json,
      mimeType: payload?.mimeType || "image/png",
      usage,
      raw: payload,
    };
  },
  async generateVideo(config, request): Promise<AIMediaResult> {
    const model = request.model || config.defaultModel || "creative-agent";
    const payload = await krevRequest(config, krevUrl(config, "videoEndpoint", "/v1/videos"), {
      model,
      prompt: request.prompt,
      inputImageUrl: request.inputImageUrl,
      options: request.options,
    });
    const usage: NormalizedUsage = {
      inputTokens: Number(payload?.usage?.inputTokens ?? 0),
      outputTokens: Number(payload?.usage?.outputTokens ?? 0),
      imageCount: 0,
      videoSeconds: Number(payload?.usage?.videoSeconds ?? payload?.durationSeconds ?? 5),
      estimatedCostMicros: 0,
      actualCostMicros: null,
      currency: "USD",
    };
    usage.estimatedCostMicros = estimate(config, usage, model);
    return {
      providerId: config.id,
      providerSlug: "krev",
      model,
      url: payload?.url || payload?.assetUrl,
      mimeType: payload?.mimeType || "video/mp4",
      usage,
      raw: payload,
    };
  },
  estimateCost(usage, config, model) {
    return estimate(config, usage, model);
  },
  normalizeUsage(rawUsage, requestType) {
    const usage = (rawUsage || {}) as {
      inputTokens?: number;
      outputTokens?: number;
      videoSeconds?: number;
    };
    return {
      inputTokens: Number(usage.inputTokens ?? 0),
      outputTokens: Number(usage.outputTokens ?? 0),
      imageCount: requestType === "image" ? 1 : 0,
      videoSeconds: requestType === "video" ? Number(usage.videoSeconds ?? 5) : 0,
      estimatedCostMicros: 0,
      actualCostMicros: null,
      currency: "USD",
    };
  },
};
