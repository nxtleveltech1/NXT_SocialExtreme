/**
 * WhatsApp Broadcast Campaign Engine
 * Handles campaign creation, scheduling, execution, and delivery tracking.
 *
 * Architecture:
 *   Campaign → Template → Recipients → Send Loop → Track Delivery
 */

import { db } from "@/db/db";
import {
  broadcastCampaigns,
  messageTemplates,
  channels,
  whatsappConversations,
  whatsappMessages,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CampaignCreateInput {
  channelId: number;
  name: string;
  templateId?: number;
  recipients: string[]; // phone numbers
  scheduledAt?: Date;
  customMessage?: string; // text fallback if no template
  templateParams?: Record<string, string>;
}

export interface CampaignResult {
  campaignId: number;
  sent: number;
  failed: number;
  errors: Array<{ recipient: string; error: string }>;
}

export interface DeliveryStatus {
  recipient: string;
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Template Management
// ---------------------------------------------------------------------------

/**
 * Sync approved WhatsApp templates from Meta into the database
 */
export async function syncWhatsAppTemplates(channelId: number): Promise<number> {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel?.accessToken) throw new Error("Channel not connected");

  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  if (!wabaId) throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID not set");

  const accessToken = decryptSecret(channel.accessToken);
  const client = new MetaApiClient(accessToken);

  const result = await client.request<{
    data: Array<{
      name: string;
      status: string;
      language: string;
      category: string;
      id: string;
      components: any[];
    }>;
  }>(`/${wabaId}/message_templates?fields=name,status,language,category,id,components&limit=100`);

  let synced = 0;

  for (const tmpl of result.data) {
    const existing = await db
      .select()
      .from(messageTemplates)
      .where(
        and(
          eq(messageTemplates.channelId, channelId),
          eq(messageTemplates.templateName, tmpl.name),
          eq(messageTemplates.language, tmpl.language)
        )
      )
      .limit(1);

    if (existing.length) {
      await db
        .update(messageTemplates)
        .set({
          templateId: tmpl.id,
          category: tmpl.category,
          status: tmpl.status.toLowerCase(),
          content: { components: tmpl.components },
          updatedAt: new Date(),
        })
        .where(eq(messageTemplates.id, existing[0].id));
    } else {
      await db.insert(messageTemplates).values({
        channelId,
        platform: "WhatsApp",
        templateName: tmpl.name,
        templateId: tmpl.id,
        category: tmpl.category,
        language: tmpl.language,
        content: { components: tmpl.components },
        status: tmpl.status.toLowerCase(),
      });
    }
    synced++;
  }

  return synced;
}

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new broadcast campaign
 */
export async function createCampaign(input: CampaignCreateInput): Promise<number> {
  const [campaign] = await db
    .insert(broadcastCampaigns)
    .values({
      channelId: input.channelId,
      name: input.name,
      platform: "WhatsApp",
      templateId: input.templateId ?? null,
      recipients: input.recipients,
      status: input.scheduledAt ? "scheduled" : "draft",
      scheduledAt: input.scheduledAt ?? null,
      sentCount: 0,
      failedCount: 0,
    })
    .returning();

  return campaign.id;
}

/**
 * Get campaign with details
 */
export async function getCampaign(campaignId: number) {
  const [campaign] = await db
    .select()
    .from(broadcastCampaigns)
    .where(eq(broadcastCampaigns.id, campaignId))
    .limit(1);

  if (!campaign) throw new Error("Campaign not found");

  let template = null;
  if (campaign.templateId) {
    const [tmpl] = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, campaign.templateId))
      .limit(1);
    template = tmpl ?? null;
  }

  return { ...campaign, template };
}

// ---------------------------------------------------------------------------
// Campaign Execution
// ---------------------------------------------------------------------------

/**
 * Execute a broadcast campaign — sends messages to all recipients
 */
