"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Eye, Heart, MessageSquare, Share2, TrendingUp } from "lucide-react";

interface PostPerformanceProps {
  channelId: number;
  limit?: number;
}

interface Post {
  id: number;
  content: string;
  date: Date;
  likes: number;
  comments: number;
  shares: number;
  reach: number | null;
  impressions: number | null;
  platform: string;
  image: string | null;
}

async function fetchPosts(channelId: number, limit = 10): Promise<Post[]> {
  const res = await fetch(`/api/posts?channelId=${channelId}&limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  const data = await res.json();
  return data.posts || [];
}

export default function PostPerformance({ channelId, limit = 10 }: PostPerformanceProps) {
  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["posts", channelId, limit],
    queryFn: () => fetchPosts(channelId, limit),
    enabled: !!channelId,
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center py-8">
          <RefreshCw className="animate-spin text-blue-600" size={24} />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">POST PERFORMANCE</h3>

      {posts.length === 0 ? (
        <div className="p-8 text-center border border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No posts found. Publish content to see performance metrics.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
            const engagementRate = post.reach && post.reach > 0 
              ? ((totalEngagement / post.reach) * 100).toFixed(2)
              : post.impressions && post.impressions > 0
                ? ((totalEngagement / post.impressions) * 100).toFixed(2)
                : "0.00";

            return (
              <div
                key={post.id}
                className="p-4 bg-white border border-gray-100 rounded-xl hover:border-blue-200 transition-all"
              >
                <div className="flex gap-4">
                  {post.image && (
                    <img
                      src={post.image}
                      alt="Post"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-bold text-gray-900 line-clamp-2">
                        {post.content || "No content"}
                      </p>
                      <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                        {post.platform}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {new Date(post.date).toLocaleDateString()}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="flex items-center gap-2">
                        <Heart size={14} className="text-red-500" />
                        <span className="text-xs font-bold text-gray-700">{post.likes || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={14} className="text-blue-500" />
                        <span className="text-xs font-bold text-gray-700">{post.comments || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Share2 size={14} className="text-green-500" />
                        <span className="text-xs font-bold text-gray-700">{post.shares || 0}</span>
                      </div>
                      {post.reach && (
                        <div className="flex items-center gap-2">
                          <Eye size={14} className="text-purple-500" />
                          <span className="text-xs font-bold text-gray-700">{post.reach.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-orange-500" />
                        <span className="text-xs font-bold text-gray-700">{engagementRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

