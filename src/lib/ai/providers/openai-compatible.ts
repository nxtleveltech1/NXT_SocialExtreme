import OpenAI from "openai";
import { BUILT_IN_AI_PROVIDERS } from "@/lib/ai/catalog";
import type { AIMediaResult, AITextRequest, AITextResult, NormalizedUsage, ProviderResolvedConfig } from "@/lib/ai/types";
import type { AIProviderAdapter } from "@/lib/ai/providers/base";

function getProviderCatalog(slug: ProviderResolvedConfig["slug"]) {
  return BUILT_IN_AI_PROVIDERS.find((provider) => provider.slug === slug);
}

const OPENAI_TIMEOUT_MS = 60_000;

function getClient(config: ProviderResolvedConfig) {
  if (!config.apiKey) {
    throw new Error(`No API key configured for ${config.displayName}`);
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl || undefined,
    timeout: OPENAI_TIMEOUT_MS,
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "NXT Social Extreme",
    },
  });
}

function usageFromCompletion(rawUsage: unknown): NormalizedUsage {
  const usage = (rawUsage || {}) as {
    prompt_tokens?: number;
    input_tokens?: number;
    completion_tokens?: number;
    output_tokens?: number;
  };
  return {
    inputTokens: Number(usage.prompt_tokens ?? usage.input_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? usage.output_tokens ?? 0),
    imageCount: 0,
    videoSeconds: 0,
    estimatedCostMicros: 0,
    actualCostMicros: null,
    currency: "USD",
  };
}

function estimateFromCatalog(config: ProviderResolvedConfig, usage: NormalizedUsage, model?: string): number {
  const catalog = getProviderCatalog(config.slug);
  const modelCatalog = catalog?.models.find((entry) => entry.modelId === (model || config.defaultModel || ""));
  const pricing = modelCatalog?.pricing;
  if (!pricing) return usage.estimatedCostMicros;

  const inputMicros = pricing.inputMicrosPer1k
    ? Math.ceil((usage.inputTokens / 1000) * pricing.inputMicrosPer1k)
    : 0;
  const outputMicros = pricing.outputMicrosPer1k
    ? Math.ceil((usage.outputTokens / 1000) * pricing.outputMicrosPer1k)
    : 0;
  const imageMicros = pricing.imageMicrosPerUnit
    ? usage.imageCount * pricing.imageMicrosPerUnit
    : 0;
  const videoMicros = pricing.videoMicrosPerSecond
    ? usage.videoSeconds * pricing.videoMicrosPerSecond
    : 0;

  return inputMicros + outputMicros + imageMicros + videoMicros;
}

async function generateTextBase(config: ProviderResolvedConfig, request: AITextRequest) {
  const client = getClient(config);
  const model = request.model || config.defaultModel || "gpt-4.1-mini";
  const completion = await client.chat.completions.create({
    model,
    messages: [
      ...(request.systemPrompt ? [{ role: "system" as const, content: request.systemPrompt }] : []),
      { role: "user" as const, content: request.prompt },
    ],
    response_format: request.options?.response_format as { type: "json_object" } | undefined,
  });

  const text = completion.choices[0]?.message?.content || "";
  const usage = usageFromCompletion(completion.usage);
  usage.estimatedCostMicros = estimateFromCatalog(config, usage, model);

  return { completion, model, text, usage };
}

export function createOpenAICompatibleAdapter(
  slug: ProviderResolvedConfig["slug"],
  capabilities = getProviderCatalog(slug)?.capabilities
): AIProviderAdapter {
  return {
    slug,
    capabilities: capabilities || { text: true, structured: true, image: false, video: false, streaming: true },
    async validateCredentials(config) {
      try {
        const client = getClient(config);
        await client.models.list();
        return { ok: true, message: "Connected successfully." };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : "Connection test failed",
        };
      }
    },
    async listModels(config) {
      if (!config.apiKey) return [];
      try {
        const client = getClient(config);
        const response = await client.models.list();
        return response.data.map((model) => model.id);
      } catch {
        return getProviderCatalog(config.slug)?.models.map((model) => model.modelId) || [];
      }
    },
    async generateText(config, request): Promise<AITextResult> {
      const { completion, model, text, usage } = await generateTextBase(config, request);
      return {
        text,
        providerId: config.id,
        providerSlug: config.slug,
        model,
        usage,
        raw: completion,
      };
    },
    async generateStructured<T = Record<string, unknown>>(config: ProviderResolvedConfig, request: AITextRequest) {
      const nextRequest: AITextRequest = {
        ...request,
        options: {
          ...request.options,
          response_format: { type: "json_object" },
        },
      };
      const { completion, model, text, usage } = await generateTextBase(config, nextRequest);
      let object: T;
      try {
        object = JSON.parse(text || "{}") as T;
      } catch (parseError) {
        console.error(
          `[AI:openai-compatible] Failed to parse structured JSON from model "${model}". Raw text (first 500 chars):`,
          (text || "").slice(0, 500)
        );
        throw new Error(
          `AI provider "${config.displayName}" returned malformed JSON. Model: ${model}. ` +
          `Parse error: ${parseError instanceof Error ? parseError.message : "unknown"}`
        );
      }
      return {
        text,
        object,
        providerId: config.id,
        providerSlug: config.slug,
        model,
        usage,
        raw: completion,
      };
    },
    async *streamText(config, request) {
      const client = getClient(config);
      const model = request.model || config.defaultModel || "gpt-4.1-mini";
      const stream = await client.chat.completions.create({
        model,
        messages: [
          ...(request.systemPrompt ? [{ role: "system" as const, content: request.systemPrompt }] : []),
          { role: "user" as const, content: request.prompt },
        ],
        stream: true,
      });

      for await (const part of stream) {
        const delta = part.choices[0]?.delta?.content;
        if (delta) yield delta;
      }
    },
    async generateImage(config, request): Promise<AIMediaResult> {
      const client = getClient(config);
      const model = request.model || config.defaultModel || "gpt-image-1";
      const response = await client.images.generate({
        model,
        prompt: request.prompt,
        size: String(request.options?.size || "1024x1024"),
      } as never);
      const image = response.data?.[0] as { url?: string; b64_json?: string } | undefined;
      const usage = this.normalizeUsage(null, "image");
      usage.imageCount = 1;
      usage.estimatedCostMicros = estimateFromCatalog(config, usage, model);
      return {
        providerId: config.id,
        providerSlug: config.slug,
        model,
        url: image?.url,
        b64Json: image?.b64_json,
        mimeType: "image/png",
        usage,
        raw: response,
      };
    },
    async generateVideo() {
      throw new Error("Video generation is not supported by this adapter.");
    },
    estimateCost(usage, config, model) {
      return estimateFromCatalog(config, usage, model);
    },
    normalizeUsage(rawUsage, requestType) {
      if (requestType === "image") {
        return {
          inputTokens: 0,
          outputTokens: 0,
          imageCount: 1,
          videoSeconds: 0,
          estimatedCostMicros: 0,
          actualCostMicros: null,
          currency: "USD",
        };
      }

      return usageFromCompletion(rawUsage);
    },
  };
}
