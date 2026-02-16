import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";

const ShipOrderSchema = z.object({
  channelId: z.number(),
  orderId: z.string(),
  trackingNumber: z.string().min(1),
  carrier: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const validated = ShipOrderSchema.parse(body);

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

    await client.shipOrder(validated.orderId, {
      tracking_number: validated.trackingNumber,
      carrier: validated.carrier,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to ship order";
    console.error("Error shipping order:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

