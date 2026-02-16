"use client";

import { 
  PenTool, 
  Image as ImageIcon, 
  Video, 
  Smile, 
  Eye,
  Smartphone,
  Facebook,
  Instagram,
  MessageSquare, 
  Monitor,
  Calendar,
  ChevronRight
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import AIContentGenerator from "@/components/create/AIContentGenerator";
import PostPreview from "@/components/create/PostPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const platforms = [
  { id: 'Instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-600', text: 'text-pink-600' },
  { id: 'Facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600', text: 'text-blue-600' },
  { id: 'TikTok', name: 'TikTok', icon: Video, color: 'bg-black', text: 'text-black' },
  { id: 'WhatsApp', name: 'WhatsApp', icon: MessageSquare, color: 'bg-green-600', text: 'text-green-600' },
];

type Channel = {
  id: number;
  name: string;
  platform: string;
  isConnected: boolean | null;
};

export default function CreatePostPage() {
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]);
  const [content, setContent] = useState('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAIGenerated = (newContent: string, hashtags: string[]) => {
    setContent(`${newContent}\n\n${hashtags.join(' ')}`);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/channels");
        const data = await res.json();
        setChannels(Array.isArray(data) ? data : []);
      } catch {
        setChannels([]);
      }
    };
    load();
  }, []);

  const platformChannels = useMemo(
    () => channels.filter((c) => c.platform === selectedPlatform.id),
    [channels, selectedPlatform.id]
  );

  useEffect(() => {
    setSelectedChannelId(platformChannels[0]?.id ?? null);
  }, [platformChannels]);

  const createPost = async (opts: { status: "draft" | "scheduled"; scheduledAt?: string | null }) => {
    if (!selectedChannelId) {
      toast.warning("No channel selected for this platform. Connect a channel first.");
      return;
    }
    if (!content.trim()) {
      toast.warning("Add some content before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: selectedChannelId,
          platform: selectedPlatform.id,
          content,
          mediaUrls: mediaUrl ? [mediaUrl] : [],
          image: mediaUrl,
          status: opts.status,
          scheduledAt: opts.scheduledAt ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save post");

      setScheduleOpen(false);
      setScheduledAtLocal("");
      toast.success(opts.status === "draft" ? "Draft saved." : "Post scheduled successfully!");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PenTool className="text-blue-600" />
            NXT Content Studio
          </h1>
          <p className="text-gray-500">World-class content creation with AI assistance and live previews.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => createPost({ status: "draft" })} disabled={isSubmitting}>
            Save draft
          </Button>
          <Button onClick={() => setScheduleOpen(true)} disabled={isSubmitting}>
            <Calendar size={18} />
            Schedule post
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Editor Side */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-4 overflow-x-auto scrollbar-hide">
            {platforms.map((p) => (
              <Button
                key={p.id}
                onClick={() => setSelectedPlatform(p)}
                variant={selectedPlatform.id === p.id ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  selectedPlatform.id === p.id ? `${p.color} text-white hover:opacity-95` : "bg-white"
                )}
              >
                <p.icon size={14} />
                {p.name}
              </Button>
            ))}
          </div>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Channel</Label>
              <select
                value={selectedChannelId ?? ""}
                onChange={(e) => setSelectedChannelId(e.target.value ? Number(e.target.value) : null)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {platformChannels.length === 0 ? (
                  <option value="">No {selectedPlatform.id} channels connected</option>
                ) : (
                  platformChannels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isConnected ? "" : "(disconnected)"}
                    </option>
                  ))
                )}
              </select>
              {!selectedChannelId && (
                <p className="text-xs text-red-600 font-semibold">
                  Connect a {selectedPlatform.id} channel in Channels before scheduling.
                </p>
              )}
            </div>
            
            {/* AI Generator */}
            <AIContentGenerator 
              platform={selectedPlatform.name} 
              onGenerate={handleAIGenerated} 
            />

            {/* Content Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Post Content</label>
              <div className="relative">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Write your engaging caption for ${selectedPlatform.name}...`}
                  className="h-40 bg-gray-50 border-none rounded-xl text-sm focus-visible:ring-blue-500 resize-none"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {content.length} / {selectedPlatform.id === 'Twitter' ? 280 : 2200}
                  </span>
                </div>
              </div>
            </div>

            {/* Media Upload (Simulated) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Media Assets</label>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setMediaUrl("https://images.unsplash.com/photo-1598488035139-bdbb2231ce04")}
                  className={`h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${
                    mediaUrl ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-blue-400 text-gray-400 hover:text-blue-500'
                  }`}
                >
                  <ImageIcon size={24} />
                  <span className="text-xs font-bold">Upload Image</span>
                </button>
                <button className="h-32 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-400 text-gray-400 hover:text-blue-500 flex flex-col items-center justify-center gap-2 transition-all">
                  <Video size={24} />
                  <span className="text-xs font-bold">Upload Video</span>
                </button>
              </div>
            </div>

            {/* Advanced Options */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group cursor-pointer hover:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md shadow-sm">
                    <ImageIcon size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Add Alt Text</p>
                    <p className="text-[10px] text-gray-400">Make your content more accessible</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group cursor-pointer hover:bg-blue-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-md shadow-sm">
                    <Smile size={16} className="text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Tag Products</p>
                    <p className="text-[10px] text-gray-400">Link to NXT Gear or Services</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Side */}
        <div className="w-full lg:w-[400px] xl:w-[480px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Eye size={18} />
              Live Preview
            </h3>
            <div className="flex bg-gray-200 rounded-lg p-1">
              <button 
                onClick={() => setPreviewMode('mobile')}
                className={`p-1.5 rounded-md transition-all ${previewMode === 'mobile' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                <Smartphone size={16} />
              </button>
              <button 
                onClick={() => setPreviewMode('desktop')}
                className={`p-1.5 rounded-md transition-all ${previewMode === 'desktop' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
              >
                <Monitor size={16} />
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 flex items-center justify-center overflow-y-auto">
            <PostPreview 
              platform={selectedPlatform.id} 
              content={content} 
              mediaUrl={mediaUrl} 
              viewMode={previewMode}
            />
          </div>
        </div>
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule post</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Publish time</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAtLocal}
              onChange={(e) => setScheduledAtLocal(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Tip: use your local time — we’ll store it as a timestamp and run the job when due.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => createPost({ status: "scheduled", scheduledAt: scheduledAtLocal || null })}
              disabled={isSubmitting || !scheduledAtLocal}
            >
              {isSubmitting ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
