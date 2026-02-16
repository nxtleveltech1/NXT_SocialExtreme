import { db } from "@/db/db";
import { conversations, messages } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

/**
 * POST /api/messages/[conversationId]/read
 * Mark conversation and messages as read
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    await requireAuth();

    const { conversationId: convId } = await params;
    const conversationId = parseInt(convId);

    // Mark conversation as read
    await db
      .update(conversations)
      .set({ unread: false, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    // Mark all inbound messages as read
    await db
      .update(messages)
      .set({ status: "read", readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.direction, "inbound")
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to mark as read:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark as read" },
      { status: 500 }
    );
  }
}

