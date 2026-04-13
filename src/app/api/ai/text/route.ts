import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { generateStructuredWithAI, generateTextWithAI, getCurrentAIUserId } from "@/lib/ai/service";

export const runtime = "nodejs";

const textSchema = z.object({
  routeKey: z.enum(["studio.copy", "agents.content", "agents.reply"]),
  prompt: z.string().min(1),
  providerId: z.number().int().positive().optional(),
  model: z.string().optional(),
  systemPrompt: z.string().optional(),
  brandProfileId: z.number().int().positive().optional(),
  promptTemplateId: z.number().int().positive().optional(),
  parseJson: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const payload = textSchema.parse(await req.json());
    const result = payload.parseJson
      ? await generateStructuredWithAI(ownerUserId, payload)
      : await generateTextWithAI(ownerUserId, payload);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("AI text POST error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request payload", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to generate AI text";
    const isTimeout = message.includes("timed out") || message.includes("aborted");
    return NextResponse.json(
      { error: message },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
