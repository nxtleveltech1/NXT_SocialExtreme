/**
 * Platform-Specific Message Sync Services
 * Fetches messages from each platform and stores them in the unified inbox
 */

import { db } from "@/db/db";
import {
  messages,
  conversations,
  channels,
  whatsappConversations,
  whatsappMessages,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

export interface SyncResult {
  synced: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Meta (Facebook / Instagram)
// ---------------------------------------------------------------------------

export async function syncMetaMessages(
  channel: typeof channels.$inferSelect
): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    if (!channel.accessToken) {
      return { synced: 0, errors: ["Channel not connected - no access token"] };
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);
    const pageId = channel.platformId || "me";

    // Fetch recent conversations
    const convData = await client.getPageConversations(pageId, 50);

    for (const conv of convData.data) {
      const participantName =
        conv.participants?.data?.[0]?.name || "Unknown";
      const participantId = conv.participants?.data?.[0]?.id || null;
      const convPlatformId = `${channel.platform === "Instagram" ? "ig" : "fb"}_conv:${conv.id}`;

      // Upsert conversation
      let [localConv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.platformConversationId, convPlatformId))
        .limit(1);

      if (!localConv) {
        const [newConv] = await db
          .insert(conversations)
          .values({
            channelId: channel.id,
            platformConversationId: convPlatformId,
            userName: participantName,
            platform: channel.platform,
            lastMessage: conv.snippet || "",
            time: new Date(conv.updated_time),
            unread: (conv.unread_count || 0) > 0,
            avatar: participantName.charAt(0),
            participantId,
            status: "open",
          })
          .returning();
        localConv = newConv;
      } else {
        await db
          .update(conversations)
          .set({
            lastMessage: conv.snippet || localConv.lastMessage,
            time: new Date(conv.updated_time),
            unread: (conv.unread_count || 0) > 0,
            updatedAt: new Date(),
            lastSyncAt: new Date(),
          })
          .where(eq(conversations.id, localConv.id));
      }

      // Fetch messages for this conversation
      try {
        const msgData = await client.request<{
          data: Array<{
            id: string;
            message?: string;
            from?: { name: string; id: string };
            created_time: string;
            attachments?: { data: Array<{ mime_type: string; name: string; size: number }> };
          }>;
        }>(`/${conv.id}/messages?fields=id,message,from,created_time,attachments&limit=25`);

        for (const msg of msgData.data) {
          // Check for duplicate
          const [existing] = await db
            .select()
            .from(messages)
            .where(eq(messages.platformMessageId, msg.id))
            .limit(1);

          if (existing) continue;

          const isInbound = msg.from?.id !== pageId;

          await db.insert(messages).values({
            conversationId: localConv.id,
            channelId: channel.id,
            platform: channel.platform,
            platformMessageId: msg.id,
            direction: isInbound ? "inbound" : "outbound",
            messageType: msg.attachments?.data?.length ? "attachment" : "text",
            content: msg.message || null,
            timestamp: new Date(msg.created_time),
            status: "delivered",
            metadata: msg.attachments ? { attachments: msg.attachments.data } : null,
          });
          synced++;
        }
      } catch (msgErr: any) {
        errors.push(`Conversation ${conv.id}: ${msgErr.message}`);
      }
    }

    // Update channel sync timestamp
    await db
      .update(channels)
      .set({ lastSync: new Date(), status: "Healthy" })
      .where(eq(channels.id, channel.id));

    return { synced, errors };
  } catch (error: any) {
    errors.push(error.message);
    return { synced, errors };
  }
}

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

/**
 * Sync WhatsApp messages.
 *
 * WhatsApp Cloud API does NOT provide a "list messages" endpoint —
 * messages arrive exclusively via webhooks. This function:
 *   1. Reconciles whatsappMessages → unified messages table
 *   2. Ensures every whatsappConversation has a corresponding unified conversation
 */
