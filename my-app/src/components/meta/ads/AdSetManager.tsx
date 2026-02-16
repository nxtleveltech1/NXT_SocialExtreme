"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

interface AdSetManagerProps {
  channelId: number;
  adAccountId: string;
  campaignId?: string;
}

interface AdSet {
  id: number;
  name: string;
  status: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  platformAdSetId: string;
}

async function fetchAdSets(channelId: number, adAccountId: string, campaignId?: string): Promise<AdSet[]> {
  const url = `/api/meta/ads/adsets?channelId=${channelId}&adAccountId=${adAccountId}${campaignId ? `&campaignId=${campaignId}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch ad sets");
  const data = await res.json();
  return data.adSets || [];
}

export default function AdSetManager({ channelId, adAccountId, campaignId }: AdSetManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [optimizationGoal, setOptimizationGoal] = useState("LINK_CLICKS");
  const [billingEvent, setBillingEvent] = useState("IMPRESSIONS");
  const [dailyBudget, setDailyBudget] = useState("");

  const queryClient = useQueryClient();

  const { data: adSets = [], isLoading } = useQuery<AdSet[]>({
    queryKey: ["adSets", channelId, adAccountId, campaignId],
    queryFn: () => fetchAdSets(channelId, adAccountId, campaignId),
    enabled: !!channelId && !!adAccountId,
  });

  const createAdSetMutation = useMutation({
    mutationFn: async () => {
      if (!campaignId) throw new Error("Campaign ID required");
      const res = await fetch("/api/meta/ads/adsets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          adAccountId,
          campaignId,
          name,
          optimizationGoal,
          billingEvent,
          dailyBudget: dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : undefined,
          targeting: {},
          status: "PAUSED",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create ad set");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Ad set created successfully");
      queryClient.invalidateQueries({ queryKey: ["adSets", channelId, adAccountId, campaignId] });
      setShowCreate(false);
      setName("");
      setDailyBudget("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create ad set: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-gray-900">AD SETS</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["adSets", channelId, adAccountId, campaignId] })}
            size="sm"
            variant="outline"
            className="rounded-xl"
          >
            <RefreshCw size={16} className="mr-2" /> Refresh
          </Button>
          {campaignId && (
            <Button
              onClick={() => setShowCreate(!showCreate)}
              size="sm"
              variant="outline"
              className="rounded-xl"
            >
              <Plus size={16} className="mr-2" /> New Ad Set
            </Button>
          )}
        </div>
      </div>

      {showCreate && campaignId && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold">Ad Set Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Sale - Ad Set 1"
              className="rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold">Optimization Goal</Label>
              <select
                value={optimizationGoal}
                onChange={(e) => setOptimizationGoal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="LINK_CLICKS">Link Clicks</option>
                <option value="CONVERSIONS">Conversions</option>
                <option value="REACH">Reach</option>
                <option value="IMPRESSIONS">Impressions</option>
                <option value="ENGAGEMENT">Engagement</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">Billing Event</Label>
              <select
                value={billingEvent}
                onChange={(e) => setBillingEvent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="IMPRESSIONS">Impressions</option>
                <option value="LINK_CLICKS">Link Clicks</option>
                <option value="CONVERSIONS">Conversions</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold">Daily Budget ($)</Label>
            <Input
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="50.00"
              step="0.01"
              className="rounded-lg"
            />
          </div>
          <Button
            onClick={() => createAdSetMutation.mutate()}
            disabled={!name || !optimizationGoal || !billingEvent || createAdSetMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
          >
            {createAdSetMutation.isPending ? "Creating..." : "Create Ad Set"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="animate-spin text-blue-600" size={24} />
        </div>
      ) : adSets.length === 0 ? (
        <div className="p-8 text-center border border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">
            {!campaignId ? "Select a campaign to view ad sets" : "No ad sets found. Create your first ad set."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {adSets.map((adSet) => (
            <div
              key={adSet.id}
              className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                  <Settings size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{adSet.name}</p>
                  <p className="text-xs text-gray-500">
                    {adSet.optimizationGoal} • {adSet.billingEvent}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {adSet.dailyBudget && (
                  <p className="text-sm font-black text-gray-900">
                    ${(adSet.dailyBudget / 100).toFixed(2)}/day
                  </p>
                )}
                <Badge
                  className={`${
                    adSet.status === "ACTIVE"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-gray-500/10 text-gray-600"
                  }`}
                >
                  {adSet.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

