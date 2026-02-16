import { NextRequest, NextResponse } from "next/server";
import { syncAdInsights } from "@/lib/integrations/meta-comprehensive";
import { db } from "@/db/db";
import { adInsights, ads, adSets, adCampaigns } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { withRateLimit } from "@/lib/middleware/rate-limiter";
import { handleApiError } from "@/lib/utils/api-error-handler";

export const GET = withRateLimit(async (req: Request) => {
  try {
    const url = new URL(req.url);
    const channelId = url.searchParams.get("channelId");
    const adAccountId = url.searchParams.get("adAccountId");
    const since = url.searchParams.get("since");
    const until = url.searchParams.get("until");
    const sync = url.searchParams.get("sync") === "true";

    if (!channelId || !adAccountId) {
      return NextResponse.json(
        { error: "channelId and adAccountId required" },
        { status: 400 }
      );
    }

    // Sync insights only if requested (prevents hammering Meta on every dashboard poll)
    if (sync) {
      await syncAdInsights(
        parseInt(channelId),
        adAccountId,
        since && until ? { since, until } : undefined
      );
    }

    // Return aggregated insights
    const insights = await db
      .select()
      .from(adInsights)
      .orderBy(desc(adInsights.date))
      .limit(100);

    // Aggregate by date
    const aggregated = insights.reduce((acc, insight) => {
      const date = insight.date.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          conversions: 0,
        };
      }
      acc[date].impressions += insight.impressions || 0;
      acc[date].clicks += insight.clicks || 0;
      acc[date].spend += insight.spend || 0;
      acc[date].reach += insight.reach || 0;
      acc[date].conversions += insight.conversions || 0;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({
      insights: Object.values(aggregated),
      raw: insights,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { limit: 120, windowMs: 60_000 });



