import { db } from "@/db/db";
import { webhookEvents } from "@/db/schema";
import { env } from "@/lib/env";
import { findChannelForMetaWebhook, syncMetaChannel } from "@/lib/integrations/meta";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

function requireMetaWebhookEnv() {
  if (!env.META_APP_SECRET) {
    throw new Error("Missing META_APP_SECRET (required for webhook signature verification).");
  }
  if (!env.META_WEBHOOK_VERIFY_TOKEN) {
    throw new Error("Missing META_WEBHOOK_VERIFY_TOKEN (required for webhook verification).");
  }
}

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const [algo, sig] = signatureHeader.split("=", 2);
  if (algo !== "sha256" || !sig) return false;

  const digest = crypto.createHmac("sha256", env.META_APP_SECRET!).update(rawBody, "utf8").digest("hex");
  return safeEqual(sig, digest);
}

/**
 * Meta webhook verification (GET)
 * - hub.mode=subscribe
 * - hub.verify_token matches META_WEBHOOK_VERIFY_TOKEN
 * - respond hub.challenge as plain text
 */
export async function GET(req: NextRequest) {
  try {
    requireMetaWebhookEnv();

    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && safeEqual(token, env.META_WEBHOOK_VERIFY_TOKEN!)) {
      return new Response(challenge ?? "", { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Meta webhook ingestion (POST)
 * - verify X-Hub-Signature-256 using META_APP_SECRET
 * - store raw payload for async processing
 */
export async function POST(req: NextRequest) {
  try {
    requireMetaWebhookEnv();

    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifySignature(rawBody, signature)) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const object = typeof payload?.object === "string" ? payload.object : "unknown";

    // Derive a stable external id for de-dupe (best-effort).
    // Prefer provider ids (message id/comment id), otherwise fall back to hash(rawBody).
    const firstEntry = Array.isArray(payload?.entry) ? payload.entry?.[0] : undefined;
    const firstChange = Array.isArray(firstEntry?.changes) ? firstEntry.changes?.[0] : undefined;
    const waMsgId = firstChange?.value?.messages?.[0]?.id;
    const igCommentId = firstChange?.value?.id;
    const fbCommentId = firstChange?.value?.comment_id;
    const externalId =
      (typeof waMsgId === "string" && waMsgId.length ? `wa_msg:${waMsgId}` : null) ||
      (typeof igCommentId === "string" && igCommentId.length ? `ig_evt:${igCommentId}` : null) ||
      (typeof fbCommentId === "string" && fbCommentId.length ? `fb_cmt:${fbCommentId}` : null) ||
      crypto.createHash("sha256").update(rawBody, "utf8").digest("hex");

    // De-dupe: if we've already seen this externalId, acknowledge immediately.
    const [existing] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.externalId, externalId))
      .limit(1);

    if (existing) {
      return NextResponse.json({ success: true, deduped: true });
    }

    const [event] = await db
      .insert(webhookEvents)
      .values({
        provider: "meta",
        eventType: object,
        externalId,
        payload,
        status: "received",
      })
      .returning();

    // Process webhook events
    const entries: Array<{ id?: string; changes?: Array<any> }> = Array.isArray(payload?.entry) ? payload.entry : [];
    
    for (const entry of entries) {
      const objectId = entry.id;
      if (!objectId) continue;

      const channel = await findChannelForMetaWebhook(object, objectId);
      if (!channel) continue;

      const changes = entry.changes || [];

      // 1. WhatsApp Business Account events
      if (object === "whatsapp_business_account") {
        for (const change of changes) {
          // Handle delivery status updates
          if (change.field === "messages" && change.value?.statuses) {
            const statuses = Array.isArray(change.value.statuses) ? change.value.statuses : [change.value.statuses];
            for (const statusUpdate of statuses) {
              if (statusUpdate.id && statusUpdate.status) {
                try {
                  const { updateDeliveryStatus } = await import("@/lib/campaigns/broadcast-engine");
                  const statusMap: Record<string, "sent" | "delivered" | "read" | "failed"> = {
                    sent: "sent",
                    delivered: "delivered",
                    read: "read",
                    failed: "failed",
                  };
                  const mappedStatus = statusMap[statusUpdate.status];
                  if (mappedStatus) {
                    await updateDeliveryStatus(
                      statusUpdate.id,
                      mappedStatus,
                      statusUpdate.timestamp ? new Date(parseInt(statusUpdate.timestamp) * 1000) : undefined
                    );
                  }
                } catch (err) {
                  console.error("Delivery status update failed:", err);
                }
              }
            }
          }

          if (change.field === "messages" && change.value?.messages) {
            const messages = Array.isArray(change.value.messages) ? change.value.messages : [change.value.messages];
            for (const message of messages) {
              // Store WhatsApp message
              // Message is incoming, so we store it in the database
              const { whatsappConversations, whatsappMessages } = await import("@/db/schema");
              const phoneNumber = change.value.contacts?.[0]?.wa_id || message.from;
              
              if (phoneNumber) {
                const conversationId = `wa_${phoneNumber}`;
                let [conversation] = await db
                  .select()
                  .from(whatsappConversations)
                  .where(eq(whatsappConversations.platformConversationId, conversationId))
                  .limit(1);

                if (!conversation) {
                  const [newConv] = await db
                    .insert(whatsappConversations)
                    .values({
                      channelId: channel.id,
                      phoneNumber,
                      platformConversationId: conversationId,
                      userName: change.value.contacts?.[0]?.profile?.name || phoneNumber,
                      lastMessage: message.text?.body || message.type,
                      lastMessageTime: new Date(parseInt(message.timestamp) * 1000),
                      unread: true,
                      status: "open",
                    })
                    .returning();
                  conversation = newConv;
                } else {
                  await db
                    .update(whatsappConversations)
                    .set({
                      lastMessage: message.text?.body || message.type,
                      lastMessageTime: new Date(parseInt(message.timestamp) * 1000),
                      unread: true,
                    })
                    .where(eq(whatsappConversations.id, conversation.id));
                }

                // Store message
                await db.insert(whatsappMessages).values({
                  conversationId: conversation.id,
                  platformMessageId: message.id,
                  direction: "inbound",
                  messageType: message.type,
                  content: message.text?.body || JSON.stringify(message),
                  timestamp: new Date(parseInt(message.timestamp) * 1000),
                  status: "delivered",
                  metadata: message,
                });

                // AI follow-up: classify intent and auto-respond if applicable
                if (message.text?.body) {
                  try {
                    const { processIncomingReply } = await import("@/lib/campaigns/ai-followup");
                    await processIncomingReply(
                      channel.id,
                      conversation.id,
                      message.text.body,
                      phoneNumber
                    );
                  } catch (followUpErr) {
                    console.error("AI follow-up failed:", followUpErr);
                  }
                }
              }
            }
          }
        }
      }

      // 2. Instagram events
      if (object === "instagram") {
        for (const change of changes) {
          if (change.field === "comments") {
            // Handle Instagram comment
            const { conversations } = await import("@/db/schema");
            const commentId = change.value?.id;
            if (commentId) {
              const convId = `ig_comment:${commentId}`;
              await db
                .insert(conversations)
                .values({
                  channelId: channel.id,
                  platformConversationId: convId,
                  userName: change.value?.from?.username || "instagram_user",
                  platform: "Instagram",
                  lastMessage: change.value?.text || "",
                  time: new Date(),
                  unread: true,
                  avatar: change.value?.from?.username?.charAt(0) || "I",
                  status: "open",
                })
                .onConflictDoUpdate({
                  target: conversations.platformConversationId,
                  set: {
                    lastMessage: change.value?.text || "",
                    time: new Date(),
                    unread: true,
                  },
                });
            }
          }
        }
      }

      // 3. Page events (Facebook)
      if (object === "page") {
        for (const change of changes) {
          if (change.field === "feed") {
            // Handle new post or post update
            const { posts } = await import("@/db/schema");
            const postId = change.value?.post_id || change.value?.item;
            if (postId) {
              // Trigger post sync
              const { syncFacebookPageComprehensive } = await import("@/lib/integrations/meta-comprehensive");
              try {
                await syncFacebookPageComprehensive(channel.id);
              } catch (err) {
                console.error("Failed to sync page posts:", err);
              }
            }
          } else if (change.field === "comments") {
            // Handle comment
            const { conversations } = await import("@/db/schema");
            const commentId = change.value?.comment_id;
            if (commentId) {
              const convId = `fb_comment:${commentId}`;
              await db
                .insert(conversations)
                .values({
                  channelId: channel.id,
                  platformConversationId: convId,
                  userName: change.value?.from?.name || "Facebook User",
                  platform: "Facebook",
                  lastMessage: change.value?.message || "",
                  time: new Date(),
                  unread: true,
                  avatar: change.value?.from?.name?.charAt(0) || "F",
                  status: "open",
                })
                .onConflictDoUpdate({
                  target: conversations.platformConversationId,
                  set: {
                    lastMessage: change.value?.message || "",
                    time: new Date(),
                    unread: true,
                  },
                });
            }
          }
        }
      }

      // 4. Commerce events
      if (object === "commerce_checkout" || object === "commerce_order") {
        for (const change of changes) {
          const { syncCommerceOrders } = await import("@/lib/integrations/meta-comprehensive");
          const cmsId = change.value?.commerce_merchant_settings_id || change.value?.id;
          if (cmsId) {
            try {
              await syncCommerceOrders(channel.id, cmsId);
            } catch (err) {
              console.error("Failed to sync commerce orders:", err);
            }
          }
        }
      }

      // 5. Ad events
      if (object === "ad_account") {
        for (const change of changes) {
          // Handle ad account events (campaign status changes, etc.)
          const { syncAdCampaigns } = await import("@/lib/integrations/meta-comprehensive");
          const adAccountId = change.value?.ad_account_id;
          if (adAccountId) {
            try {
              await syncAdCampaigns(channel.id, adAccountId);
            } catch (err) {
              console.error("Failed to sync ad campaigns:", err);
            }
          }
        }
      }
    }

    await db
      .update(webhookEvents)
      .set({ status: "processed", processedAt: new Date() })
      .where(eq(webhookEvents.id, event.id));

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook ingest failed";
    console.error("Meta webhook ingest error:", err);

    try {
      // If we already inserted an event but failed later, we still want a response.
      // (We do not have the event id here reliably; ingestion failures are handled above.)
    } catch {}

    return NextResponse.json({ error: message }, { status: 500 });
  }
}


