import type { channels, posts } from "@/db/schema";

type ChannelRow = typeof channels.$inferSelect;
type PostRow = typeof posts.$inferSelect;

export async function publishPostForChannel(channel: ChannelRow, post: PostRow): Promise<{ platformPostId: string }> {
  if (channel.platform === "Facebook" || channel.platform === "Instagram") {
    const { publishToMeta } = await import("./providers/meta");
    return await publishToMeta(channel, post);
  }

  if (channel.platform === "TikTok") {
    const { publishToTikTok } = await import("./providers/tiktok");
    return await publishToTikTok(channel, post);
  }

  throw new Error(`Publishing not implemented for platform: ${channel.platform}`);
}



