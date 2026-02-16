"use client";

import { 
  Users, 
  MapPin, 
  Search, 
  Crown, 
  Star, 
  TrendingUp, 
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  MoreHorizontal,
  Loader2,
  UserX,
} from "lucide-react";
import { useState, useEffect } from "react";

const segments = ["All", "VIP", "Local", "Influencer", "New Lead"];

interface Follower {
  id: number;
  platformId: string;
  platform: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  isVerified: boolean;
  followerCount: number | null;
  engagementScore: number;
  segment: string;
  lastActive: string | null;
  createdAt: string;
}

interface AudienceStats {
  totalFollowers: number;
  totalReach: number;
  vipCount: number;
  localPercent: number;
}

export default function AudiencePage() {
  const [activeSegment, setActiveSegment] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AudienceStats>({
    totalFollowers: 0,
    totalReach: 0,
    vipCount: 0,
    localPercent: 0,
  });

  useEffect(() => {
    fetchAudience();
  }, [activeSegment, searchQuery]);

  const fetchAudience = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (activeSegment !== "All") {
        params.set("segment", activeSegment);
      }
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/followers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch followers");

      const data = await res.json();
      setFollowers(data.followers || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch audience:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatar = (follower: Follower) => {
    const name = follower.displayName || follower.username || "?";
    return name.substring(0, 2).toUpperCase();
  };

  const getSegmentBadge = (segment: string) => {
    switch (segment) {
      case "VIP":
        return "bg-yellow-100 text-yellow-700";
      case "Local":
        return "bg-blue-100 text-blue-700";
      case "Influencer":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-blue-600" />
          Audience Intelligence
        </h1>
        <p className="text-gray-500">
          {stats.totalFollowers > 0
            ? `Deep-dive into your ${stats.totalFollowers.toLocaleString()} tracked followers across all platforms.`
            : "Track and manage your followers across all platforms."}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Reach</p>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-lg">
              <TrendingUp size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">
              {stats.totalReach >= 1000 ? `${(stats.totalReach / 1000).toFixed(1)}K` : stats.totalReach}
            </h3>
            <p className="text-xs font-bold text-green-600 mt-1">From connected channels</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">VIP Segment</p>
            <div className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg">
              <Crown size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">{stats.vipCount}</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">High-value accounts</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Local Audience</p>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <MapPin size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">{stats.localPercent}%</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">Of tracked followers</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tracked Followers</p>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Star size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">{stats.totalFollowers}</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">Across all platforms</p>
          </div>
        </div>
      </div>

      {/* Directory & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            {segments.map((s) => (
              <button
                key={s}
                onClick={() => setActiveSegment(s)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  activeSegment === s 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="text" 
              placeholder="Search by name, bio, or username..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase text-gray-400 font-bold">
                <th className="px-6 py-4">User Profile</th>
                <th className="px-6 py-4">Segment</th>
                <th className="px-6 py-4">Engagement</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading audience data...</p>
                  </td>
                </tr>
              ) : followers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500 mb-1">No followers found</p>
                    <p className="text-xs text-gray-400">
                      {searchQuery || activeSegment !== "All"
                        ? "Try adjusting your filters or search query."
                        : "Connect your social channels and sync to start tracking followers."}
                    </p>
                  </td>
                </tr>
              ) : (
                followers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={user.displayName || user.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                              {getAvatar(user)}
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                            {user.platform === 'Instagram' && <Instagram size={12} className="text-pink-600" />}
                            {user.platform === 'Facebook' && <Facebook size={12} className="text-blue-600" />}
                            {user.platform === 'TikTok' && <Video size={12} className="text-black" />}
                            {user.platform === 'WhatsApp' && <MessageSquare size={12} className="text-green-600" />}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm">
                            {user.displayName || user.username}
                            {user.isVerified && (
                              <span className="ml-1 text-blue-500" title="Verified">✓</span>
                            )}
                          </h4>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                          {user.bio && (
                            <p className="text-[10px] text-gray-400 mt-0.5 italic truncate max-w-[200px]">
                              {user.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${getSegmentBadge(user.segment)}`}>
                        {user.segment}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              user.engagementScore > 90 ? 'bg-green-500' : user.engagementScore > 70 ? 'bg-blue-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${user.engagementScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{user.engagementScore}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.location ? (
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <MapPin size={14} />
                          <span className="text-xs">{user.location}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
