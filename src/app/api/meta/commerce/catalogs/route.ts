import { NextRequest, NextResponse } from "next/server";
import { syncProductCatalogs } from "@/lib/integrations/meta-comprehensive";
import { db } from "@/db/db";
import { productCatalogs, channels } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const channelId = searchParams.get("channelId");
    const businessId = searchParams.get("businessId");

    if (!channelId || !businessId) {
      return NextResponse.json(
        { error: "channelId and businessId required" },
        { status: 400 }
      );
    }

    // Sync catalogs
    await syncProductCatalogs(parseInt(channelId), businessId);

    // Return catalogs
    const catalogs = await db
      .select()
      .from(productCatalogs)
      .where(eq(productCatalogs.channelId, parseInt(channelId)));

    return NextResponse.json({ catalogs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch catalogs";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, businessId, name, vertical } = body;

    if (!channelId || !businessId || !name || !vertical) {
      return NextResponse.json(
        { error: "channelId, businessId, name, and vertical required" },
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

    const { MetaApiClient } = await import("@/lib/integrations/meta-client");
    const { decryptSecret } = await import("@/lib/crypto");
    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const catalog = await client.createCatalog(businessId, name, vertical);

    // Sync to get full catalog data
    await syncProductCatalogs(parseInt(channelId), businessId);

    return NextResponse.json({ catalog });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create catalog";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}



