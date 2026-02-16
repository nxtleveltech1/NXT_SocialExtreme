import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { verifyOAuthState } from "@/lib/oauth/state";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TIKTOK_API_URL = "https://open.tiktokapis.com/v2";

function requireTikTokEnv() {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET || !env.TIKTOK_REDIRECT_URI) {
    throw new Error(
      "Missing TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REDIRECT_URI. Configure these env vars before connecting TikTok."
    );
  }
}

async function exchangeCodeForToken(code: string) {
  const tokenUrl = `${TIKTOK_API_URL}/oauth/token/`;
  const body = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY!,
    client_secret: env.TIKTOK_CLIENT_SECRET!,
    grant_type: "authorization_code",
    code,
    redirect_uri: env.TIKTOK_REDIRECT_URI!,
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description ?? data?.error ?? "TikTok token exchange failed");
  }

  return data as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    scope?: string;
    token_type?: string;
  };
}

async function fetchTikTokUserInfo(accessToken: string) {
  const url = `${TIKTOK_API_URL}/user/info/`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error_description ?? data?.error ?? "Failed to fetch TikTok user info");
  }

  return data as {
    data?: {
      user?: {
        open_id?: string;
        display_name?: string;
        avatar_url?: string;
        username?: string;
      };
    };
  };
}

export async function GET(req: NextRequest) {
  try {
    requireTikTokEnv();

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      return NextResponse.json(
        { error: `TikTok OAuth error: ${errorDescription ?? error}` },
        { status: 400 }
      );
    }

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
    }

    const payload = verifyOAuthState(state);
    if (payload.provider !== "tiktok") {
      return NextResponse.json({ error: "Invalid OAuth provider" }, { status: 400 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, payload.channelId))
      .limit(1);

    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    if (channel.platform !== "TikTok") {
      return NextResponse.json({ error: "Channel platform mismatch" }, { status: 400 });
    }

    const tokenData = await exchangeCodeForToken(code);
    const userInfo = await fetchTikTokUserInfo(tokenData.access_token);

    const openId = userInfo.data?.user?.open_id;
    const displayName = userInfo.data?.user?.display_name ?? userInfo.data?.user?.username ?? "TikTok User";
    const username = userInfo.data?.user?.username ?? null;

    if (!openId) {
      throw new Error("TikTok API did not return user open_id");
    }

    const expiresAt =
      typeof tokenData.expires_in === "number"
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : null;

    const refreshExpiresAt =
      typeof tokenData.refresh_expires_in === "number"
        ? new Date(Date.now() + tokenData.refresh_expires_in * 1000)
        : null;

    await db
      .update(channels)
      .set({
        isConnected: true,
        accessToken: encryptSecret(tokenData.access_token),
        refreshToken: tokenData.refresh_token ? encryptSecret(tokenData.refresh_token) : null,
        tokenExpiresAt: expiresAt,
        platformId: openId,
        status: "Healthy",
        lastSync: new Date(),
        settings: {
          ...(channel.settings ?? {}),
          oauth: {
            provider: "tiktok",
            openId,
            displayName,
            username,
            refreshExpiresAt: refreshExpiresAt?.toISOString() ?? null,
            createdAt: new Date().toISOString(),
            initiatedBy: payload.userId || "system",
          },
        },
      })
      .where(eq(channels.id, payload.channelId));

    // Redirect back to channels page with success
    const redirectUrl = new URL("/channels", url.origin);
    redirectUrl.searchParams.set("connected", "tiktok");
    return NextResponse.redirect(redirectUrl.toString());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "TikTok OAuth callback failed";
    console.error("TikTok OAuth callback error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

