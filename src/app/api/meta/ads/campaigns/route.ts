import { NextResponse } from "next/server";
import { syncCampaignsSDK, createCampaignSDK } from "@/lib/integrations/meta-sdk-integration";
import { db } from "@/db/db";
import { adCampaigns } from "@/db/schema";
import { eq } from "drizzle-orm";
import { withRateLimit } from "@/lib/middleware/rate-limiter";
import { handleApiError } from "@/lib/utils/api-error-handler";
import { withCache, cacheKeys } from "@/lib/utils/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";

const GetSchema = z.object({
  channelId: z.string().regex(/^\d+$/),
  adAccountId: z.string().min(1),
  useSDK: z.enum(["true", "false"]).optional(),
  sync: z.enum(["true", "false"]).optional(),
});

export const GET = withRateLimit(async (req: Request) => {
  try {
    await requireAuth();
    const url = new URL(req.url);
    const parsed = GetSchema.parse({
      channelId: url.searchParams.get("channelId") ?? undefined,
      adAccountId: url.searchParams.get("adAccountId") ?? undefined,
      useSDK: url.searchParams.get("useSDK") ?? undefined,
      sync: url.searchParams.get("sync") ?? undefined,
    });

    const channelId = parseInt(parsed.channelId);
    const adAccountId = parsed.adAccountId;
    const useSDK = parsed.useSDK !== "false"; // default true
    const shouldSync = parsed.sync === "true";

    const cacheKey = cacheKeys.campaigns(channelId, adAccountId);

    const campaigns = await withCache(
      cacheKey,
      async () => {
        if (shouldSync) {
          if (useSDK) {
            const result = await syncCampaignsSDK(channelId, adAccountId);
            return result.campaigns;
          }
          const { syncAdCampaigns } = await import("@/lib/integrations/meta-comprehensive");
          await syncAdCampaigns(channelId, adAccountId);
        }

        return await db.select().from(adCampaigns).where(eq(adCampaigns.channelId, channelId));
      },
      30_000
    );

    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { limit: 120, windowMs: 60_000 });

const PostSchema = z.object({
  channelId: z.number().int().positive(),
  adAccountId: z.string().min(1),
  name: z.string().min(1),
  objective: z.string().min(1),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  startTime: z.string().optional(),
  stopTime: z.string().optional(),
  useSDK: z.boolean().optional(),
});

export const POST = withRateLimit(async (req: Request) => {
  try {
    await requireAuth();
    const body = PostSchema.parse(await req.json());

    // Use SDK by default
    if (body.useSDK ?? true) {
      const campaign = await createCampaignSDK(body.channelId, body.adAccountId, {
        name: body.name,
        objective: body.objective,
        status: "PAUSED",
        dailyBudget: body.dailyBudget,
        lifetimeBudget: body.lifetimeBudget,
        startTime: body.startTime,
        stopTime: body.stopTime,
      });
      // invalidate short cache by overwriting
      return NextResponse.json({ campaign });
    }

    // Fallback to manual API client
    const { syncAdCampaigns } = await import("@/lib/integrations/meta-comprehensive");
    const { MetaApiClient } = await import("@/lib/integrations/meta-client");
    const { decryptSecret } = await import("@/lib/crypto");
    const { channels } = await import("@/db/schema");
      
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, body.channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const campaign = await client.createCampaign(body.adAccountId, {
      name: body.name,
      objective: body.objective,
      daily_budget: body.dailyBudget,
      lifetime_budget: body.lifetimeBudget,
      start_time: body.startTime,
      stop_time: body.stopTime,
      status: "PAUSED",
    });

    await syncAdCampaigns(body.channelId, body.adAccountId);
      return NextResponse.json({ campaign });
  } catch (error: unknown) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { limit: 60, windowMs: 60_000 });

