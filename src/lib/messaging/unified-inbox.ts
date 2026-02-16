/**
 * Unified Inbox Service
 * Handles message aggregation and sending across all platforms
 */

import { db } from "@/db/db";
import { messages, conversations, channels } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";

export interface UnifiedMessage {
  id: number;
  conversationId: number;
  platform: string;
  direction: "inbound" | "outbound";
  messageType: string;
  content: string | null;
  mediaUrl: string | null;
  timestamp: Date;
  status: string | null;
  userName?: string;
  avatar?: string;
}

export interface UnifiedConversation {
  id: number;
  channelId: number | null;
  platform: string;
  userName: string;
  lastMessage: string;
  time: Date;
  unread: boolean;
  avatar: string | null;
  unreadCount: number;
  latestMessage: UnifiedMessage | null;
}

/**
 * Get all conversations from all platforms, sorted by most recent
 */
export async function getAllConversations(): Promise<UnifiedConversation[]> {
  const allConversations = await db
    .select()
    .from(conversations)
    .orderBy(desc(conversations.time));

  const conversationsWithDetails = await Promise.all(
    allConversations.map(async (conv) => {
      // Get unread count
      const unreadMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            eq(messages.direction, "inbound"),
            eq(messages.status, "delivered") // Consider delivered messages as unread
          )
        );

      // Get latest message
      const [latestMessage] = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv.id))
        .orderBy(desc(messages.timestamp))
        .limit(1);

      return {
        ...conv,
        time: conv.time ?? new Date(),
        unread: conv.unread ?? false,
        unreadCount: unreadMessages.length,
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              conversationId: latestMessage.conversationId,
              platform: latestMessage.platform,
              direction: latestMessage.direction as "inbound" | "outbound",
              messageType: latestMessage.messageType,
              content: latestMessage.content,
              mediaUrl: latestMessage.mediaUrl,
              timestamp: latestMessage.timestamp,
              status: latestMessage.status,
            }
          : null,
      };
    })
  );

  return conversationsWithDetails;
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(
  conversationId: number
): Promise<UnifiedMessage[]> {
  const messagesList = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.timestamp); // Oldest first for chat view

  return messagesList.map((msg) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    platform: msg.platform,
    direction: msg.direction as "inbound" | "outbound",
    messageType: msg.messageType,
    content: msg.content,
    mediaUrl: msg.mediaUrl,
    timestamp: msg.timestamp,
    status: msg.status,
  }));
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  conversationId: number,
  platform: string,
  content: string,
  options?: {
    messageType?: string;
    mediaUrl?: string;
    attachments?: any[];
    quickReplies?: any[];
    channelId?: number;
  }
) {
  // Create message record
  const [newMessage] = await db
    .insert(messages)
    .values({
      conversationId,
      channelId: options?.channelId || null,
      platform,
      direction: "outbound",
      messageType: options?.messageType || "text",
      content,
      mediaUrl: options?.mediaUrl || null,
      attachments: options?.attachments
        ? JSON.parse(JSON.stringify(options.attachments))
        : null,
      quickReplies: options?.quickReplies
        ? JSON.parse(JSON.stringify(options.quickReplies))
        : null,
      status: "pending",
      timestamp: new Date(),
    })
    .returning();

  // Update conversation
  await db
    .update(conversations)
    .set({
      lastMessage: content,
      time: new Date(),
      updatedAt: new Date(),
      unread: false, // Mark as read since we're sending
    })
    .where(eq(conversations.id, conversationId));

  // Send via platform-specific API
  await sendMessageToPlatform(newMessage, platform);

  return newMessage;
}

/**
 * Send message via platform-specific API
 */
async function sendMessageToPlatform(message: any, platform: string) {
  try {
    const { sendMessageToPlatform } = await import("./platform-send");
    const result = await sendMessageToPlatform(
      message.id,
      message.conversationId,
      platform,
      message.content || "",
      {
        mediaUrl: message.mediaUrl || undefined,
        messageType: message.messageType,
        attachments: message.attachments ? JSON.parse(JSON.stringify(message.attachments)) : undefined,
        quickReplies: message.quickReplies ? JSON.parse(JSON.stringify(message.quickReplies)) : undefined,
      }
    );

    // Update message with platform message ID and status
    await db
      .update(messages)
      .set({
        status: "sent",
        platformMessageId: result.platformMessageId,
      })
      .where(eq(messages.id, message.id));
  } catch (error: any) {
    // Mark as failed
    await db
      .update(messages)
      .set({ status: "failed" })
      .where(eq(messages.id, message.id));
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markConversationAsRead(conversationId: number) {
  await db
    .update(conversations)
    .set({ unread: false })
    .where(eq(conversations.id, conversationId));

  await db
    .update(messages)
    .set({ status: "read", readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.direction, "inbound")
      )
    );
}

