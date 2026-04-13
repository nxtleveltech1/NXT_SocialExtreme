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

/** Returns true for errors that are likely transient and worth retrying on the same provider. */
function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("status 429") ||
    msg.includes("status 503") ||
    msg.includes("status 502") ||
    msg.includes("rate limit") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up")
  );
}

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 2_000;

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
  const errors: { provider: string; slug: string; error: string; durationMs: number }[] = [];

  for (const candidate of candidates) {
    // Allow one retry for transient errors on the same provider before falling back
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const attemptStart = Date.now();
      try {
        const result = await executor(candidate);
        if (errors.length > 0) {
          console.warn(
            `[AI:${routeKey}] Succeeded on provider "${candidate.displayName}" (${candidate.slug}) after ${errors.length} failed attempt(s):`,
            errors.map((e) => `${e.provider} (${e.slug}): ${e.error} [${e.durationMs}ms]`).join("; ")
          );
        }
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown AI provider error";
        const durationMs = Date.now() - attemptStart;
        errors.push({
          provider: candidate.displayName,
          slug: candidate.slug,
          error: errorMessage,
          durationMs,
        });
        console.error(
          `[AI:${routeKey}] Provider "${candidate.displayName}" (${candidate.slug}) attempt ${attempt + 1} failed after ${durationMs}ms:`,
          errorMessage
        );

        // Only retry on the same provider for transient errors, and only if we have retries left
        if (attempt < MAX_RETRIES && isRetryableError(error)) {
          console.info(`[AI:${routeKey}] Retrying "${candidate.displayName}" in ${RETRY_DELAY_MS}ms (transient error)...`);
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        break; // Non-retryable or out of retries — move to next provider
      }
    }
  }

  const summary = errors.map((e) => `${e.provider} (${e.slug}): ${e.error}`).join("; ");
  throw new Error(
    `All AI providers failed for route "${routeKey}". Tried ${errors.length} provider(s): ${summary}`
  );
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

  const configUpdate: Parameters<typeof updateProviderConfig>[2] = {
    enabled: payload.enabled,
    displayName: payload.displayName,
    defaultModel: payload.defaultModel,
    baseUrl: payload.baseUrl,
  };

  // Merge incoming settings with whatever is already stored so that omitted
  // endpoint fields (empty strings → stripped by JSON.stringify) don't wipe
  // the values the user saved previously.
  if (payload.settings && Object.keys(payload.settings).length > 0) {
    const existing = await getResolvedProvider(ownerUserId, providerId);
    const existingSettings = (existing?.settings as Record<string, unknown>) || {};
    configUpdate.settings = { ...existingSettings, ...payload.settings };
  }

  await updateProviderConfig(ownerUserId, providerId, configUpdate);
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
