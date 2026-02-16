import ResponseCommandCenter from "@/components/inbox/ResponseCommandCenter";
import UnifiedInbox from "@/components/inbox/UnifiedInbox";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  return (
    <div className="space-y-6">
      <ResponseCommandCenter />
      <UnifiedInbox />
    </div>
  );
}
