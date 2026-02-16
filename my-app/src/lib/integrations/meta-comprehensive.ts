/**
 * Comprehensive Meta Platform Integration
 * Handles all Meta features: Pages, Instagram, WhatsApp, Ads, Analytics, Commerce
 */

import { db } from "@/db/db";
import {
  channels as channelsTable,
  posts as postsTable,
  conversations as conversationsTable,
  adCampaigns,
  adSets,
  ads,
  adInsights,
  productCatalogs,
  products,
  whatsappConversations,
  whatsappMessages,
  pixelEvents,
  channelDailyMetrics,
  followers as followersTable,
  orders as ordersTable,
} from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { MetaApiClient } from "./meta-client";
import { eq, and, isNotNull } from "drizzle-orm";
import crypto from "node:crypto";

type ChannelRow = typeof channelsTable.$inferSelect;

/**
 * Hash data for Meta Conversions/Audience API (SHA256)
 */
function hashData(data: string): string {
  return crypto.createHash("sha256").update(data.toLowerCase().trim()).digest("hex");
}

/**
 * Get Meta API client for a channel
 */
function getMetaClient(channel: ChannelRow): MetaApiClient {
  if (!channel.accessToken) {
    throw new Error("Channel not connected or missing access token");
  }
  const accessToken = decryptSecret(channel.accessToken);
  return new MetaApiClient(accessToken);
}

// ==================== INTERACTIVE MESSAGING ====================

/**
 * Send a WhatsApp Flow to a customer
 */
export async function sendWhatsAppFlowComprehensive(
  channelId: number,
  to: string,
  params: {
    header?: string;
    body: string;
    footer?: string;
    flow_id: string;
    flow_cta: string;
    flow_token?: string;
    flow_action?: "navigate" | "data_exchange";
    flow_action_payload?: Record<string, any>;
  }
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel || channel.platform !== "WhatsApp") {
    throw new Error("WhatsApp channel not found");
  }

  const client = getMetaClient(channel);
  const phoneNumberId = channel.platformId;

  if (!phoneNumberId) {
    throw new Error("WhatsApp channel missing phone number ID");
  }

  return await client.sendWhatsAppFlow(phoneNumberId, to, params);
}

/**
 * Send a Messenger Button Template
 */
