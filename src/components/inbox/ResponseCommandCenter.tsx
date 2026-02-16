"use client";

import { useState, useEffect } from "react";
import { 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2,
  Trophy,
  RefreshCw,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InboxStats {
  avgResponseTime: string;
  avgResponseSeconds: number;
  slaBreaches: number;
  resolutionRate: number;
  openConversations: number;
  unreadConversations: number;
  totalConversations: number;
  topPerformer: { name: string; replyCount: number } | null;
}

export default function ResponseCommandCenter() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<InboxStats | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/inbox/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch inbox stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/messages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      console.log("Sync results:", data);
      await fetchStats();
      window.location.reload();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const initials = stats?.topPerformer?.name
    ? stats.topPerformer.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  return (
    <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-yellow-400" fill="currentColor" />
            Response Velocity Center
          </h2>
          <p className="text-blue-200 text-sm">Real-time team performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Messages"}
          </Button>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20 backdrop-blur-sm">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">Live System</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Avg Response Time */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-300 uppercase">Avg Response Time</span>
            <Clock size={16} className="text-blue-300" />
          </div>
          <div className="flex items-end gap-2">
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-blue-300" />
            ) : (
              <>
                <span className="text-3xl font-black">
                  {stats?.avgResponseTime || "—"}
                </span>
                {stats && stats.avgResponseSeconds > 0 && (
                  <span className="text-xs font-bold text-green-400 mb-1 flex items-center">
                    <TrendingDown size={12} className="mr-0.5" /> Live
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* SLA Breaches */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 blur-2xl group-hover:bg-red-500/30 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-300 uppercase">SLA Breaches</span>
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div className="flex items-end gap-2">
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-red-300" />
            ) : (
              <>
                <span className="text-3xl font-black text-red-100">
                  {stats?.slaBreaches ?? 0}
                </span>
                <span className="text-xs font-bold text-red-300 mb-1">
                  {(stats?.slaBreaches ?? 0) > 0 ? "Needs Attention" : "All Clear"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-green-300 uppercase">Resolution Rate</span>
            <CheckCircle2 size={16} className="text-green-300" />
          </div>
          <div className="flex items-end gap-2">
            {isLoading ? (
              <Loader2 size={24} className="animate-spin text-green-300" />
            ) : (
              <>
                <span className="text-3xl font-black">
                  {stats?.totalConversations
                    ? `${stats.resolutionRate}%`
                    : "—"}
                </span>
                <span className="text-xs font-bold text-blue-200 mb-1">
                  {stats?.totalConversations
                    ? "First Contact"
                    : "No conversations"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top Performer */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-yellow-300 uppercase">Top Performer</span>
            <Trophy size={16} className="text-yellow-400" />
          </div>
          {isLoading ? (
            <Loader2 size={24} className="animate-spin text-yellow-300" />
          ) : stats?.topPerformer ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-black text-sm">
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold">{stats.topPerformer.name}</p>
                <p className="text-xs text-yellow-200">
                  {stats.topPerformer.replyCount} replies
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/30 flex items-center justify-center text-yellow-300">
                <User size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-yellow-200/70">No data yet</p>
                <p className="text-xs text-yellow-200/50">Assign conversations to track</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
