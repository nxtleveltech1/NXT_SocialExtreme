import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels, adCreatives } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

const CreateCreativeSchema = z.object({
  channelId: z.number(),
  adAccountId: z.string(),
  name: z.string().min(1),
  object_story_spec: z.object({
    page_id: z.string(),
    link_data: z.object({
      image_url: z.string().url().optional(),
      video_id: z.string().optional(),
      message: z.string().optional(),
      link: z.string().url(),
      call_to_action: z.object({
        type: z.string(),
        value: z.object({
          link: z.string().url(),
        }),
      }).optional(),
    }),
  }),
});

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const adAccountId = searchParams.get("adAccountId");

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
    const creatives = await client.getAdCreatives(adAccountId, 100);

    // Store in database
    for (const creative of creatives.data) {
      await db
        .insert(adCreatives)
        .values({
          channelId: channel.id,
          platformCreativeId: creative.id,
          name: creative.name,
          objectStorySpec: creative.object_story_spec,
          objectStoryId: creative.object_story_id,
          thumbnailUrl: creative.thumbnail_url,
          metadata: creative,
        })
        .onConflictDoUpdate({
          target: adCreatives.platformCreativeId,
          set: {
            name: creative.name,
            objectStorySpec: creative.object_story_spec,
            objectStoryId: creative.object_story_id,
            thumbnailUrl: creative.thumbnail_url,
            updatedAt: new Date(),
          },
        });
    }

    const storedCreatives = await db
      .select()
      .from(adCreatives)
      .where(eq(adCreatives.channelId, parseInt(channelId)));

    return NextResponse.json({ creatives: storedCreatives });
  } catch (error: any) {
    console.error("Error fetching creatives:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch creatives" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateCreativeSchema.parse(body);

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, validated.channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const creative = await client.createAdCreative(validated.adAccountId, {
      name: validated.name,
      object_story_spec: validated.object_story_spec,
    });

    // Sync to get full data
    const res = await fetch(`${req.nextUrl.origin}/api/meta/ads/creatives?channelId=${validated.channelId}&adAccountId=${validated.adAccountId}`);
    const data = await res.json();

    return NextResponse.json({ creative, creatives: data.creatives });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error creating creative:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create creative" },
      { status: 500 }
    );
  }
}

