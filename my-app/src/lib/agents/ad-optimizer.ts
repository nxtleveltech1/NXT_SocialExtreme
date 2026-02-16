/**
 * Ad Optimizer Agent
 * 
 * Monitors ad performance via adInsights table and automatically
 * pauses underperforming ads based on configurable rules.
 */

import { db } from "@/db/db";
import { ads, adSets, adCampaigns, adInsights, channels } from "@/db/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { decryptSecret } from "@/lib/crypto";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: RuleCondition[];
  action: "pause" | "reduce_budget" | "alert";
  budgetReductionPercent?: number; // For reduce_budget action
}

export interface RuleCondition {
  metric: "ctr" | "cpc" | "cpm" | "conversions" | "roas" | "spend";
  operator: "lt" | "gt" | "lte" | "gte";
  value: number;
  timeframeDays: number;
}

export interface OptimizationResult {
  adId: number;
  platformAdId: string;
  adName: string;
  ruleTriggered: string;
  action: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  metrics: Record<string, number>;
}

// Default optimization rules
export const DEFAULT_RULES: OptimizationRule[] = [
  {
    id: "low-ctr",
    name: "Low CTR",
    description: "Pause ads with CTR below 0.5% over 7 days",
    enabled: true,
    conditions: [
      { metric: "ctr", operator: "lt", value: 50, timeframeDays: 7 }, // CTR stored as percentage * 100
    ],
    action: "pause",
  },
  {
    id: "high-cpc",
    name: "High CPC",
    description: "Alert when CPC exceeds $5 over 3 days",
    enabled: true,
    conditions: [
      { metric: "cpc", operator: "gt", value: 500, timeframeDays: 3 }, // CPC in cents
    ],
    action: "alert",
  },
  {
    id: "zero-conversions",
    name: "Zero Conversions",
    description: "Pause ads with no conversions after $50 spend",
    enabled: true,
    conditions: [
      { metric: "conversions", operator: "lte", value: 0, timeframeDays: 14 },
      { metric: "spend", operator: "gte", value: 5000, timeframeDays: 14 }, // $50 in cents
    ],
    action: "pause",
  },
  {
    id: "budget-drain",
    name: "Budget Drain",
    description: "Reduce budget 20% for ads spending too fast with low results",
    enabled: false,
    conditions: [
      { metric: "spend", operator: "gt", value: 10000, timeframeDays: 3 },
      { metric: "conversions", operator: "lt", value: 2, timeframeDays: 3 },
    ],
    action: "reduce_budget",
    budgetReductionPercent: 20,
  },
];

/**
 * Get aggregated metrics for an ad over a timeframe
 */
async function getAdMetrics(
  adId: number,
  days: number
): Promise<Record<string, number>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const insights = await db
    .select({
      totalImpressions: sql<number>`COALESCE(SUM(${adInsights.impressions}), 0)`,
      totalClicks: sql<number>`COALESCE(SUM(${adInsights.clicks}), 0)`,
      totalSpend: sql<number>`COALESCE(SUM(${adInsights.spend}), 0)`,
      totalConversions: sql<number>`COALESCE(SUM(${adInsights.conversions}), 0)`,
      totalConversionValue: sql<number>`COALESCE(SUM(${adInsights.conversionValue}), 0)`,
      avgCpm: sql<number>`COALESCE(AVG(${adInsights.cpm}), 0)`,
      avgCpc: sql<number>`COALESCE(AVG(${adInsights.cpc}), 0)`,
      avgCtr: sql<number>`COALESCE(AVG(${adInsights.ctr}), 0)`,
    })
    .from(adInsights)
    .where(
      and(
        eq(adInsights.adId, adId),
        gte(adInsights.date, startDate)
      )
    );

  const data = insights[0];
  
  // Calculate ROAS (Return on Ad Spend)
  const roas = data.totalSpend > 0 
    ? (data.totalConversionValue / data.totalSpend) * 100 
    : 0;

  return {
    impressions: Number(data.totalImpressions),
    clicks: Number(data.totalClicks),
    spend: Number(data.totalSpend),
    conversions: Number(data.totalConversions),
    conversionValue: Number(data.totalConversionValue),
    cpm: Number(data.avgCpm),
    cpc: Number(data.avgCpc),
    ctr: Number(data.avgCtr),
    roas,
  };
}

/**
 * Check if a rule's conditions are met
 */
