import type {
  AIMediaRequest,
  AIMediaResult,
  AITextRequest,
  AITextResult,
  AICapabilities,
  NormalizedUsage,
  ProviderResolvedConfig,
} from "@/lib/ai/types";

export type AIProviderAdapter = {
  slug: string;
  capabilities: AICapabilities;
  validateCredentials(config: ProviderResolvedConfig): Promise<{ ok: boolean; message?: string }>;
  listModels(config: ProviderResolvedConfig): Promise<string[]>;
  generateText(config: ProviderResolvedConfig, request: AITextRequest): Promise<AITextResult>;
  generateStructured<T = Record<string, unknown>>(
    config: ProviderResolvedConfig,
    request: AITextRequest
  ): Promise<AITextResult & { object: T }>;
  streamText?(
    config: ProviderResolvedConfig,
    request: AITextRequest
  ): AsyncGenerator<string, void, unknown>;
  generateImage?(config: ProviderResolvedConfig, request: AIMediaRequest): Promise<AIMediaResult>;
  generateVideo?(config: ProviderResolvedConfig, request: AIMediaRequest): Promise<AIMediaResult>;
  estimateCost(usage: NormalizedUsage, config: ProviderResolvedConfig, model?: string): number;
  normalizeUsage(rawUsage: unknown, requestType: "text" | "structured" | "image" | "video"): NormalizedUsage;
};
