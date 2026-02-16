import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { channels, channelWebhookEvents, channelMetrics } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const channelId = parseInt(params.id);
    
    // Get channel details
    const channelData = await db.select().from(channels).where(eq(channels.id, channelId));
    
    if (!channelData.length) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Get channel statistics
    const webhookEvents = await db.select().from(channelWebhookEvents).where(eq(channelWebhookEvents.channelId, channelId));
    const metrics = await db.select().from(channelMetrics).where(eq(channelMetrics.channelId, channelId));

    return NextResponse.json({
      channel: channelData[0],
      statistics: {
        webhookEvents: webhookEvents.length,
        metrics: metrics.length,
      }
    });
  } catch (error) {
    console.error('Error fetching channel details:', error);
    return NextResponse.json({ error: 'Failed to fetch channel details' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const channelId = parseInt(params.id);
    const body = await request.json();

    // Simulate webhook event creation
    const webhookEvent = await db.insert(channelWebhookEvents).values({
      channelId: channelId,
      provider: body.provider || 'meta',
      eventType: body.eventType || 'test',
      payload: body.payload || {},
      headers: body.headers || {},
      status: 'pending',
    }).returning();

    return NextResponse.json({ event: webhookEvent[0] });
  } catch (error) {
    console.error('Error creating webhook event:', error);
    return NextResponse.json({ error: 'Failed to create webhook event' }, { status: 400 });
  }
}
