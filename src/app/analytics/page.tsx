import { 
  BarChart3, 
  TrendingUp, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Facebook,
  Instagram,
  Video,
  MessageSquare
} from "lucide-react";

import { db } from "@/db/db";
import {
  channels as channelsTable,
  posts as postsTable,
  conversations as conversationsTable,
} from "@/db/schema";
import { sql, gte, lt, and, InferSelectModel } from "drizzle-orm";

type Channel = InferSelectModel<typeof channelsTable>;

export const dynamic = "force-dynamic";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'text-blue-600' },
  Instagram: { icon: Instagram, color: 'text-pink-600' },
  TikTok: { icon: Video, color: 'text-black' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600' },
};

function calcPercentChange(
  current: number,
  previous: number
): { change: string; trend: "up" | "down" } {
  if (previous === 0) {
    return {
      change: current > 0 ? "+100%" : "0%",
      trend: current > 0 ? "up" : "down",
    };
  }
  const pct = ((current - previous) / previous) * 100;
  return {
    change: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`,
    trend: pct >= 0 ? "up" : "down",
  };
}

function formatNumber(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return String(val);
}

export default async function AnalyticsPage() {
  let channels: Channel[] = [];

  // Current-period aggregates
  let currentImpressions = 0;
  let currentEngagement = { likes: 0, comments: 0, shares: 0, reach: 0 };
  let currentPostsCount = 0;

  // Previous-period aggregates (for trend comparison)
  let prevImpressions = 0;
  let prevEngagement = { likes: 0, comments: 0, shares: 0, reach: 0 };
  let prevPostsCount = 0;

  // Per-channel breakdowns
  let channelPostStats: {
    channelId: number | null;
    platform: string;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
  }[] = [];
  let prevChannelPostStats: typeof channelPostStats = [];
  let channelLeadCounts: { channelId: number | null; count: number }[] = [];

  // Weekly chart data
  let weeklyData: { week: string; impressions: number }[] = [];

  try {
    const now = new Date();
    const days = 30;

    // Current period: last 30 days
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - days);

    // Previous period: 31–60 days ago
    const prevStart = new Date(now);
    prevStart.setDate(prevStart.getDate() - days * 2);
    const prevEnd = new Date(now);
    prevEnd.setDate(prevEnd.getDate() - days);

    channels = await db.select().from(channelsTable);

    // ── Current period ────────────────────────────────────────────────
    const [currImpRow] = await db
      .select({
        sum: sql<number>`coalesce(sum(${postsTable.impressions}), 0)`,
      })
      .from(postsTable)
      .where(gte(postsTable.date, currentStart));
    currentImpressions = Number(currImpRow?.sum ?? 0);

    const [currEngRow] = await db
      .select({
        likes: sql<number>`coalesce(sum(${postsTable.likes}), 0)`,
        comments: sql<number>`coalesce(sum(${postsTable.comments}), 0)`,
        shares: sql<number>`coalesce(sum(${postsTable.shares}), 0)`,
        reach: sql<number>`coalesce(sum(${postsTable.reach}), 0)`,
      })
      .from(postsTable)
      .where(gte(postsTable.date, currentStart));
    currentEngagement = {
      likes: Number(currEngRow?.likes ?? 0),
      comments: Number(currEngRow?.comments ?? 0),
      shares: Number(currEngRow?.shares ?? 0),
      reach: Number(currEngRow?.reach ?? 0),
    };

    const [currPostsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(gte(postsTable.date, currentStart));
    currentPostsCount = Number(currPostsRow?.count ?? 0);

    // ── Previous period ───────────────────────────────────────────────
    const [prevImpRow] = await db
      .select({
        sum: sql<number>`coalesce(sum(${postsTable.impressions}), 0)`,
      })
      .from(postsTable)
      .where(and(gte(postsTable.date, prevStart), lt(postsTable.date, prevEnd)));
    prevImpressions = Number(prevImpRow?.sum ?? 0);

    const [prevEngRow] = await db
      .select({
        likes: sql<number>`coalesce(sum(${postsTable.likes}), 0)`,
        comments: sql<number>`coalesce(sum(${postsTable.comments}), 0)`,
        shares: sql<number>`coalesce(sum(${postsTable.shares}), 0)`,
        reach: sql<number>`coalesce(sum(${postsTable.reach}), 0)`,
      })
      .from(postsTable)
      .where(and(gte(postsTable.date, prevStart), lt(postsTable.date, prevEnd)));
    prevEngagement = {
      likes: Number(prevEngRow?.likes ?? 0),
      comments: Number(prevEngRow?.comments ?? 0),
      shares: Number(prevEngRow?.shares ?? 0),
      reach: Number(prevEngRow?.reach ?? 0),
    };

    const [prevPostsRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(and(gte(postsTable.date, prevStart), lt(postsTable.date, prevEnd)));
    prevPostsCount = Number(prevPostsRow?.count ?? 0);

    // ── Per-channel post stats (current) ──────────────────────────────
    channelPostStats = (
      await db
        .select({
          channelId: postsTable.channelId,
          platform: postsTable.platform,
          likes: sql<number>`coalesce(sum(${postsTable.likes}), 0)`,
          comments: sql<number>`coalesce(sum(${postsTable.comments}), 0)`,
          shares: sql<number>`coalesce(sum(${postsTable.shares}), 0)`,
          reach: sql<number>`coalesce(sum(${postsTable.reach}), 0)`,
          impressions: sql<number>`coalesce(sum(${postsTable.impressions}), 0)`,
        })
        .from(postsTable)
        .where(gte(postsTable.date, currentStart))
        .groupBy(postsTable.channelId, postsTable.platform)
    ).map((r) => ({
      channelId: r.channelId,
      platform: r.platform,
      likes: Number(r.likes),
      comments: Number(r.comments),
      shares: Number(r.shares),
      reach: Number(r.reach),
      impressions: Number(r.impressions),
    }));

    // ── Per-channel post stats (previous) ─────────────────────────────
    prevChannelPostStats = (
      await db
        .select({
          channelId: postsTable.channelId,
          platform: postsTable.platform,
          likes: sql<number>`coalesce(sum(${postsTable.likes}), 0)`,
          comments: sql<number>`coalesce(sum(${postsTable.comments}), 0)`,
          shares: sql<number>`coalesce(sum(${postsTable.shares}), 0)`,
          reach: sql<number>`coalesce(sum(${postsTable.reach}), 0)`,
          impressions: sql<number>`coalesce(sum(${postsTable.impressions}), 0)`,
        })
        .from(postsTable)
        .where(and(gte(postsTable.date, prevStart), lt(postsTable.date, prevEnd)))
        .groupBy(postsTable.channelId, postsTable.platform)
    ).map((r) => ({
      channelId: r.channelId,
      platform: r.platform,
      likes: Number(r.likes),
      comments: Number(r.comments),
      shares: Number(r.shares),
      reach: Number(r.reach),
      impressions: Number(r.impressions),
    }));

    // ── Leads per channel (conversation count) ────────────────────────
    channelLeadCounts = (
      await db
        .select({
          channelId: conversationsTable.channelId,
          count: sql<number>`count(*)`,
        })
        .from(conversationsTable)
        .groupBy(conversationsTable.channelId)
    ).map((r) => ({ channelId: r.channelId, count: Number(r.count) }));

    // ── Weekly impressions for growth chart (last 12 weeks) ───────────
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    weeklyData = (
      await db
        .select({
          week: sql<string>`to_char(date_trunc('week', ${postsTable.date}), 'YYYY-MM-DD')`,
          impressions: sql<number>`coalesce(sum(${postsTable.impressions}), 0)`,
        })
        .from(postsTable)
        .where(gte(postsTable.date, twelveWeeksAgo))
        .groupBy(sql`date_trunc('week', ${postsTable.date})`)
        .orderBy(sql`date_trunc('week', ${postsTable.date})`)
    ).map((r) => ({ week: r.week, impressions: Number(r.impressions) }));
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Analytics DB error:", msg);
    }
  }

  // ── Compute KPIs with real period-over-period trends ──────────────
  const currTotalEng =
    currentEngagement.likes +
    currentEngagement.comments +
    currentEngagement.shares;
  const prevTotalEng =
    prevEngagement.likes + prevEngagement.comments + prevEngagement.shares;

  const engagementRate =
    currentEngagement.reach > 0
      ? (currTotalEng / currentEngagement.reach) * 100
      : 0;
  const prevEngagementRate =
    prevEngagement.reach > 0
      ? (prevTotalEng / prevEngagement.reach) * 100
      : 0;

  const engRateDelta = engagementRate - prevEngagementRate;

  const impressionsTrend = calcPercentChange(currentImpressions, prevImpressions);
  const engRateTrend = {
    change: `${engRateDelta >= 0 ? "+" : ""}${engRateDelta.toFixed(1)}%`,
    trend: (engRateDelta >= 0 ? "up" : "down") as "up" | "down",
  };
  const postsDiff = currentPostsCount - prevPostsCount;
  const postsTrend = {
    change: `${postsDiff >= 0 ? "+" : ""}${postsDiff}`,
    trend: (postsDiff >= 0 ? "up" : "down") as "up" | "down",
  };
  const totalEngTrend = calcPercentChange(currTotalEng, prevTotalEng);

  const kpis = [
    {
      name: "Total Impressions",
      value: formatNumber(currentImpressions),
      change: impressionsTrend.change,
      trend: impressionsTrend.trend,
    },
    {
      name: "Engagement Rate",
      value: `${engagementRate.toFixed(1)}%`,
      change: engRateTrend.change,
      trend: engRateTrend.trend,
    },
    {
      name: "Total Posts",
      value: String(currentPostsCount),
      change: postsTrend.change,
      trend: postsTrend.trend,
    },
    {
      name: "Total Engagement",
      value: formatNumber(currTotalEng),
      change: totalEngTrend.change,
      trend: totalEngTrend.trend,
    },
  ];

  // ── Per-channel data from real queries ─────────────────────────────
  const channelData = channels.map((channel) => {
    const currStats = channelPostStats.find((s) => s.channelId === channel.id);
    const prevStats = prevChannelPostStats.find(
      (s) => s.channelId === channel.id
    );

    const currEng =
      (currStats?.likes ?? 0) +
      (currStats?.comments ?? 0) +
      (currStats?.shares ?? 0);
    const prevEng =
      (prevStats?.likes ?? 0) +
      (prevStats?.comments ?? 0) +
      (prevStats?.shares ?? 0);

    const engRate =
      (currStats?.reach ?? 0) > 0
        ? `${((currEng / currStats!.reach) * 100).toFixed(1)}%`
        : "0.0%";

    const growth = calcPercentChange(currEng, prevEng);
    const leads =
      channelLeadCounts.find((l) => l.channelId === channel.id)?.count ?? 0;

    return {
      name: channel.name.includes("|")
        ? channel.name.split("|")[0].trim()
        : channel.name,
      platform: channel.platform,
      growth: growth.change,
      engagement: engRate,
      leads,
      ...platformIcons[channel.platform as keyof typeof platformIcons],
    };
  });

  const totalLeads = channelData.reduce((acc, curr) => acc + curr.leads, 0);

  // ── Growth chart: normalize weekly DB data to bar heights ──────────
  const last12 = weeklyData.slice(-12);
  const padded = Array.from({ length: 12 }, (_, i) => {
    const idx = i - (12 - last12.length);
    return idx >= 0 && idx < last12.length ? last12[idx].impressions : 0;
  });
  const maxWeeklyVal = Math.max(...padded, 1);
  const chartBars = padded.map((v) =>
    v > 0 ? Math.max(Math.round((v / maxWeeklyVal) * 100), 5) : 0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NXT Insights & Analytics</h1>
        <p className="text-gray-500">Comprehensive performance data for NXT Level Tech marketing campaigns.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500">{kpi.name}</p>
            <div className="mt-2 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <div className={`flex items-center text-sm font-medium ${
                kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {kpi.change}
                {kpi.trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart Placeholder */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
              <BarChart3 size={18} className="text-blue-600" />
              <span>NXT Growth Trends (Last 30 Days)</span>
            </h3>
            <select className="text-sm border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500">
              <option>All Platforms</option>
              {channels.map(c => (
                <option key={c.id}>{c.platform}</option>
              ))}
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-2">
            {chartBars.map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-blue-600 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity" 
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-gray-400 font-medium">W{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Target size={18} className="text-blue-600" />
            <span>NXT Lead Distribution</span>
          </h3>
          <div className="space-y-6">
            {channelData.map((channel) => (
              <div key={channel.platform}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {channel.icon && <channel.icon size={16} className={channel.color} />}
                    <span className="text-sm font-medium text-gray-700">{channel.platform}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{channel.leads}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div 
                    className={`h-1.5 rounded-full ${
                      channel.color?.replace('text', 'bg') || 'bg-gray-600'
                    }`}
                    style={{ width: `${totalLeads > 0 ? (channel.leads / totalLeads) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp size={16} className="text-green-600" />
                <span className="text-sm font-medium text-gray-600">Total NXT Leads</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{totalLeads.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
