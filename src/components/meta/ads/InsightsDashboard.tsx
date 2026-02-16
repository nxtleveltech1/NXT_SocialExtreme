"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { RefreshCw, TrendingUp, Eye, MousePointerClick, DollarSign, Target } from "lucide-react";

interface InsightsDashboardProps {
  channelId: number;
  adAccountId: string;
}

interface AdInsight {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  conversions: number;
}

async function fetchAdInsights(channelId: number, adAccountId: string): Promise<AdInsight[]> {
  const res = await fetch(`/api/meta/ads/insights?channelId=${channelId}&adAccountId=${adAccountId}`);
  if (!res.ok) throw new Error("Failed to fetch ad insights");
  const data = await res.json();
  return data.insights || [];
}

export default function InsightsDashboard({ channelId, adAccountId }: InsightsDashboardProps) {
  const { data: insights = [], isLoading } = useQuery<AdInsight[]>({
    queryKey: ["adInsights", channelId, adAccountId],
    queryFn: () => fetchAdInsights(channelId, adAccountId),
    enabled: !!channelId && !!adAccountId,
  });

  const totals = insights.reduce(
    (acc, insight) => ({
      impressions: acc.impressions + (insight.impressions || 0),
      clicks: acc.clicks + (insight.clicks || 0),
      spend: acc.spend + (insight.spend || 0),
      reach: acc.reach + (insight.reach || 0),
      conversions: acc.conversions + (insight.conversions || 0),
    }),
    { impressions: 0, clicks: 0, spend: 0, reach: 0, conversions: 0 }
  );

  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">AD PERFORMANCE INSIGHTS</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="text-blue-600" size={20} />
            <span className="text-xs font-bold text-blue-600 uppercase">Impressions</span>
          </div>
          <p className="text-2xl font-black text-blue-900">{totals.impressions.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-green-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="text-green-600" size={20} />
            <span className="text-xs font-bold text-green-600 uppercase">Clicks</span>
          </div>
          <p className="text-2xl font-black text-green-900">{totals.clicks.toLocaleString()}</p>
        </div>

        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-purple-600" size={20} />
            <span className="text-xs font-bold text-purple-600 uppercase">CTR</span>
          </div>
          <p className="text-2xl font-black text-purple-900">{ctr.toFixed(2)}%</p>
        </div>

        <div className="p-4 bg-yellow-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-yellow-600" size={20} />
            <span className="text-xs font-bold text-yellow-600 uppercase">Spend</span>
          </div>
          <p className="text-2xl font-black text-yellow-900">${(totals.spend / 100).toFixed(2)}</p>
        </div>

        <div className="p-4 bg-red-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-red-600" size={20} />
            <span className="text-xs font-bold text-red-600 uppercase">Conversions</span>
          </div>
          <p className="text-2xl font-black text-red-900">{totals.conversions}</p>
        </div>

        <div className="p-4 bg-indigo-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="text-indigo-600" size={20} />
            <span className="text-xs font-bold text-indigo-600 uppercase">CPA</span>
          </div>
          <p className="text-2xl font-black text-indigo-900">
            {cpa > 0 ? `$${(cpa / 100).toFixed(2)}` : "N/A"}
          </p>
        </div>
      </div>

      {insights.length === 0 && (
        <div className="p-8 text-center border border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No insights data available. Run some ads to see performance metrics.</p>
        </div>
      )}
    </Card>
  );
}

