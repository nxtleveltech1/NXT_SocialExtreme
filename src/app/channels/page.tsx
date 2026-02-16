"use client";

import {
  Facebook,
  Instagram,
  Video,
  MessageSquare,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Link as LinkIcon,
  Unlink,
  Activity,
  Zap,
  Clock,
  Shield,
  Sparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { withRetry } from "@/lib/utils/api-error-handler";
import { formatErrorForToast } from "@/lib/utils/error-messages";
import ConnectionModal from "@/components/channels/ConnectionModal";
import ChannelSettingsModal from "@/components/channels/ChannelSettingsModal";
import CreateChannelModal from "@/components/channels/CreateChannelModal";
import { ChannelListSkeleton } from "@/components/ui/skeleton-card";

interface Channel {
  id: number;
  name: string;
  platform: string;
  handle: string;
  followers: string | null;
  status: string | null;
  lastSync: Date | null;
  branch: string | null;
  isConnected: boolean | null;
  // Enhanced Fields
  healthScore?: number;
  pingLatency?: number;
  tokenExpiresIn?: string;
  apiUsage?: number;
  authType?: string;
}

const platformIcons = {
  facebook: { icon: Facebook, color: 'bg-blue-600' },
  instagram: { icon: Instagram, color: 'bg-pink-600' },
  tiktok: { icon: Video, color: 'bg-black' },
  whatsapp: { icon: MessageSquare, color: 'bg-green-500' },
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const [isSyncing, setIsSyncing] = useState<number | null>(null);

  const fetchChannels = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/channels");
      const data = await response.json();

      // Ensure data is an array or has channels property
      if (!data || (!Array.isArray(data) && !data.channels)) {
        console.error("Invalid response format:", data);
        setChannels([]);
        return;
      }

      // Extract channels data
      const channelsArray = Array.isArray(data) ? data : data.channels || [];

      // Map data and calculate health based on real sync status
      const enhancedData = channelsArray.map((c: any) => ({
        ...c,
        healthScore: c.status === 'Healthy' ? 100 : c.status === 'Error' ? 0 : 50,
        pingLatency: c.isConnected ? Math.floor(Math.random() * 50) + 20 : 0, // Simulated ping for now
        tokenExpiresIn: c.isConnected ? 'Valid' : 'Expired',
        apiUsage: c.isConnected ? 12 : 0
      }));

      setChannels(enhancedData);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
      setChannels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  const handleSync = async (channel: Channel) => {
    setIsSyncing(channel.id);
    try {
      const result = await withRetry(
        async () => {
          const response = await fetch("/api/channels/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ channelId: channel.id, platform: channel.platform }),
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Sync failed");
          return data;
        },
        { maxRetries: 2, initialDelay: 1000 }
      );
      
      // Refresh channels to show updated stats
      await fetchChannels();
      toast.success(`Sync successful! Imported ${result.postsCount || 0} posts.`);
    } catch (error: unknown) {
      toast.error(formatErrorForToast(error));
    } finally {
      setIsSyncing(null);
    }
  };

  const handleConnectClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsModalOpen(true);
  };

  const handleSettingsClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsSettingsOpen(true);
  };

  const handleCreateSuccess = async (channelId: number) => {
    await fetchChannels();
    // Find the newly created channel and auto-open connection modal
    const newChannels = await fetch("/api/channels").then(r => r.json());
    const channelsArray = newChannels.channels || newChannels || [];
    const newChannel = channelsArray.find((c: any) => c.id === channelId);
    if (newChannel) {
      setSelectedChannel({
        ...newChannel,
        healthScore: 0,
        pingLatency: 0,
        tokenExpiresIn: 'Not Connected',
        apiUsage: 0,
      });
      setIsModalOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SA Channel Management</h1>
          <p className="text-gray-500">Connected social accounts for NXT Level TECH South Africa.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
          <span>Connect New SA Channel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-full">
            <ChannelListSkeleton count={4} />
          </div>
        ) : channels.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
              <div className="max-w-md mx-auto space-y-6">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <Sparkles className="text-white" size={36} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900">No Channels Yet</h3>
                  <p className="text-gray-500">
                    Connect your first social media account to start managing your South African presence.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
                  >
                    <div className="bg-blue-600 p-3 rounded-xl text-white">
                      <Facebook size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Facebook</span>
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-pink-200 hover:bg-pink-50 transition-all"
                  >
                    <div className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-3 rounded-xl text-white">
                      <Instagram size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">Instagram</span>
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-green-200 hover:bg-green-50 transition-all"
                  >
                    <div className="bg-green-500 p-3 rounded-xl text-white">
                      <MessageSquare size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all"
                  >
                    <div className="bg-black p-3 rounded-xl text-white">
                      <Video size={20} />
                    </div>
                    <span className="text-xs font-bold text-gray-700">TikTok</span>
                  </button>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  <Plus size={18} className="inline mr-2" />
                  Connect Your First Channel
                </button>
              </div>
            </div>
          </div>
        ) : channels.map((channel) => {
          const normalizedPlatform = channel.platform?.toLowerCase() || '';
          const platformInfo = platformIcons[normalizedPlatform as keyof typeof platformIcons] || { icon: MessageSquare, color: 'bg-gray-600' };
          const Icon = platformInfo.icon;
          
          return (
            <div key={channel.id} className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all ${
              channel.isConnected ? 'ring-1 ring-green-100' : 'opacity-80'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`${platformInfo.color} p-3 rounded-xl text-white shadow-lg relative`}>
                      <Icon size={24} />
                      {channel.isConnected && (
                        <div className="absolute -top-1 -right-1 bg-green-500 border-2 border-white rounded-full w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{channel.name}</h3>
                      <p className="text-sm text-gray-500">{channel.handle}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    channel.isConnected ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {channel.isConnected ? <ShieldCheck size={12} /> : <Unlink size={12} />}
                    <span>{channel.isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>

                {/* Enhanced Diagnostics Grid */}
                {channel.isConnected ? (
                  <div className="mt-6 grid grid-cols-4 gap-2">
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                        <Activity size={10} />
                        <span>Health</span>
                      </div>
                      <span className="text-sm font-black text-green-600">{channel.healthScore}%</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                        <Zap size={10} />
                        <span>Ping</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">{channel.pingLatency}ms</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                        <Clock size={10} />
                        <span>Token</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">{channel.tokenExpiresIn}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-1">
                        <Shield size={10} />
                        <span>Auth Type</span>
                      </div>
                      <span className="text-sm font-black text-gray-900">
                        {channel.authType === 'username_password' ? 'Username/Pass' : 'OAuth'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 grid grid-cols-4 gap-2">
                    <div className="bg-red-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-red-500 mb-1">
                        <Activity size={10} />
                        <span>Health</span>
                      </div>
                      <span className="text-sm font-black text-red-600">Offline</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-red-500 mb-1">
                        <Zap size={10} />
                        <span>Ping</span>
                      </div>
                      <span className="text-sm font-black text-red-600">N/A</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-red-500 mb-1">
                        <Clock size={10} />
                        <span>Token</span>
                      </div>
                      <span className="text-sm font-black text-red-600">Expired</span>
                    </div>
                    <div className="bg-red-50 p-2 rounded-lg text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-red-500 mb-1">
                        <Shield size={10} />
                        <span>Auth Type</span>
                      </div>
                      <span className="text-sm font-black text-red-600">
                        {channel.authType === 'username_password' ? 'Username/Pass' : 'OAuth'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase">Followers</p>
                    <p className="text-xl font-bold text-gray-900 mt-1">{channel.followers || '0'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 uppercase">Last Sync</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">
                      {channel.lastSync ? new Date(channel.lastSync).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="px-2 py-1 bg-blue-50 rounded text-xs text-blue-600 font-bold">{channel.branch}</span>
                  {!channel.isConnected && (
                    <button 
                      onClick={() => handleConnectClick(channel)}
                      className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <LinkIcon size={14} />
                      <span>Finish Setup</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button 
                  disabled={!channel.isConnected || isSyncing === channel.id}
                  onClick={() => handleSync(channel)}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={16} className={isSyncing === channel.id ? "animate-spin" : ""} />
                  <span>{isSyncing === channel.id ? "Syncing..." : "Re-sync Data"}</span>
                </button>
                <button 
                  onClick={() => handleSettingsClick(channel)}
                  className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span>Channel Settings</span>
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConnectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        channel={selectedChannel}
        onSuccess={fetchChannels}
      />

      <ChannelSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        channel={selectedChannel}
        onUpdate={fetchChannels}
      />

      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <div className="bg-blue-600 rounded-xl p-8 text-white shadow-xl overflow-hidden relative">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Grow your SA Presence</h2>
          <p className="text-blue-100 max-w-lg mb-6">
            Leverage our unified tools to reach more customers in Cape Town and across South Africa.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-6 py-2 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition-colors">
              Launch Campaign
            </button>
            <button className="px-6 py-2 bg-blue-700 text-white rounded-lg font-bold hover:bg-blue-800 transition-colors">
              View Strategy
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 opacity-10">
          <RefreshCw size={300} />
        </div>
      </div>
    </div>
  );
}

