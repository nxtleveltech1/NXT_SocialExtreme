import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { generateStructuredWithAI, getCurrentAIUserId } from "@/lib/ai/service";

export const runtime = "nodejs";

const generateSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  platform: z.string().optional(),
  tone: z.enum(["Professional", "Fun", "Edgy", "Casual", "Bold"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const { prompt, platform, tone } = generateSchema.parse(await req.json());

    // Construct system prompt based on tone
    let systemPrompt = "You are a social media expert. Generate engaging content.";
    if (tone === "Professional") {
      systemPrompt += " Use a professional, authoritative tone. Focus on value and expertise.";
    } else if (tone === "Fun") {
      systemPrompt += " Use a fun, energetic, and casual tone. Use emojis freely.";
    } else if (tone === "Edgy") {
      systemPrompt += " Use a bold, controversial, or thought-provoking tone.";
    }

    const platformContext = platform ? `The content is for ${platform}.` : "";
    const result = await generateStructuredWithAI<{ content: string; hashtags: string[] }>(ownerUserId, {
      routeKey: "studio.copy",
      prompt,
      systemPrompt: `${systemPrompt} ${platformContext} Return valid JSON with fields 'content' and 'hashtags'.`,
      options: {
        tone,
        platform,
      },
    });

    // Platform specific adjustments (length limits)
    let finalContent = result.object.content;
    if (platform === "Twitter" && finalContent.length > 280) {
      finalContent = finalContent.substring(0, 277) + "...";
    }

    return NextResponse.json({
      content: finalContent,
      hashtags: result.object.hashtags || [],
      usage: result.usage
    });

  } catch (error: unknown) {
    console.error("AI Generation Error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate content";
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    const isTimeout = message.includes("timed out") || message.includes("aborted");
    return NextResponse.json({ error: message }, { status: isTimeout ? 504 : 500 });
  }
}
