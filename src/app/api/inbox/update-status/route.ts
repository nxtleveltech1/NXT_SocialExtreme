import { db } from "@/db/db";
import { conversations as conversationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  conversationId: z.number(),
  status: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireAuth();

    let body;
    try {
      body = BodySchema.parse(await req.json());
    } catch (error) {
      return NextResponse.json({ error: "Invalid request body", details: error }, { status: 400 });
    }

    const updates: Partial<typeof conversationsTable.$inferInsert> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.status === "replied" || body.status === "closed") updates.unread = false;

    await db.update(conversationsTable).set(updates).where(eq(conversationsTable.id, body.conversationId));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    console.error("Update status API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

