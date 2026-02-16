import { db } from "@/db/db";
import { channels as channelsTable, conversations as conversationsTable, posts as postsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

type ChannelRow = typeof channelsTable.$inferSelect;

export async function syncMetaChannel(channelId: number) {
  const [channel] = await db.select().from(channelsTable).where(eq(channelsTable.id, channelId)).limit(1);
  if (!channel) throw new Error("Channel not found");
  if (!channel.accessToken) throw new Error("Channel not connected or missing access token");

  // Use comprehensive sync functions
  if (channel.platform === "Facebook") {
    const { syncFacebookPageComprehensive } = await import("./meta-comprehensive");
    return await syncFacebookPageComprehensive(channelId);
  }
  if (channel.platform === "Instagram") {
    const { syncInstagramComprehensive } = await import("./meta-comprehensive");
    return await syncInstagramComprehensive(channelId);
  }

  throw new Error(`Unsupported Meta platform: ${channel.platform}`);
}

async function syncFacebookPage(channel: ChannelRow, accessToken: string) {
  // Pull posts
  const postsRes = await fetch(
    `${FB_GRAPH_URL}/me/posts?fields=id,message,story,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}`
  );

  const postsJson = await postsRes.json();
  if (!postsRes.ok) {
    throw new Error(postsJson?.error?.message ?? "Facebook API error (posts)");
  }

  const fbPosts = (postsJson.data ?? []) as any[];

  let commentsImported = 0;
  for (const post of fbPosts) {
    // Upsert post
    await db
      .insert(postsTable)
      .values({
        channelId: channel.id,
        platform: "Facebook",
        platformPostId: post.id,
        content: post.message || post.story || "No content",
        date: new Date(post.created_time),
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
        image: post.full_picture || null,
        mediaUrls: post.full_picture ? [post.full_picture] : [],
        status: "published",
        aiGenerated: false,
      })
      .onConflictDoUpdate({
        target: postsTable.platformPostId,
        set: {
          content: post.message || post.story || "No content",
          date: new Date(post.created_time),
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          image: post.full_picture || null,
        },
      });

    // Pull recent comments (best-effort)
    const commentsRes = await fetch(
      `${FB_GRAPH_URL}/${post.id}/comments?fields=id,message,from,created_time&limit=25&access_token=${accessToken}`
    );
    const commentsJson = await commentsRes.json();
    if (commentsRes.ok) {
      const fbComments = (commentsJson.data ?? []) as any[];
      for (const c of fbComments) {
        const convId = `fb_comment:${c.id}`;
        const fromName = c.from?.name ?? "Facebook User";
        await db
          .insert(conversationsTable)
          .values({
            platformConversationId: convId,
            userName: fromName,
            platform: "Facebook",
            lastMessage: c.message || "No message",
            time: c.created_time ? new Date(c.created_time) : new Date(),
            unread: true,
            avatar: fromName?.charAt(0) ?? "F",
            priority: "normal",
            status: "open",
          })
          .onConflictDoUpdate({
            target: conversationsTable.platformConversationId,
            set: {
              lastMessage: c.message || "No message",
              time: c.created_time ? new Date(c.created_time) : new Date(),
            },
          });
        commentsImported += 1;
      }
    }
  }

  // Pull page conversations/messages (best-effort)
  try {
    const messagesRes = await fetch(
      `${FB_GRAPH_URL}/me/conversations?fields=id,snippet,updated_time,participants,unread_count&limit=25&access_token=${accessToken}`
    );
    const messagesJson = await messagesRes.json();
    if (messagesRes.ok) {
      const fbConvs = (messagesJson.data ?? []) as any[];
      for (const conv of fbConvs) {
        const convId = `fb_conv:${conv.id}`;
        const participantName = conv.participants?.data?.[0]?.name || "Facebook User";
        await db
          .insert(conversationsTable)
          .values({
            platformConversationId: convId,
            userName: participantName,
            platform: "Facebook",
            lastMessage: conv.snippet || "No message",
            time: conv.updated_time ? new Date(conv.updated_time) : new Date(),
            unread: (conv.unread_count || 0) > 0,
            avatar: participantName?.charAt(0) ?? "F",
            priority: "normal",
            status: "open",
          })
          .onConflictDoUpdate({
            target: conversationsTable.platformConversationId,
            set: {
              lastMessage: conv.snippet || "No message",
              time: conv.updated_time ? new Date(conv.updated_time) : new Date(),
              unread: (conv.unread_count || 0) > 0,
            },
          });
      }
    }
  } catch {
    // ignore messaging errors (requires app review/permissions)
  }

  await db
    .update(channelsTable)
    .set({
      lastSync: new Date(),
      status: "Healthy",
    })
    .where(eq(channelsTable.id, channel.id));

  return { success: true, postsCount: fbPosts.length, commentsImported };
}

async function syncInstagramBusiness(channel: ChannelRow, accessToken: string) {
  if (!channel.platformId) {
    throw new Error("Instagram channel missing platformId (ig user id). Reconnect the channel.");
  }

  // Pull media for the IG Business account
  const mediaRes = await fetch(
    `${FB_GRAPH_URL}/${channel.platformId}/media?fields=id,caption,media_url,permalink,media_type,timestamp,like_count,comments_count&limit=25&access_token=${accessToken}`
  );
  const mediaJson = await mediaRes.json();
  if (!mediaRes.ok) {
    throw new Error(mediaJson?.error?.message ?? "Instagram API error (media)");
  }

  const media = (mediaJson.data ?? []) as any[];
  let commentsImported = 0;

  for (const m of media) {
    await db
      .insert(postsTable)
      .values({
        channelId: channel.id,
        platform: "Instagram",
        platformPostId: m.id,
        content: m.caption || "No caption",
        date: m.timestamp ? new Date(m.timestamp) : new Date(),
        likes: m.like_count || 0,
        comments: m.comments_count || 0,
        shares: 0,
        image: m.media_url || null,
        mediaUrls: m.media_url ? [m.media_url] : [],
        status: "published",
        aiGenerated: false,
      })
      .onConflictDoUpdate({
        target: postsTable.platformPostId,
        set: {
          content: m.caption || "No caption",
          date: m.timestamp ? new Date(m.timestamp) : new Date(),
          likes: m.like_count || 0,
          comments: m.comments_count || 0,
          image: m.media_url || null,
        },
      });

    // Pull recent comments (best-effort)
    const commentsRes = await fetch(
      `${FB_GRAPH_URL}/${m.id}/comments?fields=id,text,username,timestamp&limit=25&access_token=${accessToken}`
    );
    const commentsJson = await commentsRes.json();
    if (commentsRes.ok) {
      const igComments = (commentsJson.data ?? []) as any[];
      for (const c of igComments) {
        const convId = `ig_comment:${c.id}`;
        const username = c.username ?? "instagram_user";
        await db
          .insert(conversationsTable)
          .values({
            platformConversationId: convId,
            userName: username,
            platform: "Instagram",
            lastMessage: c.text || "No message",
            time: c.timestamp ? new Date(c.timestamp) : new Date(),
            unread: true,
            avatar: username?.charAt(0) ?? "I",
            priority: "normal",
            status: "open",
          })
          .onConflictDoUpdate({
            target: conversationsTable.platformConversationId,
            set: {
              lastMessage: c.text || "No message",
              time: c.timestamp ? new Date(c.timestamp) : new Date(),
            },
          });
        commentsImported += 1;
      }
    }
  }

  await db
    .update(channelsTable)
    .set({
      lastSync: new Date(),
      status: "Healthy",
    })
    .where(eq(channelsTable.id, channel.id));

  return { success: true, postsCount: media.length, commentsImported };
}

/**
 * Given a Meta webhook object + id, attempt to map it to a channel.
 * - object=page => channel.platform=Facebook, channel.platformId=page_id
 * - object=instagram => channel.platform=Instagram, channel.platformId=ig_user_id
 * - object=whatsapp_business_account => channel.platform=WhatsApp, channel.platformId=wa_id
 */
export async function findChannelForMetaWebhook(object: string, objectId: string) {
  let platform: string | null = null;
  if (object === "instagram") platform = "Instagram";
  else if (object === "page") platform = "Facebook";
  else if (object === "whatsapp_business_account") platform = "WhatsApp";
  
  if (!platform) return null;

  const [channel] = await db
    .select()
    .from(channelsTable)
    .where(and(eq(channelsTable.platform, platform), eq(channelsTable.platformId, objectId)))
    .limit(1);

  return channel ?? null;
}



