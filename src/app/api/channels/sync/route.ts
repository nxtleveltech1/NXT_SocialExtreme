import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  channelId: z.number(),
  platform: z.string(),
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

    let result: unknown;
    if (body.platform === "Facebook" || body.platform === "Instagram") {
      const { syncMetaChannel } = await import("@/lib/integrations/meta");
      result = await syncMetaChannel(body.channelId);
    } else if (body.platform === "TikTok") {
      const { syncTikTokChannel } = await import("@/lib/integrations/tiktok");
      result = await syncTikTokChannel(body.channelId);
    } else {
      return NextResponse.json({ error: `Sync not implemented for platform: ${body.platform}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
