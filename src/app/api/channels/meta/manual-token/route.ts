import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { encryptSecret } from "@/lib/crypto";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

async function validateFacebookToken(token: string): Promise<{ valid: boolean; userId?: string; name?: string; error?: string }> {
  try {
    // Test token by fetching user info
    const url = new URL(`${FB_GRAPH_URL}/me`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json();

    if (!res.ok) {
      return {
        valid: false,
        error: data?.error?.message ?? "Invalid token",
      };
    }

    return {
      valid: true,
      userId: data.id,
      name: data.name,
    };
  } catch (err: unknown) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Token validation failed",
    };
  }
}

async function fetchUserPages(token: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const url = new URL(`${FB_GRAPH_URL}/me/accounts`);
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", token);

    const res = await fetch(url.toString(), { method: "GET" });
    const data = await res.json();

    if (!res.ok) {
      return [];
    }

    return (data.data || []).map((page: any) => ({
      id: page.id,
      name: page.name,
    }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, accessToken } = body;

    if (!channelId || typeof channelId !== "number") {
      return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
    }

    if (!accessToken || typeof accessToken !== "string") {
      return NextResponse.json({ error: "Access token required" }, { status: 400 });
    }

    // Get channel
    const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Validate token
    const validation = await validateFacebookToken(accessToken);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error ?? "Invalid access token" },
        { status: 400 }
      );
    }

    // Fetch user's pages
    const pages = await fetchUserPages(accessToken);
    
    // For Facebook channel, try to find a matching page or use first page
    let pageId: string | null = null;
    let pageName: string | null = null;

    if (pages.length > 0) {
      // Try to match by channel name, or use first page
      const matchingPage = pages.find((p) => p.name.toLowerCase() === channel.name.toLowerCase());
      const selectedPage = matchingPage || pages[0];
      pageId = selectedPage.id;
      pageName = selectedPage.name;
    }

    // Get page access token if we have a page
    let pageAccessToken = accessToken;
    if (pageId) {
      try {
        const pageTokenUrl = new URL(`${FB_GRAPH_URL}/${pageId}`);
        pageTokenUrl.searchParams.set("fields", "access_token");
        pageTokenUrl.searchParams.set("access_token", accessToken);

        const pageTokenRes = await fetch(pageTokenUrl.toString(), { method: "GET" });
        const pageTokenData = await pageTokenRes.json();
        if (pageTokenRes.ok && pageTokenData?.access_token) {
          pageAccessToken = pageTokenData.access_token;
        }
      } catch {
        // Fallback to user token
      }
    }

    // Update channel
    const now = new Date();
    await db
      .update(channels)
      .set({
        isConnected: true,
        accessToken: encryptSecret(pageAccessToken),
        tokenType: "bearer",
        platformId: pageId || validation.userId || null,
        connectedAt: now,
        status: "Healthy",
        settings: {
          ...(channel.settings ?? {}),
          meta: {
            pageId: pageId,
            pageName: pageName,
            userId: validation.userId,
            userName: validation.name,
            connectedAt: now.toISOString(),
            manualToken: true, // Flag that this was manually added
          },
        },
        lastSync: now,
      })
      .where(eq(channels.id, channelId));

    return NextResponse.json({
      success: true,
      message: "Facebook connected successfully",
      pageId,
      pageName,
      pages: pages.length > 0 ? pages : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect with manual token";
    console.error("Manual token connection error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}


