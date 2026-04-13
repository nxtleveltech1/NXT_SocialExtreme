import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/db";
import {
  aiBrandProfiles,
  aiBudgetPolicies,
  aiModels,
  aiPromptTemplates,
  aiProviderCredentials,
  aiProviders,
  aiReconciliationAdjustments,
  aiReconciliationRuns,
  aiRequestLogs,
  aiRoutingProfiles,
  aiUsageEvents,
} from "@/db/schema";
import { BUILT_IN_AI_PROVIDERS, DEFAULT_PROMPT_TEMPLATES, DEFAULT_ROUTE_PROVIDER_SLUGS } from "@/lib/ai/catalog";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import type { AIRouteKey, BudgetCheckResult, NormalizedUsage, ProviderResolvedConfig, ProviderSecretResolution, ProviderSlug } from "@/lib/ai/types";

function envSecretForProvider(slug: ProviderSlug): ProviderSecretResolution & { baseUrl?: string; defaultModel?: string } {
  switch (slug) {
    case "openai":
      return {
        apiKey: env.OPENAI_API_KEY,
        baseUrl: env.OPENAI_BASE_URL,
        defaultModel: env.OPENAI_DEFAULT_MODEL,
        source: env.OPENAI_API_KEY ? "env" : "none",
      };
    case "anthropic":
      return {
        apiKey: env.ANTHROPIC_API_KEY,
        defaultModel: env.ANTHROPIC_DEFAULT_MODEL,
        source: env.ANTHROPIC_API_KEY ? "env" : "none",
      };
    case "gemini":
      return {
        apiKey: env.GEMINI_API_KEY,
        defaultModel: env.GEMINI_DEFAULT_MODEL,
        source: env.GEMINI_API_KEY ? "env" : "none",
      };
    case "openrouter":
      return {
        apiKey: env.OPENROUTER_API_KEY,
        baseUrl: env.OPENROUTER_BASE_URL,
        defaultModel: env.OPENROUTER_MODEL,
        source: env.OPENROUTER_API_KEY ? "env" : "none",
      };
    case "krev":
      return {
        apiKey: env.KREV_API_KEY,
        baseUrl: env.KREV_API_BASE_URL,
        defaultModel: "creative-agent",
        source: env.KREV_API_KEY ? "env" : "none",
      };
    case "generic-openai-compatible":
      return {
        apiKey: env.GENERIC_AI_API_KEY,
        baseUrl: env.GENERIC_AI_BASE_URL,
        defaultModel: env.GENERIC_AI_MODEL,
        source: env.GENERIC_AI_API_KEY ? "env" : "none",
      };
  }
}

