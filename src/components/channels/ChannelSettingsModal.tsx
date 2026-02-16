"use client";

import { useState } from "react";
import { 
  Settings, 
  RefreshCw, 
  Trash2, 
  Bell, 
  Shield, 
  CheckCircle2, 
  Loader2,
  AlertTriangle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface ChannelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: {
    id: number;
    name: string;
    platform: string;
    isConnected: boolean | null;
  } | null;
  onUpdate: () => void;
}

export default function ChannelSettingsModal({ isOpen, onClose, channel, onUpdate }: ChannelSettingsModalProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  if (!channel) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatus('idle');
    try {
      const response = await fetch("/api/channels/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id, platform: channel.platform }),
      });

      if (response.ok) {
        setStatus('success');
        onUpdate();
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/channels/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: channel.id }),
      });

      if (response.ok) {
        toast.success(`${channel.name} disconnected successfully`);
        onUpdate();
        onClose();
      } else {
        toast.error("Failed to disconnect channel. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("A network error occurred. Please check your connection.");
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setStatus("idle");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-muted p-2 rounded-lg text-muted-foreground">
              <Settings size={20} />
            </div>
            <div className="text-left">
              <DialogTitle>{channel.name}</DialogTitle>
              <DialogDescription>{channel.platform} settings</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sync Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Data synchronization</h3>
            <div className="p-4 bg-muted rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">Manual refresh</p>
                <p className="text-xs text-muted-foreground">
                  Pull the latest posts and messages from {channel.platform}.
                </p>
              </div>
              <Button onClick={handleManualSync} disabled={isSyncing || !channel.isConnected} variant="outline">
                {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw size={16} />}
                {isSyncing ? "Syncing…" : "Sync now"}
              </Button>
            </div>
            {status === 'success' && (
              <div className="flex items-center space-x-2 text-green-600 text-xs font-bold">
                <CheckCircle2 size={14} />
                <span>Sync completed successfully</span>
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Channel preferences</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-accent/30 transition-colors">
                <div className="flex items-center space-x-3">
                  <Bell size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Push notifications</p>
                    <p className="text-xs text-muted-foreground">Alert for new comments and messages.</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between p-3 border border-border rounded-xl hover:bg-accent/30 transition-colors">
                <div className="flex items-center space-x-3">
                  <Shield size={18} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold text-foreground">Auto-moderation</p>
                    <p className="text-xs text-muted-foreground">
                      Filter spam and inappropriate comments.
                    </p>
                  </div>
                </div>
                <Switch />
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 border-t border-gray-100">
            {!showDisconnectConfirm ? (
              <DialogFooter>
                <Button
                  onClick={() => setShowDisconnectConfirm(true)}
                  disabled={isDisconnecting}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 size={18} />
                  Disconnect channel
                </Button>
              </DialogFooter>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertTriangle className="text-destructive" size={18} />
                  <p className="text-sm text-destructive font-medium">
                    Disconnect {channel.name}?
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will remove the connection and you'll need to re-authenticate to reconnect.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowDisconnectConfirm(false)}
                    variant="outline"
                    className="flex-1"
                    disabled={isDisconnecting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Disconnecting…
                      </>
                    ) : (
                      "Yes, disconnect"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
