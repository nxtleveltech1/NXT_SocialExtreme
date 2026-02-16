import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

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
    const audiences = await client.getCustomAudiences(adAccountId, 100);

    return NextResponse.json({ audiences: audiences.data });
  } catch (error: any) {
    console.error("Error fetching audiences:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audiences" },
      { status: 500 }
    );
  }
}

