import { db } from "@/db/db";
import { followers } from "@/db/schema";
import { and, desc, eq, like } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const segment = searchParams.get('segment');

    const data = await db
      .select()
      .from(followers)
      .where(
        and(
          search ? like(followers.username, `%${search}%`) : undefined,
          segment && segment !== 'All' ? eq(followers.segment, segment) : undefined
        )
      )
      .orderBy(desc(followers.engagementScore));

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Follower Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch followers" }, { status: 500 });
  }
}
