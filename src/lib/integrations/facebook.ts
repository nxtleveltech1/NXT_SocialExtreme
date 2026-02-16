import { db } from "@/db/db";
import { channels as channelsTable, conversations as conversationsTable, posts as postsTable } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { eq } from "drizzle-orm";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

export async function syncFacebookData(channelId: number) {
  try {
    const [channel] = await db
      .select()
      .from(channelsTable)
      .where(eq(channelsTable.id, channelId))
      .limit(1);

    if (!channel || !channel.accessToken) {
      throw new Error("Channel not connected or missing access token");
    }

    console.log(`Starting REAL data pull for Facebook Page: ${channel.name}`);

    const accessToken = decryptSecret(channel.accessToken);

    // 1. Fetch Posts from Facebook Graph API
    let fbPosts: Record<string, unknown>[] = [];
    
    // Requesting rich data: Full Picture, Permalink, Shares, Summary of Likes/Comments
    const postsResponse = await fetch(
      `${FB_GRAPH_URL}/me/posts?fields=id,message,story,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&access_token=${accessToken}`
    );
    
    if (!postsResponse.ok) {
      const errorData = await postsResponse.json();
      console.error("Facebook API Error (Posts):", errorData);
      throw new Error(`Facebook API Error: ${errorData.error?.message || postsResponse.statusText}`);
    }

    const postsData = await postsResponse.json();
    fbPosts = postsData.data || [];

    // Upsert real posts into database
    for (const post of fbPosts) {
      await db.insert(postsTable).values({
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
        aiGenerated: false
      }).onConflictDoUpdate({
        target: postsTable.platformPostId,
        set: {
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
          shares: post.shares?.count || 0,
          image: post.full_picture || null,
        }
      });
    }

    // 2. Fetch Conversations/Messages
    let fbConvs: Record<string, unknown>[] = [];

    const messagesResponse = await fetch(
      `${FB_GRAPH_URL}/me/conversations?fields=id,snippet,updated_time,participants,unread_count&access_token=${accessToken}`
    );

    if (!messagesResponse.ok) {
      console.error("Facebook API Error (Messages):", await messagesResponse.json());
    } else {
      const messagesData = await messagesResponse.json();
      fbConvs = messagesData.data || [];
    }
    
    for (const conv of fbConvs) {
        const participantName = conv.participants?.data[0]?.name || "Facebook User";
        
        await db.insert(conversationsTable).values({
          platformConversationId: conv.id,
          userName: participantName,
          platform: "Facebook",
          lastMessage: conv.snippet || "No message",
          time: new Date(conv.updated_time),
          unread: (conv.unread_count || 0) > 0,
          avatar: participantName[0],
          priority: "normal",
          status: "open"
        }).onConflictDoUpdate({
          target: conversationsTable.platformConversationId,
          set: {
            lastMessage: conv.snippet || "No message",
            time: new Date(conv.updated_time),
            unread: (conv.unread_count || 0) > 0,
          }
        });
    }

    // Update last sync time and status
    await db.update(channelsTable)
      .set({ 
        lastSync: new Date(),
        status: "Healthy"
      })
      .where(eq(channelsTable.id, channelId));

    return { success: true, postsCount: fbPosts.length };

  } catch (error) {
    console.error("Facebook Sync Critical Failure:", error);
    
    // Update channel status to error
    await db.update(channelsTable)
      .set({ status: "Error" })
      .where(eq(channelsTable.id, channelId));

    throw error;
  }
}
