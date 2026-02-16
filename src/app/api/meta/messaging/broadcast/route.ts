import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels, whatsappConversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

const BroadcastSchema = z.object({
  channelId: z.number(),
  recipients: z.array(z.string()), // Phone numbers or user IDs
  message: z.string().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateParams: z.record(z.string(), z.any()).optional(),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(["image", "video", "document", "audio"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = BroadcastSchema.parse(body);

    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.id, validated.channelId))
      .limit(1);

    if (!channel || channel.platform !== "WhatsApp") {
      return NextResponse.json({ error: "WhatsApp channel not found" }, { status: 404 });
    }

    if (!channel.platformId) {
      return NextResponse.json({ error: "Channel missing phone number ID" }, { status: 400 });
    }

    const accessToken = decryptSecret(channel.accessToken!);
    const client = new MetaApiClient(accessToken);
    const phoneNumberId = channel.platformId;

    const results = [];
    const errors = [];

    for (const recipient of validated.recipients) {
      try {
        if (validated.templateName) {
          // Send template message
          const result = await client.sendWhatsAppTemplate(
            phoneNumberId,
            recipient,
            validated.templateName,
            validated.templateLanguage || "en",
            validated.templateParams ? [{
              type: "body",
              parameters: Object.entries(validated.templateParams).map(([key, value]) => ({
                type: "text",
                text: String(value),
              })),
            }] : undefined
          );
          results.push({ recipient, success: true, messageId: result.messages?.[0]?.id });
        } else if (validated.mediaUrl && validated.mediaType) {
          // Send media message
          const result = await client.sendWhatsAppMedia(
            phoneNumberId,
            recipient,
            validated.mediaType,
            validated.mediaUrl,
            validated.message
          );
          results.push({ recipient, success: true, messageId: result.messages?.[0]?.id });
        } else if (validated.message) {
          // Send text message
          const result = await client.sendWhatsAppMessage(phoneNumberId, recipient, validated.message);
          results.push({ recipient, success: true, messageId: result.messages?.[0]?.id });
        } else {
          errors.push({ recipient, error: "No message content provided" });
        }
      } catch (error: unknown) {
        errors.push({ recipient, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      sent: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to send broadcast";
    console.error("Error sending broadcast:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

