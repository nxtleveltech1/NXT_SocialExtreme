"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Facebook, 
  Instagram, 
  MessageSquare, 
  TrendingUp, 
  ShoppingBag, 
  Megaphone, 
  Users, 
  Zap,
  RefreshCw,
  Send,
  Plus,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import CampaignBuilder from "@/components/meta/ads/CampaignBuilder";
import AdSetManager from "@/components/meta/ads/AdSetManager";
import AdCreativeBuilder from "@/components/meta/ads/AdCreativeBuilder";
import AudienceManager from "@/components/meta/ads/AudienceManager";
import InsightsDashboard from "@/components/meta/ads/InsightsDashboard";

interface Channel {
  id: number;
  name: string;
  platform: string;
  status: string;
  followers: string | null;
  lastSync: Date | null;
  platformId: string | null;
  isConnected: boolean | null;
}

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
}

interface Order {
  id: number;
  userName: string | null;
  phoneNumber: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  items?: Array<{
    productName: string;
    quantity: number;
    priceAtTime: number;
  }>;
}

interface Conversation {
  id: number;
  type: string;
  platform: string;
  userName: string;
  lastMessage: string | null;
  time: Date | null;
  unread: boolean;
  avatar: string | null;
  status: string;
}

interface AnalyticsSummary {
  engagementRate: number;
  totalPosts: number;
  totalEngagement: number;
  totalReach: number;
  impressions?: number;
  reach?: number;
  profileViews?: number;
  followerCount?: number;
}

interface AdPerformance {
  totalSpend: number;
  conversions: number;
  cpa: number;
}

// Fetch channels
async function fetchChannels(): Promise<Channel[]> {
  const res = await fetch("/api/channels");
  if (!res.ok) throw new Error("Failed to fetch channels");
  const data = await res.json();
  const channels = data.channels || data;
  return channels.filter(
    (c: Channel) => c.platform === "Facebook" || c.platform === "Instagram" || c.platform === "WhatsApp"
  );
}

// Fetch campaigns
async function fetchCampaigns(channelId: number, adAccountId: string): Promise<Campaign[]> {
  const res = await fetch(`/api/meta/ads/campaigns?channelId=${channelId}&adAccountId=${adAccountId}`);
  if (!res.ok) throw new Error("Failed to fetch campaigns");
  const data = await res.json();
  return data.campaigns || [];
}

// Fetch orders
async function fetchOrders(channelId: number): Promise<{ orders: Order[]; summary: any }> {
  const res = await fetch(`/api/meta/commerce/orders?channelId=${channelId}`);
  if (!res.ok) throw new Error("Failed to fetch orders");
  return await res.json();
}

// Fetch conversations
async function fetchConversations(channelId: number): Promise<Conversation[]> {
  const res = await fetch(`/api/inbox/conversations?channelId=${channelId}&limit=20`);
  if (!res.ok) throw new Error("Failed to fetch conversations");
  const data = await res.json();
  return data.conversations || [];
}

// Fetch analytics
async function fetchAnalytics(channelId: number, sync = false): Promise<{ summary: AnalyticsSummary; metrics: any[] }> {
  const res = await fetch(`/api/meta/analytics?channelId=${channelId}&sync=${sync}&daysBack=7`);
  if (!res.ok) throw new Error("Failed to fetch analytics");
  const data = await res.json();
  return {
    summary: data.summary || { engagementRate: 0, totalPosts: 0, totalEngagement: 0, totalReach: 0 },
    metrics: data.metrics || [],
  };
}

// Fetch ad performance
async function fetchAdPerformance(channelId: number, adAccountId: string): Promise<AdPerformance> {
  const res = await fetch(`/api/meta/ads/insights?channelId=${channelId}&adAccountId=${adAccountId}`);
  if (!res.ok) throw new Error("Failed to fetch ad performance");
  const data = await res.json();
  const insights = data.insights || [];
  const totalSpend = insights.reduce((sum: number, i: any) => sum + (i.spend || 0), 0);
  const conversions = insights.reduce((sum: number, i: any) => sum + (i.conversions || 0), 0);
  const cpa = conversions > 0 ? totalSpend / conversions : 0;
  return {
    totalSpend: totalSpend / 100, // Convert from cents
    conversions,
    cpa: cpa / 100, // Convert from cents
  };
}

