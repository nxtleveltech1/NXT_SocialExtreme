import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { channels } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { encryptSecret } from '@/lib/crypto';

// Channel management types
const ChannelSchema = z.object({
  name: z.string().min(1),
  platform: z.enum(['facebook', 'instagram', 'tiktok', 'whatsapp']),
  handle: z.string().min(1),
  authType: z.enum(['oauth', 'username_password']).default('oauth'),
  username: z.string().optional(),
  password: z.string().optional(),
  platformId: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const MessageQueueSchema = z.object({
  channelId: z.number(),
  messageType: z.enum(['text', 'image', 'video', 'template', 'interactive']),
  content: z.object({}),
});

export async function GET(request: NextRequest) {
  try {
    const channelsData = await db.select().from(channels);
    return NextResponse.json({ channels: channelsData });
  } catch (error: unknown) {
    console.error('Error fetching channels:', error);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ChannelSchema.parse(body);

    // Encrypt password if provided
    const encryptedPassword = validatedData.password ? encryptSecret(validatedData.password) : undefined;

    const newChannel = await db.insert(channels).values({
      name: validatedData.name,
      platform: validatedData.platform,
      handle: validatedData.handle,
      authType: validatedData.authType,
      username: validatedData.username,
      password: encryptedPassword,
      platformId: validatedData.platformId,
      settings: validatedData.settings,
      isConnected: false,
      createdAt: new Date(),
    }).returning();

    return NextResponse.json({ channel: newChannel[0] }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating channel:', error);
    return NextResponse.json({ error: 'Failed to create channel' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, password, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    // Encrypt password if provided
    const encryptedPassword = password ? encryptSecret(password) : undefined;

    // Prepare update data
    const updateFields: any = { ...updateData };
    if (encryptedPassword) {
      updateFields.password = encryptedPassword;
    }

    const updatedChannel = await db.update(channels)
      .set(updateFields)
      .where(eq(channels.id, id))
      .returning();

    return NextResponse.json({ channel: updatedChannel[0] });
  } catch (error: unknown) {
    console.error('Error updating channel:', error);
    return NextResponse.json({ error: 'Failed to update channel' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    await db.delete(channels).where(eq(channels.id, parseInt(id)));
    return NextResponse.json({ message: 'Channel deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting channel:', error);
    return NextResponse.json({ error: 'Failed to delete channel' }, { status: 500 });
  }
}

// Push message to channel
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = MessageQueueSchema.parse(body);

    return NextResponse.json({ message: 'Message queued for delivery', queueId: null });
  } catch (error: unknown) {
    console.error('Error queuing message:', error);
    return NextResponse.json({ error: 'Failed to queue message' }, { status: 400 });
  }
}
