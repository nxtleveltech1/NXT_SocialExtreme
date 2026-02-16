"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface OrderFulfillmentProps {
  order: {
    id: number;
    userName: string | null;
    phoneNumber: string;
    status: string;
    totalAmount: number;
    currency: string;
    metadata?: any;
  };
  channelId: number;
  cmsId: string;
}

export default function OrderFulfillment({ order, channelId, cmsId }: OrderFulfillmentProps) {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [showShipForm, setShowShipForm] = useState(false);

  const queryClient = useQueryClient();

  const shipOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order.metadata?.id) {
        throw new Error("Order missing Meta order ID");
      }

      const res = await fetch("/api/meta/commerce/orders/ship", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          orderId: order.metadata.id,
          trackingNumber,
          carrier,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to ship order");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Order shipped successfully");
      queryClient.invalidateQueries({ queryKey: ["orders", channelId] });
      setShowShipForm(false);
      setTrackingNumber("");
      setCarrier("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to ship order: ${error.message}`);
    },
  });

  const acknowledgeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!order.metadata?.id) {
        throw new Error("Order missing Meta order ID");
      }

      const res = await fetch("/api/meta/commerce/orders/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          orderId: order.metadata.id,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to acknowledge order");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Order acknowledged");
      queryClient.invalidateQueries({ queryKey: ["orders", channelId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge order: ${error.message}`);
    },
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
            <Package size={20} />
          </div>
          <div>
            <p className="font-bold text-gray-900">{order.userName || order.phoneNumber}</p>
            <p className="text-xs text-gray-500">Order #{order.id}</p>
          </div>
        </div>
        <Badge
          className={`${
            order.status === "delivered"
              ? "bg-green-500/10 text-green-600"
              : order.status === "shipped"
              ? "bg-blue-500/10 text-blue-600"
              : "bg-yellow-500/10 text-yellow-600"
          }`}
        >
          {order.status}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-gray-600">Total:</span>
        <span className="font-black text-gray-900">
          {(order.totalAmount / 100).toLocaleString("en-US", {
            style: "currency",
            currency: order.currency || "USD",
          })}
        </span>
      </div>

      {order.status === "pending" && (
        <Button
          onClick={() => acknowledgeOrderMutation.mutate()}
          disabled={acknowledgeOrderMutation.isPending}
          className="w-full mb-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
        >
          {acknowledgeOrderMutation.isPending ? "Acknowledging..." : "Acknowledge Order"}
        </Button>
      )}

      {(order.status === "confirmed" || order.status === "processing") ? (
        <>
          {!showShipForm ? (
            <Button
              onClick={() => setShowShipForm(true)}
              className="w-full bg-green-600 hover:bg-green-700 rounded-xl font-bold"
            >
              <Truck size={16} className="mr-2" /> Ship Order
            </Button>
          ) : (
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <div className="space-y-2">
                <Label className="text-sm font-bold">Tracking Number</Label>
                <Input
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="1Z999AA10123456784"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-bold">Carrier</Label>
                <Input
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  placeholder="UPS, FedEx, DHL, etc."
                  className="rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => shipOrderMutation.mutate()}
                  disabled={!trackingNumber || !carrier || shipOrderMutation.isPending}
                  className="flex-1 bg-green-600 hover:bg-green-700 rounded-xl font-bold"
                >
                  {shipOrderMutation.isPending ? (
                    <>
                      <RefreshCw size={16} className="mr-2 animate-spin" /> Shipping...
                    </>
                  ) : (
                    "Confirm Shipment"
                  )}
                </Button>
                <Button
                  onClick={() => setShowShipForm(false)}
                  variant="outline"
                  className="rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
}

