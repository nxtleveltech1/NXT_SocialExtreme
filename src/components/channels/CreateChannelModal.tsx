"use client";

import { useState } from "react";
import { Loader2, Facebook, Instagram, Video, MessageSquare, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (channelId: number) => void;
}

const platforms = [
  { 
    id: "facebook", 
    name: "Facebook", 
    icon: Facebook, 
    color: "bg-blue-600", 
    hoverColor: "hover:bg-blue-700",
    ringColor: "ring-blue-500",
    description: "Pages, Posts, Insights"
  },
  { 
    id: "instagram", 
    name: "Instagram", 
    icon: Instagram, 
    color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400", 
    hoverColor: "hover:opacity-90",
    ringColor: "ring-pink-500",
    description: "Business Accounts, Reels, Stories"
  },
  { 
    id: "whatsapp", 
    name: "WhatsApp", 
    icon: MessageSquare, 
    color: "bg-green-500", 
    hoverColor: "hover:bg-green-600",
    ringColor: "ring-green-500",
    description: "Business API, Broadcasts, Flows"
  },
  { 
    id: "tiktok", 
    name: "TikTok", 
    icon: Video, 
    color: "bg-black", 
    hoverColor: "hover:bg-gray-900",
    ringColor: "ring-gray-800",
    description: "Business Center, Analytics"
  },
];

export default function CreateChannelModal({ isOpen, onClose, onSuccess }: CreateChannelModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [handle, setHandle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setStep(1);
    setSelectedPlatform(null);
    setChannelName("");
    setHandle("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handlePlatformSelect = (platformId: string) => {
    setSelectedPlatform(platformId);
    // Auto-suggest name based on platform
    if (!channelName) {
      setChannelName(`My ${platformId} Channel`);
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!selectedPlatform || !channelName.trim() || !handle.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName.trim(),
          platform: selectedPlatform,
          provider: selectedPlatform === "TikTok" ? "tiktok" : "meta",
          handle: handle.trim().startsWith("@") ? handle.trim() : `@${handle.trim()}`,
          branch: "South Africa",
          syncEnabled: true,
          pushEnabled: true,
          authType: "oauth",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create channel");
      }

      const newChannelId = result.channel?.id;
      if (newChannelId) {
        onSuccess(newChannelId);
      }
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to create channel");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlatformData = platforms.find(p => p.id === selectedPlatform);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="text-blue-600" size={20} />
            Connect New Channel
          </DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Select the platform you want to connect" 
              : `Configure your ${selectedPlatform} channel`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-3 py-4">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformSelect(platform.id)}
                  className={`
                    flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100
                    transition-all duration-200 hover:border-gray-200 hover:shadow-md
                    focus:outline-none focus:ring-2 ${platform.ringColor} focus:ring-offset-2
                  `}
                >
                  <div className={`${platform.color} p-4 rounded-xl text-white shadow-lg`}>
                    <Icon size={28} />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{platform.name}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">{platform.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && selectedPlatformData && (
          <div className="space-y-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <div className={`${selectedPlatformData.color} p-3 rounded-xl text-white`}>
                <selectedPlatformData.icon size={24} />
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedPlatformData.name}</p>
                <button 
                  onClick={() => setStep(1)} 
                  className="text-xs text-blue-600 hover:underline"
                >
                  Change platform
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channelName" className="text-sm font-bold text-gray-700">
                  Channel Name
                </Label>
                <Input
                  id="channelName"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., NXT Level TECH SA"
                  className="h-11"
                />
                <p className="text-xs text-gray-400">
                  A friendly name to identify this channel in your dashboard
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="handle" className="text-sm font-bold text-gray-700">
                  {selectedPlatform === "WhatsApp" ? "Phone Number" : "Username / Handle"}
                </Label>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={selectedPlatform === "WhatsApp" ? "+27 76 147 8369" : "@nxtleveltech"}
                  className="h-11"
                />
                <p className="text-xs text-gray-400">
                  {selectedPlatform === "WhatsApp" 
                    ? "Your WhatsApp Business phone number"
                    : `Your ${selectedPlatform} username or page handle`}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <p className="text-sm font-medium text-blue-900 mb-1">What happens next?</p>
              <p className="text-xs text-blue-700">
                After creating the channel, you'll connect it via OAuth using your {selectedPlatform} credentials. 
                Your data stays secure — we never store your password.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          {step === 2 && (
            <Button 
              onClick={handleCreate} 
              disabled={isLoading || !channelName.trim() || !handle.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Channel"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

