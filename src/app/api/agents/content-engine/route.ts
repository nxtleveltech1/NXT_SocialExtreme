import { NextRequest, NextResponse } from "next/server";
import {
  generateWeeklyContent,
  generateContentIdeas,
  generatePostDraft,
  saveDraftAsPost,
  DEFAULT_CONFIG,
  type ContentEngineConfig,
  type ContentTopic,
} from "@/lib/agents/content-engine";

export const runtime = "nodejs";

/**
 * GET /api/agents/content-engine
 * Generate content ideas or weekly batch
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "ideas";
    const topicId = searchParams.get("topic");

    if (mode === "weekly") {
      const drafts = await generateWeeklyContent();
      return NextResponse.json({
        mode: "weekly",
        count: drafts.length,
        drafts,
      });
    }

    // Generate ideas for a specific topic or default
    const topic: ContentTopic = topicId
      ? DEFAULT_CONFIG.topics.find((t) => t.id === topicId) || DEFAULT_CONFIG.topics[0]
      : DEFAULT_CONFIG.topics[0];

    const ideas = await generateContentIdeas(topic);

    return NextResponse.json({
      mode: "ideas",
      topic: topic.name,
      ideas,
    });
  } catch (error: unknown) {
    console.error("Content engine error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/content-engine
 * Generate a specific draft or save a draft as a post
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, idea, topicId, platform, draftId, channelId, draft } = body;

    if (action === "generate-draft") {
      if (!idea || !platform) {
        return NextResponse.json(
          { error: "idea and platform are required" },
          { status: 400 }
        );
      }

      const topic = topicId
        ? DEFAULT_CONFIG.topics.find((t) => t.id === topicId) || DEFAULT_CONFIG.topics[0]
        : DEFAULT_CONFIG.topics[0];

      const generatedDraft = await generatePostDraft(idea, topic, platform);

      return NextResponse.json({
        action: "generate-draft",
        draft: generatedDraft,
      });
    }

    if (action === "save-draft") {
      if (!draft || !channelId) {
        return NextResponse.json(
          { error: "draft and channelId are required" },
          { status: 400 }
        );
      }

      const postId = await saveDraftAsPost(draft, channelId);

      return NextResponse.json({
        action: "save-draft",
        postId,
        status: "draft",
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'generate-draft' or 'save-draft'" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Content engine error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
