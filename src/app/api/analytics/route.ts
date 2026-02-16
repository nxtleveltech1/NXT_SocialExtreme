import { db } from "@/db/db";
import { conversations as conversationsTable, posts as postsTable } from "@/db/schema";
import { desc, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Calculate KPIs from real data
    const totalPosts = await db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));

    const totalImpressions = await db
      .select({ sum: sql<number>`coalesce(sum(${postsTable.impressions}), 0)` })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));

    const totalEngagement = await db
      .select({
        likes: sql<number>`coalesce(sum(${postsTable.likes}), 0)`,
        comments: sql<number>`coalesce(sum(${postsTable.comments}), 0)`,
        shares: sql<number>`coalesce(sum(${postsTable.shares}), 0)`,
      })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));

    const totalReach = await db
      .select({ sum: sql<number>`coalesce(sum(${postsTable.reach}), 0)` })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));

    const avgResponseTime = await db
      .select({
        avg: sql<number>`coalesce(avg(extract(epoch from (${conversationsTable.time} - ${conversationsTable.createdAt})) / 60), 0)`,
      })
      .from(conversationsTable)
      .where(gte(conversationsTable.time, startDate));

    const engagementRate =
      totalReach[0]?.sum > 0
        ? ((totalEngagement[0]?.likes + totalEngagement[0]?.comments + totalEngagement[0]?.shares) /
            totalReach[0]?.sum) *
          100
        : 0;

    // Platform breakdown
    const platformStats = await db
      .select({
        platform: postsTable.platform,
        posts: sql<number>`count(*)`,
        impressions: sql<number>`coalesce(sum(${postsTable.impressions}), 0)`,
        engagement: sql<number>`coalesce(sum(${postsTable.likes} + ${postsTable.comments} + ${postsTable.shares}), 0)`,
      })
      .from(postsTable)
      .where(gte(postsTable.date, startDate))
      .groupBy(postsTable.platform);

    // Top performing posts
    const topPosts = await db
      .select()
      .from(postsTable)
      .where(gte(postsTable.date, startDate))
      .orderBy(desc(sql`${postsTable.likes} + ${postsTable.comments} + ${postsTable.shares}`))
      .limit(10);

    return NextResponse.json({
      kpis: {
        impressions: totalImpressions[0]?.sum || 0,
        engagementRate: Math.round(engagementRate * 100) / 100,
        totalPosts: totalPosts[0]?.count || 0,
        avgResponseTime: Math.round(avgResponseTime[0]?.avg || 0),
      },
      platformStats,
      topPosts: topPosts.map((p) => ({
        id: p.id,
        platform: p.platform,
        content: p.content?.substring(0, 100),
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        date: p.date,
      })),
    });
  } catch (err: any) {
    console.error("Analytics API error:", err);
    // Return default values so client doesn't break
    return NextResponse.json({
      kpis: {
        impressions: 0,
        engagementRate: 0,
        totalPosts: 0,
        avgResponseTime: 0,
      },
      platformStats: [],
      topPosts: [],
    });
  }
}

