import { db } from "@/db/db";
import { conversations as conversationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {

    const { conversationId, assignedTo } = await req.json();

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    await db
      .update(conversationsTable)
      .set({
        assignedTo: assignedTo || null,
      })
      .where(eq(conversationsTable.id, parseInt(conversationId)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Assign API error:", err);
    return NextResponse.json({ error: err?.message ?? "Assignment failed" }, { status: 500 });
  }
}

