"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { RefreshCw, TrendingUp, Users, Eye, Heart, MessageSquare } from "lucide-react";

interface OverviewDashboardProps {
  channelId: number;
}

interface AnalyticsData {
  summary: {
    engagementRate: number;
    totalPosts: number;
    totalEngagement: number;
    totalReach: number;
    impressions?: number;
    reach?: number;
    profileViews?: number;
    followerCount?: number;
  };
  metrics: Array<{
    date: string;
    [key: string]: any;
  }>;
}

async function fetchAnalytics(channelId: number): Promise<AnalyticsData> {
  const res = await fetch(`/api/meta/analytics?channelId=${channelId}&sync=true&daysBack=7`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

export default function OverviewDashboard({ channelId }: OverviewDashboardProps) {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", channelId],
    queryFn: () => fetchAnalytics(channelId),
    enabled: !!channelId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center py-12">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
        </div>
      </Card>
    );
  }

  const summary = data?.summary || {
    engagementRate: 0,
    totalPosts: 0,
    totalEngagement: 0,
    totalReach: 0,
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">ANALYTICS OVERVIEW</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Users className="text-blue-600" size={20} />
            <span className="text-xs font-bold text-blue-600 uppercase">Followers</span>
          </div>
          <p className="text-2xl font-black text-blue-900">
            {summary.followerCount?.toLocaleString() || "0"}
          </p>
        </div>

        <div className="p-4 bg-purple-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-purple-600" size={20} />
            <span className="text-xs font-bold text-purple-600 uppercase">Engagement Rate</span>
          </div>
          <p className="text-2xl font-black text-purple-900">{summary.engagementRate.toFixed(2)}%</p>
        </div>

        <div className="p-4 bg-green-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="text-green-600" size={20} />
            <span className="text-xs font-bold text-green-600 uppercase">Reach</span>
          </div>
          <p className="text-2xl font-black text-green-900">
            {summary.totalReach > 0
              ? `${(summary.totalReach / 1000).toFixed(1)}K`
              : summary.reach
                ? `${(summary.reach / 1000).toFixed(1)}K`
                : "0"}
          </p>
        </div>

        <div className="p-4 bg-pink-50 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="text-pink-600" size={20} />
            <span className="text-xs font-bold text-pink-600 uppercase">Total Engagement</span>
          </div>
          <p className="text-2xl font-black text-pink-900">{summary.totalEngagement.toLocaleString()}</p>
        </div>
      </div>

      {summary.totalPosts > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Posts Analyzed</span>
            <span className="text-lg font-black text-gray-900">{summary.totalPosts}</span>
          </div>
        </div>
      )}
    </Card>
  );
}