function evaluateRule(
  rule: OptimizationRule,
  metrics: Record<string, number>
): boolean {
  return rule.conditions.every((condition) => {
    const metricValue = metrics[condition.metric] ?? 0;
    
    switch (condition.operator) {
      case "lt":
        return metricValue < condition.value;
      case "gt":
        return metricValue > condition.value;
      case "lte":
        return metricValue <= condition.value;
      case "gte":
        return metricValue >= condition.value;
      default:
        return false;
    }
  });
}

/**
 * Pause an ad via Meta API
 */
async function pauseAdOnMeta(
  platformAdId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${FB_GRAPH_URL}/${platformAdId}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        status: "PAUSED",
        access_token: accessToken,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to pause ad on Meta:", error);
    return false;
  }
}

/**
 * Run optimization on all active ads
 */
export async function runAdOptimization(
  rules: OptimizationRule[] = DEFAULT_RULES
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];
  const enabledRules = rules.filter((r) => r.enabled);

  if (enabledRules.length === 0) {
    return results;
  }

  // Get all active ads with their campaigns and channels
  const activeAds = await db
    .select({
      ad: ads,
      adSet: adSets,
      campaign: adCampaigns,
      channel: channels,
    })
    .from(ads)
    .innerJoin(adSets, eq(ads.adSetId, adSets.id))
    .innerJoin(adCampaigns, eq(adSets.campaignId, adCampaigns.id))
    .innerJoin(channels, eq(adCampaigns.channelId, channels.id))
    .where(eq(ads.status, "ACTIVE"));

  for (const { ad, adSet, campaign, channel } of activeAds) {
    // Get max timeframe needed from rules
    const maxDays = Math.max(
      ...enabledRules.flatMap((r) => r.conditions.map((c) => c.timeframeDays))
    );

    // Fetch metrics for this ad
    const metrics = await getAdMetrics(ad.id, maxDays);

    // Skip if no spend (ad hasn't run yet)
    if (metrics.spend === 0 && metrics.impressions === 0) {
      continue;
    }

    // Evaluate each rule
    for (const rule of enabledRules) {
      // Get metrics for this rule's specific timeframe
      const ruleTimeframe = Math.max(...rule.conditions.map((c) => c.timeframeDays));
      const ruleMetrics = ruleTimeframe !== maxDays 
        ? await getAdMetrics(ad.id, ruleTimeframe)
        : metrics;

      if (evaluateRule(rule, ruleMetrics)) {
        let newStatus = ad.status;
        let actionTaken = "";

        if (rule.action === "pause" && channel.accessToken) {
          const accessToken = decryptSecret(channel.accessToken);
          const success = await pauseAdOnMeta(ad.platformAdId!, accessToken);
          
          if (success) {
            newStatus = "PAUSED";
            actionTaken = "Ad paused via Meta API";
            
            // Update local database
            await db
              .update(ads)
              .set({ status: "PAUSED", updatedAt: new Date() })
              .where(eq(ads.id, ad.id));
          } else {
            actionTaken = "Failed to pause via API - flagged for manual review";
          }
        } else if (rule.action === "alert") {
          actionTaken = "Alert triggered - no automatic action taken";
        } else if (rule.action === "reduce_budget") {
          actionTaken = `Budget reduction recommended: ${rule.budgetReductionPercent}%`;
        }

        results.push({
          adId: ad.id,
          platformAdId: ad.platformAdId || "",
          adName: ad.name,
          ruleTriggered: rule.name,
          action: rule.action,
          previousStatus: ad.status || "ACTIVE",
          newStatus,
          reason: rule.description,
          metrics: ruleMetrics,
        });

        // Only trigger one rule per ad per run
        break;
      }
    }
  }

  return results;
}

/**
 * Get optimization summary for dashboard
 */
export async function getOptimizationSummary(): Promise<{
  totalAds: number;
  activeAds: number;
  pausedByOptimizer: number;
  alertsTriggered: number;
  potentialSavings: number;
}> {
  const allAds = await db.select().from(ads);
  
  const activeCount = allAds.filter((a) => a.status === "ACTIVE").length;
  const pausedCount = allAds.filter((a) => a.status === "PAUSED").length;

  // Estimate potential savings from paused underperforming ads
  // This would need historical data to calculate accurately
  const potentialSavings = pausedCount * 500; // Rough estimate: $5 per paused ad

  return {
    totalAds: allAds.length,
    activeAds: activeCount,
    pausedByOptimizer: pausedCount,
    alertsTriggered: 0, // Would need separate tracking
    potentialSavings,
  };
}

export { DEFAULT_RULES as defaultRules };
