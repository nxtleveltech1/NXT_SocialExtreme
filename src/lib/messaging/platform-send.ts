/**
 * Platform-Specific Message Sending Services
 * Sends messages to each platform using their respective APIs
 */

import { db } from "@/db/db";
import {
  messages,
  channels,
  conversations,
  whatsappConversations,
  whatsappMessages,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

/**
 * Send a message via the appropriate platform API
 */
export async function sendMessageToPlatform(
  messageId: number,
  conversationId: number,
  platform: string,
  content: string,
  options?: {
    mediaUrl?: string;
    messageType?: string;
    attachments?: any[];
    quickReplies?: any[];
  }
) {
  const [message] = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!message || !message.channelId) {
    throw new Error("Message or channel not found");
  }

  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, message.channelId))
    .limit(1);

  if (!channel || !channel.isConnected) {
    throw new Error("Channel not connected");
  }

  switch (platform) {
    case "Facebook":
    case "Instagram":
      return await sendMetaMessage(channel, conversationId, content, options);
    case "WhatsApp":
      return await sendWhatsAppMessage(channel, conversationId, content, options);
    case "TikTok":
      return await sendTikTokMessage(channel, conversationId, content, options);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// ---------------------------------------------------------------------------
// Meta (Facebook / Instagram Messenger)
// ---------------------------------------------------------------------------

async function sendMetaMessage(
  channel: typeof channels.$inferSelect,
  conversationId: number,
  content: string,
  options?: {
    mediaUrl?: string;
    messageType?: string;
    attachments?: any[];
    quickReplies?: any[];
  }
) {
  if (!channel.accessToken) {
    throw new Error("Channel not connected - no access token");
  }

  const accessToken = decryptSecret(channel.accessToken);
  const client = new MetaApiClient(accessToken);
  const pageId = channel.platformId || "me";

  // Resolve the recipient from the conversation
  const [conv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (!conv) throw new Error("Conversation not found");

  const recipientId = conv.participantId;
  if (!recipientId) {
    throw new Error("No participant ID on conversation — cannot send via Meta API");
  }

  // Send text or media
  if (options?.mediaUrl && options.messageType !== "text") {
    // Media message via Messenger Send API attachment
    const response = await client.request<{ recipient_id: string; message_id: string }>(
      `/${pageId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            attachment: {
              type: options.messageType === "video" ? "video" : "image",
              payload: { url: options.mediaUrl, is_reusable: true },
            },
          },
        }),
      }
    );
    return { success: true, platformMessageId: response.message_id };
  }

  // Quick replies
  if (options?.quickReplies?.length) {
    const response = await client.request<{ recipient_id: string; message_id: string }>(
      `/${pageId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: {
            text: content,
            quick_replies: options.quickReplies.map((qr: any) => ({
              content_type: "text",
              title: qr.title || qr,
              payload: qr.payload || qr.title || qr,
            })),
          },
        }),
      }
    );
    return { success: true, platformMessageId: response.message_id };
  }

  // Plain text
  const response = await client.sendMessage(recipientId, content, pageId);
  return { success: true, platformMessageId: response.message_id };
}

// ---------------------------------------------------------------------------
// WhatsApp (Meta Cloud API)
// ---------------------------------------------------------------------------

