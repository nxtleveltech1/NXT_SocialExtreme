"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, Video, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

interface AdCreativeBuilderProps {
  channelId: number;
  adAccountId: string;
  pageId: string;
  onSuccess?: (creativeId: string) => void;
}

export default function AdCreativeBuilder({ channelId, adAccountId, pageId, onSuccess }: AdCreativeBuilderProps) {
  const [name, setName] = useState("");
  const [creativeType, setCreativeType] = useState<"image" | "video" | "carousel">("image");
  const [imageUrl, setImageUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");

  const queryClient = useQueryClient();

  const createCreativeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meta/ads/creatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          adAccountId,
          name,
          object_story_spec: {
            page_id: pageId,
            link_data: {
              ...(imageUrl && { image_url: imageUrl }),
              ...(videoId && { video_id: videoId }),
              message,
              link,
              call_to_action: {
                type: callToAction,
                value: {
                  link,
                },
              },
            },
          },
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create creative");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Creative created successfully");
      queryClient.invalidateQueries({ queryKey: ["adCreatives", channelId, adAccountId] });
      setName("");
      setImageUrl("");
      setVideoId("");
      setMessage("");
      setLink("");
      onSuccess?.(data.creative?.id || data.id);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create creative: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">CREATE AD CREATIVE</h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-bold">Creative Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Summer Sale Banner"
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Creative Type</Label>
          <div className="flex gap-2">
            <button
              onClick={() => setCreativeType("image")}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                creativeType === "image"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Image size={20} className="mx-auto mb-1" /> Image
            </button>
            <button
              onClick={() => setCreativeType("video")}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                creativeType === "video"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Video size={20} className="mx-auto mb-1" /> Video
            </button>
            <button
              onClick={() => setCreativeType("carousel")}
              className={`flex-1 px-4 py-3 rounded-lg font-bold transition-all ${
                creativeType === "carousel"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FileText size={20} className="mx-auto mb-1" /> Carousel
            </button>
          </div>
        </div>

        {creativeType === "image" && (
          <div className="space-y-2">
            <Label className="text-sm font-bold">Image URL</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              type="url"
              className="rounded-lg"
            />
          </div>
        )}

        {creativeType === "video" && (
          <div className="space-y-2">
            <Label className="text-sm font-bold">Video ID</Label>
            <Input
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="Video ID from Meta"
              className="rounded-lg"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-bold">Message</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Your ad message..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Link URL</Label>
          <Input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://example.com"
            type="url"
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Call to Action</Label>
          <select
            value={callToAction}
            onChange={(e) => setCallToAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="LEARN_MORE">Learn More</option>
            <option value="SHOP_NOW">Shop Now</option>
            <option value="SIGN_UP">Sign Up</option>
            <option value="DOWNLOAD">Download</option>
            <option value="BOOK_TRAVEL">Book Travel</option>
            <option value="CONTACT_US">Contact Us</option>
          </select>
        </div>

        <Button
          onClick={() => createCreativeMutation.mutate()}
          disabled={!name || !pageId || (!imageUrl && !videoId) || !link || createCreativeMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
        >
          {createCreativeMutation.isPending ? "Creating..." : "Create Creative"}
        </Button>
      </div>
    </Card>
  );
}

