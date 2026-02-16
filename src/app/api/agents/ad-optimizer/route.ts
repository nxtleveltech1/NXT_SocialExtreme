import { NextRequest, NextResponse } from "next/server";
import {
  runAdOptimization,
  getOptimizationSummary,
  DEFAULT_RULES,
  type OptimizationRule,
} from "@/lib/agents/ad-optimizer";
import { requireAuth } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/agents/ad-optimizer
 * Get optimization summary and current rules
 */
export async function GET() {
  try {
    await requireAuth();
    const summary = await getOptimizationSummary();

    return NextResponse.json({
      summary,
      rules: DEFAULT_RULES,
    });
  } catch (error: unknown) {
    console.error("Ad optimizer error:", error);
    return NextResponse.json(
      { error: "Failed to get optimization summary" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agents/ad-optimizer
 * Run ad optimization with optional custom rules
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => ({}));
    const customRules = body.rules as OptimizationRule[] | undefined;

    const rules = customRules || DEFAULT_RULES;
    const results = await runAdOptimization(rules);

    return NextResponse.json({
      executed: true,
      resultsCount: results.length,
      results,
    });
  } catch (error: unknown) {
    console.error("Ad optimizer error:", error);
    return NextResponse.json(
      { error: "Failed to run optimization" },
      { status: 500 }
    );
  }
}
