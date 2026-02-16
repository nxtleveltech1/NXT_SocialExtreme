import { db } from "@/db/db";
import { conversations as conversationsTable, posts as postsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { conversationId, message } = await req.json();

    if (!conversationId || !message) {
      return NextResponse.json({ error: "Missing conversationId or message" }, { status: 400 });
    }

    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, parseInt(conversationId)))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Find the channel for this conversation
    const [channel] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.platform, conversation.platform))
      .limit(1);

    // For now, we'll reply based on platform
    // Meta: Reply to comments or messages
    // TikTok: Reply to comments (if API supports it)

    if (conversation.platform === "Facebook" || conversation.platform === "Instagram") {
      return await replyToMeta(conversation, message, "system");
    }

    if (conversation.platform === "TikTok") {
      // TikTok comment replies may require additional API support
      return NextResponse.json(
        { error: "TikTok comment replies not yet supported via API" },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: `Reply not supported for platform: ${conversation.platform}` }, { status: 400 });
  } catch (err: any) {
    console.error("Reply API error:", err);
    return NextResponse.json({ error: err?.message ?? "Reply failed" }, { status: 500 });
  }
}

async function replyToMeta(conversation: typeof conversationsTable.$inferSelect, message: string, userId: string) {
  // Extract comment ID from platformConversationId (format: fb_comment:123 or ig_comment:456)
  const convId = conversation.platformConversationId;
  if (!convId) {
    throw new Error("Conversation missing platformConversationId");
  }

  const isComment = convId.startsWith("fb_comment:") || convId.startsWith("ig_comment:");
  if (!isComment) {
    // For messages/conversations, we'd need the channel's access token
    // This is a simplified version - full implementation would fetch channel and decrypt token
    return NextResponse.json(
      { error: "Message replies require channel connection. Use the platform's native messaging." },
      { status: 501 }
    );
  }

  const commentId = convId.split(":")[1];
  if (!commentId) {
    throw new Error("Invalid conversation ID format");
  }

  // To reply to a comment, we need:
  // 1. The post ID (from the comment's parent)
  // 2. The channel's access token
  // For now, we'll return a placeholder - full implementation requires fetching the post and channel

  // Mark conversation as replied
  await db
    .update(conversationsTable)
    .set({
      unread: false,
      status: "replied",
      assignedTo: "system",
    })
    .where(eq(conversationsTable.id, conversation.id));

  return NextResponse.json({
    success: true,
    message: "Reply queued (full API integration requires post/channel lookup)",
  });
}

