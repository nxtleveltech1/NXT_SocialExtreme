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

    // Normalise: if the provider returned b64_json but no url, convert to a data URI
    // so downstream consumers always have a usable `url` field.
    const url =
      result.url ||
      (result.b64Json
        ? `data:${result.mimeType || "image/png"};base64,${result.b64Json}`
        : undefined);

    if (!url) {
      console.error("[AI:media] Provider returned neither url nor b64Json", {
        provider: result.providerSlug,
        model: result.model,
      });
      return NextResponse.json(
        { error: "AI provider did not return a usable media asset." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ...result,
      url,
      // Strip large b64 payload from the response to keep it lightweight
      b64Json: undefined,
    });
  } catch (error: unknown) {
    console.error("AI media POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate AI media";
    const isTimeout = message.includes("timed out") || message.includes("aborted");
    return NextResponse.json(
      { error: message },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
