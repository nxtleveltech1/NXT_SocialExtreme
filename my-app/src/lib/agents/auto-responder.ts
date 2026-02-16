/**
 * Auto-Responder Agent
 * 
 * Automatically classifies incoming messages by intent (Sales, Support, Spam)
 * and drafts/sends appropriate responses using AI.
 */

import { db } from "@/db/db";
import { messages, conversations, channels } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import OpenAI from "openai";

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "MobileMate Auto-Responder",
  },
});

export type MessageIntent = "sales" | "support" | "general" | "spam" | "urgent";

export interface ClassifiedMessage {
  messageId: number;
  conversationId: number;
  intent: MessageIntent;
  confidence: number;
  suggestedResponse: string;
  shouldAutoReply: boolean;
}

interface AgentConfig {
  autoReplyEnabled: boolean;
  confidenceThreshold: number; // 0-100
  businessName: string;
  businessDescription: string;
  supportEmail?: string;
  salesEmail?: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  autoReplyEnabled: false, // Manual approval by default
  confidenceThreshold: 80,
  businessName: "MobileMate",
  businessDescription: "Social media management platform",
};

/**
 * Classify message intent using AI
 */
export async function classifyMessageIntent(
  messageContent: string,
  conversationHistory: string[] = []
): Promise<{ intent: MessageIntent; confidence: number }> {
  if (!process.env.OPENROUTER_API_KEY) {
    // Fallback classification using keywords
    return keywordBasedClassification(messageContent);
  }

  try {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a message intent classifier for a business. Classify the incoming message into one of these categories:
- sales: Customer interested in buying, pricing questions, product inquiries
- support: Technical issues, complaints, help requests, order problems
- general: General questions, greetings, casual conversation
- spam: Promotional content, irrelevant messages, scams
- urgent: Emergency issues, time-sensitive requests, angry customers

Respond with JSON: { "intent": "category", "confidence": 0-100 }`,
        },
        ...conversationHistory.slice(-5).map((msg, i) => ({
          role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
          content: msg,
        })),
        { role: "user", content: messageContent },
      ],
      response_format: { type: "json_object" },
      max_tokens: 100,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return {
      intent: result.intent || "general",
      confidence: result.confidence || 50,
    };
  } catch (error) {
    console.error("AI classification failed:", error);
    return keywordBasedClassification(messageContent);
  }
}

/**
 * Generate AI-powered response based on intent
 */
export async function generateResponse(
  messageContent: string,
  intent: MessageIntent,
  config: AgentConfig = DEFAULT_CONFIG
): Promise<string> {
  if (!process.env.OPENROUTER_API_KEY) {
    return getTemplateResponse(intent, config);
  }

  try {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    const systemPrompts: Record<MessageIntent, string> = {
      sales: `You are a friendly sales assistant for ${config.businessName}. ${config.businessDescription}. Help the customer with pricing and product information. Be enthusiastic but not pushy. Keep responses concise (2-3 sentences).`,
      support: `You are a helpful support agent for ${config.businessName}. Acknowledge the customer's issue, apologize for inconvenience, and offer to help. If complex, suggest contacting ${config.supportEmail || "support"}. Keep responses concise.`,
      general: `You are a friendly representative for ${config.businessName}. Respond warmly and helpfully. Keep responses brief and professional.`,
      spam: `Politely decline and redirect to legitimate business inquiries.`,
      urgent: `You are an urgent response agent for ${config.businessName}. Acknowledge the urgency, assure immediate attention, and provide next steps. Be calm and reassuring.`,
    };

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompts[intent] },
        { role: "user", content: messageContent },
      ],
      max_tokens: 200,
    });

    return completion.choices[0].message.content || getTemplateResponse(intent, config);
  } catch (error) {
    console.error("AI response generation failed:", error);
    return getTemplateResponse(intent, config);
  }
}

/**
 * Process unread messages and generate responses
 */
export async function processUnreadMessages(
  config: AgentConfig = DEFAULT_CONFIG
): Promise<ClassifiedMessage[]> {
  // Get unread inbound messages
  const unreadConversations = await db
    .select()
    .from(conversations)
    .where(eq(conversations.unread, true))
    .orderBy(desc(conversations.time))
    .limit(50);

  const results: ClassifiedMessage[] = [];

  for (const conv of unreadConversations) {
    // Get the latest inbound message
    const latestMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conv.id),
          eq(messages.direction, "inbound")
        )
      )
      .orderBy(desc(messages.timestamp))
      .limit(5);

    if (latestMessages.length === 0) continue;

    const latestMessage = latestMessages[0];
    const messageContent = latestMessage.content || "";

    // Get conversation history for context
    const history = latestMessages
      .reverse()
      .map((m) => m.content || "")
      .filter(Boolean);

    // Classify intent
    const { intent, confidence } = await classifyMessageIntent(messageContent, history);

    // Generate response
    const suggestedResponse = await generateResponse(messageContent, intent, config);

    // Determine if we should auto-reply
    const shouldAutoReply =
      config.autoReplyEnabled &&
      confidence >= config.confidenceThreshold &&
      intent !== "spam";

    results.push({
      messageId: latestMessage.id,
      conversationId: conv.id,
      intent,
      confidence,
      suggestedResponse,
      shouldAutoReply,
    });
  }

  return results;
}

/**
 * Fallback keyword-based classification
 */
function keywordBasedClassification(message: string): {
  intent: MessageIntent;
  confidence: number;
} {
  const lower = message.toLowerCase();

  const salesKeywords = ["price", "cost", "buy", "purchase", "order", "quote", "available", "stock"];
  const supportKeywords = ["help", "issue", "problem", "broken", "error", "refund", "return", "complaint"];
  const urgentKeywords = ["urgent", "asap", "emergency", "immediately", "now", "critical"];
  const spamKeywords = ["free money", "lottery", "winner", "click here", "limited offer"];

  const matchCount = (keywords: string[]) =>
    keywords.filter((k) => lower.includes(k)).length;

  const scores = {
    sales: matchCount(salesKeywords),
    support: matchCount(supportKeywords),
    urgent: matchCount(urgentKeywords),
    spam: matchCount(spamKeywords),
    general: 0,
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { intent: "general", confidence: 60 };
  }

  const intent = Object.entries(scores).find(([, v]) => v === maxScore)?.[0] as MessageIntent;
  const confidence = Math.min(50 + maxScore * 15, 90);

  return { intent, confidence };
}

/**
 * Template responses when AI is unavailable
 */
function getTemplateResponse(intent: MessageIntent, config: AgentConfig): string {
  const templates: Record<MessageIntent, string> = {
    sales: `Thank you for your interest in ${config.businessName}! We'd love to help you. A member of our sales team will get back to you shortly.`,
    support: `Thank you for reaching out to ${config.businessName} support. We've received your message and will respond as soon as possible. ${config.supportEmail ? `You can also email us at ${config.supportEmail}.` : ""}`,
    general: `Thank you for contacting ${config.businessName}! We'll get back to you soon.`,
    spam: `Thank you for your message. For business inquiries, please visit our official website.`,
    urgent: `We understand this is urgent. Your message has been flagged as priority and our team will respond immediately.`,
  };

  return templates[intent];
}

export { DEFAULT_CONFIG, type AgentConfig };
