import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { listAIAdminState, saveProviderSettings, getCurrentAIUserId } from "@/lib/ai/service";

export const runtime = "nodejs";

const providerUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  displayName: z.string().min(1).optional(),
  defaultModel: z.string().nullable().optional(),
  baseUrl: z.string().nullable().optional(),
  apiKey: z.string().min(1).optional(),
  label: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const { id } = await params;
    const providerId = Number(id);
    const state = await listAIAdminState(ownerUserId);
    const provider = state.providers.find((entry) => entry.id === providerId);
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }
    return NextResponse.json(provider);
  } catch (error: unknown) {
    console.error("AI provider GET error:", error);
    return NextResponse.json({ error: "Failed to load AI provider" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const { id } = await params;
    const providerId = Number(id);
    const payload = providerUpdateSchema.parse(await req.json());
    await saveProviderSettings(ownerUserId, providerId, payload);
    const state = await listAIAdminState(ownerUserId);
    const provider = state.providers.find((entry) => entry.id === providerId);
    return NextResponse.json({ success: true, provider });
  } catch (error: unknown) {
    console.error("AI provider PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save AI provider" },
      { status: 500 }
    );
  }
}
