import { db } from "@/db/db";
import { channels as channelsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {

    const { channelId } = await req.json();

    if (!channelId) {
      return NextResponse.json({ error: "Channel ID required" }, { status: 400 });
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
      .where(eq(channelsTable.id, parseInt(channelId)));

    return NextResponse.json({ success: true, message: "Channel disconnected successfully" });
  } catch (error) {
    console.error("Disconnect Error:", error);
    return NextResponse.json({ error: "Failed to disconnect channel" }, { status: 500 });
  }
}
