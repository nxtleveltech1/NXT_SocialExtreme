import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { channels, webhookEvents, channelDailyMetrics } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const channelId = parseInt(id);

    const channelData = await db.select().from(channels).where(eq(channels.id, channelId));

    if (!channelData.length) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    const metrics = await db
      .select()
      .from(channelDailyMetrics)
      .where(eq(channelDailyMetrics.channelId, channelId));

    return NextResponse.json({
      channel: channelData[0],
      statistics: {
        metrics: metrics.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching channel details:', error);
    return NextResponse.json({ error: 'Failed to fetch channel details' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const webhookEvent = await db
      .insert(webhookEvents)
      .values({
        provider: body.provider || 'meta',
        eventType: body.eventType || 'test',
        payload: body.payload || {},
        status: 'pending',
      })
      .returning();

    return NextResponse.json({ event: webhookEvent[0] });
  } catch (error: unknown) {
    console.error('Error creating webhook event:', error);
    return NextResponse.json({ error: 'Failed to create webhook event' }, { status: 400 });
  }
}
