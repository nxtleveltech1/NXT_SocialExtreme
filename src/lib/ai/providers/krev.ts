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

const KREV_TIMEOUT_MS = 90_000; // Krev media generation can be slow
const KREV_PROBE_TIMEOUT_MS = 8_000;

/** Patterns that indicate endpoint misconfiguration rather than a transient failure */
const ENDPOINT_MISCONFIGURATION_PATTERNS = [
  "DEPLOYMENT_NOT_FOUND",
  "NOT_FOUND",
  "DNS_PROBE_FINISHED",
  "ENOTFOUND",
  "getaddrinfo",
  "certificate",
  "SSL",
] as const;

function isEndpointMisconfigured(text: string): boolean {
  const upper = text.toUpperCase();
  return ENDPOINT_MISCONFIGURATION_PATTERNS.some((p) => upper.includes(p.toUpperCase()));
}

async function probeKrevEndpoint(endpointUrl: string, apiKey: string): Promise<{ ok: boolean; message?: string; warning?: boolean }> {
  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "GET",
      headers: {
        authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(KREV_PROBE_TIMEOUT_MS),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (isEndpointMisconfigured(msg)) {
      return {
        ok: false,
        message: `Endpoint "${endpointUrl}" is unreachable or misconfigured (${msg}).`,
      };
    }
    return {
      ok: false,
      message: `Could not reach endpoint "${endpointUrl}" (${msg}).`,
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      message: `Krev API key was rejected for endpoint "${endpointUrl}" (status ${response.status}).`,
    };
  }

  if (response.status === 404) {
    let body = "";
    try { body = await response.text(); } catch { /* ignore */ }
    return {
      ok: false,
      message: `Endpoint "${endpointUrl}" returned 404 (deployment not found). ${body.slice(0, 180)}`,
    };
  }

  // 2xx is healthy. 4xx/5xx other than auth/404 still prove the deployment exists.
  if (!response.ok) {
    return {
      ok: true,
      warning: true,
      message: `Endpoint "${endpointUrl}" exists but returned status ${response.status}.`,
    };
  }

  return { ok: true };
}

async function krevRequest(config: ProviderResolvedConfig, endpointUrl: string, body: Record<string, unknown>) {
  if (!config.apiKey) throw new Error(`No API key configured for ${config.displayName}`);

  let response: Response;
  try {
    response = await fetch(endpointUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(KREV_TIMEOUT_MS),
    });
  } catch (fetchError) {
    const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    if (isEndpointMisconfigured(msg)) {
      throw new Error(
        `Krev endpoint unreachable: "${endpointUrl}" — the URL appears to be misconfigured. ` +
        `Update the Krev base URL or custom endpoint in Settings → AI Providers. (${msg})`
      );
    }
    throw fetchError;
  }

  if (!response.ok) {
    let errorBody = "";
    try { errorBody = await response.text(); } catch { /* ignore */ }

    // Detect endpoint misconfiguration vs. transient/auth errors
    if (isEndpointMisconfigured(errorBody) || response.status === 404) {
      throw new Error(
        `Krev endpoint not found (${response.status}): "${endpointUrl}" — ` +
        `the deployment or URL no longer exists. Update the Krev base URL or custom endpoints in Settings → AI Providers. ` +
        `${errorBody.slice(0, 200)}`
      );
    }

    const detail = errorBody ? ` — ${errorBody.slice(0, 300)}` : "";
    throw new Error(`Krev request failed with status ${response.status}${detail}`);
  }

  return response.json();
}

export const krevAdapter: AIProviderAdapter = {
  slug: "krev",
  capabilities: { text: true, structured: false, image: true, video: true, streaming: false },
  async validateCredentials(config) {
    if (!config.apiKey) {
      return { ok: false, message: "No API key configured for Krev AI." };
    }
    const imageEndpoint = krevUrl(config, "imageEndpoint", "/v1/images");
    const textEndpoint = krevUrl(config, "textEndpoint", "/v1/text");
    const videoEndpoint = krevUrl(config, "videoEndpoint", "/v1/videos");

    // Image endpoint is mandatory for current studio.media.image usage.
    const imageProbe = await probeKrevEndpoint(imageEndpoint, config.apiKey);
    if (!imageProbe.ok) {
      return {
        ok: false,
        message: `Krev image endpoint validation failed: ${imageProbe.message}`,
      };
    }

    const warnings: string[] = [];
    const textProbe = await probeKrevEndpoint(textEndpoint, config.apiKey);
    if (!textProbe.ok) warnings.push(`Text endpoint issue: ${textProbe.message}`);
    else if (textProbe.warning && textProbe.message) warnings.push(textProbe.message);

    const videoProbe = await probeKrevEndpoint(videoEndpoint, config.apiKey);
    if (!videoProbe.ok) warnings.push(`Video endpoint issue: ${videoProbe.message}`);
    else if (videoProbe.warning && videoProbe.message) warnings.push(videoProbe.message);

    if (warnings.length > 0) {
      return {
        ok: true,
        message: `Krev image endpoint is valid. ${warnings.join(" ")}`,
      };
    }

    return { ok: true, message: "Connected to Krev AI. Required endpoints are reachable." };
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