async function sendWhatsAppMessage(
  channel: typeof channels.$inferSelect,
  conversationId: number,
  content: string,
  options?: {
    mediaUrl?: string;
    messageType?: string;
    attachments?: any[];
    quickReplies?: any[];
  }
) {
  if (!channel.accessToken) {
    throw new Error("WhatsApp channel not connected — no access token");
  }

  const accessToken = decryptSecret(channel.accessToken);
  const client = new MetaApiClient(accessToken);
  const phoneNumberId = channel.platformId;

  if (!phoneNumberId) {
    throw new Error("WhatsApp channel missing phone number ID (platformId)");
  }

  // Resolve recipient phone from whatsappConversations or unified conversations
  let recipientPhone: string | null = null;

  // Try WhatsApp-specific conversations first
  const waConvs = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.id, conversationId))
    .limit(1);

  if (waConvs.length && waConvs[0].phoneNumber) {
    recipientPhone = waConvs[0].phoneNumber;
  } else {
    // Fall back to unified conversations
    const [conv] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1);

    if (conv?.participantPhone) {
      recipientPhone = conv.participantPhone;
    }
  }

  if (!recipientPhone) {
    throw new Error("Cannot resolve recipient phone number for WhatsApp message");
  }

  // Send media
  if (options?.mediaUrl && options.messageType && options.messageType !== "text") {
    const mediaType = options.messageType as "image" | "video" | "document" | "audio";
    const result = await client.sendWhatsAppMedia(
      phoneNumberId,
      recipientPhone,
      mediaType,
      options.mediaUrl,
      content || undefined
    );
    const messageId = result.messages?.[0]?.id;
    await storeOutboundWhatsAppMessage(channel.id, conversationId, recipientPhone, content, messageId);
    return { success: true, platformMessageId: messageId };
  }

  // Send interactive (quick replies as buttons)
  if (options?.quickReplies?.length) {
    const buttons = options.quickReplies.slice(0, 3).map((qr: any, i: number) => ({
      type: "reply",
      reply: {
        id: `btn_${i}`,
        title: (typeof qr === "string" ? qr : qr.title || qr.payload).slice(0, 20),
      },
    }));

    const result = await client.sendWhatsAppInteractive(phoneNumberId, recipientPhone, {
      type: "button",
      body: { text: content },
      action: { buttons },
    });
    const messageId = result.messages?.[0]?.id;
    await storeOutboundWhatsAppMessage(channel.id, conversationId, recipientPhone, content, messageId);
    return { success: true, platformMessageId: messageId };
  }

  // Plain text
  const result = await client.sendWhatsAppMessage(phoneNumberId, recipientPhone, content);
  const messageId = result.messages?.[0]?.id;
  await storeOutboundWhatsAppMessage(channel.id, conversationId, recipientPhone, content, messageId);
  return { success: true, platformMessageId: messageId };
}

/**
 * Store outbound WhatsApp message in both WA-specific and unified tables
 */
async function storeOutboundWhatsAppMessage(
  channelId: number,
  conversationId: number,
  phone: string,
  content: string,
  platformMessageId?: string
) {
  // Find or create WhatsApp conversation
  const waConvId = `wa_${phone}`;
  let [waConv] = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.platformConversationId, waConvId))
    .limit(1);

  if (!waConv) {
    const [newConv] = await db
      .insert(whatsappConversations)
      .values({
        channelId,
        phoneNumber: phone,
        platformConversationId: waConvId,
        userName: phone,
        lastMessage: content,
        lastMessageTime: new Date(),
        unread: false,
        status: "open",
      })
      .returning();
    waConv = newConv;
  } else {
    await db
      .update(whatsappConversations)
      .set({ lastMessage: content, lastMessageTime: new Date(), unread: false })
      .where(eq(whatsappConversations.id, waConv.id));
  }

  // Store message
  if (platformMessageId) {
    await db.insert(whatsappMessages).values({
      conversationId: waConv.id,
      platformMessageId,
      direction: "outbound",
      messageType: "text",
      content,
      timestamp: new Date(),
      status: "sent",
    });
  }
}

// ---------------------------------------------------------------------------
// TikTok (placeholder — TikTok DM API is restricted)
// ---------------------------------------------------------------------------

async function sendTikTokMessage(
  channel: typeof channels.$inferSelect,
  _conversationId: number,
  _content: string,
  _options?: any
) {
  if (!channel.accessToken) {
    throw new Error("Channel not connected - no access token");
  }

  // TikTok does not expose a public messaging API for businesses yet.
  // The Send API is limited to verified partners.
  throw new Error(
    "TikTok messaging is not available via public API. Use TikTok's native inbox or apply for partner access."
  );
}