export async function ensureAIFoundation(ownerUserId: string) {
  const existingProviders = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.ownerUserId, ownerUserId));
  const providerMap = new Map(existingProviders.map((provider) => [provider.slug, provider]));

  for (const provider of BUILT_IN_AI_PROVIDERS) {
    const envSecret = envSecretForProvider(provider.slug);
    if (!providerMap.has(provider.slug)) {
      await db.insert(aiProviders).values({
        ownerUserId,
        slug: provider.slug,
        displayName: provider.displayName,
        adapter: provider.adapter,
        enabled: Boolean(envSecret.apiKey),
        status: envSecret.apiKey ? "ready" : "inactive",
        isBuiltIn: true,
        defaultModel: envSecret.defaultModel || provider.models[0]?.modelId || null,
        baseUrl: envSecret.baseUrl || provider.defaultBaseUrl || null,
        settings: provider.settingsSchema || {},
        capabilities: provider.capabilities,
      });
    }
  }

  const providerRows = await db
    .select()
    .from(aiProviders)
    .where(eq(aiProviders.ownerUserId, ownerUserId));
  const providerBySlug = new Map(providerRows.map((provider) => [provider.slug, provider]));

  for (const provider of BUILT_IN_AI_PROVIDERS) {
    const row = providerBySlug.get(provider.slug);
    if (!row) continue;
    const existingModels = await db.select().from(aiModels).where(eq(aiModels.providerId, row.id));
    const existingModelIds = new Set(existingModels.map((model) => model.modelId));

    for (const model of provider.models) {
      if (existingModelIds.has(model.modelId)) continue;
      await db.insert(aiModels).values({
        providerId: row.id,
        ownerUserId,
        modelId: model.modelId,
        displayName: model.displayName,
        isDefault: row.defaultModel === model.modelId,
        capabilities: model.capabilities,
        pricing: model.pricing || {},
        metadata: model.metadata || {},
      });
    }
  }

  const routes = await db
    .select()
    .from(aiRoutingProfiles)
    .where(eq(aiRoutingProfiles.ownerUserId, ownerUserId));
  const routeSet = new Set(routes.map((route) => route.routeKey));

  for (const [routeKey, slug] of Object.entries(DEFAULT_ROUTE_PROVIDER_SLUGS) as [AIRouteKey, ProviderSlug][]) {
    if (routeSet.has(routeKey)) continue;
    const provider = providerBySlug.get(slug);
    if (!provider) continue;
    await db.insert(aiRoutingProfiles).values({
      ownerUserId,
      routeKey,
      primaryProviderId: provider.id,
      preferredModel: provider.defaultModel,
      fallbackProviderIds: [],
      settings: {},
    });
  }

  const prompts = await db
    .select()
    .from(aiPromptTemplates)
    .where(eq(aiPromptTemplates.ownerUserId, ownerUserId));
  const promptSet = new Set(prompts.map((prompt) => prompt.slug));
  for (const prompt of DEFAULT_PROMPT_TEMPLATES) {
    if (promptSet.has(prompt.slug)) continue;
    await db.insert(aiPromptTemplates).values({
      ownerUserId,
      name: prompt.name,
      slug: prompt.slug,
      useCase: prompt.useCase,
      systemPrompt: prompt.systemPrompt,
      userPromptTemplate: prompt.userPromptTemplate,
      isDefault: prompt.isDefault,
      settings: {},
    });
  }

  const brands = await db
    .select()
    .from(aiBrandProfiles)
    .where(eq(aiBrandProfiles.ownerUserId, ownerUserId))
    .limit(1);
  if (brands.length === 0) {
    await db.insert(aiBrandProfiles).values({
      ownerUserId,
      name: "Default Brand Profile",
      isDefault: true,
      businessName: "NXT Social Extreme",
      businessDescription: "AI-assisted social media management platform",
      targetAudience: "Business owners, marketers, and content teams",
      brandVoice: "Professional, practical, high-energy, and conversion-focused",
      styleGuide: {
        values: ["clarity", "speed", "business value"],
        channels: ["Instagram", "Facebook", "TikTok", "WhatsApp"],
      },
      bannedTerms: [],
    });
  }
}

export async function listProvidersWithSecrets(ownerUserId: string) {
  await ensureAIFoundation(ownerUserId);
  const rows = await db
    .select({
      provider: aiProviders,
      credential: aiProviderCredentials,
    })
    .from(aiProviders)
    .leftJoin(aiProviderCredentials, eq(aiProviderCredentials.providerId, aiProviders.id))
    .where(eq(aiProviders.ownerUserId, ownerUserId));

  return rows.map(({ provider, credential }) => {
    const envSecret = envSecretForProvider(provider.slug as ProviderSlug);
    const secret = credential?.secretEnc ? decryptSecret(credential.secretEnc) : undefined;
    const secretSource = secret ? "credential" : envSecret.source;

    const resolved: ProviderResolvedConfig = {
      id: provider.id,
      slug: provider.slug as ProviderSlug,
      displayName: provider.displayName,
      adapter: provider.adapter,
      baseUrl: provider.baseUrl || envSecret.baseUrl || null,
      defaultModel: provider.defaultModel || envSecret.defaultModel || null,
      settings: (provider.settings as Record<string, unknown> | null) || null,
      capabilities: (provider.capabilities as Record<string, unknown> | null) || null,
      apiKey: secret || envSecret.apiKey,
      secretSource,
    };

    return {
      ...provider,
      credential: credential
        ? {
            id: credential.id,
            label: credential.label,
            last4: credential.last4,
            isEnvBacked: credential.isEnvBacked || secretSource === "env",
            rotatedAt: credential.rotatedAt,
          }
        : {
            id: null,
            label: envSecret.apiKey ? "Environment" : null,
            last4: envSecret.apiKey ? envSecret.apiKey.slice(-4) : null,
            isEnvBacked: secretSource === "env",
            rotatedAt: null,
          },
      resolved,
    };
  });
}

