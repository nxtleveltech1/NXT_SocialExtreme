import { db } from "@/db/db";
import { messages, conversations } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/messages
 * Get messages for a conversation or all conversations
 */
export async function GET(req: Request) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    const conversationId = url.searchParams.get("conversationId");
    const platform = url.searchParams.get("platform");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (conversationId) {
      // Get messages for a specific conversation
      const messagesList = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, parseInt(conversationId)))
        .orderBy(desc(messages.timestamp))
        .limit(limit);

      return NextResponse.json({ messages: messagesList });
    }

    // Get all conversations with their latest message
    const allConversations = await db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.time));

    const conversationsWithMessages = await Promise.all(
      allConversations.map(async (conv) => {
        const [latestMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.timestamp))
          .limit(1);

        return {
          ...conv,
          latestMessage: latestMessage || null,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithMessages });
  } catch (error: any) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Send a message to a conversation
 */
export async function POST(req: Request) {
  try {
    await requireAuth();

    const body = await req.json();
    const {
      conversationId,
      channelId,
      platform,
      content,
      messageType = "text",
      mediaUrl,
      attachments,
      quickReplies,
    } = body;

    if (!conversationId || !platform || !content) {
      return NextResponse.json(
        { error: "Missing required fields: conversationId, platform, content" },
        { status: 400 }
      );
    }

    // Create the message record
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId: parseInt(conversationId),
        channelId: channelId ? parseInt(channelId) : null,
        platform,
        direction: "outbound",
        messageType,
        content,
        mediaUrl,
        attachments: attachments ? JSON.parse(JSON.stringify(attachments)) : null,
        quickReplies: quickReplies ? JSON.parse(JSON.stringify(quickReplies)) : null,
        status: "pending",
        timestamp: new Date(),
      })
      .returning();

    // Update conversation's last message and timestamp
    await db
      .update(conversations)
      .set({
        lastMessage: content,
        time: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, parseInt(conversationId)));

    // Send the message via platform-specific service
    // This will be handled by the message sync service
    // For now, we'll mark it as sent
    await db
      .update(messages)
      .set({ status: "sent" })
      .where(eq(messages.id, newMessage.id));

    return NextResponse.json({ message: newMessage, success: true });
  } catch (error: any) {
    console.error("Failed to send message:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    );
  }
}

