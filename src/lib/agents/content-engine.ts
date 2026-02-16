/**
 * Content Engine Agent
 * 
 * Monitors industry trends and automatically drafts posts for approval.
 * Uses AI to generate relevant content based on configured topics.
 */

import { db } from "@/db/db";
import { posts, channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "NXT Social Extreme Content Engine",
  },
});

export interface ContentTopic {
  id: string;
  name: string;
  keywords: string[];
  tone: "professional" | "casual" | "fun" | "edgy";
  platforms: string[];
  enabled: boolean;
}

export interface GeneratedDraft {
  id: string;
  topic: string;
  platform: string;
  content: string;
  hashtags: string[];
  suggestedMediaType: "image" | "video" | "carousel" | "text";
  mediaPrompt?: string; // Prompt for AI image generation
  scheduleSuggestion: Date;
  confidence: number;
}

export interface ContentEngineConfig {
  businessName: string;
  businessDescription: string;
  industry: string;
  targetAudience: string;
  brandVoice: string;
  topics: ContentTopic[];
  postsPerWeek: number;
  preferredPostTimes: string[]; // e.g., ["09:00", "12:00", "18:00"]
}

const DEFAULT_CONFIG: ContentEngineConfig = {
  businessName: "NXT Social Extreme",
  businessDescription: "Social media management platform",
  industry: "Technology",
  targetAudience: "Small business owners and marketing professionals",
  brandVoice: "Professional yet approachable, innovative, helpful",
  topics: [
    {
      id: "tips",
      name: "Social Media Tips",
      keywords: ["social media", "marketing", "engagement", "growth"],
      tone: "professional",
      platforms: ["Facebook", "Instagram", "LinkedIn"],
      enabled: true,
    },
    {
      id: "trends",
      name: "Industry Trends",
      keywords: ["AI", "automation", "digital marketing", "2024 trends"],
      tone: "professional",
      platforms: ["LinkedIn", "Twitter"],
      enabled: true,
    },
    {
      id: "behind-scenes",
      name: "Behind the Scenes",
      keywords: ["team", "culture", "product updates", "features"],
      tone: "casual",
      platforms: ["Instagram", "TikTok"],
      enabled: true,
    },
  ],
  postsPerWeek: 5,
  preferredPostTimes: ["09:00", "12:00", "17:00"],
};

/**
 * Generate content ideas for a specific topic
 */
export async function generateContentIdeas(
  topic: ContentTopic,
  config: ContentEngineConfig = DEFAULT_CONFIG,
  count: number = 3
): Promise<string[]> {
  if (!process.env.OPENROUTER_API_KEY) {
    return getDefaultIdeas(topic);
  }

  try {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a social media content strategist for ${config.businessName}, a ${config.businessDescription} in the ${config.industry} industry.
          
Target audience: ${config.targetAudience}
Brand voice: ${config.brandVoice}

Generate ${count} unique content ideas for the topic "${topic.name}".
Keywords to incorporate: ${topic.keywords.join(", ")}
Tone: ${topic.tone}

Return JSON: { "ideas": ["idea1", "idea2", "idea3"] }
Each idea should be a brief 1-2 sentence description of the post concept.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.ideas || getDefaultIdeas(topic);
  } catch (error) {
    console.error("Failed to generate content ideas:", error);
    return getDefaultIdeas(topic);
  }
}

/**
 * Generate a full post draft from an idea
 */
