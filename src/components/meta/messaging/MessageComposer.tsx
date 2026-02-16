"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Image, FileText } from "lucide-react";
import { toast } from "sonner";

interface MessageComposerProps {
  channelId: number;
  conversationId?: number;
  recipientPhone?: string;
  onSuccess?: () => void;
}

export default function MessageComposer({ channelId, conversationId, recipientPhone, onSuccess }: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "document" | "audio" | null>(null);

  const queryClient = useQueryClient();

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!recipientPhone && !conversationId) {
        throw new Error("Recipient phone or conversation ID required");
      }

      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message,
          ...(mediaUrl && mediaType && {
            mediaUrl,
            mediaType,
          }),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Message sent successfully");
      setMessage("");
      setMediaUrl("");
      setMediaType(null);
      queryClient.invalidateQueries({ queryKey: ["conversations", channelId] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-gray-900 mb-6">COMPOSE MESSAGE</h3>

      <div className="space-y-4">
        {recipientPhone && (
          <div className="space-y-2">
            <Label className="text-sm font-bold">Recipient</Label>
            <Input value={recipientPhone} disabled className="rounded-lg bg-gray-50" />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-bold">Message</Label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">Media (Optional)</Label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMediaType(mediaType === "image" ? null : "image");
                if (mediaType !== "image") setMediaUrl("");
              }}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                mediaType === "image"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Image size={16} className="inline mr-2" /> Image
            </button>
            <button
              onClick={() => {
                setMediaType(mediaType === "document" ? null : "document");
                if (mediaType !== "document") setMediaUrl("");
              }}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                mediaType === "document"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <FileText size={16} className="inline mr-2" /> Document
            </button>
          </div>
          {mediaType && (
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={`${mediaType} URL`}
              type="url"
              className="rounded-lg"
            />
          )}
        </div>

        <Button
          onClick={() => sendMessageMutation.mutate()}
          disabled={!message.trim() || sendMessageMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 rounded-xl font-bold"
        >
          {sendMessageMutation.isPending ? (
            "Sending..."
          ) : (
            <>
              <Send size={16} className="mr-2" /> Send Message
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

