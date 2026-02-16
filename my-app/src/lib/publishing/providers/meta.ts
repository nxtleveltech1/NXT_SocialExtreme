import type { channels, posts } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { withRetry, MetaApiError, rateLimitHandler } from "@/lib/utils/api-error-handler";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

type ChannelRow = typeof channels.$inferSelect;
type PostRow = typeof posts.$inferSelect;

/**
 * Rate-limit-aware fetch wrapper for Meta Graph API.
 * Inspects X-Business-Use-Case-Usage and X-App-Usage headers.
 */
async function metaFetch(
  url: string,
  options: RequestInit,
  rateLimitKey: string
): Promise<Response> {
  // Wait if we're rate-limited
  await rateLimitHandler.waitForRateLimit(rateLimitKey);

  const response = await fetch(url, options);

  // Parse rate limit headers (Meta uses these for business APIs)
  const appUsage = response.headers.get("X-App-Usage");
  const businessUsage = response.headers.get("X-Business-Use-Case-Usage");

  if (appUsage) {
    try {
      const usage = JSON.parse(appUsage);
      const callPercent = usage.call_count || 0;
      const cpuPercent = usage.total_cputime || 0;
      const maxUsage = Math.max(callPercent, cpuPercent);

      // If approaching limit (>80%), add delay
      if (maxUsage > 80) {
        const resetTime = Date.now() + 60 * 1000; // Reset in 1 minute
        const remaining = maxUsage > 95 ? 0 : 5;
        rateLimitHandler.updateRateLimit(rateLimitKey, resetTime, remaining);
      }
    } catch {
      // Ignore parse errors
    }
  }

  return response;
}

/**
 * Wrapper that combines metaFetch with retry logic.
 */
async function metaFetchWithRetry(
  url: string,
  options: RequestInit,
  rateLimitKey: string
): Promise<{ response: Response; data: Record<string, unknown> }> {
  return withRetry(
    async () => {
      const response = await metaFetch(url, options, rateLimitKey);
      const data = await response.json();

      if (!response.ok) {
        throw MetaApiError.fromError(data);
      }

      return { response, data };
    },
    {
      maxRetries: 3,
      initialDelay: 2000,
      maxDelay: 30000,
    }
  );
}

/**
 * Publish a post to Meta (Facebook Page or Instagram Business account).
 * - Facebook: Direct POST to /{page-id}/feed
 * - Instagram: Two-step process (create container, then publish)
 */
export async function publishToMeta(channel: ChannelRow, post: PostRow): Promise<{ platformPostId: string }> {
  if (!channel.accessToken) {
    throw new Error("Channel not connected or missing access token");
  }
  if (!channel.platformId) {
    throw new Error("Channel missing platformId. Reconnect the channel.");
  }

  const accessToken = decryptSecret(channel.accessToken);

  if (channel.platform === "Facebook") {
    return await publishToFacebookPage(channel, post, accessToken);
  }
  if (channel.platform === "Instagram") {
    return await publishToInstagramBusiness(channel, post, accessToken);
  }

  throw new Error(`Unsupported Meta platform for publishing: ${channel.platform}`);
}

/**
 * Publish to Facebook Page feed.
 * POST /{page-id}/feed with message and optionally attached_media (for images).
 */
async function publishToFacebookPage(
  channel: ChannelRow,
  post: PostRow,
  accessToken: string
): Promise<{ platformPostId: string }> {
  const pageId = channel.platformId;
  const message = post.content || "";

  // If there's media, we need to upload it first and get an attachment_share_id
  // For now, we'll support simple text posts and posts with image URLs.
  // Full Vercel Blob upload integration comes in a later phase.
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const firstMediaUrl = hasMedia ? post.mediaUrls[0] : null;

  const body: Record<string, string> = {
    message,
    access_token: accessToken,
  };

  // If there's an image URL, attach it as a link (simpler than uploading to FB first)
  // In production, you'd upload the image to FB and use attachment_share_id
  if (firstMediaUrl && firstMediaUrl.startsWith("http")) {
    body.url = firstMediaUrl;
  }

  const { data: result } = await metaFetchWithRetry(
    `${FB_GRAPH_URL}/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    },
    `fb-page-${pageId}`
  );

  if (!result.id) {
    throw new Error("Facebook API returned success but no post ID");
  }

  return { platformPostId: result.id as string };
}

/**
 * Publish to Instagram Business account.
 * Two-step process:
 * 1. Create media container: POST /{ig-user-id}/media
 * 2. Publish container: POST /{ig-user-id}/media_publish
 */
async function publishToInstagramBusiness(
  channel: ChannelRow,
  post: PostRow,
  accessToken: string
): Promise<{ platformPostId: string }> {
  const igUserId = channel.platformId;
  const caption = post.content || "";

  // Instagram requires media (image or video)
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0;
  const firstMediaUrl = hasMedia ? post.mediaUrls[0] : null;

  if (!firstMediaUrl || !firstMediaUrl.startsWith("http")) {
    throw new Error("Instagram requires a media URL (image or video) to publish");
  }

  // Step 1: Create media container
  // For images: image_url + caption
  // For videos: video_url + caption (and optionally cover_url for thumbnail)
  const isVideo = firstMediaUrl.match(/\.(mp4|mov|avi|mkv)$/i);

  const containerBody: Record<string, string> = {
    caption,
    access_token: accessToken,
  };

  if (isVideo) {
    containerBody.media_type = "REELS";
    containerBody.video_url = firstMediaUrl;
    // Optional: cover_url for thumbnail
  } else {
    containerBody.image_url = firstMediaUrl;
  }

  const { data: containerResult } = await metaFetchWithRetry(
    `${FB_GRAPH_URL}/${igUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(containerBody),
    },
    `ig-container-${igUserId}`
  );

  if (!containerResult.id) {
    throw new Error("Instagram API returned success but no container ID");
  }

  const containerId = containerResult.id as string;

  // Step 2: Wait for video processing (REELS only)
  if (isVideo) {
    await waitForMediaProcessing(containerId, accessToken, igUserId);
  }

  // Step 3: Publish the container
  const { data: publishResult } = await metaFetchWithRetry(
    `${FB_GRAPH_URL}/${igUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: accessToken,
      }),
    },
    `ig-publish-${igUserId}`
  );

  if (!publishResult.id) {
    throw new Error("Instagram API returned success but no post ID");
  }

  return { platformPostId: publishResult.id as string };
}

/**
 * Poll Instagram container status until video processing is complete.
 * Videos must reach "FINISHED" status before they can be published.
 */
async function waitForMediaProcessing(
  containerId: string,
  accessToken: string,
  igUserId: string
): Promise<void> {
  const maxAttempts = 20; // 20 attempts × 3s = 60s max wait
  const delayMs = 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: statusData } = await metaFetchWithRetry(
      `${FB_GRAPH_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`,
      { method: "GET" },
      `ig-status-${igUserId}`
    );

    const statusCode = statusData.status_code as string;

    if (statusCode === "FINISHED") {
      return; // Ready to publish
    }

    if (statusCode === "ERROR") {
      throw new Error(`Instagram media processing failed: ${statusData.status}`);
    }

    // IN_PROGRESS - wait and retry
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Instagram media processing timed out after 60 seconds");
}
