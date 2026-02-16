import { db } from "@/db/db";
import { channels, posts, publishJobs } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const channelId = url.searchParams.get("channelId");
  const limit = parseInt(url.searchParams.get("limit") || "100");

  const rows = await db
    .select()
    .from(posts)
    .where(
      and(
        status ? eq(posts.status, status) : undefined,
        channelId ? eq(posts.channelId, parseInt(channelId)) : undefined
      )
    )
    .orderBy(desc(posts.date))
    .limit(limit);

  return NextResponse.json({ posts: rows });
}

type CreatePostBody = {
  channelId: number;
  platform: string;
  content: string;
  mediaUrls?: string[];
  image?: string | null;
  status?: "draft" | "scheduled" | "published";
  scheduledAt?: string | null; // ISO
};

export async function POST(req: Request) {

  const body = (await req.json()) as Partial<CreatePostBody>;
  const channelId = Number(body.channelId);
  if (!Number.isFinite(channelId)) {
    return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
  }
  if (!body.platform || typeof body.platform !== "string") {
    return NextResponse.json({ error: "Platform required" }, { status: 400 });
  }
  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  const status = body.status ?? (body.scheduledAt ? "scheduled" : "draft");
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (body.scheduledAt && isNaN(scheduledAt!.getTime())) {
    return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
  }

  const [created] = await db
    .insert(posts)
    .values({
      channelId,
      platform: body.platform,
      content: body.content,
      image: body.image ?? (body.mediaUrls?.[0] ?? null),
      mediaUrls: body.mediaUrls ?? [],
      status,
      scheduledAt: status === "scheduled" ? scheduledAt : null,
      aiGenerated: false,
    })
    .returning();

  if (status === "scheduled") {
    const runAt = scheduledAt ?? new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(publishJobs).values({
      postId: created.id,
      channelId,
      runAt,
      status: "pending",
    });
  }

  return NextResponse.json(created);
}


