import { sendWhatsAppFlowComprehensive } from "@/lib/integrations/meta-comprehensive";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { channelId, to, flowParams } = body;

    if (!channelId || !to || !flowParams) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await sendWhatsAppFlowComprehensive(channelId, to, flowParams);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



