import { syncCRMToMetaCustomAudience } from "@/lib/integrations/meta-comprehensive";
import { NextResponse } from "next/server";
import { withRateLimit } from "@/lib/middleware/rate-limiter";
import { handleApiError } from "@/lib/utils/api-error-handler";
import { z } from "zod";

const BodySchema = z.object({
  channelId: z.number().int().positive(),
  adAccountId: z.string().min(1),
  audienceName: z.string().min(1),
  source: z.enum(["followers", "conversations"]).optional(),
});

export const POST = withRateLimit(async (req: Request) => {
  try {
    const body = BodySchema.parse(await req.json());

    const result = await syncCRMToMetaCustomAudience(
      body.channelId,
      body.adAccountId,
      body.audienceName,
      body.source
    );

    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}, { limit: 20, windowMs: 60_000 });



