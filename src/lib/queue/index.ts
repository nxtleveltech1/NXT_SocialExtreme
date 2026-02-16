/**
 * Queue Abstraction Layer
 * 
 * Phase 4: Enterprise Scale
 * 
 * This module provides a provider-agnostic interface for background job processing.
 * Currently uses database polling (publishJobs table).
 * Can be swapped for BullMQ, Upstash QStash, or other providers.
 */

import { db } from "@/db/db";
import { publishJobs } from "@/db/schema";
import { and, eq, lte, asc } from "drizzle-orm";

export type JobStatus = "pending" | "running" | "succeeded" | "failed" | "cancelled";

export interface Job<T = unknown> {
  id: string;
  queue: string;
  payload: T;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: Date;
  createdAt: Date;
  lastError?: string;
}

export interface QueueProvider {
  name: string;
  enqueue<T>(queue: string, payload: T, options?: EnqueueOptions): Promise<string>;
  dequeue(queue: string, limit?: number): Promise<Job[]>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, error: string): Promise<void>;
  retry(jobId: string, delayMs?: number): Promise<void>;
  cancel(jobId: string): Promise<void>;
}

export interface EnqueueOptions {
  runAt?: Date;
  maxAttempts?: number;
  dedupeKey?: string;
}

/**
 * Database-backed queue provider (current implementation)
 * Uses the publishJobs table for job storage.
 */
class DatabaseQueueProvider implements QueueProvider {
  name = "database";

  async enqueue<T>(queue: string, payload: T, options: EnqueueOptions = {}): Promise<string> {
    const { runAt = new Date(), maxAttempts = 5 } = options;

    // For the publish queue, we expect postId and channelId in payload
    const { postId, channelId } = payload as { postId?: number; channelId?: number };

    if (!postId || !channelId) {
      throw new Error("Database queue requires postId and channelId in payload");
    }

    const [job] = await db
      .insert(publishJobs)
      .values({
        postId,
        channelId,
        runAt,
        status: "pending",
        attempts: 0,
        maxAttempts,
      })
      .returning();

    return String(job.id);
  }

  async dequeue(queue: string, limit: number = 10): Promise<Job[]> {
    const now = new Date();

    const jobs = await db
      .select()
      .from(publishJobs)
      .where(and(eq(publishJobs.status, "pending"), lte(publishJobs.runAt, now)))
      .orderBy(asc(publishJobs.runAt))
      .limit(limit);

    return jobs.map((j) => ({
      id: String(j.id),
      queue: "publish",
      payload: { postId: j.postId, channelId: j.channelId },
      status: j.status as JobStatus,
      attempts: j.attempts,
      maxAttempts: j.maxAttempts,
      runAt: j.runAt,
      createdAt: j.createdAt || new Date(),
      lastError: j.lastError || undefined,
    }));
  }

  async complete(jobId: string): Promise<void> {
    await db
      .update(publishJobs)
      .set({ status: "succeeded", updatedAt: new Date(), lastError: null })
      .where(eq(publishJobs.id, Number(jobId)));
  }

  async fail(jobId: string, error: string): Promise<void> {
    const [job] = await db
      .select()
      .from(publishJobs)
      .where(eq(publishJobs.id, Number(jobId)))
      .limit(1);

    if (!job) return;

    const attempts = job.attempts + 1;
    const isFinal = attempts >= job.maxAttempts;

    await db
      .update(publishJobs)
      .set({
        status: isFinal ? "failed" : "pending",
        attempts,
        lastError: error,
        updatedAt: new Date(),
        runAt: isFinal ? job.runAt : new Date(Date.now() + getBackoffMs(attempts)),
      })
      .where(eq(publishJobs.id, Number(jobId)));
  }

  async retry(jobId: string, delayMs: number = 60000): Promise<void> {
    await db
      .update(publishJobs)
      .set({
        status: "pending",
        runAt: new Date(Date.now() + delayMs),
        updatedAt: new Date(),
      })
      .where(eq(publishJobs.id, Number(jobId)));
  }

  async cancel(jobId: string): Promise<void> {
    await db
      .update(publishJobs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(publishJobs.id, Number(jobId)));
  }
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffMs(attempt: number): number {
  const base = 60 * 1000; // 1 minute
  const multiplier = Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * base * multiplier;
  return Math.min(base * multiplier + jitter, 24 * 60 * 60 * 1000); // Max 24 hours
}

/**
 * Get the configured queue provider
 */
export function getQueueProvider(): QueueProvider {
  return new DatabaseQueueProvider();
}

export const queue = getQueueProvider();

export { DatabaseQueueProvider };
