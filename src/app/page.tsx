import { 
  Users, 
  TrendingUp, 
  Eye, 
  MessageCircle,
  Facebook,
  Instagram,
  Video,
  MessageSquare,
} from "lucide-react";

import { db } from "@/db/db";
import {
  channels as channelsTable,
  posts as postsTable,
  conversations as conversationsTable,
} from "@/db/schema";
import { InferSelectModel, desc, sql } from "drizzle-orm";

type Channel = InferSelectModel<typeof channelsTable>;
type Post = InferSelectModel<typeof postsTable>;

import LoginLanding from "@/components/LoginLanding";

export const dynamic = "force-dynamic";

const platformIcons = {
  Facebook: { icon: Facebook, color: 'bg-blue-600' },
  Instagram: { icon: Instagram, color: 'bg-pink-600' },
  TikTok: { icon: Video, color: 'bg-black' },
  WhatsApp: { icon: MessageSquare, color: 'bg-green-500' },
};

function parseFollowers(value: string | null): number {
  if (!value) return 0;
  const cleaned = value.replace(/,/g, '').trim();
  const match = cleaned.match(/^([\d.]+)\s*([KkMm]?)$/);
  if (!match) return parseInt(cleaned, 10) || 0;
  const num = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  if (suffix === 'K') return Math.round(num * 1_000);
  if (suffix === 'M') return Math.round(num * 1_000_000);
  return Math.round(num);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function timeAgo(date: Date | null): string {
  if (!date) return 'Unknown';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default async function Dashboard() {
  let userId: string | null = null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const authResult = await auth();
    userId = authResult.userId;
  } catch {
    // Clerk auth failed — treat as unauthenticated
  }

  if (!userId) {
    return <LoginLanding />;
  }

  // ── Fetch channels
  let channels: Channel[] = [];
  try {
    channels = await db.select().from(channelsTable);
  } catch {
    channels = [];
  }

  // ── Aggregate post metrics
  let totalEngagement = 0;
  let totalReach = 0;
  try {
    const [postMetrics] = await db
      .select({
        totalLikes: sql<string>`coalesce(sum(${postsTable.likes}), 0)`,
        totalComments: sql<string>`coalesce(sum(${postsTable.comments}), 0)`,
        totalShares: sql<string>`coalesce(sum(${postsTable.shares}), 0)`,
        totalReach: sql<string>`coalesce(sum(${postsTable.reach}), 0)`,
      })
      .from(postsTable);

    if (postMetrics) {
      totalEngagement =
        (Number(postMetrics.totalLikes) || 0) +
        (Number(postMetrics.totalComments) || 0) +
        (Number(postMetrics.totalShares) || 0);
      totalReach = Number(postMetrics.totalReach) || 0;
    }
  } catch {
    // Posts table may not exist yet
  }

  // ── Count conversations
  let totalConversations = 0;
  try {
    const [convCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversationsTable);
    totalConversations = Number(convCount?.count) || 0;
  } catch {
    // Conversations table may not exist yet
  }

  const totalFollowers = channels.reduce(
    (acc, ch) => acc + parseFollowers(ch.followers),
    0,
  );

  // ── Fetch recent posts
  let recentPosts: Post[] = [];
  try {
    recentPosts = await db
      .select()
      .from(postsTable)
      .orderBy(desc(postsTable.date))
      .limit(4);
  } catch {
    // Posts table may not exist yet
  }

  const stats = [
    { name: 'Total Followers', value: formatNumber(totalFollowers), icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Total Engagement', value: formatNumber(totalEngagement), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Total Reach', value: formatNumber(totalReach), icon: Eye, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'Conversations', value: formatNumber(totalConversations), icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">NXT Level TECH - South Africa</h1>
        <p className="text-gray-500">Sales, Rentals, Repairs &amp; Recording Studio | Saxenburg Park 2, Cape Town.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div className={stat.bg + " p-2 rounded-lg"}>
                <stat.icon className={stat.color + " h-6 w-6"} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">SA Channel Performance</h3>
          <div className="space-y-6">
            {channels.length === 0 ? (
              <p className="text-sm text-gray-400">No channels connected yet.</p>
            ) : (
              channels.map((platform) => {
                const platformInfo = platformIcons[platform.platform as keyof typeof platformIcons] || { icon: MessageSquare, color: 'bg-gray-600' };
                const Icon = platformInfo.icon;
                return (
                  <div key={platform.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`${platformInfo.color} p-2 rounded-lg text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{platform.platform}</p>
                        <p className="text-xs text-gray-500">{platform.handle || platform.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{platform.followers || '0'}</p>
                      <p className={`text-xs font-medium ${platform.status === 'Healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {platform.status || 'Unknown'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Posts</h3>
          </div>
          <div className="space-y-4">
            {recentPosts.length === 0 ? (
              <p className="text-sm text-gray-400">No posts yet.</p>
            ) : (
              recentPosts.map((post) => (
                <div key={post.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-gray-900 line-clamp-1">
                        {post.content.length > 60 ? post.content.substring(0, 60) + '\u2026' : post.content}
                      </p>
                      <p className="text-xs text-gray-500">{post.platform} &bull; {timeAgo(post.date)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded shrink-0">
                    {post.status || 'published'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
