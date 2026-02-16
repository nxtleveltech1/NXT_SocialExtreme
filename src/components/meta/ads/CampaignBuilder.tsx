"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface CampaignBuilderProps {
  channelId: number;
  adAccountId: string;
  onSuccess?: () => void;
}

const CAMPAIGN_OBJECTIVES = [
  "CONVERSIONS",
  "TRAFFIC",
  "ENGAGEMENT",
  "REACH",
  "BRAND_AWARENESS",
  "APP_INSTALLS",
  "VIDEO_VIEWS",
  "LEAD_GENERATION",
  "MESSAGES",
  "CATALOG_SALES",
  "STORE_VISITS",
] as const;

export default function CampaignBuilder({ channelId, adAccountId, onSuccess }: CampaignBuilderProps) {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<string>("CONVERSIONS");
  const [dailyBudget, setDailyBudget] = useState("");
  const [lifetimeBudget, setLifetimeBudget] = useState("");
  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED");

  const queryClient = useQueryClient();

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meta/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          adAccountId,
          name,
          objective,
          dailyBudget: dailyBudget ? Math.round(parseFloat(dailyBudget) * 100) : undefined,
          lifetimeBudget: lifetimeBudget ? Math.round(parseFloat(lifetimeBudget) * 100) : undefined,
          startTime: startTime || undefined,
          stopTime: stopTime || undefined,
          status,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Campaign created successfully");
      queryClient.invalidateQueries({ queryKey: ["campaigns", channelId, adAccountId] });
      setName("");
      setDailyBudget("");
      setLifetimeBudget("");
      setStartTime("");
      setStopTime("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">CREATE NEW CAMPAIGN</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-bold">Campaign Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer Sale 2024"
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Objective</Label>
          <select
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CAMPAIGN_OBJECTIVES.map((obj) => (
              <option key={obj} value={obj}>
                {obj.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label className="text-sm font-bold">Lifetime Budget ($)</Label>
            <Input
              type="number"
              value={lifetimeBudget}
              onChange={(e) => setLifetimeBudget(e.target.value)}
              placeholder="1000.00"
              step="0.01"
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold">Start Time</Label>
            <Input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold">Stop Time</Label>
            <Input
              type="datetime-local"
              value={stopTime}
              onChange={(e) => setStopTime(e.target.value)}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Status</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("PAUSED")}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                status === "PAUSED"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Paused
            </button>
            <button
              onClick={() => setStatus("ACTIVE")}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                status === "ACTIVE"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Active
            </button>
          </div>
        </div>

        <Button
          onClick={() => createCampaignMutation.mutate()}
          disabled={!name || !objective || createCampaignMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
        >
          {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
        </Button>
      </div>
    </Card>
  );
}

