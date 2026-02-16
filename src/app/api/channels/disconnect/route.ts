import { db } from "@/db/db";
import { channels as channelsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  channelId: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    let body;
    try {
      body = BodySchema.parse(await req.json());
    } catch (error) {
      return NextResponse.json({ error: "Invalid request body", details: error }, { status: 400 });
    }

    await db
      .update(channelsTable)
      .set({
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        status: "Disconnected",
        settings: null,
        tokenExpiresAt: null
      })
      .where(eq(channelsTable.id, body.channelId));

    return NextResponse.json({ success: true, message: "Channel disconnected successfully" });
  } catch (error: unknown) {
    console.error("Disconnect Error:", error);
    return NextResponse.json({ error: "Failed to disconnect channel" }, { status: 500 });
  }
}
