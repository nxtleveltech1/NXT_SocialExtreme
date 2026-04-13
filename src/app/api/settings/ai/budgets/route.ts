import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentAIUserId, listAIAdminState, saveBudget } from "@/lib/ai/service";

export const runtime = "nodejs";

const budgetSchema = z.object({
  id: z.number().int().positive().optional(),
  providerId: z.number().int().positive().nullable().optional(),
  routeKey: z.string().nullable().optional(),
  limitMicros: z.number().int().nonnegative(),
  warningThresholdPercent: z.number().int().min(1).max(100).optional(),
  hardStop: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const state = await listAIAdminState(ownerUserId);
    return NextResponse.json({ budgets: state.budgets });
  } catch (error: unknown) {
    console.error("AI budgets GET error:", error);
    return NextResponse.json({ error: "Failed to load AI budgets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const ownerUserId = await getCurrentAIUserId();
    const payload = budgetSchema.parse(await req.json());
    await saveBudget(ownerUserId, payload);
    const state = await listAIAdminState(ownerUserId);
    return NextResponse.json({ success: true, budgets: state.budgets });
  } catch (error: unknown) {
    console.error("AI budgets POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save AI budget" },
      { status: 500 }
    );
  }
}
