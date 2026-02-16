import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels, posts, publishJobs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";

const SchedulePostSchema = z.object({
  channelId: z.number(),
  content: z.string().min(1),
  scheduledAt: z.string().datetime(),
  mediaUrls: z.array(z.string().url()).optional(),
  platform: z.enum(["Facebook", "Instagram"]),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const validated = SchedulePostSchema.parse(body);

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, validated.channelId))
      .limit(1);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Create post record
    const [post] = await db
      .insert(posts)
      .values({
        channelId: validated.channelId,
        platform: validated.platform,
        content: validated.content,
        scheduledAt: new Date(validated.scheduledAt),
        mediaUrls: validated.mediaUrls || [],
        status: "scheduled",
      })
      .returning();

    // Create publish job
    const [job] = await db
      .insert(publishJobs)
      .values({
        postId: post.id,
        channelId: validated.channelId,
        runAt: new Date(validated.scheduledAt),
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        content: post.content,
        scheduledAt: post.scheduledAt,
      },
      job: {
        id: job.id,
        runAt: job.runAt,
        status: job.status,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to schedule post";
    console.error("Error scheduling post:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");

    if (!channelId) {
      return NextResponse.json(
        { error: "channelId required" },
        { status: 400 }
      );
    }

    const scheduledPosts = await db
      .select()
      .from(posts)
      .where(and(
        eq(posts.channelId, parseInt(channelId)),
        eq(posts.status, "scheduled")
      ))
      .orderBy(posts.scheduledAt);

    return NextResponse.json({ posts: scheduledPosts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch scheduled posts";
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

