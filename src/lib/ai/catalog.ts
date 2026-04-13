import type { AIRouteKey, BuiltInProviderCatalogEntry } from "@/lib/ai/types";

export const BUILT_IN_AI_PROVIDERS: BuiltInProviderCatalogEntry[] = [
  {
    slug: "openai",
    displayName: "OpenAI",
    adapter: "openai",
    description: "General purpose multimodal provider for copy, structured outputs, and image generation.",
    defaultBaseUrl: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    envBaseUrlKey: "OPENAI_BASE_URL",
    envDefaultModelKey: "OPENAI_DEFAULT_MODEL",
    capabilities: { text: true, structured: true, image: true, video: false, streaming: true },
    models: [
      {
        modelId: "gpt-4.1-mini",
        displayName: "GPT-4.1 mini",
        capabilities: { text: true, structured: true, streaming: true },
        pricing: { inputMicrosPer1k: 400, outputMicrosPer1k: 1600 },
      },
      {
        modelId: "gpt-4.1",
        displayName: "GPT-4.1",
        capabilities: { text: true, structured: true, streaming: true },
        pricing: { inputMicrosPer1k: 2000, outputMicrosPer1k: 8000 },
      },
      {
        modelId: "gpt-image-1",
        displayName: "GPT Image 1",
        capabilities: { image: true },
        pricing: { imageMicrosPerUnit: 20000 },
      },
    ],
  },
  {
    slug: "anthropic",
    displayName: "Anthropic",
    adapter: "anthropic",
    description: "Strong reasoning and long-context copy generation provider.",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    envKey: "ANTHROPIC_API_KEY",
    envDefaultModelKey: "ANTHROPIC_DEFAULT_MODEL",
    capabilities: { text: true, structured: true, image: false, video: false, streaming: true },
    models: [
      {
        modelId: "claude-3-5-haiku-latest",
        displayName: "Claude 3.5 Haiku",
        capabilities: { text: true, structured: true, streaming: true },
        pricing: { inputMicrosPer1k: 250, outputMicrosPer1k: 1250 },
      },
      {
        modelId: "claude-3-7-sonnet-latest",
        displayName: "Claude 3.7 Sonnet",
        capabilities: { text: true, structured: true, streaming: true },
        pricing: { inputMicrosPer1k: 3000, outputMicrosPer1k: 15000 },
      },
    ],
  },
  {
    slug: "gemini",
    displayName: "Google Gemini",
    adapter: "gemini",
    description: "Cost-efficient multimodal provider for fast generation workflows.",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    envKey: "GEMINI_API_KEY",
    envDefaultModelKey: "GEMINI_DEFAULT_MODEL",
    capabilities: { text: true, structured: true, image: false, video: false, streaming: false },
    models: [
      {
        modelId: "gemini-2.0-flash",
        displayName: "Gemini 2.0 Flash",
        capabilities: { text: true, structured: true },
        pricing: { inputMicrosPer1k: 150, outputMicrosPer1k: 600 },
      },
      {
        modelId: "gemini-1.5-pro",
        displayName: "Gemini 1.5 Pro",
        capabilities: { text: true, structured: true },
        pricing: { inputMicrosPer1k: 1250, outputMicrosPer1k: 5000 },
      },
    ],
  },
  {
    slug: "openrouter",
    displayName: "OpenRouter",
    adapter: "openrouter",
    description: "Broker and fallback layer for OpenAI-compatible multi-model routing.",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    envBaseUrlKey: "OPENROUTER_BASE_URL",
    envDefaultModelKey: "OPENROUTER_MODEL",
    capabilities: { text: true, structured: true, image: false, video: false, streaming: true },
    models: [
      {
        modelId: "google/gemini-2.0-flash-001",
        displayName: "Gemini 2.0 Flash via OpenRouter",
        capabilities: { text: true, structured: true, streaming: true },
        pricing: { inputMicrosPer1k: 180, outputMicrosPer1k: 700 },
      },
      {
        modelId: "openai/gpt-4.1-mini",
        displayName: "GPT-4.1 mini via OpenRouter",
        capabilities: { text: true, structured: true, streaming: true },
        pricing: { inputMicrosPer1k: 450, outputMicrosPer1k: 1700 },
      },
    ],
  },
  {
    slug: "krev",
    displayName: "Krev AI",
    adapter: "krev",
    description: "Creative-media oriented provider for product visuals, ad concepts, and short-form media workflows.",
    defaultBaseUrl: "https://api.krev.ai",
    envKey: "KREV_API_KEY",
    envBaseUrlKey: "KREV_API_BASE_URL",
    capabilities: { text: true, structured: false, image: true, video: true, streaming: false },
    settingsSchema: {
      requiresCustomEndpoints: true,
      fields: ["textEndpoint", "imageEndpoint", "videoEndpoint"],
    },
    models: [
      {
        modelId: "creative-agent",
        displayName: "Creative Agent",
        capabilities: { text: true, image: true, video: true },
        pricing: { inputMicrosPer1k: 800, outputMicrosPer1k: 2200, imageMicrosPerUnit: 25000, videoMicrosPerSecond: 4000 },
      },
    ],
  },
  {
    slug: "generic-openai-compatible",
    displayName: "Generic OpenAI-Compatible",
    adapter: "generic-openai-compatible",
    description: "Bring your own OpenAI-compatible endpoint with custom base URL and model catalog.",
    envKey: "GENERIC_AI_API_KEY",
    envBaseUrlKey: "GENERIC_AI_BASE_URL",
    envDefaultModelKey: "GENERIC_AI_MODEL",
    capabilities: { text: true, structured: true, image: false, video: false, streaming: true },
    models: [
      {
        modelId: "custom-model",
        displayName: "Custom Model",
        capabilities: { text: true, structured: true, streaming: true },
      },
    ],
  },
];

export const DEFAULT_ROUTE_PROVIDER_SLUGS: Record<AIRouteKey, BuiltInProviderCatalogEntry["slug"]> = {
  "studio.copy": "openrouter",
  "studio.media.image": "krev",
  "studio.media.video": "krev",
  "agents.content": "openrouter",
  "agents.reply": "openrouter",
};

export const DEFAULT_PROMPT_TEMPLATES = [
  {
    slug: "studio-social-caption",
    name: "Social Caption Generator",
    useCase: "studio.copy",
    systemPrompt: "You are a brand-aware social media strategist. Produce polished, platform-ready output.",
    userPromptTemplate:
      "Create a high-performing social media caption for {{platform}} about: {{prompt}}. Tone: {{tone}}. Include hashtags and a clear CTA when appropriate.",
    isDefault: true,
  },
  {
    slug: "agent-reply",
    name: "Reply Assistant",
    useCase: "agents.reply",
    systemPrompt: "You are a customer-facing support and sales assistant. Be concise, helpful, and accurate.",
    userPromptTemplate:
      "Respond to this customer message using the provided business context and intent classification when available: {{prompt}}",
    isDefault: true,
  },
  {
    slug: "content-idea-engine",
    name: "Content Idea Engine",
    useCase: "agents.content",
    systemPrompt: "You are a senior content strategist generating practical weekly campaign ideas.",
    userPromptTemplate:
      "Generate content ideas and post drafts based on this brief: {{prompt}}",
    isDefault: true,
  },
];