export async function generatePostDraft(
  idea: string,
  topic: ContentTopic,
  platform: string,
  config: ContentEngineConfig = DEFAULT_CONFIG
): Promise<GeneratedDraft> {
  const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      id: draftId,
      topic: topic.name,
      platform,
      content: `${idea}\n\n#${config.businessName.replace(/\s/g, "")}`,
      hashtags: [`#${config.industry}`, `#${topic.name.replace(/\s/g, "")}`],
      suggestedMediaType: "image",
      scheduleSuggestion: getNextScheduleTime(config),
      confidence: 60,
    };
  }

  try {
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    // Platform-specific constraints
    const platformConstraints: Record<string, string> = {
      Twitter: "Max 280 characters. Be punchy and engaging.",
      Instagram: "Focus on visual storytelling. Use emojis. Max 2200 characters but keep it concise.",
      Facebook: "Can be longer form. Encourage engagement with questions.",
      LinkedIn: "Professional tone. Focus on value and insights.",
      TikTok: "Trendy, casual, hook-based. Think video script.",
    };

    const completion = await openrouter.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `You are a social media copywriter for ${config.businessName}.
          
Brand voice: ${config.brandVoice}
Platform: ${platform}
${platformConstraints[platform] || ""}

Write a complete social media post based on the given idea.

Return JSON with these fields:
{
  "content": "The full post text",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "suggestedMediaType": "image|video|carousel|text",
  "mediaPrompt": "Description of ideal image/video to accompany the post",
  "confidence": 0-100
}`,
        },
        { role: "user", content: `Topic: ${topic.name}\nIdea: ${idea}` },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    return {
      id: draftId,
      topic: topic.name,
      platform,
      content: result.content || idea,
      hashtags: result.hashtags || [],
      suggestedMediaType: result.suggestedMediaType || "image",
      mediaPrompt: result.mediaPrompt,
      scheduleSuggestion: getNextScheduleTime(config),
      confidence: result.confidence || 70,
    };
  } catch (error) {
    console.error("Failed to generate post draft:", error);
    return {
      id: draftId,
      topic: topic.name,
      platform,
      content: idea,
      hashtags: [],
      suggestedMediaType: "text",
      scheduleSuggestion: getNextScheduleTime(config),
      confidence: 50,
    };
  }
}

/**
 * Generate a batch of content drafts for the week
 */
export async function generateWeeklyContent(
  config: ContentEngineConfig = DEFAULT_CONFIG
): Promise<GeneratedDraft[]> {
  const drafts: GeneratedDraft[] = [];
  const enabledTopics = config.topics.filter((t) => t.enabled);

  if (enabledTopics.length === 0) {
    return drafts;
  }

  const postsPerTopic = Math.ceil(config.postsPerWeek / enabledTopics.length);

  for (const topic of enabledTopics) {
    const ideas = await generateContentIdeas(topic, config, postsPerTopic);

    for (let i = 0; i < ideas.length && drafts.length < config.postsPerWeek; i++) {
      const idea = ideas[i];
      const platform = topic.platforms[i % topic.platforms.length];

      const draft = await generatePostDraft(idea, topic, platform, config);
      drafts.push(draft);
    }
  }

  return drafts;
}

/**
 * Save draft to database as a pending post
 */
export async function saveDraftAsPost(
  draft: GeneratedDraft,
  channelId: number
): Promise<number> {
  const [channel] = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const [created] = await db
    .insert(posts)
    .values({
      channelId,
      platform: draft.platform,
      content: `${draft.content}\n\n${draft.hashtags.join(" ")}`,
      status: "draft",
      scheduledAt: draft.scheduleSuggestion,
      aiGenerated: true,
      tags: draft.hashtags,
    })
    .returning();

  return created.id;
}

/**
 * Get the next optimal schedule time
 */
function getNextScheduleTime(config: ContentEngineConfig): Date {
  const now = new Date();
  const preferredTimes = config.preferredPostTimes.map((t) => {
    const [hours, minutes] = t.split(":").map(Number);
    const date = new Date(now);
    date.setHours(hours, minutes, 0, 0);
    if (date <= now) {
      date.setDate(date.getDate() + 1);
    }
    return date;
  });

  preferredTimes.sort((a, b) => a.getTime() - b.getTime());
  return preferredTimes[0];
}

/**
 * Fallback content ideas when AI is unavailable
 */
function getDefaultIdeas(topic: ContentTopic): string[] {
  const genericIdeas: Record<string, string[]> = {
    tips: [
      "Share 3 quick tips for improving social media engagement",
      "Common mistakes businesses make on social media",
      "How to create content that resonates with your audience",
    ],
    trends: [
      "Latest trends shaping the industry in 2024",
      "How AI is transforming digital marketing",
      "What successful brands are doing differently",
    ],
    "behind-scenes": [
      "A day in the life at our company",
      "Sneak peek at upcoming features",
      "Meet the team behind the product",
    ],
  };

  return genericIdeas[topic.id] || [
    `Share insights about ${topic.name}`,
    `Tips related to ${topic.keywords[0]}`,
    `Industry update on ${topic.keywords[1] || topic.keywords[0]}`,
  ];
}

export { DEFAULT_CONFIG };
