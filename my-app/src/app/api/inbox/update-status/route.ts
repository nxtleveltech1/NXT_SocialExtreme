import { db } from "@/db/db";
import { conversations as conversationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
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
  } catch (err: any) {
    console.error("Update status API error:", err);
    return NextResponse.json({ error: err?.message ?? "Update failed" }, { status: 500 });
  }
}

