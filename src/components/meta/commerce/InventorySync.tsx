"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

interface InventorySyncProps {
  channelId: number;
  catalogId: string;
}

export default function InventorySync({ channelId, catalogId }: InventorySyncProps) {
  const [inventoryData, setInventoryData] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  const updateInventoryMutation = useMutation({
    mutationFn: async () => {
      // Parse CSV or JSON format: retailer_id,inventory
      const lines = inventoryData.trim().split("\n");
      const updates = lines.map((line) => {
        const [retailerId, inventory] = line.split(",").map((s) => s.trim());
        return {
          retailer_id: retailerId,
          inventory: parseInt(inventory) || 0,
        };
      }).filter((u) => u.retailer_id && !isNaN(u.inventory));

      if (updates.length === 0) {
        throw new Error("No valid inventory updates found");
      }

      const res = await fetch("/api/meta/commerce/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          catalogId,
          updates,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update inventory");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Updated inventory for ${data.updates || 0} products`);
      setInventoryData("");
      queryClient.invalidateQueries({ queryKey: ["products", channelId, catalogId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update inventory: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">BATCH INVENTORY UPDATE</h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-bold">
            Inventory Data (CSV format: retailer_id,inventory)
          </Label>
          <textarea
            value={inventoryData}
            onChange={(e) => setInventoryData(e.target.value)}
            placeholder="retailer_123,100&#10;retailer_456,50&#10;retailer_789,0"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={8}
          />
          <p className="text-xs text-gray-500">
            One product per line. Format: retailer_id,inventory_quantity
          </p>
        </div>

        <Button
          onClick={() => updateInventoryMutation.mutate()}
          disabled={!inventoryData.trim() || updateInventoryMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 rounded-xl font-bold"
        >
          {updateInventoryMutation.isPending ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" /> Updating...
            </>
          ) : (
            <>
              <Upload size={16} className="mr-2" /> Update Inventory
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