export default function MetaCommandCenter() {
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "ads" | "commerce" | "analytics" | "messaging">("overview");
  const [flowPhone, setFlowPhone] = useState("");
  const [flowId, setFlowId] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [audienceName, setAudienceName] = useState("MobileMate VIPs");
  const [pageId, setPageId] = useState("");
  const [selectedCampaignPlatformId, setSelectedCampaignPlatformId] = useState<string>("");
  
  const queryClient = useQueryClient();

  // Fetch channels
  const { data: channels = [], isLoading: channelsLoading, error: channelsError } = useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: fetchChannels,
  });

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) {
      setSelectedChannel(channels[0].id);
    }
  }, [channels, selectedChannel]);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns", selectedChannel, adAccountId],
    queryFn: () => selectedChannel && adAccountId ? fetchCampaigns(selectedChannel, adAccountId) : [],
    enabled: !!selectedChannel && !!adAccountId && activeTab === "ads",
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: Order[]; summary: any }>({
    queryKey: ["orders", selectedChannel],
    queryFn: () => selectedChannel ? fetchOrders(selectedChannel) : { orders: [], summary: {} },
    enabled: !!selectedChannel && activeTab === "commerce",
  });

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations", selectedChannel],
    queryFn: () => selectedChannel ? fetchConversations(selectedChannel) : [],
    enabled: !!selectedChannel && activeTab === "messaging",
  });

  // Fetch analytics
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<{ summary: AnalyticsSummary; metrics: any[] }>({
    queryKey: ["analytics", selectedChannel],
    queryFn: () => selectedChannel ? fetchAnalytics(selectedChannel, false) : { summary: { engagementRate: 0, totalPosts: 0, totalEngagement: 0, totalReach: 0 }, metrics: [] },
    enabled: !!selectedChannel && (activeTab === "overview" || activeTab === "analytics"),
  });

  // Fetch ad performance
  const { data: adPerformance, isLoading: adPerformanceLoading } = useQuery<AdPerformance>({
    queryKey: ["adPerformance", selectedChannel, adAccountId],
    queryFn: () => selectedChannel && adAccountId ? fetchAdPerformance(selectedChannel, adAccountId) : { totalSpend: 0, conversions: 0, cpa: 0 },
    enabled: !!selectedChannel && !!adAccountId && activeTab === "ads",
  });

  // Sync audience mutation
  const syncAudienceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChannel) throw new Error("No channel selected");
      const res = await fetch("/api/meta/audience/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel,
          adAccountId,
          audienceName,
          source: "conversations",
        }),
      });
      if (!res.ok) throw new Error("Failed to sync audience");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.count || 0} contacts to audience ${data.audienceId}`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to sync audience: ${error.message}`);
    },
  });

  // Send flow mutation
  const sendFlowMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChannel || !flowPhone || !flowId) throw new Error("Missing required fields");
      const res = await fetch("/api/meta/messaging/flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannel,
          to: flowPhone,
          flowParams: {
            flow_id: flowId,
            flow_cta: "Open Form",
            body: "Please fill out our customer satisfaction survey.",
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to send flow");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Flow sent successfully!");
      setFlowPhone("");
      setFlowId("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to send flow: ${error.message}`);
    },
  });

  const currentChannel = channels.find((c) => c.id === selectedChannel);
  const orders = ordersData?.orders || [];
  const ordersSummary = ordersData?.summary || {};
  const analyticsSummary = analyticsData?.summary || { engagementRate: 0, totalPosts: 0, totalEngagement: 0, totalReach: 0 };

  if (channelsLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (channelsError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-screen">
        <AlertCircle className="text-red-600 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Channels</h2>
        <p className="text-gray-500 mb-4">{(channelsError as Error).message}</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["channels"] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">META COMMAND CENTER</h1>
          <p className="text-gray-500 font-medium">Full-suite control for FB, IG, and WhatsApp.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-white px-3 py-1 border-gray-200">
            v24.0 API ACTIVE
          </Badge>
          <Button 
            onClick={() => queryClient.invalidateQueries()} 
            size="sm" 
            variant="secondary"
            disabled={channelsLoading}
          >
            <RefreshCw size={16} className={`mr-2 ${channelsLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Channel Selector */}
      {channels.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {channels.map((channel) => {
            const Icon = channel.platform === "Facebook" ? Facebook : channel.platform === "Instagram" ? Instagram : MessageSquare;
            const color = channel.platform === "Facebook" ? "text-blue-600" : channel.platform === "Instagram" ? "text-pink-600" : "text-green-600";
            return (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all min-w-[200px] ${
                  selectedChannel === channel.id 
                    ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500" 
                    : "bg-white border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className={`p-2 rounded-lg bg-gray-50 ${color}`}>
                  <Icon size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">{channel.name}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{channel.platform}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {currentChannel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: "overview", label: "Overview", icon: Zap },
              { id: "ads", label: "Ad Center", icon: Megaphone },
              { id: "commerce", label: "Commerce Hub", icon: ShoppingBag },
              { id: "messaging", label: "Inbox Plus", icon: MessageSquare },
              { id: "analytics", label: "Insight Engine", icon: TrendingUp },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                  activeTab === tab.id 
                    ? "bg-gray-900 text-white shadow-lg" 
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-9">
            <Card className="p-8 border-gray-200 shadow-sm min-h-[600px] bg-white">
              
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {analyticsLoading ? (
                    <div className="flex justify-center py-12">
                      <RefreshCw className="animate-spin text-blue-600" size={32} />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                          <p className="text-blue-600 text-xs font-black uppercase tracking-widest mb-1">Followers</p>
                          <h3 className="text-3xl font-black text-blue-900">{currentChannel.followers || "0"}</h3>
                        </div>
                        <div className="bg-pink-50 p-6 rounded-2xl border border-pink-100">
                          <p className="text-pink-600 text-xs font-black uppercase tracking-widest mb-1">Status</p>
                          <h3 className="text-3xl font-black text-pink-900">{currentChannel.status || "Unknown"}</h3>
                        </div>
                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                          <p className="text-green-600 text-xs font-black uppercase tracking-widest mb-1">Reach</p>
                          <h3 className="text-3xl font-black text-green-900">
                            {analyticsSummary.totalReach > 0 
                              ? `${(analyticsSummary.totalReach / 1000).toFixed(1)}K` 
                              : analyticsSummary.reach 
                                ? `${(analyticsSummary.reach / 1000).toFixed(1)}K`
                                : "0"}
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-gray-900">RECENT ACTIVITY</h3>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => refetchAnalytics()}
                          >
                            <RefreshCw size={14} className="mr-2" /> Refresh
                          </Button>
                        </div>
                        {analyticsSummary.totalPosts > 0 ? (
                          <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                            <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                  <TrendingUp size={18} className="text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">Engagement Rate: {analyticsSummary.engagementRate.toFixed(2)}%</p>
                                  <p className="text-xs text-gray-500">Based on {analyticsSummary.totalPosts} recent posts</p>
                                </div>
                              </div>
                              <Badge variant="outline">Analytics</Badge>
                            </div>
                            <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                  <Users size={18} className="text-gray-400" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-gray-900">Total Engagement: {analyticsSummary.totalEngagement.toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">Likes, comments, and shares</p>
                                </div>
                              </div>
                              <Badge variant="outline">Social</Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center border border-gray-100 rounded-2xl">
                            <p className="text-gray-400 text-sm">No recent activity. Sync your channel to see updates.</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "ads" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">AD CENTER</h2>
                    <Badge variant="outline" className="rounded-xl">Marketing Operator</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="p-6 border-dashed border-2">
                      <h3 className="font-black text-sm mb-4 uppercase tracking-widest">Audience Sync</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400">Ad Account ID</Label>
                          <Input 
                            value={adAccountId} 
                            onChange={(e) => setAdAccountId(e.target.value)} 
                            placeholder="act_123456789"
                            className="rounded-lg" 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400">Page ID (for creatives)</Label>
                          <Input
                            value={pageId}
                            onChange={(e) => setPageId(e.target.value)}
                            placeholder="1234567890"
                            className="rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-gray-400">Audience Name</Label>
                          <Input 
                            value={audienceName} 
                            onChange={(e) => setAudienceName(e.target.value)} 
                            className="rounded-lg" 
                          />
                        </div>
                        <Button 
                          onClick={() => syncAudienceMutation.mutate()} 
                          disabled={!adAccountId || syncAudienceMutation.isPending}
                          className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
                        >
                          {syncAudienceMutation.isPending ? (
                            <>
                              <RefreshCw size={16} className="mr-2 animate-spin" /> Syncing...
                            </>
                          ) : (
                            "Sync CRM to Meta"
                          )}
                        </Button>
                      </div>
                    </Card>

                    <Card className="p-6 bg-gray-900 text-white">
                      <h3 className="font-black text-sm mb-4 uppercase tracking-widest text-gray-400">Performance Summary</h3>
                      {adPerformanceLoading ? (
                        <div className="flex justify-center py-8">
                          <RefreshCw className="animate-spin" size={24} />
                        </div>
                      ) : adPerformance && adAccountId ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Total Spend</span>
                            <span className="text-lg font-black">${adPerformance.totalSpend.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">Conversions</span>
                            <span className="text-lg font-black">{adPerformance.conversions}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-400">CPA</span>
                            <span className="text-lg font-black text-green-400">
                              {adPerformance.cpa > 0 ? `$${adPerformance.cpa.toFixed(2)}` : "N/A"}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400">
                          {!adAccountId ? "Enter Ad Account ID to view performance" : "No performance data available"}
                        </div>
                      )}
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <CampaignBuilder
                      channelId={selectedChannel!}
                      adAccountId={adAccountId}
                      onSuccess={() => queryClient.invalidateQueries({ queryKey: ["campaigns", selectedChannel, adAccountId] })}
                    />
                    <AudienceManager channelId={selectedChannel!} adAccountId={adAccountId} />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900">ACTIVE CAMPAIGNS</h3>
                    {campaignsLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="animate-spin text-blue-600" size={24} />
                      </div>
                    ) : campaigns.length === 0 ? (
                      <div className="p-8 text-center border border-gray-100 rounded-2xl">
                        <p className="text-gray-400 text-sm italic">
                          {!adAccountId 
                            ? "Enter Ad Account ID to load campaigns" 
                            : "No active campaigns found."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {campaigns.map((c) => (
                          <div key={c.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                            <div>
                              <p className="font-bold text-gray-900">{c.name}</p>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.objective}</p>
                              <button
                                onClick={() => setSelectedCampaignPlatformId(c.id)}
                                className="mt-1 text-xs font-bold text-blue-600 hover:underline"
                              >
                                Manage Ad Sets
                              </button>
                            </div>
                            <div className="flex items-center gap-4">
                              <p className="text-sm font-black text-gray-900">
                                ${((c.daily_budget || 0) / 100).toFixed(2)}/day
                              </p>
                              <Badge className={`${
                                c.status === "ACTIVE" ? "bg-green-500/10 text-green-600" : "bg-gray-500/10 text-gray-600"
                              } border-none`}>
                                {c.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AdSetManager
                      channelId={selectedChannel!}
                      adAccountId={adAccountId}
                      campaignId={selectedCampaignPlatformId || undefined}
                    />
                    <AdCreativeBuilder
                      channelId={selectedChannel!}
                      adAccountId={adAccountId}
                      pageId={pageId}
                    />
                  </div>

                  <InsightsDashboard channelId={selectedChannel!} adAccountId={adAccountId} />
                </div>
              )}

              {activeTab === "commerce" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">COMMERCE HUB</h2>
                    <Button 
                      variant="outline" 
                      className="rounded-xl border-gray-300 font-bold"
                      onClick={() => queryClient.invalidateQueries({ queryKey: ["orders", selectedChannel] })}
                    >
                      <RefreshCw size={16} className="mr-2" /> Sync Orders
                    </Button>
                  </div>

                  {ordersLoading ? (
                    <div className="flex justify-center py-12">
                      <RefreshCw className="animate-spin text-blue-600" size={32} />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-gray-50 rounded-2xl text-center">
                          <p className="text-xs font-black text-gray-400 uppercase mb-1">Open Orders</p>
                          <p className="text-3xl font-black text-gray-900">{ordersSummary.openOrders || 0}</p>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl text-center">
                          <p className="text-xs font-black text-gray-400 uppercase mb-1">Total Orders</p>
                          <p className="text-3xl font-black text-gray-900">{ordersSummary.totalOrders || 0}</p>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-2xl text-center">
                          <p className="text-xs font-black text-gray-400 uppercase mb-1">Total Sales</p>
                          <p className="text-3xl font-black text-green-600">
                            {ordersSummary.totalSales 
                              ? `${(ordersSummary.totalSales / 100).toLocaleString("en-US", { style: "currency", currency: ordersSummary.currency || "USD", minimumFractionDigits: 0 })}`
                              : "$0"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-lg font-black text-gray-900">RECENT ORDERS</h3>
                        {orders.length === 0 ? (
                          <div className="p-8 text-center border border-gray-100 rounded-2xl">
                            <p className="text-gray-400 text-sm">No orders found. Sync orders from Meta Commerce Manager.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                            {orders.map((o) => (
                              <div key={o.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors bg-white">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                    <ShoppingBag size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{o.userName || o.phoneNumber}</p>
                                    <p className="text-[10px] font-black text-gray-400">ORDER #{o.id}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-gray-900">
                                    {(o.totalAmount / 100).toLocaleString("en-US", { style: "currency", currency: o.currency || "USD" })}
                                  </p>
                                  <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "messaging" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">INBOX PLUS</h2>
                    <Button className="bg-green-600 hover:bg-green-700 rounded-xl font-bold">
                      <Plus size={16} className="mr-2" /> New Broadcast
                    </Button>
                  </div>

                  <Card className="p-6 border-dashed border-2 bg-green-50/20">
                    <h3 className="font-black text-sm mb-4 uppercase tracking-widest text-green-700">WhatsApp Flow Sender</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Phone Number (with code)</Label>
                        <Input 
                          placeholder="+27..." 
                          value={flowPhone} 
                          onChange={(e) => setFlowPhone(e.target.value)} 
                          className="rounded-lg" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Flow ID</Label>
                        <Input 
                          placeholder="meta_flow_id" 
                          value={flowId} 
                          onChange={(e) => setFlowId(e.target.value)} 
                          className="rounded-lg" 
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={() => sendFlowMutation.mutate()} 
                      disabled={!flowPhone || !flowId || sendFlowMutation.isPending}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 rounded-xl font-bold shadow-lg shadow-green-200"
                    >
                      {sendFlowMutation.isPending ? (
                        <>
                          <RefreshCw size={16} className="mr-2 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" /> Send Flow Message
                        </>
                      )}
                    </Button>
                  </Card>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900">ACTIVE CONVERSATIONS</h3>
                    {conversationsLoading ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw className="animate-spin text-blue-600" size={24} />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-8 text-center border border-gray-100 rounded-2xl">
                        <p className="text-gray-400 text-sm">No active conversations found.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {conversations.map((conv) => (
                          <div key={conv.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex gap-4 shadow-sm hover:border-blue-200 transition-all cursor-pointer">
                            <div className="w-12 h-12 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center">
                              <span className="text-sm font-bold text-gray-600">{conv.avatar || conv.userName?.charAt(0) || "?"}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-gray-900 truncate">{conv.userName}</p>
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {conv.time ? new Date(conv.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 truncate italic">{conv.lastMessage || "No message"}</p>
                              {conv.unread && (
                                <Badge className="mt-1 bg-blue-500 text-white text-[10px]">New</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "analytics" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-gray-900">INSIGHT ENGINE</h2>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ["analytics", selectedChannel] });
                        refetchAnalytics();
                      }}
                    >
                      <RefreshCw size={16} className="mr-2" /> Refresh
                    </Button>
                  </div>
                  
                  {analyticsLoading ? (
                    <div className="flex justify-center py-12">
                      <RefreshCw className="animate-spin text-blue-600" size={32} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Card className="p-6">
                        <h3 className="font-black text-sm mb-6 uppercase tracking-widest text-gray-400">Engagement Metrics</h3>
                        <div className="space-y-4">
                          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Zap size={18} />
                              </div>
                              <span className="text-sm font-bold text-gray-700">Average Engagement</span>
                            </div>
                            <span className="text-lg font-black text-gray-900">{analyticsSummary.engagementRate.toFixed(2)}%</span>
                          </div>
                          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <TrendingUp size={18} />
                              </div>
                              <span className="text-sm font-bold text-gray-700">Total Reach</span>
                            </div>
                            <span className="text-lg font-black text-gray-900">
                              {analyticsSummary.totalReach > 0 
                                ? `${(analyticsSummary.totalReach / 1000).toFixed(1)}K`
                                : analyticsSummary.reach 
                                  ? `${(analyticsSummary.reach / 1000).toFixed(1)}K`
                                  : "0"}
                            </span>
                          </div>
                          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Users size={18} />
                              </div>
                              <span className="text-sm font-bold text-gray-700">Total Engagement</span>
                            </div>
                            <span className="text-lg font-black text-gray-900">{analyticsSummary.totalEngagement.toLocaleString()}</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-6">
                        <h3 className="font-black text-sm mb-6 uppercase tracking-widest text-gray-400">Platform Metrics</h3>
                        <div className="space-y-4">
                          {analyticsSummary.followerCount !== undefined && (
                            <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-700">Followers</span>
                              <span className="text-lg font-black text-gray-900">{analyticsSummary.followerCount.toLocaleString()}</span>
                            </div>
                          )}
                          {analyticsSummary.impressions !== undefined && (
                            <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-700">Impressions</span>
                              <span className="text-lg font-black text-gray-900">{analyticsSummary.impressions.toLocaleString()}</span>
                            </div>
                          )}
                          {analyticsSummary.profileViews !== undefined && (
                            <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                              <span className="text-sm font-bold text-gray-700">Profile Views</span>
                              <span className="text-lg font-black text-gray-900">{analyticsSummary.profileViews.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">Total Posts</span>
                            <span className="text-lg font-black text-gray-900">{analyticsSummary.totalPosts}</span>
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}

            </Card>
          </div>
        </div>
      )}

      {channels.length === 0 && !channelsLoading && (
        <Card className="p-12 text-center border-dashed border-2 border-gray-200 bg-white">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
              <Plus className="text-gray-300" size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 uppercase">No Channels Connected</h3>
              <p className="text-gray-500 font-medium">Connect your Facebook, Instagram or WhatsApp account to start using the Command Center.</p>
            </div>
            <Button 
              onClick={() => (window.location.href = "/channels")} 
              className="bg-blue-600 hover:bg-blue-700 rounded-xl font-black px-8 py-6 text-lg shadow-xl shadow-blue-100"
            >
              CONNECT NOW
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
