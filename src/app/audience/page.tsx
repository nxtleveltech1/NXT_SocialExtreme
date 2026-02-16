"use client";

import { 
  Users, 
  MapPin, 
  Search, 
  Filter, 
  Crown, 
  Star, 
  TrendingUp, 
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  MoreHorizontal
} from "lucide-react";
import { useState, useEffect } from "react";

const segments = ["All", "VIP", "Local", "Influencer", "New Lead"];

interface AudienceMember {
  id: number;
  username: string;
  name: string;
  avatar: string;
  platform: string;
  segment: string;
  score: number;
  location: string;
  bio: string;
}

export default function AudiencePage() {
  const [activeSegment, setActiveSegment] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [audience, setAudience] = useState<AudienceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ totalReach: 0, vipCount: 0, localPercent: 0 });

  useEffect(() => {
    const fetchAudience = async () => {
      try {
        // Fetch conversations from API as audience proxy
        const res = await fetch("/api/messages");
        const data = await res.json();
        const convs = data.conversations || [];

        // Transform conversations into audience members
        const audienceData: AudienceMember[] = convs.map((conv: any, idx: number) => {
          // Determine segment based on engagement
          let segment = "New Lead";
          let score = 50;
          if (conv.unreadCount > 2) {
            segment = "VIP";
            score = 95;
          } else if (conv.platform === "WhatsApp") {
            segment = "Local";
            score = 85;
          } else if (conv.platform === "Instagram" || conv.platform === "TikTok") {
            segment = "Influencer";
            score = 75;
          }

          return {
            id: conv.id,
            username: conv.platformConversationId || `@${conv.userName?.replace(/\s+/g, "_").toLowerCase()}`,
            name: conv.userName || "Unknown",
            avatar: (conv.userName || "U").substring(0, 2).toUpperCase(),
            platform: conv.platform,
            segment,
            score,
            location: "Cape Town", // Default for now
            bio: conv.lastMessage?.substring(0, 50) || "No recent activity",
          };
        });

        setAudience(audienceData);

        // Calculate stats from channels
        const channelRes = await fetch("/api/channels");
        const channelData = await channelRes.json();
        const channels = Array.isArray(channelData) ? channelData : channelData.channels || [];
        
        const totalFollowers = channels.reduce((sum: number, ch: any) => {
          const count = parseInt(String(ch.followers || "0").replace(/,/g, "")) || 0;
          return sum + count;
        }, 0);

        setStats({
          totalReach: totalFollowers,
          vipCount: audienceData.filter((a) => a.segment === "VIP").length,
          localPercent: audienceData.length > 0 
            ? Math.round((audienceData.filter((a) => a.segment === "Local").length / audienceData.length) * 100)
            : 0,
        });
      } catch (error) {
        console.error("Failed to fetch audience:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAudience();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-blue-600" />
          Audience Intelligence
        </h1>
        <p className="text-gray-500">Deep-dive into your 45k+ followers across all platforms.</p>
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
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cape Town Locals</p>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <MapPin size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">{stats.localPercent}%</h3>
            <p className="text-xs font-bold text-gray-500 mt-1">Of total audience</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-start justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Conversations</p>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <MessageSquare size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900">{audience.length}</h3>
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
              placeholder="Search by name, bio, or job..." 
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
              {audience.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                          {user.avatar}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                          {user.platform === 'Instagram' && <Instagram size={12} className="text-pink-600" />}
                          {user.platform === 'Facebook' && <Facebook size={12} className="text-blue-600" />}
                          {user.platform === 'TikTok' && <Video size={12} className="text-black" />}
                          {user.platform === 'WhatsApp' && <MessageSquare size={12} className="text-green-600" />}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{user.name}</h4>
                        <p className="text-xs text-gray-500">{user.username}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 italic truncate max-w-[150px]">{user.bio}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      user.segment === 'VIP' ? 'bg-yellow-100 text-yellow-700' :
                      user.segment === 'Local' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {user.segment}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            user.score > 90 ? 'bg-green-500' : user.score > 70 ? 'bg-blue-500' : 'bg-gray-400'
                          }`}
                          style={{ width: `${user.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{user.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <MapPin size={14} />
                      <span className="text-xs">{user.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
