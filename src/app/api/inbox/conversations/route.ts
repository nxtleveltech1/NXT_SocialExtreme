import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { conversations, whatsappConversations, channels } from "@/db/schema";
import { eq, desc, and, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    const platform = searchParams.get("platform");
    const limit = parseInt(searchParams.get("limit") || "50");

    let allConversations: any[] = [];

    // Fetch regular conversations
    const conversationsQuery = db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.time))
      .limit(limit);

    if (channelId) {
      conversationsQuery.where(eq(conversations.channelId, parseInt(channelId)));
    }
    if (platform) {
      conversationsQuery.where(eq(conversations.platform, platform));
    }

    const regularConvs = await conversationsQuery;
    allConversations.push(...regularConvs.map((c) => ({
      id: c.id,
      type: "conversation",
      platform: c.platform,
      userName: c.userName,
      lastMessage: c.lastMessage,
      time: c.time,
      unread: c.unread,
      avatar: c.avatar,
      status: c.status,
      participantId: c.participantId,
      participantPhone: c.participantPhone,
      participantEmail: c.participantEmail,
    })));

    // Fetch WhatsApp conversations
    const whatsappQuery = db
      .select()
      .from(whatsappConversations)
      .orderBy(desc(whatsappConversations.lastMessageTime))
      .limit(limit);

    if (channelId) {
      whatsappQuery.where(eq(whatsappConversations.channelId, parseInt(channelId)));
    }

    const waConvs = await whatsappQuery;
    allConversations.push(...waConvs.map((c) => ({
      id: c.id,
      type: "whatsapp",
      platform: "WhatsApp",
      userName: c.userName || c.phoneNumber,
      lastMessage: c.lastMessage,
      time: c.lastMessageTime,
      unread: c.unread,
      avatar: c.phoneNumber?.slice(-2) || "WA",
      status: c.status,
      participantPhone: c.phoneNumber,
    })));

    // Sort by time descending
    allConversations.sort((a, b) => {
      const timeA = a.time ? new Date(a.time).getTime() : 0;
      const timeB = b.time ? new Date(b.time).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      conversations: allConversations.slice(0, limit),
      total: allConversations.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch conversations";
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

