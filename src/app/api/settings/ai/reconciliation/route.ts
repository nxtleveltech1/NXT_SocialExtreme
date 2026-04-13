import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentAIUserId, listAIAdminState, saveReconciliation } from "@/lib/ai/service";

export const runtime = "nodejs";

const reconciliationSchema = z.object({
  providerSlug: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  importedTotalMicros: z.number().int(),
  notes: z.string().optional(),
  adjustments: z.array(
    z.object({
      amountMicros: z.number().int(),
      reason: z.string().min(1),
      notes: z.string().optional(),
    })
  ).optional(),
});

export async function GET() {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const state = await listAIAdminState(ownerUserId);
    return NextResponse.json({ reconciliationRuns: state.reconciliationRuns });
  } catch (error: unknown) {
    console.error("AI reconciliation GET error:", error);
    return NextResponse.json({ error: "Failed to load reconciliation runs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const payload = reconciliationSchema.parse(await req.json());
    const run = await saveReconciliation(ownerUserId, {
      providerSlug: payload.providerSlug,
      periodStart: new Date(payload.periodStart),
      periodEnd: new Date(payload.periodEnd),
      importedTotalMicros: payload.importedTotalMicros,
      notes: payload.notes,
      adjustments: payload.adjustments,
    });
    return NextResponse.json({ success: true, run });
  } catch (error: unknown) {
    console.error("AI reconciliation POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save reconciliation run" },
      { status: 500 }
    );
  }
}
