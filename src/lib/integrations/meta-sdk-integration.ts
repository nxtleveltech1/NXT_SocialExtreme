/**
 * Meta Business SDK Integration Functions
 * Uses the official Meta Business SDK for better type safety and features
 */

import { db } from "@/db/db";
import {
  channels as channelsTable,
  adCampaigns,
  adSets,
  ads,
  adInsights,
  productCatalogs,
  products,
} from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { MetaBusinessSDK } from "./meta-sdk";
import { eq } from "drizzle-orm";
import { env } from "@/lib/env";

type ChannelRow = typeof channelsTable.$inferSelect;

/**
 * Get Meta Business SDK instance for a channel
 */
function getMetaSDK(channel: ChannelRow): MetaBusinessSDK {
  if (!channel.accessToken) {
    throw new Error("Channel not connected or missing access token");
  }
  const accessToken = decryptSecret(channel.accessToken);
  
  return new MetaBusinessSDK({
    accessToken,
    appId: env.META_APP_ID || undefined,
    appSecret: env.META_APP_SECRET || undefined,
  });
}

// ==================== CAMPAIGN MANAGEMENT ====================

/**
 * Sync campaigns using SDK
 */
export async function syncCampaignsSDK(channelId: number, adAccountId: string) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const sdk = getMetaSDK(channel);
  const campaignsData = await sdk.getCampaigns(adAccountId);

  const campaigns = [];
  for await (const campaign of campaignsData) {
    campaigns.push({
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      daily_budget: campaign.daily_budget,
      lifetime_budget: campaign.lifetime_budget,
      created_time: campaign.created_time,
    });

    // Store in database
    await db
      .insert(adCampaigns)
      .values({
        channelId: channel.id,
        platformCampaignId: campaign.id,
        name: campaign.name || "",
        objective: campaign.objective || "",
        status: (campaign.status || "PAUSED") as any,
        dailyBudget: campaign.daily_budget ? parseInt(campaign.daily_budget) : null,
        lifetimeBudget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) : null,
        createdAt: campaign.created_time ? new Date(campaign.created_time) : new Date(),
      })
      .onConflictDoUpdate({
        target: adCampaigns.platformCampaignId,
        set: {
          name: campaign.name || "",
          status: (campaign.status || "PAUSED") as any,
          dailyBudget: campaign.daily_budget ? parseInt(campaign.daily_budget) : null,
          lifetimeBudget: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) : null,
          updatedAt: new Date(),
        },
      });
  }

  return { success: true, campaignsCount: campaigns.length, campaigns };
}

/**
 * Create campaign using SDK
 */
export async function createCampaignSDK(
  channelId: number,
  adAccountId: string,
  params: {
    name: string;
    objective: string;
    status?: "ACTIVE" | "PAUSED";
    dailyBudget?: number;
    lifetimeBudget?: number;
    startTime?: string;
    stopTime?: string;
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

  const sdk = getMetaSDK(channel);
  const campaign = await sdk.createCampaign(adAccountId, {
    name: params.name,
    objective: params.objective,
    status: params.status,
    daily_budget: params.dailyBudget,
    lifetime_budget: params.lifetimeBudget,
    start_time: params.startTime,
    stop_time: params.stopTime,
  });

  // Sync to get full data
  await syncCampaignsSDK(channelId, adAccountId);

  return campaign;
}

// ==================== AD SET MANAGEMENT ====================

/**
 * Sync ad sets using SDK
 */
export async function syncAdSetsSDK(
  channelId: number,
  adAccountId: string,
  campaignId?: string
) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const sdk = getMetaSDK(channel);
  const adSetsData = await sdk.getAdSets(adAccountId, campaignId);

  const adSets = [];
  for await (const adSet of adSetsData) {
    adSets.push({
      id: adSet.id,
      name: adSet.name,
      campaign_id: adSet.campaign_id,
      optimization_goal: adSet.optimization_goal,
      status: adSet.status,
      daily_budget: adSet.daily_budget,
    });

    // Find campaign in DB
    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.platformCampaignId, adSet.campaign_id || ""))
      .limit(1);

    if (campaign) {
      await db
        .insert(adSets)
        .values({
          campaignId: campaign.id,
          platformAdSetId: adSet.id,
          name: adSet.name || "",
          status: (adSet.status || "PAUSED") as any,
          dailyBudget: adSet.daily_budget ? parseInt(adSet.daily_budget) : null,
          optimizationGoal: adSet.optimization_goal || "",
          billingEvent: "IMPRESSIONS", // Default, should be fetched
        })
        .onConflictDoUpdate({
          target: adSets.platformAdSetId,
          set: {
            name: adSet.name || "",
            status: (adSet.status || "PAUSED") as any,
            dailyBudget: adSet.daily_budget ? parseInt(adSet.daily_budget) : null,
            updatedAt: new Date(),
          },
        });
    }
  }

  return { success: true, adSetsCount: adSets.length, adSets };
}

