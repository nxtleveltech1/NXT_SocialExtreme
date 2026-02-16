import { NextRequest, NextResponse } from "next/server";
import {
  processUnreadMessages,
  classifyMessageIntent,
  generateResponse,
  DEFAULT_CONFIG,
  type AgentConfig,
} from "@/lib/agents/auto-responder";
import { sendMessage } from "@/lib/messaging/unified-inbox";
import { db } from "@/db/db";
import { conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/agents/auto-responder
 * Process unread messages and return suggested responses
 */
export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const autoReply = searchParams.get("autoReply") === "true";

    const config: AgentConfig = {
      ...DEFAULT_CONFIG,
      autoReplyEnabled: autoReply,
    };

    const results = await processUnreadMessages(config);

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error: unknown) {
    console.error("Auto-responder error:", error);
    return NextResponse.json(
      { error: "Failed to process messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/auto-responder
 * Classify a single message and optionally send a response
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json();
    const { conversationId, messageContent, sendReply, customResponse } = body;

    if (!messageContent) {
      return NextResponse.json(
        { error: "messageContent is required" },
        { status: 400 }
      );
    }

    // Classify the message
    const { intent, confidence } = await classifyMessageIntent(messageContent);

    // Generate response
    const suggestedResponse = await generateResponse(messageContent, intent);

    // If sendReply is true, actually send the message
    if (sendReply && conversationId) {
      const [conv] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (conv) {
        const responseText = customResponse || suggestedResponse;
        await sendMessage(conversationId, conv.platform, responseText);

        return NextResponse.json({
          intent,
          confidence,
          suggestedResponse,
          sent: true,
          sentMessage: responseText,
        });
      }
    }

    return NextResponse.json({
      intent,
      confidence,
      suggestedResponse,
      sent: false,
    });
  } catch (error: unknown) {
    console.error("Auto-responder error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
