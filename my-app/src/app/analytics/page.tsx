import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Facebook,
  Instagram,
  Video,
  MessageSquare
} from "lucide-react";

import { db } from "@/db/db";
import { channels as channelsTable, posts as postsTable } from "@/db/schema";
import { sql, gte, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'text-blue-600' },
  Instagram: { icon: Instagram, color: 'text-pink-600' },
  TikTok: { icon: Video, color: 'text-black' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600' },
};

export default async function AnalyticsPage() {
  let channels = [];
  let totalImpressions = [{ sum: 0 }];
  let totalEngagement = [{ likes: 0, comments: 0, shares: 0, reach: 0 }];
  let totalPosts = [{ count: 0 }];
  
  try {
    channels = await db.select().from(channelsTable);
    
    // Calculate real KPIs from database
    const days = 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    totalImpressions = await db
      .select({ sum: sql<number>`coalesce(sum(${postsTable.impressions}), 0)` })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));

    totalEngagement = await db
      .select({
        likes: sql<number>`coalesce(sum(${postsTable.likes}), 0)`,
        comments: sql<number>`coalesce(sum(${postsTable.comments}), 0)`,
        shares: sql<number>`coalesce(sum(${postsTable.shares}), 0)`,
        reach: sql<number>`coalesce(sum(${postsTable.reach}), 0)`,
      })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));

    totalPosts = await db
      .select({ count: sql<number>`count(*)` })
      .from(postsTable)
      .where(gte(postsTable.date, startDate));
  } catch (error: any) {
    // Silently handle database errors - tables may not exist yet
    // This is expected if migrations haven't been run
    if (process.env.NODE_ENV === 'development') {
      console.warn("Database not initialized. Run 'bun run db:push' to create tables.");
    }
    // Use default values if database query fails
  }

  const engagementRate =
    totalEngagement[0]?.reach > 0
      ? ((totalEngagement[0]?.likes + totalEngagement[0]?.comments + totalEngagement[0]?.shares) /
          totalEngagement[0]?.reach) *
        100
      : 0;

  const impressions = totalImpressions[0]?.sum || 0;
  const kpis = [
    { 
      name: 'Total Impressions', 
      value: impressions >= 1000000 
        ? `${(impressions / 1000000).toFixed(1)}M` 
        : impressions >= 1000 
        ? `${(impressions / 1000).toFixed(1)}K` 
        : String(impressions), 
      change: '+12.5%', 
      trend: 'up' as const 
    },
    { 
      name: 'Engagement Rate', 
      value: `${engagementRate.toFixed(1)}%`, 
      change: '+0.4%', 
      trend: 'up' as const 
    },
    { 
      name: 'Total Posts', 
      value: String(totalPosts[0]?.count || 0), 
      change: '+5', 
      trend: 'up' as const 
    },
    { 
      name: 'Total Engagement', 
      value: String(
        (totalEngagement[0]?.likes || 0) + 
        (totalEngagement[0]?.comments || 0) + 
        (totalEngagement[0]?.shares || 0)
      ), 
      change: '+8%', 
      trend: 'up' as const 
    },
  ];
  
  // Calculate lead distribution based on channels (mocking lead counts for now but using DB platforms)
  const channelData = channels.map(channel => ({
    name: channel.name.includes('|') ? channel.name.split('|')[0].trim() : channel.name,
    platform: channel.platform,
    growth: channel.platform === 'Instagram' ? '+28%' : channel.platform === 'TikTok' ? '+142%' : '+15%',
    engagement: channel.platform === 'TikTok' ? '22.1%' : channel.platform === 'Instagram' ? '8.4%' : '5.2%',
    leads: channel.platform === 'Instagram' ? 820 : channel.platform === 'Facebook' ? 450 : channel.platform === 'WhatsApp' ? 240 : 120,
    ...platformIcons[channel.platform as keyof typeof platformIcons]
  }));

  const totalLeads = channelData.reduce((acc, curr) => acc + curr.leads, 0);

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
            {[45, 60, 55, 80, 70, 90, 85, 100, 95, 110, 105, 120].map((height, i) => (
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
                    style={{ width: `${(channel.leads / totalLeads) * 100}%` }}
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