export async function getResolvedProvider(ownerUserId: string, providerId: number) {
  const providers = await listProvidersWithSecrets(ownerUserId);
  return providers.find((provider) => provider.id === providerId)?.resolved || null;
}

export async function upsertProviderCredential(ownerUserId: string, providerId: number, apiKey: string, label?: string) {
  const last4 = apiKey.slice(-4);
  const secretEnc = encryptSecret(apiKey);
  const existing = await db
    .select()
    .from(aiProviderCredentials)
    .where(and(eq(aiProviderCredentials.providerId, providerId), eq(aiProviderCredentials.ownerUserId, ownerUserId)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(aiProviderCredentials)
      .set({
        secretEnc,
        last4,
        label: label || existing[0].label,
        isEnvBacked: false,
        rotatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiProviderCredentials.id, existing[0].id));
    return;
  }

  await db.insert(aiProviderCredentials).values({
    providerId,
    ownerUserId,
    secretEnc,
    last4,
    label: label || "Primary API Key",
    isEnvBacked: false,
    rotatedAt: new Date(),
  });
}

export async function updateProviderConfig(
  ownerUserId: string,
  providerId: number,
  updates: Partial<{
    enabled: boolean;
    displayName: string;
    defaultModel: string | null;
    baseUrl: string | null;
    settings: Record<string, unknown>;
    status: string;
    lastValidationStatus: string | null;
    lastValidationError: string | null;
  }>
) {
  await db
    .update(aiProviders)
    .set({
      ...updates,
      updatedAt: new Date(),
      lastValidatedAt: updates.lastValidationStatus ? new Date() : undefined,
    })
    .where(and(eq(aiProviders.id, providerId), eq(aiProviders.ownerUserId, ownerUserId)));
}

export async function getRoutingProfiles(ownerUserId: string) {
  await ensureAIFoundation(ownerUserId);
  return db.select().from(aiRoutingProfiles).where(eq(aiRoutingProfiles.ownerUserId, ownerUserId));
}

export async function upsertRoutingProfile(
  ownerUserId: string,
  routeKey: AIRouteKey,
  updates: {
    primaryProviderId: number;
    preferredModel?: string | null;
    fallbackProviderIds?: number[];
    enabled?: boolean;
    settings?: Record<string, unknown>;
  }
) {
  const existing = await db
    .select()
    .from(aiRoutingProfiles)
    .where(and(eq(aiRoutingProfiles.ownerUserId, ownerUserId), eq(aiRoutingProfiles.routeKey, routeKey)))
    .limit(1);

  if (existing[0]) {
    await db
      .update(aiRoutingProfiles)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aiRoutingProfiles.id, existing[0].id));
    return;
  }

  await db.insert(aiRoutingProfiles).values({
    ownerUserId,
    routeKey,
    primaryProviderId: updates.primaryProviderId,
    preferredModel: updates.preferredModel,
    fallbackProviderIds: updates.fallbackProviderIds || [],
    enabled: updates.enabled ?? true,
    settings: updates.settings || {},
  });
}

export async function listPromptTemplates(ownerUserId: string) {
  await ensureAIFoundation(ownerUserId);
  return db
    .select()
    .from(aiPromptTemplates)
    .where(eq(aiPromptTemplates.ownerUserId, ownerUserId))
    .orderBy(aiPromptTemplates.name);
}

