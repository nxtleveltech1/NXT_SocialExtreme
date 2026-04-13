import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentAIUserId, listAIAdminState, saveRouting } from "@/lib/ai/service";

export const runtime = "nodejs";

const routingSchema = z.object({
  routeKey: z.enum(["studio.copy", "studio.media.image", "studio.media.video", "agents.content", "agents.reply"]),
  primaryProviderId: z.number().int().positive(),
  preferredModel: z.string().nullable().optional(),
  fallbackProviderIds: z.array(z.number().int().positive()).optional(),
  enabled: z.boolean().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const state = await listAIAdminState(ownerUserId);
    return NextResponse.json({ routes: state.routes });
  } catch (error: unknown) {
    console.error("AI routing GET error:", error);
    return NextResponse.json({ error: "Failed to load AI routing" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const payload = routingSchema.parse(await req.json());
    await saveRouting(ownerUserId, payload);
    const state = await listAIAdminState(ownerUserId);
    return NextResponse.json({ success: true, routes: state.routes });
  } catch (error: unknown) {
    console.error("AI routing PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save routing" },
      { status: 500 }
    );
  }
}
