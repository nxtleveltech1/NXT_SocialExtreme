import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentAIUserId, testProviderConnection } from "@/lib/ai/service";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const { id } = await params;
    const providerId = Number(id);
    const result = await testProviderConnection(ownerUserId, providerId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error: unknown) {
    console.error("AI provider test error:", error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Connection test failed" },
      { status: 500 }
    );
  }
}
