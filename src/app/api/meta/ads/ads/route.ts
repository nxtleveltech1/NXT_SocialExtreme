import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels, ads, adSets, adCampaigns } from "@/db/schema";
import { eq, InferSelectModel } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { requireAuth } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const adAccountId = searchParams.get("adAccountId");
    const adSetId = searchParams.get("adSetId");

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
    const adsData = await client.getAds(adAccountId, adSetId || undefined, 100);

    // Store in database
    for (const ad of adsData.data) {
      const [adSet] = await db
        .select()
        .from(adSets)
        .where(eq(adSets.platformAdSetId, ad.adset_id))
        .limit(1);

      if (adSet) {
        await db
          .insert(ads)
          .values({
            adSetId: adSet.id,
            platformAdId: ad.id,
            name: ad.name,
            status: (ad.status || "PAUSED") as any,
            creative: ad.creative || null,
            trackingSpecs: ad.tracking_specs || null,
          })
          .onConflictDoUpdate({
            target: ads.platformAdId,
            set: {
              name: ad.name,
              status: (ad.status || "PAUSED") as any,
              creative: ad.creative || null,
              trackingSpecs: ad.tracking_specs || null,
              updatedAt: new Date(),
            },
          });
      }
    }

    // Return from database
    let storedAds: InferSelectModel<typeof ads>[] = [];
    if (adSetId) {
      const [adSet] = await db
        .select()
        .from(adSets)
        .where(eq(adSets.platformAdSetId, adSetId))
        .limit(1);
      if (adSet) {
        storedAds = await db
          .select()
          .from(ads)
          .where(eq(ads.adSetId, adSet.id));
      } else {
        storedAds = [];
      }
    } else {
      storedAds = await db.select().from(ads);
    }

    return NextResponse.json({ ads: storedAds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch ads";
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      channelId,
      adAccountId,
      adSetId,
      name,
      creative,
      status,
      trackingSpecs,
    } = body;

    if (!channelId || !adAccountId || !adSetId || !name || !creative) {
      return NextResponse.json(
        { error: "channelId, adAccountId, adSetId, name, and creative required" },
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

    const [adSet] = await db
      .select()
      .from(adSets)
      .where(eq(adSets.platformAdSetId, adSetId))
      .limit(1);

    if (!adSet) {
      return NextResponse.json({ error: "Ad set not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const ad = await client.createAd(adAccountId, {
      adset_id: adSetId,
      name,
      creative,
      status: status || "PAUSED",
      tracking_specs: trackingSpecs,
    });

    // Sync to get full data
    const res = await fetch(`${req.nextUrl.origin}/api/meta/ads/ads?channelId=${channelId}&adAccountId=${adAccountId}&adSetId=${adSetId}`);
    const data = await res.json();

    return NextResponse.json({ ad, ads: data.ads });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create ad";
    console.error("Error creating ad:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { adId, updates } = body;

    if (!adId || !updates) {
      return NextResponse.json(
        { error: "adId and updates required" },
        { status: 400 }
      );
    }

    const [ad] = await db
      .select()
      .from(ads)
      .where(eq(ads.platformAdId, adId))
      .limit(1);

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const [adSet] = await db
      .select()
      .from(adSets)
      .where(eq(adSets.id, ad.adSetId))
      .limit(1);

    if (!adSet) {
      return NextResponse.json({ error: "Ad set not found" }, { status: 404 });
    }

    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.id, adSet.campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, campaign.channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    await client.updateAd(adId, updates);

    // Update in database
    await db
      .update(ads)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(ads.platformAdId, adId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update ad";
    console.error("Error updating ad:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const adId = searchParams.get("adId");

    if (!adId) {
      return NextResponse.json(
        { error: "adId required" },
        { status: 400 }
      );
    }

    const [ad] = await db
      .select()
      .from(ads)
      .where(eq(ads.platformAdId, adId))
      .limit(1);

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    const [adSet] = await db
      .select()
      .from(adSets)
      .where(eq(adSets.id, ad.adSetId))
      .limit(1);

    if (!adSet) {
      return NextResponse.json({ error: "Ad set not found" }, { status: 404 });
    }

    const [campaign] = await db
      .select()
      .from(adCampaigns)
      .where(eq(adCampaigns.id, adSet.campaignId))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, campaign.channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    await client.deleteAd(adId);

    // Delete from database
    await db.delete(ads).where(eq(ads.platformAdId, adId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete ad";
    console.error("Error deleting ad:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