export async function sendMessengerButtons(
  channelId: number,
  recipientId: string,
  text: string,
  buttons: Array<{ type: "web_url" | "postback"; title: string; url?: string; payload?: string }>
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel || channel.platform !== "Facebook") {
    throw new Error("Facebook channel not found");
  }

  const client = getMetaClient(channel);
  const pageId = channel.platformId || "me";

  return await client.request(`/${pageId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "button",
            text,
            buttons,
          },
        },
      },
    }),
  });
}

/**
 * Sync CRM contacts to a Meta Custom Audience
 */
export async function syncCRMToMetaCustomAudience(
  channelId: number,
  adAccountId: string,
  audienceName: string,
  source: "followers" | "conversations" = "conversations"
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) throw new Error("Channel not found");
  const client = getMetaClient(channel);

  // 1. Create or Find Audience
  // For simplicity, we create a new one each time or the user provides an ID
  // In production, you'd check if it exists
  const audience = await client.createCustomAudience(adAccountId, {
    name: audienceName,
    subtype: "CUSTOM",
    customer_file_source: "USER_PROVIDED_ONLY",
  });

  const audienceId = audience.id;

  // 2. Fetch Data
  let usersToSync: any[][] = [];
  let schema: string[] = [];

  if (source === "conversations") {
    const contacts = await db
      .select()
      .from(conversationsTable)
      .where(isNotNull(conversationsTable.participantEmail));
    
    schema = ["EMAIL"];
    usersToSync = contacts.map(c => [hashData(c.participantEmail!)]);
  } else {
    // If we had emails in followers... 
    // For now, let's assume we use participantPhone from conversations too
    const contacts = await db
      .select()
      .from(conversationsTable)
      .where(isNotNull(conversationsTable.participantPhone));
    
    schema = ["PHONE"];
    usersToSync = contacts.map(c => [hashData(c.participantPhone!)]);
  }

  if (usersToSync.length === 0) {
    return { success: true, message: "No contacts to sync", audienceId };
  }

  // 3. Upload in batches of 10,000 (Meta limit)
  const batchSize = 10000;
  for (let i = 0; i < usersToSync.length; i += batchSize) {
    const batch = usersToSync.slice(i, i + batchSize);
    await client.addUsersToCustomAudience(audienceId, {
      payload: {
        schema,
        data: batch,
      },
    });
  }

  return { success: true, audienceId, count: usersToSync.length };
}

// ==================== COMMERCE ENHANCEMENTS ====================

/**
 * Sync orders from Meta Commerce Manager
 */
export async function syncCommerceOrders(channelId: number, cmsId: string) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) throw new Error("Channel not found");
  const client = getMetaClient(channel);

  const ordersData = await client.getCommerceOrders(cmsId);
  
  let synced = 0;
  for (const metaOrder of ordersData.data) {
    // 1. Map status
    let status = "pending";
    if (metaOrder.order_status?.state === "COMPLETED") status = "delivered";
    if (metaOrder.order_status?.state === "SHIPPED") status = "shipped";
    if (metaOrder.order_status?.state === "IN_PROGRESS") status = "processing";

    // 2. Upsert into orders table
    const [existingOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.platformOrderId, metaOrder.id))
      .limit(1);

    const values = {
      platformOrderId: metaOrder.id,
      phoneNumber: metaOrder.buyer_details?.email || "N/A",
      userName: metaOrder.buyer_details?.name || "Meta Buyer",
      status: status as any,
      totalAmount: Math.round(parseFloat(metaOrder.estimated_payment_details?.total_amount?.amount || "0") * 100),
      currency: metaOrder.estimated_payment_details?.total_amount?.currency || "USD",
      metadata: metaOrder,
      createdAt: new Date(metaOrder.created_time),
      updatedAt: new Date(),
    };

    const order = existingOrder
      ? await db
          .update(ordersTable)
          .set(values)
          .where(eq(ordersTable.id, existingOrder.id))
          .returning()
      : await db.insert(ordersTable).values(values).returning();

    // 3. Acknowledge if CREATED
    if (metaOrder.order_status?.state === "CREATED") {
      await client.acknowledgeOrder(metaOrder.id);
    }
    
    synced++;
  }
  
  return { success: true, ordersCount: synced };
}

/**
 * Update inventory for multiple products in Meta Catalog
 */
export async function updateMetaInventoryBatch(
  channelId: number,
  catalogId: string,
  inventoryUpdates: Array<{ retailer_id: string; inventory: number }>
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) throw new Error("Channel not found");
  const client = getMetaClient(channel);

  return await client.updateBatchInventory(catalogId, inventoryUpdates);
}

// ==================== FACEBOOK PAGES ====================

export async function syncFacebookPageComprehensive(channelId: number) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel || channel.platform !== "Facebook") {
    throw new Error("Facebook channel not found");
  }

  const client = getMetaClient(channel);
  const pageId = channel.platformId || "me";

  // Get page info
  const pageInfo = await client.getPage(pageId);

  // Sync posts
  const postsData = await client.getPagePosts(pageId, 50);
  let postsSynced = 0;
  let commentsSynced = 0;

  for (const post of postsData.data) {
    await db
      .insert(postsTable)
      .values({
        channelId: channel.id,
        platform: "Facebook",
        platformPostId: post.id,
        content: post.message || post.story || "No content",
        date: new Date(post.created_time),
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
        image: post.full_picture || null,
        mediaUrls: post.full_picture ? [post.full_picture] : [],
        status: "published",
      })
      .onConflictDoUpdate({
        target: postsTable.platformPostId,
        set: {
          content: post.message || post.story || "No content",
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          image: post.full_picture || null,
        },
      });

    postsSynced++;

    // Sync comments
    try {
      const comments = await client.getPostComments(post.id, 25);
      for (const comment of comments.data) {
        const convId = `fb_comment:${comment.id}`;
        await db
          .insert(conversationsTable)
          .values({
            platformConversationId: convId,
            userName: comment.from?.name || "Facebook User",
            platform: "Facebook",
            lastMessage: comment.message,
            time: new Date(comment.created_time),
            unread: true,
            avatar: comment.from?.name?.charAt(0) || "F",
            status: "open",
          })
          .onConflictDoUpdate({
            target: conversationsTable.platformConversationId,
            set: {
              lastMessage: comment.message,
              time: new Date(comment.created_time),
            },
          });
        commentsSynced++;
      }
    } catch (error) {
      // Ignore comment errors
    }
  }

  // Sync conversations
  try {
    const conversations = await client.getPageConversations(pageId, 25);
    for (const conv of conversations.data) {
      const convId = `fb_conv:${conv.id}`;
      const participantName =
        conv.participants?.data?.[0]?.name || "Facebook User";
      await db
        .insert(conversationsTable)
        .values({
          platformConversationId: convId,
          userName: participantName,
          platform: "Facebook",
          lastMessage: conv.snippet || "No message",
          time: new Date(conv.updated_time),
          unread: (conv.unread_count || 0) > 0,
          avatar: participantName.charAt(0) || "F",
          status: "open",
        })
        .onConflictDoUpdate({
          target: conversationsTable.platformConversationId,
          set: {
            lastMessage: conv.snippet || "No message",
            time: new Date(conv.updated_time),
            unread: (conv.unread_count || 0) > 0,
          },
        });
    }
  } catch (error) {
    // Ignore conversation errors
  }

  // Update channel
  await db
    .update(channelsTable)
    .set({
      lastSync: new Date(),
      status: "Healthy",
      followers: pageInfo.followers_count?.toString() || pageInfo.fan_count?.toString() || null,
    })
    .where(eq(channelsTable.id, channel.id));

  return {
    success: true,
    postsSynced,
    commentsSynced,
    pageInfo,
  };
}

// ==================== INSTAGRAM ====================

export async function syncInstagramComprehensive(channelId: number) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel || channel.platform !== "Instagram") {
    throw new Error("Instagram channel not found");
  }

  if (!channel.platformId) {
    throw new Error("Instagram channel missing platformId");
  }

  const client = getMetaClient(channel);

  // Get account info
  const accountInfo = await client.getInstagramAccount(channel.platformId);

  // Sync media
  const mediaData = await client.getInstagramMedia(channel.platformId, 50);
  let mediaSynced = 0;
  let commentsSynced = 0;

  for (const media of mediaData.data) {
    await db
      .insert(postsTable)
      .values({
        channelId: channel.id,
        platform: "Instagram",
        platformPostId: media.id,
        content: media.caption || "No caption",
        date: new Date(media.timestamp),
        likes: media.like_count || 0,
        comments: media.comments_count || 0,
        shares: 0,
        image: media.media_url || null,
        mediaUrls: media.media_url ? [media.media_url] : [],
        status: "published",
      })
      .onConflictDoUpdate({
        target: postsTable.platformPostId,
        set: {
          content: media.caption || "No caption",
          likes: media.like_count || 0,
          comments: media.comments_count || 0,
          image: media.media_url || null,
        },
      });

    mediaSynced++;

    // Sync comments
    try {
      const comments = await client.getInstagramComments(media.id, 25);
      for (const comment of comments.data) {
        const convId = `ig_comment:${comment.id}`;
        await db
          .insert(conversationsTable)
          .values({
            platformConversationId: convId,
            userName: comment.username || "instagram_user",
            platform: "Instagram",
            lastMessage: comment.text,
            time: new Date(comment.timestamp),
            unread: true,
            avatar: comment.username?.charAt(0) || "I",
            status: "open",
          })
          .onConflictDoUpdate({
            target: conversationsTable.platformConversationId,
            set: {
              lastMessage: comment.text,
              time: new Date(comment.timestamp),
            },
          });
        commentsSynced++;
      }
    } catch (error) {
      // Ignore comment errors
    }
  }

  // Update channel
  await db
    .update(channelsTable)
    .set({
      lastSync: new Date(),
      status: "Healthy",
      followers: accountInfo.followers_count?.toString() || null,
    })
    .where(eq(channelsTable.id, channel.id));

  return {
    success: true,
    mediaSynced,
    commentsSynced,
    accountInfo,
  };
}

// ==================== WHATSAPP ====================

export async function sendWhatsAppMessageComprehensive(
  channelId: number,
  to: string,
  message: string
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel || channel.platform !== "WhatsApp") {
    throw new Error("WhatsApp channel not found");
  }

  const client = getMetaClient(channel);
  const phoneNumberId = channel.platformId;

  if (!phoneNumberId) {
    throw new Error("WhatsApp channel missing phone number ID");
  }

  const result = await client.sendWhatsAppMessage(phoneNumberId, to, message);

  // Store message in database
  const conversationId = `wa_${to}`;
  let [conversation] = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.platformConversationId, conversationId))
    .limit(1);

  if (!conversation) {
    const [newConv] = await db
      .insert(whatsappConversations)
      .values({
        channelId: channel.id,
        phoneNumber: to,
        platformConversationId: conversationId,
        userName: to,
        lastMessage: message,
        lastMessageTime: new Date(),
        unread: false,
        status: "open",
      })
      .returning();
    conversation = newConv;
  } else {
    await db
      .update(whatsappConversations)
      .set({
        lastMessage: message,
        lastMessageTime: new Date(),
        unread: false,
      })
      .where(eq(whatsappConversations.id, conversation.id));
  }

  // Store message
  if (result.messages?.[0]?.id) {
    await db.insert(whatsappMessages).values({
      conversationId: conversation.id,
      platformMessageId: result.messages[0].id,
      direction: "outbound",
      messageType: "text",
      content: message,
      timestamp: new Date(),
      status: "sent",
    });
  }

  return result;
}

// ==================== MARKETING API ====================

export async function syncAdCampaigns(channelId: number, adAccountId: string) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const client = getMetaClient(channel);
  const campaignsData = await client.getCampaigns(adAccountId, 100);

  for (const campaign of campaignsData.data) {
    await db
      .insert(adCampaigns)
      .values({
        channelId: channel.id,
        platformCampaignId: campaign.id,
        name: campaign.name,
        objective: campaign.objective,
        status: campaign.status as any,
        dailyBudget: campaign.daily_budget,
        lifetimeBudget: campaign.lifetime_budget,
        createdAt: new Date(campaign.created_time),
      })
      .onConflictDoUpdate({
        target: adCampaigns.platformCampaignId,
        set: {
          name: campaign.name,
          status: campaign.status as any,
          dailyBudget: campaign.daily_budget,
          lifetimeBudget: campaign.lifetime_budget,
          updatedAt: new Date(),
        },
      });
  }

  return { success: true, campaignsCount: campaignsData.data.length };
}

export async function syncAdInsights(
  channelId: number,
  adAccountId: string,
  timeRange?: { since: string; until: string }
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const client = getMetaClient(channel);
  const insights = await client.getAdInsights(adAccountId, {
    level: "ad",
    time_range: timeRange,
  });

  for (const insight of insights.data) {
    // Join insights to ads via Meta's ad_id (string numeric)
    const platformAdId =
      (insight as any).ad_id ||
      null;
    if (!platformAdId) continue;

    const [ad] = await db
      .select()
      .from(ads)
      .where(eq(ads.platformAdId, platformAdId))
      .limit(1);

    if (ad) {
      await db.insert(adInsights).values({
        adId: ad.id,
        date: new Date(insight.date_start || insight.date_stop || new Date()),
        impressions: parseInt(insight.impressions || "0") || 0,
        clicks: parseInt(insight.clicks || "0") || 0,
        spend: Math.round(parseFloat(insight.spend || "0") * 100) || 0, // Convert to cents
        reach: parseInt(insight.reach || "0") || 0,
        cpm: Math.round(parseFloat(insight.cpm || "0") * 100) || 0,
        cpc: Math.round(parseFloat(insight.cpc || "0") * 100) || 0,
        ctr: Math.round(parseFloat(insight.ctr || "0") * 100) || 0,
        conversions: insight.actions?.find((a: any) => a.action_type === "purchase")
          ? parseInt(
              insight.actions.find((a: any) => a.action_type === "purchase")!.value
            )
          : 0,
        metrics: insight as any,
      }).onConflictDoNothing();
    }
  }

  return { success: true, insightsCount: insights.data.length };
}

// ==================== COMMERCE API ====================

export async function syncProductCatalogs(
  channelId: number,
  businessId: string
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const client = getMetaClient(channel);
  const catalogsData = await client.getCatalogs(businessId);

  for (const catalog of catalogsData.data) {
    await db
      .insert(productCatalogs)
      .values({
        channelId: channel.id,
        platformCatalogId: catalog.id,
        name: catalog.name,
        vertical: catalog.vertical,
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: productCatalogs.platformCatalogId,
        set: {
          name: catalog.name,
          vertical: catalog.vertical,
          updatedAt: new Date(),
        },
      });
  }

  return { success: true, catalogsCount: catalogsData.data.length };
}

export async function syncProducts(catalogId: number) {
  const [catalog] = await db
    .select()
    .from(productCatalogs)
    .where(eq(productCatalogs.id, catalogId))
    .limit(1);

  if (!catalog || !catalog.platformCatalogId) {
    throw new Error("Catalog not found");
  }

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, catalog.channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const client = getMetaClient(channel);
  const productsData = await client.getProducts(catalog.platformCatalogId, 100);

  for (const product of productsData.data) {
    await db
      .insert(products)
      .values({
        catalogId: catalog.id,
        platformProductId: product.id,
        name: product.name,
        description: product.description || null,
        price: product.price ? Math.round(parseFloat(product.price) * 100) : null,
        currency: product.currency || "USD",
        availability: product.availability || "in stock",
        imageUrl: product.image_url || null,
        url: product.url || null,
      })
      .onConflictDoUpdate({
        target: products.platformProductId,
        set: {
          name: product.name,
          description: product.description || null,
          price: product.price ? Math.round(parseFloat(product.price) * 100) : null,
          availability: product.availability || "in stock",
          imageUrl: product.image_url || null,
          url: product.url || null,
          updatedAt: new Date(),
        },
      });
  }

  return { success: true, productsCount: productsData.data.length };
}

// ==================== ANALYTICS ====================

export async function syncPageInsights(
  channelId: number,
  metric: string = "page_fans,page_impressions,page_engaged_users",
  period: "day" | "week" | "days_28" = "day",
  daysBack: number = 7
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel || channel.platform !== "Facebook") {
    throw new Error("Facebook channel not found");
  }

  if (!channel.platformId) {
    throw new Error("Channel missing platformId");
  }

  const client = getMetaClient(channel);
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const insights = await client.getPageInsights(
    channel.platformId,
    metric,
    period,
    Math.floor(since.getTime() / 1000).toString(),
    Math.floor(until.getTime() / 1000).toString()
  );

  // Store daily metrics
  for (const insight of insights.data) {
    for (const value of insight.values) {
      const date = new Date(value.end_time);
      await db
        .insert(channelDailyMetrics)
        .values({
          channelId: channel.id,
          date,
          metrics: {
            metric: insight.name,
            value: value.value,
            period: insight.period,
          },
        })
        .onConflictDoNothing();
    }
  }

  return { success: true, insightsCount: insights.data.length };
}

// ==================== CONVERSIONS API ====================

export async function trackConversionEvent(
  channelId: number,
  pixelId: string,
  eventName: string,
  userData?: {
    email?: string;
    phone?: string;
    fbp?: string;
    fbc?: string;
  },
  customData?: {
    value?: number;
    currency?: string;
    content_name?: string;
  }
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const client = getMetaClient(channel);
  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = `${pixelId}_${eventTime}_${Math.random().toString(36).substr(2, 9)}`;

  // Store event in database first
  await db.insert(pixelEvents).values({
    channelId: channel.id,
    eventName,
    eventId,
    userData: userData || {},
    customData: customData || {},
    sentToMeta: false,
    createdAt: new Date(),
  });

  // Send to Meta with Hashing
  try {
    await client.sendConversionEvent(pixelId, {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      user_data: {
        ...(userData?.email && { em: [hashData(userData.email)] }),
        ...(userData?.phone && { ph: [hashData(userData.phone)] }),
        ...(userData?.fbp && { fbp: userData.fbp }),
        ...(userData?.fbc && { fbc: userData.fbc }),
      },
      custom_data: customData,
    });

    // Update event as sent
    await db
      .update(pixelEvents)
      .set({
        sentToMeta: true,
        sentAt: new Date(),
      })
      .where(eq(pixelEvents.eventId, eventId));

    return { success: true, eventId };
  } catch (error) {
    return { success: false, error: String(error), eventId };
  }
}



