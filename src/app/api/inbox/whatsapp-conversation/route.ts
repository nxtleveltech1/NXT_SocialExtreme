import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/db"
import { whatsappConversations, channels } from "@/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.id, parseInt(id)))
      .limit(1)

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, conversation.channelId))
      .limit(1)

    return NextResponse.json({ conversation, channel })
  } catch (error: unknown) {
    console.error("Error fetching WhatsApp conversation:", error)
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 })
  }
}



