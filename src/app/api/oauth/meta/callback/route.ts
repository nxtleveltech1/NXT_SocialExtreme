import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { verifyOAuthState } from "@/lib/oauth/state";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

function requireMetaEnv() {
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI) {
    throw new Error(
      "Missing META_APP_ID / META_APP_SECRET / META_REDIRECT_URI. Configure these env vars before connecting Meta."
    );
  }
}

async function exchangeCodeForUserToken(code: string) {
  const tokenUrl = new URL(`${FB_GRAPH_URL}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", env.META_APP_ID!);
  tokenUrl.searchParams.set("client_secret", env.META_APP_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", env.META_REDIRECT_URI!);
  tokenUrl.searchParams.set("code", code);

  const res = await fetch(tokenUrl.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Meta token exchange failed");
  return data as { access_token: string; token_type?: string; expires_in?: number };
}

async function exchangeForLongLivedUserToken(shortToken: string) {
  const tokenUrl = new URL(`${FB_GRAPH_URL}/oauth/access_token`);
  tokenUrl.searchParams.set("grant_type", "fb_exchange_token");
  tokenUrl.searchParams.set("client_id", env.META_APP_ID!);
  tokenUrl.searchParams.set("client_secret", env.META_APP_SECRET!);
  tokenUrl.searchParams.set("fb_exchange_token", shortToken);

  const res = await fetch(tokenUrl.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Meta long-lived token exchange failed");
  return data as { access_token: string; token_type?: string; expires_in?: number };
}

type MetaAccountsResponse = {
  data?: Array<{
    id: string;
    name: string;
    instagram_business_account?: { id: string; username?: string };
  }>;
};

async function fetchUserAccounts(userAccessToken: string): Promise<MetaAccountsResponse> {
  const url = new URL(`${FB_GRAPH_URL}/me/accounts`);
  url.searchParams.set("fields", "id,name,instagram_business_account{id,username}");
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Failed to fetch Meta accounts");
  return data as MetaAccountsResponse;
}

export async function GET(req: Request) {
  try {
    requireMetaEnv();

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    if (error) {
      return NextResponse.json(
        { error: `Meta OAuth error: ${errorDescription ?? error}` },
        { status: 400 }
      );
    }

    if (!code || !state) {
      return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
    }

    const payload = verifyOAuthState(state);
    if (payload.provider !== "meta") {
      return NextResponse.json({ error: "Invalid OAuth provider" }, { status: 400 });
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, payload.channelId))
      .limit(1);

    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const short = await exchangeCodeForUserToken(code);
    const long = await exchangeForLongLivedUserToken(short.access_token);
    const expiresAt =
      typeof long.expires_in === "number" ? new Date(Date.now() + long.expires_in * 1000) : null;

    const accounts = await fetchUserAccounts(long.access_token);
    const pages = accounts.data ?? [];

    const candidates =
      channel.platform === "Instagram"
        ? pages
            .filter((p) => !!p.instagram_business_account)
            .map((p) => ({
              type: "instagram_business" as const,
              pageId: p.id,
              pageName: p.name,
              igId: p.instagram_business_account!.id,
              igUsername: p.instagram_business_account!.username ?? null,
            }))
        : pages.map((p) => ({
            type: "facebook_page" as const,
            pageId: p.id,
            pageName: p.name,
          }));

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: `No eligible Meta accounts found for ${channel.platform}.` },
        { status: 400 }
      );
    }

    const nextSettings = {
      ...(channel.settings ?? {}),
      oauth: {
        provider: "meta",
        userAccessTokenEnc: encryptSecret(long.access_token),
        userAccessTokenExpiresAt: expiresAt?.toISOString() ?? null,
        candidates,
        createdAt: new Date().toISOString(),
        initiatedBy: payload.userId || "system",
      },
    };

    await db
      .update(channels)
      .set({
        settings: nextSettings,
        status: "Pending",
      })
      .where(eq(channels.id, payload.channelId));

    const redirectUrl = new URL("/oauth/meta/select", url.origin);
    redirectUrl.searchParams.set("channelId", String(payload.channelId));
    return NextResponse.redirect(redirectUrl.toString());
  } catch (err: any) {
    console.error("Meta OAuth callback error:", err);
    return NextResponse.json({ error: err?.message ?? "Meta OAuth callback failed" }, { status: 500 });
  }
}



