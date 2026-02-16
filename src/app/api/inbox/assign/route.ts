import { db } from "@/db/db";
import { conversations as conversationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  conversationId: z.number(),
  assignedTo: z.string(),
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

    await db
      .update(conversationsTable)
      .set({
        assignedTo: body.assignedTo || null,
      })
      .where(eq(conversationsTable.id, body.conversationId));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Assignment failed";
    console.error("Assign API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

