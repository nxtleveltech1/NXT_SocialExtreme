import { NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenRouter client (OpenAI-compatible)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key",
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "NXT Social Extreme",
  },
});

export async function POST(req: Request) {
  try {
    const { prompt, platform, tone } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Fallback if no API key
    if (!process.env.OPENROUTER_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return NextResponse.json({
        content: `[SIMULATION MODE - NO API KEY]\n\nExcited to share this with our ${platform} community! ${prompt}\n\n(To enable real AI, add OPENROUTER_API_KEY to .env.local)`,
        hashtags: ["#Simulation", "#NXTSocialExtreme"],
        usage: { model: "simulator", tokens: 0 }
      });
    }

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

    // Use configured model or default to Google Gemini Flash (fast + cost-effective)
    const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

    const completion = await openrouter.chat.completions.create({
      messages: [
        { role: "system", content: `${systemPrompt} ${platformContext} Return the response as JSON with two fields: 'content' (the post text) and 'hashtags' (array of strings).` },
        { role: "user", content: prompt }
      ],
      model,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0].message.content;
    const parsedResponse = JSON.parse(responseContent || "{\"content\":\"\", \"hashtags\":[]}");

    // Platform specific adjustments (length limits)
    let finalContent = parsedResponse.content;
    if (platform === "Twitter" && finalContent.length > 280) {
      finalContent = finalContent.substring(0, 277) + "...";
    }

    return NextResponse.json({
      content: finalContent,
      hashtags: parsedResponse.hashtags,
      usage: completion.usage
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}
