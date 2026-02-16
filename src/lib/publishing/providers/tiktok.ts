import type { channels, posts } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";

const TIKTOK_API_URL = "https://open.tiktokapis.com/v2";

type ChannelRow = typeof channels.$inferSelect;
type PostRow = typeof posts.$inferSelect;

/**
 * Publish a video to TikTok.
 * TikTok requires a two-step process:
 * 1. Initialize upload: POST /video/init/
 * 2. Upload video chunks (if needed)
 * 3. Upload video: POST /video/upload/
 * 4. Publish video: POST /video/publish/
 */
export async function publishToTikTok(channel: ChannelRow, post: PostRow): Promise<{ platformPostId: string }> {
  if (!channel.accessToken) {
    throw new Error("Channel not connected or missing access token");
  }
  if (!channel.platformId) {
    throw new Error("Channel missing platformId (open_id). Reconnect the channel.");
  }

  const accessToken = decryptSecret(channel.accessToken);
  const openId = channel.platformId;

  // TikTok requires a video URL (must be publicly accessible)
  const mediaUrls = post.mediaUrls ?? [];
  const hasMedia = mediaUrls.length > 0;
  const videoUrl = hasMedia ? mediaUrls.find((url) => url.match(/\.(mp4|mov|avi|mkv)$/i)) : null;

  if (!videoUrl || !videoUrl.startsWith("http")) {
    throw new Error("TikTok requires a publicly accessible video URL (MP4, MOV, AVI, or MKV)");
  }

  const caption = post.content || "";

  // Step 1: Initialize upload (optional but recommended for large files)
  // For now, we'll skip initialization and go straight to upload
  // In production, you'd handle chunked uploads for large videos

  // Step 2: Upload video (using video URL - TikTok will download it)
  const uploadRes = await fetch(`${TIKTOK_API_URL}/video/upload/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      open_id: openId,
      source_info: {
        source: "FILE_UPLOAD",
        video_size: 0, // Optional
        chunk_size: 0, // Optional
        total_chunk_count: 1, // For direct URL upload
      },
      video_url: videoUrl,
    }),
  });

  const uploadResult = await uploadRes.json();

  if (!uploadRes.ok) {
    const errorMsg = uploadResult?.error_description ?? uploadResult?.error?.message ?? "TikTok upload error";
    const errorCode = uploadResult?.error?.code;
    throw new Error(`TikTok video upload failed (${errorCode}): ${errorMsg}`);
  }

  if (!uploadResult?.data?.upload_id) {
    throw new Error("TikTok API returned success but no upload_id");
  }

  const uploadId = uploadResult.data.upload_id;

  // Step 3: Publish video
  const publishRes = await fetch(`${TIKTOK_API_URL}/video/publish/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      open_id: openId,
      post_info: {
        title: caption.substring(0, 150), // TikTok title max 150 chars
        privacy_level: "PUBLIC_TO_EVERYONE", // or "SELF_ONLY", "MUTUAL_FOLLOW_FRIENDS"
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000, // Thumbnail timestamp in milliseconds
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: 0,
        chunk_size: 0,
        total_chunk_count: 1,
      },
      upload_id: uploadId,
    }),
  });

  const publishResult = await publishRes.json();

  if (!publishRes.ok) {
    const errorMsg =
      publishResult?.error_description ?? publishResult?.error?.message ?? "TikTok publish error";
    const errorCode = publishResult?.error?.code;
    throw new Error(`TikTok video publish failed (${errorCode}): ${errorMsg}`);
  }

  if (!publishResult?.data?.publish_id) {
    throw new Error("TikTok API returned success but no publish_id");
  }

  // TikTok returns a publish_id, not the final video ID
  // The video ID will be available after processing (via webhook or sync)
  return { platformPostId: publishResult.data.publish_id };
}



