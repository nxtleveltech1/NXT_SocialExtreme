import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentAIUserId, listProviderModels } from "@/lib/ai/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const providers = await listProviderModels(ownerUserId);
    return NextResponse.json({ providers });
  } catch (error: unknown) {
    console.error("AI models GET error:", error);
    return NextResponse.json({ error: "Failed to load AI models" }, { status: 500 });
  }
}
