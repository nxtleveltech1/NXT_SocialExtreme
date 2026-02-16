import { db } from "@/db/db";
import { channels, posts, publishJobs } from "@/db/schema";
import { env } from "@/lib/env";
import { publishPostForChannel } from "@/lib/publishing";
import { and, asc, eq, lte } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";

function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function requireRunnerSecret(req: Request): boolean {
  if (!env.JOB_RUNNER_SECRET) return false;
  const authHeader = req.headers.get("authorization") ?? "";
  return safeEqual(authHeader, `Bearer ${env.JOB_RUNNER_SECRET}`);
}

function nextBackoffMs(attempts: number): number {
  // 1m, 2m, 4m, 8m ... up to 60m
  const minutes = Math.min(60, Math.pow(2, Math.max(0, attempts)));
  return minutes * 60 * 1000;
}

export async function POST(req: Request) {
  if (!requireRunnerSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const due = await db
    .select()
    .from(publishJobs)
    .where(and(eq(publishJobs.status, "pending"), lte(publishJobs.runAt, now)))
    .orderBy(asc(publishJobs.runAt))
    .limit(10);

  let processed = 0;
  const results: Array<{ jobId: number; status: string; error?: string }> = [];

  for (const job of due) {
    // Attempt to lock (best-effort concurrency control)
    const [locked] = await db
      .update(publishJobs)
      .set({ status: "running", lockedAt: now, updatedAt: now })
      .where(and(eq(publishJobs.id, job.id), eq(publishJobs.status, "pending")))
      .returning();

    if (!locked) continue;

    try {
      const [post] = await db.select().from(posts).where(eq(posts.id, job.postId)).limit(1);
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, job.channelId))
        .limit(1);

      if (!post || !channel) {
        throw new Error("Missing post or channel");
      }

      // Idempotency: if already published, mark succeeded.
      if (post.status === "published" && post.platformPostId) {
        await db
          .update(publishJobs)
          .set({ status: "succeeded", updatedAt: new Date(), lastError: null })
          .where(eq(publishJobs.id, job.id));
        results.push({ jobId: job.id, status: "succeeded" });
        processed += 1;
        continue;
      }

      const publishResult = await publishPostForChannel(channel as any, post as any);

      await db
        .update(posts)
        .set({
          status: "published",
          platformPostId: publishResult.platformPostId,
          date: new Date(),
        })
        .where(eq(posts.id, post.id));

      await db
        .update(publishJobs)
        .set({ status: "succeeded", updatedAt: new Date(), lastError: null })
        .where(eq(publishJobs.id, job.id));

      results.push({ jobId: job.id, status: "succeeded" });
      processed += 1;
    } catch (err: any) {
      const attempts = (job.attempts ?? 0) + 1;
      const lastError = String(err?.message ?? err ?? "Unknown error");

      if (attempts >= (job.maxAttempts ?? 5)) {
        await db
          .update(publishJobs)
          .set({
            status: "failed",
            attempts,
            lastError,
            updatedAt: new Date(),
          })
          .where(eq(publishJobs.id, job.id));

        await db.update(posts).set({ status: "failed" }).where(eq(posts.id, job.postId));
        results.push({ jobId: job.id, status: "failed", error: lastError });
      } else {
        const retryAt = new Date(Date.now() + nextBackoffMs(attempts));
        await db
          .update(publishJobs)
          .set({
            status: "pending",
            attempts,
            lastError,
            lockedAt: null,
            runAt: retryAt,
            updatedAt: new Date(),
          })
          .where(eq(publishJobs.id, job.id));

        results.push({ jobId: job.id, status: "retrying", error: lastError });
      }
    }
  }

  return NextResponse.json({ ok: true, processed, results });
}





