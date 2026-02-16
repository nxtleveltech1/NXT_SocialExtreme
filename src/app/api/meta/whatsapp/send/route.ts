import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessageComprehensive } from "@/lib/integrations/meta-comprehensive";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  channelId: z.number(),
  to: z.string(),
  type: z.enum(["text", "template", "image", "video", "document"]).optional(),
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    
    let body;
    try {
      body = BodySchema.parse(await req.json());
    } catch (error) {
      return NextResponse.json({ error: "Invalid request body", details: error }, { status: 400 });
    }

    if (!body.message) {
      return NextResponse.json(
        { error: "message required" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessageComprehensive(
      body.channelId,
      body.to,
      body.message
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to send WhatsApp message";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}



