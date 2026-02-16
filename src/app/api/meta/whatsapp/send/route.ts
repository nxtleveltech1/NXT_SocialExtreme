import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessageComprehensive } from "@/lib/integrations/meta-comprehensive";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, to, message } = body;

    if (!channelId || !to || !message) {
      return NextResponse.json(
        { error: "channelId, to, and message required" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessageComprehensive(
      parseInt(channelId),
      to,
      message
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