export async function listBrandProfiles(ownerUserId: string) {
  await ensureAIFoundation(ownerUserId);
  return db
    .select()
    .from(aiBrandProfiles)
    .where(eq(aiBrandProfiles.ownerUserId, ownerUserId))
    .orderBy(aiBrandProfiles.name);
}

export async function upsertBudgetPolicy(
  ownerUserId: string,
  payload: {
    id?: number;
    providerId?: number | null;
    routeKey?: string | null;
    limitMicros: number;
    warningThresholdPercent?: number;
    hardStop?: boolean;
    enabled?: boolean;
  }
) {
  if (payload.id) {
    await db
      .update(aiBudgetPolicies)
      .set({
        providerId: payload.providerId ?? null,
        routeKey: payload.routeKey ?? null,
        limitMicros: payload.limitMicros,
        warningThresholdPercent: payload.warningThresholdPercent ?? 80,
        hardStop: payload.hardStop ?? false,
        enabled: payload.enabled ?? true,
        updatedAt: new Date(),
      })
      .where(and(eq(aiBudgetPolicies.id, payload.id), eq(aiBudgetPolicies.ownerUserId, ownerUserId)));
    return;
  }

  await db.insert(aiBudgetPolicies).values({
    ownerUserId,
    providerId: payload.providerId ?? null,
    routeKey: payload.routeKey ?? null,
    limitMicros: payload.limitMicros,
    warningThresholdPercent: payload.warningThresholdPercent ?? 80,
    hardStop: payload.hardStop ?? false,
    enabled: payload.enabled ?? true,
  });
}

export async function listBudgetPolicies(ownerUserId: string) {
  return db
    .select()
    .from(aiBudgetPolicies)
    .where(eq(aiBudgetPolicies.ownerUserId, ownerUserId))
    .orderBy(desc(aiBudgetPolicies.createdAt));
}

