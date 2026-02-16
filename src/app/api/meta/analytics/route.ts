import { NextRequest, NextResponse } from "next/server";
import { syncPageInsights, syncInstagramComprehensive } from "@/lib/integrations/meta-comprehensive";
import { db } from "@/db/db";
import { channels, channelDailyMetrics, posts } from "@/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const metric = searchParams.get("metric");
    const period = (searchParams.get("period") || "day") as "day" | "week" | "days_28" | "lifetime";
    const daysBack = parseInt(searchParams.get("daysBack") || "7");
    const sync = searchParams.get("sync") === "true";

    if (!channelId) {
      return NextResponse.json({ error: "channelId required" }, { status: 400 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, parseInt(channelId)))
      .limit(1);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Sync insights if requested
    if (sync) {
      if (channel.platform === "Facebook") {
        const defaultMetric = metric || "page_fans,page_impressions,page_engaged_users,page_reach,page_views";
        await syncPageInsights(parseInt(channelId), defaultMetric, period, daysBack);
      } else if (channel.platform === "Instagram") {
        await syncInstagramComprehensive(parseInt(channelId));
      }
    }

    // Fetch stored metrics
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const metrics = await db
      .select()
      .from(channelDailyMetrics)
      .where(
        and(
          eq(channelDailyMetrics.channelId, parseInt(channelId)),
          gte(channelDailyMetrics.date, since)
        )
      )
      .orderBy(desc(channelDailyMetrics.date));

    // Aggregate metrics by date
    const aggregated: Record<string, Record<string, number>> = {};
    for (const m of metrics) {
      const date = m.date.toISOString().split("T")[0];
      if (!aggregated[date]) {
        aggregated[date] = {};
      }
      const metricName = (m.metrics as any)?.metric || "unknown";
      const value = typeof (m.metrics as any)?.value === "number" 
        ? (m.metrics as any).value 
        : typeof (m.metrics as any)?.value === "object" 
          ? Object.values((m.metrics as any).value)[0] || 0
          : 0;
      aggregated[date][metricName] = (aggregated[date][metricName] || 0) + value;
    }

    // Get recent posts for engagement metrics
    const recentPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.channelId, parseInt(channelId)))
      .orderBy(desc(posts.date))
      .limit(10);

    // Calculate engagement rate
    const totalEngagement = recentPosts.reduce((sum, post) => 
      sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0), 0
    );
    const totalReach = recentPosts.reduce((sum, post) => sum + (post.reach || 0), 0);
    const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    // Get platform-specific insights
    let platformInsights: Record<string, any> = {};
    if (channel.platform === "Instagram" && channel.platformId) {
      try {
        const client = new MetaApiClient(decryptSecret(channel.accessToken!));
        const igInsights = await client.getInstagramInsights(
          channel.platformId,
          "impressions,reach,profile_views,follower_count",
          period,
          Math.floor(since.getTime() / 1000).toString(),
          Math.floor(Date.now() / 1000).toString()
        );
        platformInsights = {
          impressions: igInsights.data.find((d: any) => d.name === "impressions")?.values?.[0]?.value || 0,
          reach: igInsights.data.find((d: any) => d.name === "reach")?.values?.[0]?.value || 0,
          profileViews: igInsights.data.find((d: any) => d.name === "profile_views")?.values?.[0]?.value || 0,
          followerCount: igInsights.data.find((d: any) => d.name === "follower_count")?.values?.[0]?.value || 0,
        };
      } catch (error) {
        console.error("Error fetching Instagram insights:", error);
      }
    }

    return NextResponse.json({
      channelId: parseInt(channelId),
      platform: channel.platform,
      metrics: Object.entries(aggregated).map(([date, values]) => ({ date, ...values })),
      summary: {
        engagementRate: Math.round(engagementRate * 100) / 100,
        totalPosts: recentPosts.length,
        totalEngagement,
        totalReach,
        ...platformInsights,
      },
      recentPosts: recentPosts.map((p) => ({
        id: p.id,
        content: p.content,
        date: p.date,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        reach: p.reach,
        impressions: p.impressions,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}