export async function syncWhatsAppMessages(
  channel: typeof channels.$inferSelect
): Promise<SyncResult> {
  const errors: string[] = [];
  let synced = 0;

  try {
    if (!channel.accessToken) {
      return { synced: 0, errors: ["Channel not connected - no access token"] };
    }

    // Get all WA conversations for this channel
    const waConvs = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.channelId, channel.id));

    for (const waConv of waConvs) {
      // Ensure a unified conversation exists
      const unifiedConvId = `wa_unified:${waConv.platformConversationId}`;
      let [unifiedConv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.platformConversationId, unifiedConvId))
        .limit(1);

      if (!unifiedConv) {
        const [newConv] = await db
          .insert(conversations)
          .values({
            channelId: channel.id,
            platformConversationId: unifiedConvId,
            userName: waConv.userName || waConv.phoneNumber,
            platform: "WhatsApp",
            lastMessage: waConv.lastMessage || "",
            time: waConv.lastMessageTime || new Date(),
            unread: waConv.unread ?? true,
            avatar: (waConv.userName || waConv.phoneNumber).charAt(0),
            participantPhone: waConv.phoneNumber,
            status: "open",
          })
          .returning();
        unifiedConv = newConv;
      }

      // Sync WA messages → unified messages
      const waMsgs = await db
        .select()
        .from(whatsappMessages)
        .where(eq(whatsappMessages.conversationId, waConv.id));

      for (const waMsg of waMsgs) {
        if (!waMsg.platformMessageId) continue;

        const [existing] = await db
          .select()
          .from(messages)
          .where(eq(messages.platformMessageId, waMsg.platformMessageId))
          .limit(1);

        if (existing) continue;

        await db.insert(messages).values({
          conversationId: unifiedConv.id,
          channelId: channel.id,
          platform: "WhatsApp",
          platformMessageId: waMsg.platformMessageId,
          direction: waMsg.direction,
          messageType: waMsg.messageType,
          content: waMsg.content,
          mediaUrl: waMsg.mediaUrl,
          timestamp: waMsg.timestamp,
          status: waMsg.status,
          metadata: waMsg.metadata,
        });
        synced++;
      }

      // Update unified conversation with latest message
      if (waConv.lastMessage) {
        await db
          .update(conversations)
          .set({
            lastMessage: waConv.lastMessage,
            time: waConv.lastMessageTime || new Date(),
            unread: waConv.unread ?? false,
            updatedAt: new Date(),
            lastSyncAt: new Date(),
          })
          .where(eq(conversations.id, unifiedConv.id));
      }
    }

    await db
      .update(channels)
      .set({ lastSync: new Date(), status: "Healthy" })
      .where(eq(channels.id, channel.id));

    return { synced, errors };
  } catch (error: any) {
    errors.push(error.message);
    return { synced, errors };
  }
}

// ---------------------------------------------------------------------------
// TikTok (limited API — no public message sync)
// ---------------------------------------------------------------------------

export async function syncTikTokMessages(
  channel: typeof channels.$inferSelect
): Promise<SyncResult> {
  if (!channel.accessToken) {
    return { synced: 0, errors: ["Channel not connected - no access token"] };
  }

  // TikTok does not expose a message reading API for business accounts.
  return { synced: 0, errors: ["TikTok message sync unavailable — no public API"] };
}

// ---------------------------------------------------------------------------
// Helper: Store messages in DB (used by external callers)
// ---------------------------------------------------------------------------

export async function storeMessages(
  platformConversation: any,
  platformMessages: any[],
  channel: typeof channels.$inferSelect
) {
  let [conversation] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.platformConversationId, platformConversation.id),
        eq(conversations.platform, channel.platform)
      )
    )
    .limit(1);

  if (!conversation) {
    [conversation] = await db
      .insert(conversations)
      .values({
        channelId: channel.id,
        platformConversationId: platformConversation.id,
        userName:
          platformConversation.userName || platformConversation.name || "Unknown",
        platform: channel.platform,
        lastMessage: platformMessages[0]?.content || "",
        time: platformMessages[0]?.timestamp || new Date(),
        unread: true,
        avatar: platformConversation.avatar || null,
        participantId: platformConversation.participantId || null,
        participantPhone: platformConversation.phone || null,
      })
      .returning();
  }

  for (const msg of platformMessages) {
    const [existing] = await db
      .select()
      .from(messages)
      .where(eq(messages.platformMessageId, msg.id))
      .limit(1);

    if (!existing) {
      await db.insert(messages).values({
        conversationId: conversation.id,
        channelId: channel.id,
        platform: channel.platform,
        platformMessageId: msg.id,
        direction: msg.direction || "inbound",
        messageType: msg.type || "text",
        content: msg.content || msg.text,
        mediaUrl: msg.mediaUrl || msg.attachment?.url,
        timestamp: msg.timestamp || new Date(),
        status: msg.status || "delivered",
        metadata: msg.metadata
          ? JSON.parse(JSON.stringify(msg.metadata))
          : null,
      });
    }
  }

  if (platformMessages.length > 0) {
    const lastMsg = platformMessages[platformMessages.length - 1];
    await db
      .update(conversations)
      .set({
        lastMessage: lastMsg.content || lastMsg.text || "",
        time: lastMsg.timestamp || new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversation.id));
  }
}
