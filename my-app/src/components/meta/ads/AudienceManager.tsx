"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AudienceManagerProps {
  channelId: number;
  adAccountId: string;
}

interface Audience {
  id: string;
  name: string;
  description?: string;
  subtype?: string;
  approximate_count?: number;
  status?: string;
}

async function fetchAudiences(channelId: number, adAccountId: string): Promise<Audience[]> {
  const res = await fetch(`/api/meta/audience/list?channelId=${channelId}&adAccountId=${adAccountId}`);
  if (!res.ok) throw new Error("Failed to fetch audiences");
  const data = await res.json();
  return data.audiences || [];
}

export default function AudienceManager({ channelId, adAccountId }: AudienceManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [audienceName, setAudienceName] = useState("");
  const [audienceDescription, setAudienceDescription] = useState("");

  const queryClient = useQueryClient();

  const { data: audiences = [], isLoading } = useQuery<Audience[]>({
    queryKey: ["audiences", channelId, adAccountId],
    queryFn: () => fetchAudiences(channelId, adAccountId),
    enabled: !!channelId && !!adAccountId,
  });

  const createAudienceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meta/audience/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          adAccountId,
          name: audienceName,
          description: audienceDescription || undefined,
          subtype: "CUSTOM",
          customerFileSource: "USER_PROVIDED_ONLY",
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create audience");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Audience created successfully");
      queryClient.invalidateQueries({ queryKey: ["audiences", channelId, adAccountId] });
      setShowCreate(false);
      setAudienceName("");
      setAudienceDescription("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create audience: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-gray-900">CUSTOM AUDIENCES</h3>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          size="sm"
          variant="outline"
          className="rounded-xl"
        >
          <Plus size={16} className="mr-2" /> {showCreate ? "Cancel" : "New Audience"}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-bold">Audience Name</Label>
            <Input
              value={audienceName}
              onChange={(e) => setAudienceName(e.target.value)}
              placeholder="VIP Customers"
              className="rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-bold">Description (Optional)</Label>
            <Input
              value={audienceDescription}
              onChange={(e) => setAudienceDescription(e.target.value)}
              placeholder="High-value customers from last 30 days"
              className="rounded-lg"
            />
          </div>
          <Button
            onClick={() => createAudienceMutation.mutate()}
            disabled={!audienceName || createAudienceMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
          >
            {createAudienceMutation.isPending ? "Creating..." : "Create Audience"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="animate-spin text-blue-600" size={24} />
        </div>
      ) : audiences.length === 0 ? (
        <div className="p-8 text-center border border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No audiences found. Create your first audience to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {audiences.map((audience) => (
            <div
              key={audience.id}
              className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{audience.name}</p>
                  {audience.description && (
                    <p className="text-xs text-gray-500">{audience.description}</p>
                  )}
                  {audience.approximate_count !== undefined && (
                    <p className="text-xs text-gray-400 mt-1">
                      ~{audience.approximate_count.toLocaleString()} users
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {audience.subtype && (
                  <Badge variant="outline" className="text-xs">
                    {audience.subtype}
                  </Badge>
                )}
                {audience.status && (
                  <Badge
                    className={`text-xs ${
                      audience.status === "ACTIVE"
                        ? "bg-green-500/10 text-green-600"
                        : "bg-gray-500/10 text-gray-600"
                    }`}
                  >
                    {audience.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

