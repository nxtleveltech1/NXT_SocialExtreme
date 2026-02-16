import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels, productCatalogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";

const UpdateInventorySchema = z.object({
  channelId: z.number(),
  catalogId: z.string(),
  updates: z.array(z.object({
    retailer_id: z.string(),
    inventory: z.number().int().min(0),
  })),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const validated = UpdateInventorySchema.parse(body);

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, validated.channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const [catalog] = await db
      .select()
      .from(productCatalogs)
      .where(eq(productCatalogs.platformCatalogId, validated.catalogId))
      .limit(1);

    if (!catalog) {
      return NextResponse.json({ error: "Catalog not found" }, { status: 404 });
    }

    const accessToken = decryptSecret(channel.accessToken);
    const client = new MetaApiClient(accessToken);

    const result = await client.updateBatchInventory(validated.catalogId, validated.updates);

    return NextResponse.json({ success: result.success, updates: validated.updates.length });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to update inventory";
    console.error("Error updating inventory:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

