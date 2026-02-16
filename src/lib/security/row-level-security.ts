/**
 * Row Level Security (RLS) Helpers
 * 
 * Phase 4: Enterprise Scale
 * 
 * Provides utilities for multi-tenant data isolation in PostgreSQL.
 * These helpers ensure users can only access their own data.
 */

import { db } from "@/db/db";
import { sql } from "drizzle-orm";

/**
 * RLS Policy definitions for each table.
 * These are applied via raw SQL migrations.
 */
export const RLS_POLICIES = {
  channels: {
    tableName: "channels",
    policyName: "channels_tenant_isolation",
    using: "user_id = current_setting('app.current_user_id')::text",
    check: "user_id = current_setting('app.current_user_id')::text",
  },
  posts: {
    tableName: "posts",
    policyName: "posts_tenant_isolation",
    using: `channel_id IN (
      SELECT id FROM channels 
      WHERE user_id = current_setting('app.current_user_id')::text
    )`,
    check: `channel_id IN (
      SELECT id FROM channels 
      WHERE user_id = current_setting('app.current_user_id')::text
    )`,
  },
  conversations: {
    tableName: "conversations",
    policyName: "conversations_tenant_isolation",
    using: `channel_id IN (
      SELECT id FROM channels 
      WHERE user_id = current_setting('app.current_user_id')::text
    )`,
    check: `channel_id IN (
      SELECT id FROM channels 
      WHERE user_id = current_setting('app.current_user_id')::text
    )`,
  },
  messages: {
    tableName: "messages",
    policyName: "messages_tenant_isolation",
    using: `conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN channels ch ON c.channel_id = ch.id
      WHERE ch.user_id = current_setting('app.current_user_id')::text
    )`,
    check: `conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN channels ch ON c.channel_id = ch.id
      WHERE ch.user_id = current_setting('app.current_user_id')::text
    )`,
  },
  ad_campaigns: {
    tableName: "ad_campaigns",
    policyName: "ad_campaigns_tenant_isolation",
    using: `channel_id IN (
      SELECT id FROM channels 
      WHERE user_id = current_setting('app.current_user_id')::text
    )`,
    check: `channel_id IN (
      SELECT id FROM channels 
      WHERE user_id = current_setting('app.current_user_id')::text
    )`,
  },
};

/**
 * Generate SQL to enable RLS on a table.
 */
export function generateEnableRLSSQL(tableName: string): string {
  return `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`;
}

/**
 * Generate SQL to create an RLS policy.
 */
export function generateCreatePolicySQL(
  tableName: string,
  policyName: string,
  using: string,
  check?: string
): string {
  let sql = `
CREATE POLICY ${policyName} ON ${tableName}
FOR ALL
USING (${using})`;

  if (check) {
    sql += `
WITH CHECK (${check})`;
  }

  return sql + ";";
}

/**
 * Generate SQL to drop an RLS policy.
 */
export function generateDropPolicySQL(tableName: string, policyName: string): string {
  return `DROP POLICY IF EXISTS ${policyName} ON ${tableName};`;
}

/**
 * Generate migration SQL for all RLS policies.
 */
export function generateRLSMigration(): string {
  const statements: string[] = [
    "-- Row Level Security Migration",
    "-- Phase 4: Enterprise Scale Multi-Tenant Isolation",
    "",
  ];

  for (const [key, policy] of Object.entries(RLS_POLICIES)) {
    statements.push(`-- ${key} table`);
    statements.push(generateEnableRLSSQL(policy.tableName));
    statements.push(generateDropPolicySQL(policy.tableName, policy.policyName));
    statements.push(generateCreatePolicySQL(
      policy.tableName,
      policy.policyName,
      policy.using,
      policy.check
    ));
    statements.push("");
  }

  return statements.join("\n");
}

/**
 * Set the current user context for RLS.
 * Must be called at the start of each request.
 */
export async function setRLSContext(userId: string): Promise<void> {
  await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
}

/**
 * Clear the RLS context.
 * Should be called at the end of each request.
 */
export async function clearRLSContext(): Promise<void> {
  await db.execute(sql`SELECT set_config('app.current_user_id', '', true)`);
}

/**
 * Execute a function with RLS context set.
 */
export async function withRLSContext<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    await setRLSContext(userId);
    return await fn();
  } finally {
    await clearRLSContext();
  }
}

/**
 * Middleware helper to set RLS context from Stack Auth user.
 */
export async function setRLSContextFromUser(
  user: { id: string } | null | undefined
): Promise<void> {
  if (user?.id) {
    await setRLSContext(user.id);
  }
}

/**
 * Check if RLS is enabled on a table.
 */
export async function isRLSEnabled(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT relrowsecurity 
    FROM pg_class 
    WHERE relname = ${tableName}
  `);

  const rows = result.rows as Array<{ relrowsecurity: boolean }>;
  return rows[0]?.relrowsecurity ?? false;
}

/**
 * Get all RLS policies for a table.
 */
export async function getTablePolicies(tableName: string): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT polname 
    FROM pg_policy 
    WHERE polrelid = ${tableName}::regclass
  `);

  const rows = result.rows as Array<{ polname: string }>;
  return rows.map((r) => r.polname);
}

/**
 * Validate that RLS is properly configured.
 */
export async function validateRLSConfiguration(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  for (const [key, policy] of Object.entries(RLS_POLICIES)) {
    try {
      const enabled = await isRLSEnabled(policy.tableName);
      if (!enabled) {
        issues.push(`RLS not enabled on table: ${policy.tableName}`);
      }

      const policies = await getTablePolicies(policy.tableName);
      if (!policies.includes(policy.policyName)) {
        issues.push(`Policy ${policy.policyName} not found on ${policy.tableName}`);
      }
    } catch (error) {
      issues.push(`Error checking ${policy.tableName}: ${error}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export default {
  setRLSContext,
  clearRLSContext,
  withRLSContext,
  setRLSContextFromUser,
  generateRLSMigration,
  validateRLSConfiguration,
};
