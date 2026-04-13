import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { generateMediaWithAI, getCurrentAIUserId } from "@/lib/ai/service";

export const runtime = "nodejs";

const mediaSchema = z.object({
  routeKey: z.enum(["studio.media.image", "studio.media.video"]),
  prompt: z.string().min(1),
  type: z.enum(["image", "video"]),
  providerId: z.number().int().positive().optional(),
  model: z.string().optional(),
  inputImageUrl: z.string().url().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const payload = mediaSchema.parse(await req.json());
    const result = await generateMediaWithAI(ownerUserId, payload);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("AI media POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI media" },
      { status: 500 }
    );
  }
}
