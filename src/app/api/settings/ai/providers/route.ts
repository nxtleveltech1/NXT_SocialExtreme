import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentAIUserId, listAIAdminState } from "@/lib/ai/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const state = await listAIAdminState(ownerUserId);
    return NextResponse.json({
      providers: state.providers,
      promptTemplates: state.promptTemplates,
      brandProfiles: state.brandProfiles,
      logs: state.logs,
    });
  } catch (error: unknown) {
    console.error("AI providers GET error:", error);
    return NextResponse.json({ error: "Failed to load AI providers" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Custom provider creation is not enabled yet. Configure the built-in generic provider instead." },
    { status: 400 }
  );
}
