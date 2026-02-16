"use client";

import { useState } from "react";
import { 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingDown, 
  CheckCircle2,
  Trophy,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ResponseCommandCenter() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/messages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      setLastSync(new Date());
      console.log("Sync results:", data);
      // Refresh the page to show new messages
      window.location.reload();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

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
        {/* Metric 1 */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-300 uppercase">Avg Response Time</span>
            <Clock size={16} className="text-blue-300" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black">4m 12s</span>
            <span className="text-xs font-bold text-green-400 mb-1 flex items-center">
              <TrendingDown size={12} className="mr-0.5" /> 12%
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 blur-2xl group-hover:bg-red-500/30 transition-all" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-300 uppercase">SLA Breaches</span>
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-red-100">3</span>
            <span className="text-xs font-bold text-red-300 mb-1">Needs Attention</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-green-300 uppercase">Resolution Rate</span>
            <CheckCircle2 size={16} className="text-green-300" />
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-black">94%</span>
            <span className="text-xs font-bold text-blue-200 mb-1">First Contact</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-yellow-300 uppercase">Top Performer</span>
            <Trophy size={16} className="text-yellow-400" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-black text-sm">
              KS
            </div>
            <div>
              <p className="text-sm font-bold">Kevin Steyn</p>
              <p className="text-xs text-yellow-200">45 replies / hr</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
