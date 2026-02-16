import { db } from "@/db/db";
import { channels as channelsTable, conversations as conversationsTable, posts as postsTable } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { eq } from "drizzle-orm";

const TIKTOK_API_URL = "https://open.tiktokapis.com/v2";

type ChannelRow = typeof channelsTable.$inferSelect;

export async function syncTikTokChannel(channelId: number) {
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId)).limit(1);
  if (!channel) throw new Error("Channel not found");
  if (!channel.accessToken) throw new Error("Channel not connected or missing access token");
  if (!channel.platformId) {
    throw new Error("Channel missing platformId (open_id). Reconnect the channel.");
  }

  const accessToken = decryptSecret(channel.accessToken);
  const openId = channel.platformId;

  // Fetch user's videos
  const videosRes = await fetch(`${TIKTOK_API_URL}/video/list/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      open_id: openId,
      max_count: 20, // Limit to recent 20 videos
    }),
  });

  const videosJson = await videosRes.json();
  if (!videosRes.ok) {
    throw new Error(videosJson?.error_description ?? videosJson?.error?.message ?? "TikTok API error (videos)");
  }

  const videos = (videosJson?.data?.videos ?? []) as Array<{
    video_id?: string;
    title?: string;
    cover_image_url?: string;
    create_time?: number;
    video_status?: string;
    statistics?: {
      like_count?: number;
      comment_count?: number;
      share_count?: number;
      view_count?: number;
    };
  }>;

  let commentsImported = 0;

  for (const video of videos) {
    if (!video.video_id) continue;

    const videoId = video.video_id;
    const title = video.title || "No title";
    const createdAt = video.create_time ? new Date(video.create_time * 1000) : new Date();
    const stats = video.statistics ?? {};

    // Upsert video post
    await db
      .insert(postsTable)
      .values({
        channelId: channel.id,
        platform: "TikTok",
        platformPostId: videoId,
        content: title,
        date: createdAt,
        likes: stats.like_count ?? 0,
        comments: stats.comment_count ?? 0,
        shares: stats.share_count ?? 0,
        impressions: stats.view_count ?? 0,
        image: video.cover_image_url || null,
        mediaUrls: video.cover_image_url ? [video.cover_image_url] : [],
        status: video.video_status === "PUBLISHED" ? "published" : "draft",
        aiGenerated: false,
      })
      .onConflictDoUpdate({
        target: postsTable.platformPostId,
        set: {
          content: title,
          date: createdAt,
          likes: stats.like_count ?? 0,
          comments: stats.comment_count ?? 0,
          shares: stats.share_count ?? 0,
          impressions: stats.view_count ?? 0,
          image: video.cover_image_url || null,
          status: video.video_status === "PUBLISHED" ? "published" : "draft",
        },
      });

    // Fetch comments for this video (best-effort)
    try {
      const commentsRes = await fetch(`${TIKTOK_API_URL}/video/comment/list/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          open_id: openId,
          video_id: videoId,
          max_count: 25,
        }),
      });

      const commentsJson = await commentsRes.json();
      if (commentsRes.ok) {
        const tikTokComments = (commentsJson?.data?.comments ?? []) as Array<{
          comment_id?: string;
          text?: string;
          user?: {
            display_name?: string;
            username?: string;
          };
          create_time?: number;
        }>;

        for (const c of tikTokComments) {
          if (!c.comment_id) continue;

          const convId = `tiktok_comment:${c.comment_id}`;
          const username = c.user?.username ?? c.user?.display_name ?? "tiktok_user";
          const commentText = c.text || "No message";
          const commentTime = c.create_time ? new Date(c.create_time * 1000) : new Date();

          await db
            .insert(conversationsTable)
            .values({
              platformConversationId: convId,
              userName: username,
              platform: "TikTok",
              lastMessage: commentText,
              time: commentTime,
              unread: true,
              avatar: username?.charAt(0) ?? "T",
              priority: "normal",
              status: "open",
            })
            .onConflictDoUpdate({
              target: conversationsTable.platformConversationId,
              set: {
                lastMessage: commentText,
                time: commentTime,
              },
            });
          commentsImported += 1;
        }
      }
    } catch (commentErr) {
      // Comments may require additional permissions; ignore errors
      console.warn(`Failed to fetch comments for TikTok video ${videoId}:`, commentErr);
    }
  }

  await db
    .update(channelsTable)
    .set({
      lastSync: new Date(),
      status: "Healthy",
    })
    .where(eq(channelsTable.id, channel.id));

  return { success: true, postsCount: videos.length, commentsImported };
}



