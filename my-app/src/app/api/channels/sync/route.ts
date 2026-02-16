import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {

    const { channelId, platform } = await req.json();

    if (!channelId || !platform) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    let result;
    if (platform === "Facebook" || platform === "Instagram") {
      const { syncMetaChannel } = await import("@/lib/integrations/meta");
      result = await syncMetaChannel(parseInt(channelId));
    } else if (platform === "TikTok") {
      const { syncTikTokChannel } = await import("@/lib/integrations/tiktok");
      result = await syncTikTokChannel(parseInt(channelId));
    } else {
      return NextResponse.json({ error: `Sync not implemented for platform: ${platform}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync API Error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
