import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
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
export async function POST(req: NextRequest) {
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

    const syncResults: Array<{
      channelId: number;
      platform: string;
      channelName: string;
      synced?: number;
      errors?: string[];
    }> = [];

    for (const channel of connectedChannels) {
      try {
        let syncResult: { synced: number; errors?: string[] } | undefined;
        
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
      } catch (error: unknown) {
        syncResults.push({
          channelId: channel.id,
          platform: channel.platform,
          channelName: channel.name,
          synced: 0,
          errors: [error instanceof Error ? error.message : "Unknown error"],
        });
      }
    }

    return NextResponse.json({ results: syncResults });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sync messages";
    console.error("Failed to sync messages:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

