import { env } from "@/lib/env";
import { createOAuthState } from "@/lib/oauth/state";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function requireTikTokEnv() {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET || !env.TIKTOK_REDIRECT_URI) {
    throw new Error(
      "Missing TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI. Configure these env vars before connecting TikTok."
    );
  }
}

export async function GET(req: Request) {
  try {
    requireTikTokEnv();

    const url = new URL(req.url);
    const channelIdRaw = url.searchParams.get("channelId");
    const channelId = Number(channelIdRaw);
    if (!channelIdRaw || !Number.isFinite(channelId)) {
      return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
    }

    const state = createOAuthState({ channelId, userId: "system", provider: "tiktok" });

    // TikTok OAuth scopes for content publishing
    // video.upload: Upload videos
    // video.publish: Publish videos
    // user.info.basic: Get basic user info
    const scope = ["video.upload", "video.publish", "user.info.basic"].join(",");

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.set("client_key", env.TIKTOK_CLIENT_KEY!);
    authUrl.searchParams.set("redirect_uri", env.TIKTOK_REDIRECT_URI!);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scope);

    return NextResponse.redirect(authUrl.toString());
  } catch (err: any) {
    const errorMsg = err?.message ?? "Failed to start TikTok OAuth";
    console.error("TikTok OAuth start error:", errorMsg);
    
    // If accessed via browser redirect, return HTML error page
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("text/html")) {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head><title>OAuth Error</title></head>
<body style="font-family: sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto;">
  <h1>OAuth Configuration Error</h1>
  <p style="color: #dc2626;">${errorMsg}</p>
  <p>Please configure the required environment variables in your .env.local file:</p>
  <ul>
    <li>TIKTOK_CLIENT_KEY</li>
    <li>TIKTOK_CLIENT_SECRET</li>
    <li>TIKTOK_REDIRECT_URI</li>
  </ul>
  <p><a href="/channels">← Back to Channels</a></p>
</body>
</html>`,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }
    
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