export async function executeCampaign(
  campaignId: number,
  options?: { templateParams?: Record<string, string>; customMessage?: string }
): Promise<CampaignResult> {
  const campaign = await getCampaign(campaignId);

  if (campaign.status === "completed") {
    throw new Error("Campaign already completed");
  }

  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, campaign.channelId))
    .limit(1);

  if (!channel?.accessToken || !channel.platformId) {
    throw new Error("Channel not connected or missing phone number ID");
  }

  const accessToken = decryptSecret(channel.accessToken);
  const client = new MetaApiClient(accessToken);
  const phoneNumberId = channel.platformId;

  // Mark as sending
  await db
    .update(broadcastCampaigns)
    .set({ status: "sending", updatedAt: new Date() })
    .where(eq(broadcastCampaigns.id, campaignId));

  const recipients = (campaign.recipients as string[]) || [];
  let sent = 0;
  let failed = 0;
  const errors: Array<{ recipient: string; error: string }> = [];

  for (const recipient of recipients) {
    try {
      let messageId: string | undefined;

      if (campaign.template) {
        // Template message
        const components = options?.templateParams
          ? [
              {
                type: "body" as const,
                parameters: Object.values(options.templateParams).map((v) => ({
                  type: "text" as const,
                  text: String(v),
                })),
              },
            ]
          : undefined;

        const result = await client.sendWhatsAppTemplate(
          phoneNumberId,
          recipient,
          campaign.template.templateName,
          campaign.template.language || "en",
          components
        );
        messageId = result.messages?.[0]?.id;
      } else if (options?.customMessage) {
        // Text message (only works in 24-hour window)
        const result = await client.sendWhatsAppMessage(
          phoneNumberId,
          recipient,
          options.customMessage
        );
        messageId = result.messages?.[0]?.id;
      } else {
        errors.push({ recipient, error: "No template or message provided" });
        failed++;
        continue;
      }

      // Store in WhatsApp tables
      await storeOutboundMessage(channel.id, recipient, messageId, campaign.template?.templateName);

      sent++;
    } catch (err: any) {
      errors.push({ recipient, error: err.message });
      failed++;
    }

    // Rate limiting: ~80 messages/second is the Meta limit, but play it safe
    if (sent % 50 === 0) {
      await sleep(1000);
    }
  }

  // Update campaign status
  await db
    .update(broadcastCampaigns)
    .set({
      status: failed === recipients.length ? "failed" : "completed",
      sentCount: sent,
      failedCount: failed,
      updatedAt: new Date(),
    })
    .where(eq(broadcastCampaigns.id, campaignId));

  return { campaignId, sent, failed, errors };
}

// ---------------------------------------------------------------------------
// Delivery Tracking
// ---------------------------------------------------------------------------

/**
 * Update message delivery status from webhook events.
 * Called from the webhook handler when status updates arrive.
 */
export async function updateDeliveryStatus(
  platformMessageId: string,
  status: "sent" | "delivered" | "read" | "failed",
  timestamp?: Date
) {
  // Update in WhatsApp messages table
  const [waMsg] = await db
    .select()
    .from(whatsappMessages)
    .where(eq(whatsappMessages.platformMessageId, platformMessageId))
    .limit(1);

  if (waMsg) {
    await db
      .update(whatsappMessages)
      .set({
        status,
        metadata: {
          ...(waMsg.metadata as Record<string, any> || {}),
          [`${status}_at`]: (timestamp || new Date()).toISOString(),
        },
      })
      .where(eq(whatsappMessages.id, waMsg.id));
  }
}

/**
 * Get delivery stats for a campaign
 */
export async function getCampaignDeliveryStats(campaignId: number) {
  const campaign = await getCampaign(campaignId);
  const recipients = (campaign.recipients as string[]) || [];

  // Get all outbound messages for these recipients from this channel
  const stats = {
    total: recipients.length,
    sent: campaign.sentCount || 0,
    failed: campaign.failedCount || 0,
    delivered: 0,
    read: 0,
  };

  // Count delivery statuses from WA messages
  for (const phone of recipients) {
    const waConvId = `wa_${phone}`;
    const [waConv] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.platformConversationId, waConvId))
      .limit(1);

    if (!waConv) continue;

    const msgs = await db
      .select()
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.conversationId, waConv.id),
          eq(whatsappMessages.direction, "outbound")
        )
      );

    for (const msg of msgs) {
      if (msg.status === "read") stats.read++;
      else if (msg.status === "delivered") stats.delivered++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function storeOutboundMessage(
  channelId: number,
  phone: string,
  platformMessageId?: string,
  templateName?: string
) {
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
        lastMessage: templateName ? `[Template: ${templateName}]` : "Message sent",
        lastMessageTime: new Date(),
        unread: false,
        status: "open",
      })
      .returning();
    waConv = newConv;
  }

  if (platformMessageId) {
    await db.insert(whatsappMessages).values({
      conversationId: waConv.id,
      platformMessageId,
      direction: "outbound",
      messageType: templateName ? "template" : "text",
      content: templateName ? `[Template: ${templateName}]` : null,
      timestamp: new Date(),
      status: "sent",
    });
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
