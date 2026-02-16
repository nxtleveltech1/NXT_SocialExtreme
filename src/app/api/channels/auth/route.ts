import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { channels } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireAuth } from "@/lib/api-auth";

// Authentication schema
const AuthSchema = z.object({
  channelId: z.number(),
  username: z.string().min(1),
  password: z.string().min(1),
});

// Platform OAuth URLs for redirecting users to proper OAuth flows
const PLATFORM_OAUTH_URLS: Record<string, string> = {
  facebook: "/api/oauth/meta/start?platform=facebook",
  instagram: "/api/oauth/meta/start?platform=instagram",
  tiktok: "/api/oauth/tiktok/start",
};

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const validatedData = AuthSchema.parse(body);

    // Get channel details
    const channelData = await db.select().from(channels).where(eq(channels.id, validatedData.channelId));

    if (!channelData.length) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const channel = channelData[0];

    // Username/password auth is not supported for social platforms.
    // All platforms require OAuth for secure token exchange.
    const oauthUrl = PLATFORM_OAUTH_URLS[channel.platform.toLowerCase()];
    if (!oauthUrl) {
      return NextResponse.json(
        { error: `Platform "${channel.platform}" does not support direct authentication. Use the OAuth flow.` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Direct username/password authentication is not supported. Use the OAuth flow instead.",
        oauthUrl,
        platform: channel.platform,
      },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Disconnect channel
    await db.update(channels)
      .set({
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        status: 'Disconnected',
      })
      .where(eq(channels.id, parseInt(channelId)));

    return NextResponse.json({ message: 'Channel disconnected successfully' });
  } catch (error: unknown) {
    console.error('Disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect channel' }, { status: 500 });
  }
}