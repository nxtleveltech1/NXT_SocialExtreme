import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  syncMetaMessages,
  syncWhatsAppMessages,
  syncTikTokMessages,
} from "@/lib/messaging/platform-sync";

/**
 * POST /api/messages/sync
 * Sync messages from all connected platforms
 */
export async function POST(req: Request) {
  try {
    await requireAuth();

    const body = await req.json();
    const { platform, channelId } = body;

    // Get connected channels
    const connectedChannels = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.isConnected, true),
          platform ? eq(channels.platform, platform) : undefined,
          channelId ? eq(channels.id, parseInt(channelId)) : undefined
        )
      );

    const syncResults = [];

    for (const channel of connectedChannels) {
      try {
        let syncResult;
        
        switch (channel.platform) {
          case "Facebook":
          case "Instagram":
            syncResult = await syncMetaMessages(channel);
            break;
          case "WhatsApp":
            syncResult = await syncWhatsAppMessages(channel);
            break;
          case "TikTok":
            syncResult = await syncTikTokMessages(channel);
            break;
          default:
            syncResult = { synced: 0, errors: [`Unsupported platform: ${channel.platform}`] };
        }

        syncResults.push({
          channelId: channel.id,
          platform: channel.platform,
          channelName: channel.name,
          ...syncResult,
        });
      } catch (error: any) {
        syncResults.push({
          channelId: channel.id,
          platform: channel.platform,
          channelName: channel.name,
          synced: 0,
          errors: [error.message],
        });
      }
    }

    return NextResponse.json({ results: syncResults });
  } catch (error: any) {
    console.error("Failed to sync messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync messages" },
      { status: 500 }
    );
  }
}

