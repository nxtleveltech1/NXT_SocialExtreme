export type ProviderSlug =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "krev"
  | "generic-openai-compatible";

export type AIRouteKey =
  | "studio.copy"
  | "studio.media.image"
  | "studio.media.video"
  | "agents.content"
  | "agents.reply";

export type AIRequestType = "text" | "structured" | "image" | "video";

export type AICapabilities = {
  text: boolean;
  structured: boolean;
  image: boolean;
  video: boolean;
  streaming: boolean;
};

export type AIModelCatalogEntry = {
  modelId: string;
  displayName: string;
  capabilities: Partial<AICapabilities>;
  pricing?: {
    inputMicrosPer1k?: number;
    outputMicrosPer1k?: number;
    imageMicrosPerUnit?: number;
    videoMicrosPerSecond?: number;
  };
  metadata?: Record<string, unknown>;
};

export type BuiltInProviderCatalogEntry = {
  slug: ProviderSlug;
  displayName: string;
  adapter: string;
  description: string;
  defaultBaseUrl?: string;
  envKey?: string;
  envBaseUrlKey?: string;
  envDefaultModelKey?: string;
  settingsSchema?: Record<string, unknown>;
  capabilities: AICapabilities;
  models: AIModelCatalogEntry[];
};

export type ProviderSecretResolution = {
  apiKey?: string;
  source: "credential" | "env" | "none";
};

export type ProviderResolvedConfig = {
  id: number;
  slug: ProviderSlug;
  displayName: string;
  adapter: string;
  baseUrl?: string | null;
  defaultModel?: string | null;
  settings?: Record<string, unknown> | null;
  capabilities?: Partial<AICapabilities> | null;
  apiKey?: string;
  secretSource: ProviderSecretResolution["source"];
};

export type AITextRequest = {
  routeKey: AIRouteKey;
  prompt: string;
  providerId?: number;
  model?: string;
  systemPrompt?: string;
  brandProfileId?: number;
  promptTemplateId?: number;
  options?: Record<string, unknown>;
};

export type AITextResult = {
  text: string;
  providerId: number;
  providerSlug: ProviderSlug;
  model: string;
  usage: NormalizedUsage;
  raw?: unknown;
};

export type AIMediaRequest = {
  routeKey: AIRouteKey;
  prompt: string;
  providerId?: number;
  model?: string;
  type: "image" | "video";
  inputImageUrl?: string;
  options?: Record<string, unknown>;
};

export type AIMediaResult = {
  providerId: number;
  providerSlug: ProviderSlug;
  model: string;
  url?: string;
  b64Json?: string;
  mimeType?: string;
  usage: NormalizedUsage;
  raw?: unknown;
};

export type NormalizedUsage = {
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  videoSeconds: number;
  estimatedCostMicros: number;
  actualCostMicros?: number | null;
  currency: string;
};

export type BudgetCheckResult = {
  allowed: boolean;
  blockingPolicyId?: number;
  warnings: string[];
  totals: {
    estimatedCostMicros: number;
    limitMicros: number;
  }[];
};

export type RoutingChoice = {
  routeKey: AIRouteKey;
  primaryProviderId: number;
  fallbackProviderIds: number[];
  preferredModel?: string | null;
};
