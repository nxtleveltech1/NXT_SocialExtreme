"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, RefreshCw, Plus } from "lucide-react";
import { toast } from "sonner";

interface ProductCatalogManagerProps {
  channelId: number;
  businessId: string;
}

interface Catalog {
  id: number;
  name: string;
  vertical: string;
  status: string;
  platformCatalogId: string;
}

async function fetchCatalogs(channelId: number, businessId: string): Promise<Catalog[]> {
  const res = await fetch(`/api/meta/commerce/catalogs?channelId=${channelId}&businessId=${businessId}`);
  if (!res.ok) throw new Error("Failed to fetch catalogs");
  const data = await res.json();
  return data.catalogs || [];
}

export default function ProductCatalogManager({ channelId, businessId }: ProductCatalogManagerProps) {
  const queryClient = useQueryClient();

  const { data: catalogs = [], isLoading } = useQuery<Catalog[]>({
    queryKey: ["catalogs", channelId, businessId],
    queryFn: () => fetchCatalogs(channelId, businessId),
    enabled: !!channelId && !!businessId,
  });

  const syncCatalogsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meta/commerce/catalogs?channelId=${channelId}&businessId=${businessId}`);
      if (!res.ok) throw new Error("Failed to sync catalogs");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Catalogs synced successfully");
      queryClient.invalidateQueries({ queryKey: ["catalogs", channelId, businessId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync catalogs: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-gray-900">PRODUCT CATALOGS</h3>
        <Button
          onClick={() => syncCatalogsMutation.mutate()}
          size="sm"
          variant="outline"
          disabled={syncCatalogsMutation.isPending}
          className="rounded-xl"
        >
          <RefreshCw size={16} className={`mr-2 ${syncCatalogsMutation.isPending ? "animate-spin" : ""}`} />
          Sync
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <RefreshCw className="animate-spin text-blue-600" size={24} />
        </div>
      ) : catalogs.length === 0 ? (
        <div className="p-8 text-center border border-gray-100 rounded-xl">
          <p className="text-gray-400 text-sm">No catalogs found. Sync from Meta Commerce Manager.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {catalogs.map((catalog) => (
            <div
              key={catalog.id}
              className="p-4 bg-white border border-gray-100 rounded-xl flex items-center justify-between hover:border-blue-200 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{catalog.name}</p>
                  <p className="text-xs text-gray-500">{catalog.vertical}</p>
                </div>
              </div>
              <Badge
                className={`${
                  catalog.status === "ACTIVE"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-gray-500/10 text-gray-600"
                }`}
              >
                {catalog.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

