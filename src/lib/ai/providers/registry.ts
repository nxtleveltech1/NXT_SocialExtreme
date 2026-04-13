import { anthropicAdapter } from "@/lib/ai/providers/anthropic";
import type { AIProviderAdapter } from "@/lib/ai/providers/base";
import { geminiAdapter } from "@/lib/ai/providers/gemini";
import { krevAdapter } from "@/lib/ai/providers/krev";
import { createOpenAICompatibleAdapter } from "@/lib/ai/providers/openai-compatible";
import type { ProviderSlug } from "@/lib/ai/types";

const registry: Record<ProviderSlug, AIProviderAdapter> = {
  openai: createOpenAICompatibleAdapter("openai"),
  openrouter: createOpenAICompatibleAdapter("openrouter"),
  "generic-openai-compatible": createOpenAICompatibleAdapter("generic-openai-compatible"),
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  krev: krevAdapter,
};

export function getAIProviderAdapter(slug: ProviderSlug): AIProviderAdapter {
  return registry[slug];
}
