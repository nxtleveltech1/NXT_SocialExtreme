import { db } from "@/db/db";
import { conversations as conversationsTable, channels as channelsTable, messages as messagesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { decryptSecret } from "@/lib/crypto";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { conversationId, message } = await req.json();

    if (!conversationId || !message) {
      return NextResponse.json({ error: "Missing conversationId or message" }, { status: 400 });
    }

    // Fetch conversation
    const [conversation] = await db
      .select()
      .from(conversationsTable)
      .where(eq(conversationsTable.id, parseInt(conversationId)))
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (!conversation.channelId) {
      return NextResponse.json({ error: "Conversation missing channelId" }, { status: 400 });
    }

    // Fetch channel
    const [channel] = await db
      .select()
      .from(channelsTable)
      .where(eq(channelsTable.id, conversation.channelId))
      .limit(1);

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!channel.accessToken) {
      return NextResponse.json({ error: "Channel missing access token" }, { status: 400 });
    }

    // Decrypt access token
    const accessToken = decryptSecret(channel.accessToken);

    // Route to platform-specific reply handler
    if (conversation.platform === "Facebook" || conversation.platform === "Instagram") {
      return await replyToMeta(conversation, channel, message, accessToken, userId);
    }

    if (conversation.platform === "WhatsApp") {
      return await replyToWhatsApp(conversation, channel, message, accessToken, userId);
    }

    if (conversation.platform === "TikTok") {
      return NextResponse.json(
        { error: "TikTok comment replies not yet supported via API" },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: `Reply not supported for platform: ${conversation.platform}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reply failed";
    console.error("Reply API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function replyToMeta(
  conversation: typeof conversationsTable.$inferSelect,
  channel: typeof channelsTable.$inferSelect,
  message: string,
  accessToken: string,
  userId: string
) {
  const convId = conversation.platformConversationId;
  if (!convId) {
    throw new Error("Conversation missing platformConversationId");
  }

  const isComment = convId.startsWith("fb_comment:") || convId.startsWith("ig_comment:");

  let apiResponse: Response;
  let platformMessageId: string | null = null;

  if (isComment) {
    // Reply to comment
    const commentId = convId.split(":")[1];
    if (!commentId) {
      throw new Error("Invalid conversation ID format");
    }

    apiResponse = await fetch(`${FB_GRAPH_URL}/${commentId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        access_token: accessToken,
      }),
    });

    const responseData = await apiResponse.json();
    if (!apiResponse.ok) {
      throw new Error(`Meta API error: ${responseData.error?.message || JSON.stringify(responseData)}`);
    }

    platformMessageId = responseData.id || null;
  } else {
    // Reply to direct message
    if (!conversation.participantId) {
      throw new Error("Conversation missing participantId for DM reply");
    }

    apiResponse = await fetch(`${FB_GRAPH_URL}/me/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: conversation.participantId },
        message: { text: message },
        access_token: accessToken,
      }),
    });

    const responseData = await apiResponse.json();
    if (!apiResponse.ok) {
      throw new Error(`Meta API error: ${responseData.error?.message || JSON.stringify(responseData)}`);
    }

    platformMessageId = responseData.message_id || null;
  }

  // Store outbound message
  const [savedMessage] = await db
    .insert(messagesTable)
    .values({
      conversationId: conversation.id,
      channelId: channel.id,
      platform: conversation.platform,
      platformMessageId,
      direction: "outbound",
      messageType: "text",
      content: message,
      status: "sent",
      timestamp: new Date(),
    })
    .returning();

  // Update conversation
  await db
    .update(conversationsTable)
    .set({
      unread: false,
      status: "replied",
      assignedTo: userId,
      lastMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(conversationsTable.id, conversation.id));

  return NextResponse.json({
    success: true,
    message: savedMessage,
  });
}

async function replyToWhatsApp(
  conversation: typeof conversationsTable.$inferSelect,
  channel: typeof channelsTable.$inferSelect,
  message: string,
  accessToken: string,
  userId: string
) {
  if (!channel.platformId) {
    throw new Error("Channel missing platformId for WhatsApp");
  }

  // Get recipient phone number
  const recipientPhone = conversation.participantPhone || conversation.participantId;
  if (!recipientPhone) {
    throw new Error("Conversation missing participantPhone or participantId for WhatsApp");
  }

  // WhatsApp Cloud API endpoint
  const apiResponse = await fetch(`${FB_GRAPH_URL}/${channel.platformId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipientPhone,
      type: "text",
      text: {
        body: message,
      },
    }),
  });

  const responseData = await apiResponse.json();
  if (!apiResponse.ok) {
    throw new Error(`WhatsApp API error: ${responseData.error?.message || JSON.stringify(responseData)}`);
  }

  const platformMessageId = responseData.messages?.[0]?.id || null;

  // Store outbound message
  const [savedMessage] = await db
    .insert(messagesTable)
    .values({
      conversationId: conversation.id,
      channelId: channel.id,
      platform: "WhatsApp",
      platformMessageId,
      direction: "outbound",
      messageType: "text",
      content: message,
      status: "sent",
      timestamp: new Date(),
    })
    .returning();

  // Update conversation
  await db
    .update(conversationsTable)
    .set({
      unread: false,
      status: "replied",
      assignedTo: userId,
      lastMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(conversationsTable.id, conversation.id));

  return NextResponse.json({
    success: true,
    message: savedMessage,
  });
}

