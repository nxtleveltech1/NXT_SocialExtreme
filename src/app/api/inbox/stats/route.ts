import { db } from "@/db/db";
import { conversations, messages } from "@/db/schema";
import { eq, and, lt, sql, desc, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

/**
 * GET /api/inbox/stats
 * Compute real-time inbox performance metrics from conversations and messages.
 */
export async function GET() {
  try {
    await requireAuth();

    // 1. Total open conversations
    const [openCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.status, "open"));

    // 2. Total unread conversations
    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.unread, true));

    // 3. SLA Breaches — conversations where slaDeadline has passed and status is still open
    const [slaBreaches] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(
        and(
          lt(conversations.slaDeadline, new Date()),
          ne(conversations.status, "closed")
        )
      );

    // 4. Resolution rate — closed / (closed + open)
    const [closedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.status, "closed"));

    const [totalConvs] = await db
      .select({ count: sql<number>`count(*)` })
      .from(conversations);

    const totalConversations = Number(totalConvs?.count ?? 0);
    const closed = Number(closedCount?.count ?? 0);
    const resolutionRate =
      totalConversations > 0
        ? Math.round((closed / totalConversations) * 100)
        : 0;

    // 5. Average response time (approximate)
    // Measure the average gap between inbound messages and their subsequent outbound reply
    const avgResponseResult = await db.execute(sql`
      SELECT COALESCE(
        EXTRACT(EPOCH FROM AVG(reply.timestamp - inbound.timestamp)),
        0
      )::int AS avg_seconds
      FROM ${messages} inbound
      JOIN LATERAL (
        SELECT timestamp FROM ${messages} outbound
        WHERE outbound.conversation_id = inbound.conversation_id
          AND outbound.direction = 'outbound'
          AND outbound.timestamp > inbound.timestamp
        ORDER BY outbound.timestamp ASC
        LIMIT 1
      ) reply ON true
      WHERE inbound.direction = 'inbound'
    `);

    const avgSeconds = Number(
      (avgResponseResult as any)?.rows?.[0]?.avg_seconds ?? 0
    );
    const avgMinutes = Math.floor(avgSeconds / 60);
    const avgRemainderSeconds = avgSeconds % 60;
    const avgResponseTime =
      avgSeconds > 0
        ? `${avgMinutes}m ${avgRemainderSeconds}s`
        : "—";

    // 6. Top performer — assignedTo with most outbound messages
    const topPerformerResult = await db.execute(sql`
      SELECT c.assigned_to, COUNT(m.id) AS reply_count
      FROM ${messages} m
      JOIN ${conversations} c ON c.id = m.conversation_id
      WHERE m.direction = 'outbound'
        AND c.assigned_to IS NOT NULL
        AND c.assigned_to != ''
      GROUP BY c.assigned_to
      ORDER BY reply_count DESC
      LIMIT 1
    `);

    const topPerformerRow = (topPerformerResult as any)?.rows?.[0];
    const topPerformer = topPerformerRow
      ? {
          name: topPerformerRow.assigned_to,
          replyCount: Number(topPerformerRow.reply_count),
        }
      : null;

    return NextResponse.json({
      avgResponseTime,
      avgResponseSeconds: avgSeconds,
      slaBreaches: Number(slaBreaches?.count ?? 0),
      resolutionRate,
      openConversations: Number(openCount?.count ?? 0),
      unreadConversations: Number(unreadCount?.count ?? 0),
      totalConversations,
      topPerformer,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch inbox stats";
    console.error("Failed to fetch inbox stats:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
