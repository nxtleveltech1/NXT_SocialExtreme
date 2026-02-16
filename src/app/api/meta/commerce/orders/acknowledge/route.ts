import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

const AcknowledgeOrderSchema = z.object({
  channelId: z.number(),
  orderId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = AcknowledgeOrderSchema.parse(body);

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

    await client.acknowledgeOrder(validated.orderId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error acknowledging order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to acknowledge order" },
      { status: 500 }
    );
  }
}

