import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels, adSets, adCampaigns } from "@/db/schema";
import { eq, and, InferSelectModel } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const adAccountId = searchParams.get("adAccountId");
    const campaignId = searchParams.get("campaignId");

    if (!channelId || !adAccountId) {
      return NextResponse.json(
        { error: "channelId and adAccountId required" },
        { status: 400 }
      );
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, parseInt(channelId)))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);
    const adSetsData = await client.getAdSets(adAccountId, campaignId || undefined, 100);

    // Store in database
    for (const adSet of adSetsData.data) {
      const [campaign] = await db
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.platformCampaignId, adSet.campaign_id))
        .limit(1);

      if (campaign) {
        await db
          .insert(adSets)
          .values({
            campaignId: campaign.id,
            platformAdSetId: adSet.id,
            name: adSet.name,
            status: (adSet.status || "PAUSED") as any,
            dailyBudget: adSet.daily_budget || null,
            lifetimeBudget: adSet.lifetime_budget || null,
            targeting: adSet.targeting || null,
            optimizationGoal: adSet.optimization_goal || null,
            billingEvent: adSet.billing_event || null,
          })
          .onConflictDoUpdate({
            target: adSets.platformAdSetId,
            set: {
              name: adSet.name,
              status: (adSet.status || "PAUSED") as any,
              dailyBudget: adSet.daily_budget || null,
              lifetimeBudget: adSet.lifetime_budget || null,
              targeting: adSet.targeting || null,
              updatedAt: new Date(),
            },
          });
      }
    }

    // Return from database
    let storedAdSets: InferSelectModel<typeof adSets>[] = [];
    if (campaignId) {
      const [campaign] = await db
        .select()
        .from(adCampaigns)
        .where(eq(adCampaigns.platformCampaignId, campaignId))
        .limit(1);
      if (campaign) {
        storedAdSets = await db
          .select()
          .from(adSets)
          .where(eq(adSets.campaignId, campaign.id));
      } else {
        storedAdSets = [];
      }
    } else {
      storedAdSets = await db.select().from(adSets);
    }

    return NextResponse.json({ adSets: storedAdSets });
  } catch (error: any) {
    console.error("Error fetching ad sets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ad sets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      channelId,
      adAccountId,
      campaignId,
      name,
      optimizationGoal,
      billingEvent,
      dailyBudget,
      lifetimeBudget,
      targeting,
      status,
      startTime,
      stopTime,
    } = body;

    if (!channelId || !adAccountId || !campaignId || !name || !optimizationGoal || !billingEvent) {
      return NextResponse.json(
        { error: "channelId, adAccountId, campaignId, name, optimizationGoal, and billingEvent required" },
        { status: 400 }
      );
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, parseInt(channelId)))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const adSet = await client.createAdSet(adAccountId, {
      campaign_id: campaignId,
      name,
      optimization_goal: optimizationGoal,
      billing_event: billingEvent,
      daily_budget: dailyBudget,
      lifetime_budget: lifetimeBudget,
      targeting: targeting || {},
      status: status || "PAUSED",
      start_time: startTime,
      stop_time: stopTime,
    });

    // Sync to get full data
    const res = await fetch(`${req.nextUrl.origin}/api/meta/ads/adsets?channelId=${channelId}&adAccountId=${adAccountId}&campaignId=${campaignId}`);
    const data = await res.json();

    return NextResponse.json({ adSet, adSets: data.adSets });
  } catch (error: any) {
    console.error("Error creating ad set:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ad set" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { adSetId, updates } = body;

    if (!adSetId || !updates) {
      return NextResponse.json(
        { error: "adSetId and updates required" },
        { status: 400 }
      );
    }

    const [adSet] = await db
      .select()
      .from(adSets)
      .where(eq(adSets.platformAdSetId, adSetId))
      .limit(1);

    if (!adSet) {
      return NextResponse.json({ error: "Ad set not found" }, { status: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, adSet.campaignId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    await client.updateAdSet(adSetId, updates);

    // Update in database
    await db
      .update(adSets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(adSets.platformAdSetId, adSetId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating ad set:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update ad set" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adSetId = searchParams.get("adSetId");

    if (!adSetId) {
      return NextResponse.json(
        { error: "adSetId required" },
        { status: 400 }
      );
    }

    const [adSet] = await db
      .select()
      .from(adSets)
      .where(eq(adSets.platformAdSetId, adSetId))
      .limit(1);

    if (!adSet) {
      return NextResponse.json({ error: "Ad set not found" }, { status: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, adSet.campaignId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    await client.deleteAdSet(adSetId);

    // Delete from database
    await db.delete(adSets).where(eq(adSets.platformAdSetId, adSetId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting ad set:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete ad set" },
      { status: 500 }
    );
  }
}

