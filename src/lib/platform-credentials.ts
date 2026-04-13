import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { platformCredentials } from "@/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { env } from "@/lib/env";

// ─── Credential definitions ───────────────────────────────────────────────────

export type PlatformSlug = "meta" | "tiktok" | "whatsapp";

export type CredentialDef = {
  key: string;
  label: string;
  placeholder: string;
  isSecret: boolean;
  envFallback?: keyof typeof env;
  hint?: string;
};

export const PLATFORM_DEFS: Record<PlatformSlug, { label: string; description: string; credentials: CredentialDef[] }> = {
  meta: {
    label: "Meta / Facebook & Instagram",
    description: "OAuth credentials for Facebook and Instagram channel connections.",
    credentials: [
      { key: "app_id",              label: "App ID",                   placeholder: "1234567890",                isSecret: false, envFallback: "META_APP_ID" },
      { key: "app_secret",          label: "App Secret",               placeholder: "••••••••••••••••",           isSecret: true,  envFallback: "META_APP_SECRET" },
      { key: "redirect_uri",        label: "OAuth Redirect URI",       placeholder: "https://yourdomain.com/api/oauth/meta/callback", isSecret: false, envFallback: "META_REDIRECT_URI", hint: "Must match exactly what is registered in your Meta App." },
      { key: "webhook_verify_token",label: "Webhook Verify Token",     placeholder: "your_random_token",         isSecret: true,  envFallback: "META_WEBHOOK_VERIFY_TOKEN" },
    ],
  },
  tiktok: {
    label: "TikTok",
    description: "OAuth credentials for TikTok channel connections.",
    credentials: [
      { key: "client_key",    label: "Client Key",         placeholder: "aw1234567890",                       isSecret: false, envFallback: "TIKTOK_CLIENT_KEY" },
      { key: "client_secret", label: "Client Secret",      placeholder: "••••••••••••••••",                   isSecret: true,  envFallback: "TIKTOK_CLIENT_SECRET" },
      { key: "redirect_uri",  label: "OAuth Redirect URI", placeholder: "https://yourdomain.com/api/oauth/tiktok/callback", isSecret: false, envFallback: "TIKTOK_REDIRECT_URI" },
    ],
  },
  whatsapp: {
    label: "WhatsApp Business",
    description: "Credentials for WhatsApp Business API messaging.",
    credentials: [
      { key: "business_account_id",   label: "Business Account ID",   placeholder: "1234567890",       isSecret: false, envFallback: "WHATSAPP_BUSINESS_ACCOUNT_ID" },
      { key: "business_phone_number", label: "Business Phone Number", placeholder: "+27 76 000 0000",  isSecret: false, envFallback: "WHATSAPP_BUSINESS_PHONE_NUMBER" },
      { key: "access_token",          label: "Access Token",          placeholder: "EAAxxxxx…",         isSecret: true,  envFallback: "WHATSAPP_ACCESS_TOKEN" },
    ],
  },
};

// ─── Read helpers ─────────────────────────────────────────────────────────────

/** Get a single credential value. DB takes priority; falls back to env. */
export async function getPlatformCredential(
  ownerUserId: string,
  platform: PlatformSlug,
  key: string,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(platformCredentials)
    .where(
      and(
        eq(platformCredentials.ownerUserId, ownerUserId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.credKey, key),
      ),
    )
    .limit(1);

  if (row?.valueEnc) return decryptSecret(row.valueEnc);

  // env fallback
  const def = PLATFORM_DEFS[platform]?.credentials.find((c) => c.key === key);
  if (def?.envFallback) return (env[def.envFallback] as string | undefined) ?? null;

  return null;
}

/** List all credentials for all platforms for this user, including env-backed status. */
export async function listPlatformCredentials(ownerUserId: string) {
  const rows = await db
    .select()
    .from(platformCredentials)
    .where(eq(platformCredentials.ownerUserId, ownerUserId));

  const dbMap = new Map(rows.map((r) => [`${r.platform}:${r.credKey}`, r]));

  const result: Record<PlatformSlug, Record<string, {
    hasValue: boolean;
    isEnvBacked: boolean;
    isSecret: boolean;
    last4: string | null;
    updatedAt: Date | null;
  }>> = { meta: {}, tiktok: {}, whatsapp: {} };

  for (const [slug, def] of Object.entries(PLATFORM_DEFS) as [PlatformSlug, typeof PLATFORM_DEFS[PlatformSlug]][]) {
    for (const cred of def.credentials) {
      const dbRow = dbMap.get(`${slug}:${cred.key}`);
      const envValue = cred.envFallback ? (env[cred.envFallback] as string | undefined) ?? null : null;

      let hasValue = false;
      let isEnvBacked = false;
      let last4: string | null = null;

      if (dbRow?.valueEnc) {
        hasValue = true;
        isEnvBacked = false;
        try {
          const plain = decryptSecret(dbRow.valueEnc);
          last4 = cred.isSecret ? plain.slice(-4) : null;
        } catch {
          last4 = null;
        }
      } else if (envValue) {
        hasValue = true;
        isEnvBacked = true;
        last4 = cred.isSecret ? envValue.slice(-4) : null;
      }

      result[slug][cred.key] = {
        hasValue,
        isEnvBacked,
        isSecret: cred.isSecret,
        last4,
        updatedAt: dbRow?.updatedAt ?? null,
      };
    }
  }

  return result;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

/** Upsert a single credential. Pass null to delete it. */
export async function upsertPlatformCredential(
  ownerUserId: string,
  platform: PlatformSlug,
  key: string,
  value: string | null,
  isSecret = true,
): Promise<void> {
  if (value === null || value.trim() === "") {
    // Delete from DB (env fallback will still apply)
    await db
      .delete(platformCredentials)
      .where(
        and(
          eq(platformCredentials.ownerUserId, ownerUserId),
          eq(platformCredentials.platform, platform),
          eq(platformCredentials.credKey, key),
        ),
      );
    return;
  }

  const valueEnc = encryptSecret(value.trim());
  const existing = await db
    .select({ id: platformCredentials.id })
    .from(platformCredentials)
    .where(
      and(
        eq(platformCredentials.ownerUserId, ownerUserId),
        eq(platformCredentials.platform, platform),
        eq(platformCredentials.credKey, key),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(platformCredentials)
      .set({ valueEnc, isSecret, updatedAt: new Date() })
      .where(eq(platformCredentials.id, existing[0].id));
  } else {
    await db.insert(platformCredentials).values({
      ownerUserId,
      platform,
      credKey: key,
      valueEnc,
      isSecret,
    });
  }
}
