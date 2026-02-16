import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

function requireMetaEnv() {
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI) {
    throw new Error(
      "Missing META_APP_ID / META_APP_SECRET / META_REDIRECT_URI. Configure these env vars before connecting Meta."
    );
  }
}

async function fetchPageAccessToken(userAccessToken: string, pageId: string): Promise<string> {
  const url = new URL(`${FB_GRAPH_URL}/${pageId}`);
  url.searchParams.set("fields", "access_token");
  url.searchParams.set("access_token", userAccessToken);

  const res = await fetch(url.toString(), { method: "GET" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? "Failed to fetch page access token");
  if (!data?.access_token) throw new Error("Missing page access token in response");
  return data.access_token as string;
}

type FinalizeBody =
  | { channelId: number; type: "facebook_page"; pageId: string }
  | { channelId: number; type: "instagram_business"; pageId: string; igId: string };

export async function POST(req: NextRequest) {
  try {
    requireMetaEnv();

    const body = (await req.json()) as Partial<FinalizeBody>;
    const channelId = Number(body.channelId);
    if (!Number.isFinite(channelId)) {
      return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
    }

    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

    const oauth = (channel.settings as any)?.oauth;
    if (!oauth || oauth.provider !== "meta" || !oauth.userAccessTokenEnc) {
      return NextResponse.json({ error: "No pending Meta OAuth session for this channel." }, { status: 400 });
    }

    const userAccessToken = decryptSecret(String(oauth.userAccessTokenEnc));

    if (body.type !== "facebook_page" && body.type !== "instagram_business") {
      return NextResponse.json({ error: "Invalid selection type" }, { status: 400 });
    }
    if (!body.pageId || typeof body.pageId !== "string") {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }
    if (channel.platform === "Facebook" && body.type !== "facebook_page") {
      return NextResponse.json({ error: "Selection does not match channel platform" }, { status: 400 });
    }
    if (channel.platform === "Instagram" && body.type !== "instagram_business") {
      return NextResponse.json({ error: "Selection does not match channel platform" }, { status: 400 });
    }
    if (body.type === "instagram_business" && (!(body as any).igId || typeof (body as any).igId !== "string")) {
      return NextResponse.json({ error: "Missing igId" }, { status: 400 });
    }

    const pageAccessToken = await fetchPageAccessToken(userAccessToken, body.pageId);
    const now = new Date();
    const expiresAt = oauth.userAccessTokenExpiresAt ? new Date(oauth.userAccessTokenExpiresAt) : null;

    const nextSettings = {
      ...(channel.settings ?? {}),
      oauth: null,
      meta: {
        pageId: body.pageId,
        igId: body.type === "instagram_business" ? (body as any).igId : null,
        connectedAt: now.toISOString(),
      },
    };

    await db
      .update(channels)
      .set({
        isConnected: true,
        accessToken: encryptSecret(pageAccessToken),
        tokenType: "bearer",
        tokenExpiresAt: expiresAt,
        platformId: body.type === "instagram_business" ? (body as any).igId : body.pageId,
        connectedAt: now,
        status: "Healthy",
        settings: nextSettings,
        lastSync: now,
      })
      .where(eq(channels.id, channelId));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Meta OAuth finalize failed";
    console.error("Meta OAuth finalize error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