// ==================== INSIGHTS ====================

/**
 * Sync ad insights using SDK
 */
export async function syncAdInsightsSDK(
  channelId: number,
  adAccountId: string,
  level: "account" | "campaign" | "adset" | "ad" = "ad",
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

  const sdk = getMetaSDK(channel);
  const insightsData = await sdk.getInsights(adAccountId, level, undefined, {
    time_range: timeRange,
  });

  const insights = [];
  for await (const insight of insightsData) {
    insights.push(insight);

    // Store insights based on level
    if (level === "ad" && insight.ad_id) {
      const [ad] = await db
        .select()
        .from(ads)
        .where(eq(ads.platformAdId, insight.ad_id))
        .limit(1);

      if (ad) {
        await db.insert(adInsights).values({
          adId: ad.id,
          date: insight.date_start ? new Date(insight.date_start) : new Date(),
          impressions: parseInt(insight.impressions || "0"),
          clicks: parseInt(insight.clicks || "0"),
          spend: Math.round(parseFloat(insight.spend || "0") * 100),
          reach: parseInt(insight.reach || "0"),
          cpm: Math.round(parseFloat(insight.cpm || "0") * 100),
          cpc: Math.round(parseFloat(insight.cpc || "0") * 100),
          ctr: Math.round(parseFloat(insight.ctr || "0") * 100),
          conversions: insight.actions
            ? parseInt(
                insight.actions.find((a: any) => a.action_type === "purchase")?.value || "0"
              )
            : 0,
          metrics: insight as any,
        });
      }
    }
  }

  return { success: true, insightsCount: insights.length, insights };
}

// ==================== COMMERCE ====================

/**
 * Sync product catalogs using SDK
 */
export async function syncCatalogsSDK(channelId: number, businessId: string) {
  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(eq(channelsTable.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const sdk = getMetaSDK(channel);
  const catalogsData = await sdk.getCatalogs(businessId);

  const catalogs = [];
  for await (const catalog of catalogsData) {
    catalogs.push({
      id: catalog.id,
      name: catalog.name,
      vertical: catalog.vertical,
      product_count: catalog.product_count,
    });

    await db
      .insert(productCatalogs)
      .values({
        channelId: channel.id,
        platformCatalogId: catalog.id,
        name: catalog.name || "",
        vertical: catalog.vertical || "",
        status: "ACTIVE",
      })
      .onConflictDoUpdate({
        target: productCatalogs.platformCatalogId,
        set: {
          name: catalog.name || "",
          vertical: catalog.vertical || "",
          updatedAt: new Date(),
        },
      });
  }

  return { success: true, catalogsCount: catalogs.length, catalogs };
}

/**
 * Sync products using SDK
 */
export async function syncProductsSDK(catalogId: number) {
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

  const sdk = getMetaSDK(channel);
  const productsData = await sdk.getProducts(catalog.platformCatalogId);

  const productsList = [];
  for await (const product of productsData) {
    productsList.push({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency,
      availability: product.availability,
      image_url: product.image_url,
      url: product.url,
    });

    await db
      .insert(products)
      .values({
        catalogId: catalog.id,
        platformProductId: product.id,
        name: product.name || "",
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
          name: product.name || "",
          description: product.description || null,
          price: product.price ? Math.round(parseFloat(product.price) * 100) : null,
          availability: product.availability || "in stock",
          imageUrl: product.image_url || null,
          url: product.url || null,
          updatedAt: new Date(),
        },
      });
  }

  return { success: true, productsCount: productsList.length, products: productsList };
}



