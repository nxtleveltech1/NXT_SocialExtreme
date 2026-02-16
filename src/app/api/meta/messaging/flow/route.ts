import { sendWhatsAppFlowComprehensive } from "@/lib/integrations/meta-comprehensive";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { channelId, to, flowParams } = body;

    if (!channelId || !to || !flowParams) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sendWhatsAppFlowComprehensive(channelId, to, flowParams);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



