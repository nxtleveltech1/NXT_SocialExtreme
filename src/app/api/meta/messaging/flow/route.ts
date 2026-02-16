import { sendWhatsAppFlowComprehensive } from "@/lib/integrations/meta-comprehensive";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { z } from "zod";

const BodySchema = z.object({
  channelId: z.number(),
  to: z.string(),
  flowParams: z.object({
    header: z.string().optional(),
    body: z.string(),
    footer: z.string().optional(),
    flow_id: z.string(),
    flow_cta: z.string(),
    flow_token: z.string().optional(),
    flow_action: z.enum(["navigate", "data_exchange"]).optional(),
    flow_action_payload: z.record(z.string(), z.unknown()).optional(),
  }),
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

    const result = await sendWhatsAppFlowComprehensive(body.channelId, body.to, body.flowParams);

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}



