/**
 * AI Follow-Up Engine
 * Classifies incoming WhatsApp replies and routes them appropriately.
 *
 * Pipeline:
 *   Incoming Reply → Intent Classification → Route (AI / Human / Auto-response)
 */

import { db } from "@/db/db";
import {
  whatsappConversations,
  whatsappMessages,
  autoResponseRules,
  channels,
  conversations,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntentCategory =
  | "purchase_intent"
  | "support_request"
  | "pricing_inquiry"
  | "appointment_booking"
  | "complaint"
  | "positive_feedback"
  | "opt_out"
  | "general_inquiry"
  | "greeting"
  | "unknown";

export interface ClassificationResult {
  intent: IntentCategory;
  confidence: number; // 0-1
  suggestedAction: "auto_respond" | "escalate_human" | "ai_generate" | "ignore";
  reasoning: string;
}

export interface FollowUpAction {
  conversationId: number;
  phone: string;
  classification: ClassificationResult;
  responseText?: string;
  sent: boolean;
}

// ---------------------------------------------------------------------------
// Intent Classification (rule-based + keyword matching)
// ---------------------------------------------------------------------------

const INTENT_PATTERNS: Array<{ intent: IntentCategory; patterns: RegExp[]; confidence: number }> = [
  {
    intent: "purchase_intent",
    patterns: [
      /\b(buy|purchase|order|want to get|add to cart|i('ll| will) take|how (can|do) i (buy|order|get))\b/i,
      /\b(price|cost|how much|checkout|pay)\b/i,
    ],
    confidence: 0.85,
  },
  {
    intent: "pricing_inquiry",
    patterns: [
      /\b(price|pricing|cost|fee|rate|charge|quote|estimate|budget|affordable)\b/i,
      /\b(how much|what('s| is) the price|do you charge)\b/i,
    ],
    confidence: 0.8,
  },
  {
    intent: "appointment_booking",
    patterns: [
      /\b(book|appointment|schedule|meeting|call|demo|slot|available|calendar)\b/i,
      /\b(when (can|are)|set up a|arrange)\b/i,
    ],
    confidence: 0.8,
  },
  {
    intent: "support_request",
    patterns: [
      /\b(help|support|issue|problem|broken|not working|error|bug|fix|trouble)\b/i,
      /\b(doesn('| )t work|can('| )t|something wrong)\b/i,
    ],
    confidence: 0.8,
  },
  {
    intent: "complaint",
    patterns: [
      /\b(complain|terrible|awful|worst|disappointed|unacceptable|refund|scam|fraud)\b/i,
      /\b(never again|want my money|rip( |-)?off)\b/i,
    ],
    confidence: 0.85,
  },
  {
    intent: "positive_feedback",
    patterns: [
      /\b(thank|thanks|great|awesome|excellent|amazing|love it|perfect|well done|good job)\b/i,
      /\b(happy with|satisfied|appreciate|kudos)\b/i,
    ],
    confidence: 0.75,
  },
  {
    intent: "opt_out",
    patterns: [
      /\b(stop|unsubscribe|opt( |-)?out|remove me|don('| )t (message|contact|send))\b/i,
    ],
    confidence: 0.95,
  },
  {
    intent: "greeting",
    patterns: [
      /^(hi|hello|hey|good (morning|afternoon|evening)|howzit|sup|yo)\b/i,
    ],
    confidence: 0.7,
  },
];

/**
 * Classify the intent of an incoming message
 */
export function classifyIntent(messageText: string): ClassificationResult {
  const text = messageText.trim();
  if (!text) {
    return {
      intent: "unknown",
      confidence: 0,
      suggestedAction: "ignore",
      reasoning: "Empty message",
    };
  }

  let bestMatch: { intent: IntentCategory; confidence: number } | null = null;

  for (const rule of INTENT_PATTERNS) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        if (!bestMatch || rule.confidence > bestMatch.confidence) {
          bestMatch = { intent: rule.intent, confidence: rule.confidence };
        }
      }
    }
  }

  if (!bestMatch) {
    return {
      intent: "general_inquiry",
      confidence: 0.5,
      suggestedAction: "ai_generate",
      reasoning: "No specific intent pattern matched — route to AI for response generation",
    };
  }

  // Route based on intent
  const actionMap: Record<IntentCategory, ClassificationResult["suggestedAction"]> = {
    purchase_intent: "ai_generate",
    pricing_inquiry: "ai_generate",
    appointment_booking: "escalate_human",
    support_request: "escalate_human",
    complaint: "escalate_human",
    positive_feedback: "auto_respond",
    opt_out: "auto_respond",
    greeting: "auto_respond",
    general_inquiry: "ai_generate",
    unknown: "ignore",
  };

  return {
    intent: bestMatch.intent,
    confidence: bestMatch.confidence,
    suggestedAction: actionMap[bestMatch.intent],
    reasoning: `Matched "${bestMatch.intent}" pattern with ${Math.round(bestMatch.confidence * 100)}% confidence`,
  };
}

// ---------------------------------------------------------------------------
// Auto-Response Engine
// ---------------------------------------------------------------------------

const AUTO_RESPONSES: Record<string, string> = {
  greeting:
    "Hi there! 👋 Thanks for reaching out. How can we help you today?",
  positive_feedback:
    "Thank you so much for the kind words! We really appreciate it. 🙏 Is there anything else we can help you with?",
  opt_out:
    "We've noted your request. You will no longer receive marketing messages from us. If you change your mind, just say 'subscribe'. Thank you!",
};

/**
 * Process an incoming WhatsApp reply and execute the follow-up pipeline
 */
export async function processIncomingReply(
  channelId: number,
  conversationId: number,
  messageText: string,
  senderPhone: string
): Promise<FollowUpAction> {
  const classification = classifyIntent(messageText);

  const action: FollowUpAction = {
    conversationId,
    phone: senderPhone,
    classification,
    sent: false,
  };

  // Check database auto-response rules first
  const dbRules = await db
    .select()
    .from(autoResponseRules)
    .where(
      and(
        eq(autoResponseRules.channelId, channelId),
        eq(autoResponseRules.isActive, true)
      )
    );

  for (const rule of dbRules) {
    if (rule.trigger === "keyword" && rule.triggerValue) {
      const keywords = rule.triggerValue.split(",").map((k) => k.trim().toLowerCase());
      const msgLower = messageText.toLowerCase();
      if (keywords.some((kw) => msgLower.includes(kw))) {
        action.responseText = rule.response;
        action.classification.suggestedAction = "auto_respond";
        break;
      }
    }
  }

  // Fall back to built-in auto-responses
  if (!action.responseText && classification.suggestedAction === "auto_respond") {
    action.responseText = AUTO_RESPONSES[classification.intent] || undefined;
  }

  // Send auto-response if we have one
  if (action.responseText && classification.suggestedAction === "auto_respond") {
    try {
      await sendAutoResponse(channelId, senderPhone, action.responseText);
      action.sent = true;
    } catch (err) {
      console.error("Failed to send auto-response:", err);
    }
  }

  // Tag the conversation with intent for human agents
  await tagConversation(conversationId, senderPhone, classification);

  return action;
}

// ---------------------------------------------------------------------------
// Conversation Tagging
// ---------------------------------------------------------------------------

async function tagConversation(
  conversationId: number,
  phone: string,
  classification: ClassificationResult
) {
  // Tag WhatsApp conversation
  const waConvId = `wa_${phone}`;
  const [waConv] = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.platformConversationId, waConvId))
    .limit(1);

  if (waConv) {
    await db
      .update(whatsappConversations)
      .set({
        metadata: {
          ...(waConv.metadata as Record<string, any> || {}),
          lastIntent: classification.intent,
          lastConfidence: classification.confidence,
          suggestedAction: classification.suggestedAction,
          classifiedAt: new Date().toISOString(),
        },
      })
      .where(eq(whatsappConversations.id, waConv.id));
  }

  // Also tag unified conversation if exists
  const unifiedConvId = `wa_unified:${waConvId}`;
  const [unifiedConv] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.platformConversationId, unifiedConvId))
    .limit(1);

  if (unifiedConv) {
    const priorityMap: Record<string, string> = {
      complaint: "urgent",
      support_request: "high",
      purchase_intent: "high",
      appointment_booking: "normal",
      pricing_inquiry: "normal",
      general_inquiry: "normal",
      greeting: "low",
      positive_feedback: "low",
      opt_out: "low",
      unknown: "low",
    };

    await db
      .update(conversations)
      .set({
        priority: priorityMap[classification.intent] || "normal",
        sentiment: classification.intent === "complaint" ? "negative"
          : classification.intent === "positive_feedback" ? "positive"
          : "neutral",
        tags: [classification.intent, classification.suggestedAction],
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, unifiedConv.id));
  }
}

