import { NextRequest, NextResponse } from "next/server";
import { trackConversionEvent } from "@/lib/integrations/meta-comprehensive";
import { withRateLimit } from "@/lib/middleware/rate-limiter";
import { handleApiError } from "@/lib/utils/api-error-handler";
import { z } from "zod";

const BodySchema = z.object({
  channelId: z.union([z.number().int().positive(), z.string().regex(/^\d+$/)]),
  pixelId: z.string().min(1),
  eventName: z.string().min(1),
  userData: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      fbp: z.string().optional(),
      fbc: z.string().optional(),
    })
    .optional(),
  customData: z
    .object({
      value: z.number().optional(),
      currency: z.string().optional(),
      content_name: z.string().optional(),
    })
    .optional(),
});

export const POST = withRateLimit(async (req: Request) => {
  try {
    const body = BodySchema.parse(await req.json());
    const channelId = typeof body.channelId === "string" ? parseInt(body.channelId) : body.channelId;

    const result = await trackConversionEvent(
      channelId,
      body.pixelId,
      body.eventName,
      body.userData,
      body.customData
    );

    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { limit: 30, windowMs: 60_000 });



