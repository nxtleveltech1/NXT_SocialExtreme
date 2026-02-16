import { db } from "@/db/db";
import { conversations as conversationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {

    const { conversationId, status, priority, tags } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    const updates: Partial<typeof conversationsTable.$inferInsert> = {};
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (tags !== undefined) updates.tags = tags;
    if (status === "replied" || status === "closed") updates.unread = false;

    await db.update(conversationsTable).set(updates).where(eq(conversationsTable.id, parseInt(conversationId)));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("Update status API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