// ---------------------------------------------------------------------------
// Auto-Response Sender
// ---------------------------------------------------------------------------

async function sendAutoResponse(
  channelId: number,
  phone: string,
  responseText: string
) {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel?.accessToken || !channel.platformId) {
    throw new Error("Channel not connected");
  }

  const accessToken = decryptSecret(channel.accessToken);
  const client = new MetaApiClient(accessToken);

  const result = await client.sendWhatsAppMessage(channel.platformId, phone, responseText);

  // Store outbound message
  const waConvId = `wa_${phone}`;
  const [waConv] = await db
    .select()
    .from(whatsappConversations)
    .where(eq(whatsappConversations.platformConversationId, waConvId))
    .limit(1);

  if (waConv && result.messages?.[0]?.id) {
    await db.insert(whatsappMessages).values({
      conversationId: waConv.id,
      platformMessageId: result.messages[0].id,
      direction: "outbound",
      messageType: "text",
      content: responseText,
      timestamp: new Date(),
      status: "sent",
      metadata: { autoResponse: true },
    });

    await db
      .update(whatsappConversations)
      .set({
        lastMessage: responseText,
        lastMessageTime: new Date(),
      })
      .where(eq(whatsappConversations.id, waConv.id));
  }

  return result;
}

// ---------------------------------------------------------------------------
// Batch Processing (for webhook handler)
// ---------------------------------------------------------------------------

/**
 * Process multiple pending replies — designed to be called from webhook handler
 */
export async function processPendingReplies(channelId: number): Promise<FollowUpAction[]> {
  // Get recent unprocessed inbound messages
  const waConvs = await db
    .select()
    .from(whatsappConversations)
    .where(
      and(
        eq(whatsappConversations.channelId, channelId),
        eq(whatsappConversations.unread, true)
      )
    );

  const actions: FollowUpAction[] = [];

  for (const waConv of waConvs) {
    // Get the latest inbound message
    const [latestMsg] = await db
      .select()
      .from(whatsappMessages)
      .where(
        and(
          eq(whatsappMessages.conversationId, waConv.id),
          eq(whatsappMessages.direction, "inbound")
        )
      )
      .orderBy(desc(whatsappMessages.timestamp))
      .limit(1);

    if (!latestMsg?.content) continue;

    const action = await processIncomingReply(
      channelId,
      waConv.id,
      latestMsg.content,
      waConv.phoneNumber
    );
    actions.push(action);
  }

  return actions;
}
