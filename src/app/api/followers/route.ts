import { db } from "@/db/db";
import { followers, channels } from "@/db/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/followers
 * Fetch followers with optional filtering by segment, platform, and search query.
 * Also returns aggregate stats for the audience dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const segment = url.searchParams.get("segment");
    const platform = url.searchParams.get("platform");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const conditions = [];

    if (segment && segment !== "All") {
      conditions.push(eq(followers.segment, segment));
    }

    if (platform) {
      conditions.push(eq(followers.platform, platform));
    }

    if (search) {
      conditions.push(
        or(
          ilike(followers.username, `%${search}%`),
          ilike(followers.displayName, `%${search}%`),
          ilike(followers.bio, `%${search}%`)
        )!
      );
    }

    const whereClause =
      conditions.length > 0
        ? conditions.length === 1
          ? conditions[0]
          : sql`${conditions.reduce((acc, cond, idx) => (idx === 0 ? cond : sql`${acc} AND ${cond}`))}`
        : undefined;

    const followersList = await db
      .select()
      .from(followers)
      .where(whereClause)
      .orderBy(desc(followers.engagementScore))
      .limit(limit)
      .offset(offset);

    // Compute aggregate stats
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(followers);

    const [vipCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(followers)
      .where(eq(followers.segment, "VIP"));

    const [localCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(followers)
      .where(eq(followers.segment, "Local"));

    // Total reach from connected channels
    const channelsList = await db.select().from(channels);
    const totalReach = channelsList.reduce((sum, ch) => {
      const count =
        parseInt(String(ch.followers || "0").replace(/,/g, "")) || 0;
      return sum + count;
    }, 0);

    const total = Number(totalCount?.count ?? 0);
    const vip = Number(vipCount?.count ?? 0);
    const local = Number(localCount?.count ?? 0);

    return NextResponse.json({
      followers: followersList,
      stats: {
        totalFollowers: total,
        totalReach,
        vipCount: vip,
        localPercent: total > 0 ? Math.round((local / total) * 100) : 0,
      },
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch followers";
    console.error("Failed to fetch followers:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
