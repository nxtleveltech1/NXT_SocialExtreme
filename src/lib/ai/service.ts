import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { aiBrandProfiles, aiPromptTemplates } from "@/db/schema";
import { getAIProviderAdapter } from "@/lib/ai/providers/registry";
import {
  checkBudgets,
  createReconciliationRun,
  createRequestLog,
  ensureAIFoundation,
  getResolvedProvider,
  getRoutingProfiles,
  listBrandProfiles,
  listBudgetPolicies,
  listPromptTemplates,
  listProvidersWithSecrets,
  listRecentRequestLogs,
  listReconciliationRuns,
  recordUsageEvent,
  updateProviderConfig,
  upsertBudgetPolicy,
  upsertProviderCredential,
  upsertRoutingProfile,
} from "@/lib/ai/storage";
import type { AIMediaRequest, AITextRequest, AIRouteKey, ProviderResolvedConfig } from "@/lib/ai/types";

function clampPreview(value: string | undefined, max = 400) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

async function buildPromptContext(ownerUserId: string, request: AITextRequest) {
  let brandContext = "";
  let template = null as typeof aiPromptTemplates.$inferSelect | null;

  if (request.brandProfileId) {
    const [brand] = await db
      .select()
      .from(aiBrandProfiles)
      .where(eq(aiBrandProfiles.id, request.brandProfileId))
      .limit(1);

    if (brand && brand.ownerUserId === ownerUserId) {
      brandContext = [
        `Brand: ${brand.businessName}`,
        brand.businessDescription ? `Description: ${brand.businessDescription}` : null,
        brand.targetAudience ? `Audience: ${brand.targetAudience}` : null,
        brand.brandVoice ? `Voice: ${brand.brandVoice}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  if (request.promptTemplateId) {
    const [promptTemplate] = await db
      .select()
      .from(aiPromptTemplates)
      .where(eq(aiPromptTemplates.id, request.promptTemplateId))
      .limit(1);
    if (promptTemplate && promptTemplate.ownerUserId === ownerUserId) {
      template = promptTemplate;
    }
  }

  return {
    prompt: template ? template.userPromptTemplate.replaceAll("{{prompt}}", request.prompt) : request.prompt,
    systemPrompt: [request.systemPrompt, template?.systemPrompt, brandContext].filter(Boolean).join("\n\n"),
  };
}

async function resolveProviderForRoute(ownerUserId: string, routeKey: AIRouteKey, providerId?: number) {
  await ensureAIFoundation(ownerUserId);

  if (providerId) {
    const provider = await getResolvedProvider(ownerUserId, providerId);
    if (!provider) throw new Error("Provider not found");
    return { provider, fallbacks: [] as ProviderResolvedConfig[] };
  }

  const routes = await getRoutingProfiles(ownerUserId);
  const route = routes.find((entry) => entry.routeKey === routeKey && entry.enabled);
  if (!route?.primaryProviderId) {
    throw new Error(`No AI routing configured for ${routeKey}`);
  }

  const provider = await getResolvedProvider(ownerUserId, route.primaryProviderId);
  if (!provider) throw new Error("Primary provider not found");

  const fallbacks = await Promise.all(
    (route.fallbackProviderIds || []).map((id) => getResolvedProvider(ownerUserId, id))
  );

  return {
    provider: {
      ...provider,
      defaultModel: provider.defaultModel || route.preferredModel || provider.defaultModel,
    },
    fallbacks: fallbacks.filter(Boolean) as ProviderResolvedConfig[],
  };
}

async function executeWithFallback<T extends { usage: { estimatedCostMicros: number }; model: string; providerId: number }>(
  ownerUserId: string,
  routeKey: AIRouteKey,
  executor: (provider: ProviderResolvedConfig) => Promise<T>,
  providerId?: number
) {
  const { provider, fallbacks } = await resolveProviderForRoute(ownerUserId, routeKey, providerId);
  const candidates = [provider, ...fallbacks];
  let lastError: Error | null = null;

  for (const candidate of candidates) {
    try {
      return await executor(candidate);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("AI provider request failed");
    }
  }

  throw lastError || new Error("No provider available");
}

export async function listAIAdminState(ownerUserId: string) {
  await ensureAIFoundation(ownerUserId);
  const [providers, routes, budgets, reconciliationRuns, logs, promptTemplates, brandProfiles] = await Promise.all([
    listProvidersWithSecrets(ownerUserId),
    getRoutingProfiles(ownerUserId),
    listBudgetPolicies(ownerUserId),
    listReconciliationRuns(ownerUserId),
    listRecentRequestLogs(ownerUserId, 20),
    listPromptTemplates(ownerUserId),
    listBrandProfiles(ownerUserId),
  ]);

  return {
    providers: providers.map((provider) => ({
      ...provider,
      resolved: {
        ...provider.resolved,
        apiKey: undefined,
      },
    })),
    routes,
    budgets,
    reconciliationRuns,
    logs,
    promptTemplates,
    brandProfiles,
  };
}

export async function saveProviderSettings(
  ownerUserId: string,
  providerId: number,
  payload: {
    enabled?: boolean;
    displayName?: string;
    defaultModel?: string | null;
    baseUrl?: string | null;
    apiKey?: string;
    label?: string;
    settings?: Record<string, unknown>;
  }
) {
  if (payload.apiKey) {
    await upsertProviderCredential(ownerUserId, providerId, payload.apiKey, payload.label);
  }

  await updateProviderConfig(ownerUserId, providerId, {
    enabled: payload.enabled,
    displayName: payload.displayName,
    defaultModel: payload.defaultModel,
    baseUrl: payload.baseUrl,
    settings: payload.settings,
  });
}

export async function testProviderConnection(ownerUserId: string, providerId: number) {
  const provider = await getResolvedProvider(ownerUserId, providerId);
  if (!provider) throw new Error("Provider not found");
  const adapter = getAIProviderAdapter(provider.slug);
  const result = await adapter.validateCredentials(provider);

  await updateProviderConfig(ownerUserId, providerId, {
    status: result.ok ? "ready" : "error",
    lastValidationStatus: result.ok ? "success" : "failed",
    lastValidationError: result.ok ? null : result.message || "Connection failed",
    enabled: result.ok || undefined,
  });

  return result;
}

export async function generateTextWithAI(ownerUserId: string, request: AITextRequest) {
  const prepared = await buildPromptContext(ownerUserId, request);
  const startedAt = Date.now();

  return executeWithFallback(
    ownerUserId,
    request.routeKey,
    async (provider) => {
      const adapter = getAIProviderAdapter(provider.slug);
      const result = await adapter.generateText(provider, {
        ...request,
        prompt: prepared.prompt,
        systemPrompt: prepared.systemPrompt,
      });

      result.usage.estimatedCostMicros = adapter.estimateCost(result.usage, provider, result.model);
      const budget = await checkBudgets(ownerUserId, result.usage, provider.id, request.routeKey);
      if (!budget.allowed) {
        throw new Error("AI budget exceeded for this route.");
      }

      const log = await createRequestLog(ownerUserId, {
        providerId: provider.id,
        routeKey: request.routeKey,
        feature: request.routeKey.startsWith("studio") ? "content-studio" : "automation-agents",
        requestType: "text",
        model: result.model,
        requestPreview: clampPreview(request.prompt),
        responsePreview: clampPreview(result.text),
        latencyMs: Date.now() - startedAt,
        usage: result.usage,
        metadata: { warnings: budget.warnings },
      });

      await recordUsageEvent(ownerUserId, {
        providerId: provider.id,
        routeKey: request.routeKey,
        model: result.model,
        usage: result.usage,
        requestLogId: log.id,
      });

      return result;
    },
    request.providerId
  );
}

export async function generateStructuredWithAI<T = Record<string, unknown>>(ownerUserId: string, request: AITextRequest) {
  const prepared = await buildPromptContext(ownerUserId, request);
  const startedAt = Date.now();

  return executeWithFallback(
    ownerUserId,
    request.routeKey,
    async (provider) => {
      const adapter = getAIProviderAdapter(provider.slug);
      const result = await adapter.generateStructured<T>(provider, {
        ...request,
        prompt: prepared.prompt,
        systemPrompt: prepared.systemPrompt,
      });

      result.usage.estimatedCostMicros = adapter.estimateCost(result.usage, provider, result.model);
      const budget = await checkBudgets(ownerUserId, result.usage, provider.id, request.routeKey);
      if (!budget.allowed) {
        throw new Error("AI budget exceeded for this route.");
      }

      const log = await createRequestLog(ownerUserId, {
        providerId: provider.id,
        routeKey: request.routeKey,
        feature: request.routeKey.startsWith("studio") ? "content-studio" : "automation-agents",
        requestType: "structured",
        model: result.model,
        requestPreview: clampPreview(request.prompt),
        responsePreview: clampPreview(result.text),
        latencyMs: Date.now() - startedAt,
        usage: result.usage,
      });

      await recordUsageEvent(ownerUserId, {
        providerId: provider.id,
        routeKey: request.routeKey,
        model: result.model,
        usage: result.usage,
        requestLogId: log.id,
      });

      return result;
    },
    request.providerId
  );
}

export async function generateMediaWithAI(ownerUserId: string, request: AIMediaRequest) {
  const startedAt = Date.now();

  return executeWithFallback(
    ownerUserId,
    request.routeKey,
    async (provider) => {
      const adapter = getAIProviderAdapter(provider.slug);
      const generator = request.type === "image" ? adapter.generateImage : adapter.generateVideo;
      if (!generator) {
        throw new Error(`${provider.displayName} does not support ${request.type} generation.`);
      }

      const result = await generator.call(adapter, provider, request);
      result.usage.estimatedCostMicros = adapter.estimateCost(result.usage, provider, result.model);
      const budget = await checkBudgets(ownerUserId, result.usage, provider.id, request.routeKey);
      if (!budget.allowed) {
        throw new Error("AI budget exceeded for this route.");
      }

      const log = await createRequestLog(ownerUserId, {
        providerId: provider.id,
        routeKey: request.routeKey,
        feature: "content-studio",
        requestType: request.type,
        model: result.model,
        requestPreview: clampPreview(request.prompt),
        responsePreview: clampPreview(result.url || (result.b64Json ? `${request.type} asset created` : "")),
        latencyMs: Date.now() - startedAt,
        usage: result.usage,
      });

      await recordUsageEvent(ownerUserId, {
        providerId: provider.id,
        routeKey: request.routeKey,
        model: result.model,
        usage: result.usage,
        requestLogId: log.id,
      });

      return result;
    },
    request.providerId
  );
}

export async function saveRouting(ownerUserId: string, payload: Parameters<typeof upsertRoutingProfile>[2] & { routeKey: AIRouteKey }) {
  await upsertRoutingProfile(ownerUserId, payload.routeKey, payload);
}

export async function saveBudget(ownerUserId: string, payload: Parameters<typeof upsertBudgetPolicy>[1]) {
  await upsertBudgetPolicy(ownerUserId, payload);
}

export async function saveReconciliation(ownerUserId: string, payload: Parameters<typeof createReconciliationRun>[1]) {
  return createReconciliationRun(ownerUserId, payload);
}

export async function listProviderModels(ownerUserId: string) {
  const providers = await listProvidersWithSecrets(ownerUserId);
  return Promise.all(
    providers.map(async (provider) => {
      const adapter = getAIProviderAdapter(provider.resolved.slug);
      const models = await adapter.listModels(provider.resolved);
      return {
        id: provider.id,
        slug: provider.slug,
        displayName: provider.displayName,
        defaultModel: provider.defaultModel,
        models,
      };
    })
  );
}

export async function getCurrentAIUserId() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  return user.id;
}
