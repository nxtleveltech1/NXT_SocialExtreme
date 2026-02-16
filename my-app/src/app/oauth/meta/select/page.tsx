import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import MetaAccountSelectClient from "./meta-account-select-client";

export const dynamic = "force-dynamic";

type Candidate =
  | { type: "facebook_page"; pageId: string; pageName: string }
  | {
      type: "instagram_business";
      pageId: string;
      pageName: string;
      igId: string;
      igUsername: string | null;
    };

export default async function MetaSelectPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {

  const channelIdRaw = searchParams.channelId;
  const channelId = Number(Array.isArray(channelIdRaw) ? channelIdRaw[0] : channelIdRaw);
  if (!Number.isFinite(channelId)) notFound();

  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!channel) notFound();

  const oauth = (channel.settings as any)?.oauth;
  const candidates = (oauth?.provider === "meta" ? oauth.candidates : null) as Candidate[] | null;
  if (!candidates || candidates.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground">No pending Meta connection</h1>
        <p className="text-muted-foreground mt-2">
          There is no pending Meta OAuth session for this channel. Please return to Channels and try
          connecting again.
        </p>
      </div>
    );
  }

  return (
    <MetaAccountSelectClient
      channelId={channel.id}
      channelName={channel.name}
      channelPlatform={channel.platform}
      candidates={candidates}
    />
  );
}