export async function checkBudgets(
  ownerUserId: string,
  usage: { estimatedCostMicros: number },
  providerId?: number,
  routeKey?: string
): Promise<BudgetCheckResult> {
  const policies = await db
    .select()
    .from(aiBudgetPolicies)
    .where(eq(aiBudgetPolicies.ownerUserId, ownerUserId));

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const warnings: string[] = [];
  const totals: BudgetCheckResult["totals"] = [];
  let allowed = true;
  let blockingPolicyId: number | undefined;

  for (const policy of policies.filter((entry) => entry.enabled)) {
    if (policy.providerId && providerId && policy.providerId !== providerId) continue;
    if (policy.routeKey && routeKey && policy.routeKey !== routeKey) continue;

    const [spent] = await db
      .select({
        total: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostMicros}), 0)`,
      })
      .from(aiUsageEvents)
      .where(
        and(
          eq(aiUsageEvents.ownerUserId, ownerUserId),
          gte(aiUsageEvents.usageDate, monthStart),
          policy.providerId ? eq(aiUsageEvents.providerId, policy.providerId) : undefined,
          policy.routeKey ? eq(aiUsageEvents.routeKey, policy.routeKey) : undefined
        )
      );

    const totalSpent = Number(spent?.total || 0) + usage.estimatedCostMicros;
    totals.push({ estimatedCostMicros: totalSpent, limitMicros: policy.limitMicros });

    const percent = policy.limitMicros > 0 ? Math.round((totalSpent / policy.limitMicros) * 100) : 0;
    if (percent >= policy.warningThresholdPercent) {
      warnings.push(`Budget threshold reached for ${policy.routeKey || "all routes"} (${percent}%).`);
    }
    if (policy.hardStop && totalSpent > policy.limitMicros) {
      allowed = false;
      blockingPolicyId = policy.id;
    }
  }

  return { allowed, blockingPolicyId, warnings, totals };
}

export async function recordUsageEvent(
  ownerUserId: string,
  payload: {
    providerId?: number | null;
    routeKey?: string | null;
    model?: string | null;
    usage: NormalizedUsage;
    requestLogId?: number | null;
    status?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await db.insert(aiUsageEvents).values({
    ownerUserId,
    providerId: payload.providerId ?? null,
    routeKey: payload.routeKey ?? null,
    model: payload.model ?? null,
    requestLogId: payload.requestLogId ?? null,
    inputTokens: payload.usage.inputTokens,
    outputTokens: payload.usage.outputTokens,
    imageCount: payload.usage.imageCount,
    videoSeconds: payload.usage.videoSeconds,
    estimatedCostMicros: payload.usage.estimatedCostMicros,
    actualCostMicros: payload.usage.actualCostMicros ?? null,
    currency: payload.usage.currency,
    status: payload.status || "recorded",
    metadata: payload.metadata || {},
  });
}

export async function createRequestLog(
  ownerUserId: string,
  payload: {
    providerId?: number | null;
    routeKey?: string | null;
    feature?: string | null;
    requestType: string;
    model?: string | null;
    status?: string;
    requestPreview?: string | null;
    responsePreview?: string | null;
    latencyMs?: number | null;
    usage?: NormalizedUsage;
    error?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  const [created] = await db
    .insert(aiRequestLogs)
    .values({
      ownerUserId,
      providerId: payload.providerId ?? null,
      routeKey: payload.routeKey ?? null,
      feature: payload.feature ?? null,
      requestType: payload.requestType,
      model: payload.model ?? null,
      status: payload.status || "success",
      requestPreview: payload.requestPreview ?? null,
      responsePreview: payload.responsePreview ?? null,
      latencyMs: payload.latencyMs ?? null,
      promptTokens: payload.usage?.inputTokens ?? 0,
      completionTokens: payload.usage?.outputTokens ?? 0,
      estimatedCostMicros: payload.usage?.estimatedCostMicros ?? 0,
      actualCostMicros: payload.usage?.actualCostMicros ?? null,
      currency: payload.usage?.currency || "USD",
      error: payload.error ?? null,
      metadata: payload.metadata || {},
    })
    .returning();

  return created;
}

export async function listRecentRequestLogs(ownerUserId: string, limit = 30) {
  return db
    .select()
    .from(aiRequestLogs)
    .where(eq(aiRequestLogs.ownerUserId, ownerUserId))
    .orderBy(desc(aiRequestLogs.createdAt))
    .limit(limit);
}

export async function createReconciliationRun(
  ownerUserId: string,
  payload: {
    providerSlug: string;
    periodStart: Date;
    periodEnd: Date;
    importedTotalMicros: number;
    notes?: string;
    adjustments?: Array<{ amountMicros: number; reason: string; notes?: string }>;
  }
) {
  const [estimated] = await db
    .select({
      total: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostMicros}), 0)`,
    })
    .from(aiUsageEvents)
    .leftJoin(aiProviders, eq(aiProviders.id, aiUsageEvents.providerId))
    .where(
      and(
        eq(aiUsageEvents.ownerUserId, ownerUserId),
        eq(aiProviders.slug, payload.providerSlug),
        gte(aiUsageEvents.usageDate, payload.periodStart),
        lte(aiUsageEvents.usageDate, payload.periodEnd)
      )
    );

  const estimatedTotalMicros = Number(estimated?.total || 0);
  const [run] = await db
    .insert(aiReconciliationRuns)
    .values({
      ownerUserId,
      providerSlug: payload.providerSlug,
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      importedTotalMicros: payload.importedTotalMicros,
      estimatedTotalMicros,
      varianceMicros: payload.importedTotalMicros - estimatedTotalMicros,
      notes: payload.notes || null,
    })
    .returning();

  for (const adjustment of payload.adjustments || []) {
    await db.insert(aiReconciliationAdjustments).values({
      runId: run.id,
      ownerUserId,
      amountMicros: adjustment.amountMicros,
      reason: adjustment.reason,
      notes: adjustment.notes || null,
    });
  }

  return run;
}

export async function listReconciliationRuns(ownerUserId: string) {
  return db
    .select()
    .from(aiReconciliationRuns)
    .where(eq(aiReconciliationRuns.ownerUserId, ownerUserId))
    .orderBy(desc(aiReconciliationRuns.createdAt));
}
