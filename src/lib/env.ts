type NonEmptyString = string & { __nonEmpty: true };

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function requireEnv(name: string): NonEmptyString {
  const value = getEnv(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to your .env.local (or Vercel project env).`
    );
  }
  return value as NonEmptyString;
}

export const env = {
  // Core
  NODE_ENV: (process.env.NODE_ENV ?? "development") as "development" | "test" | "production",
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Security — optional at startup; required only when encrypting tokens
  TOKEN_ENCRYPTION_KEY: getEnv("TOKEN_ENCRYPTION_KEY"),
  JOB_RUNNER_SECRET: getEnv("JOB_RUNNER_SECRET"),

  // Providers (added in later phases; optional for local UI work)
  META_APP_ID: getEnv("META_APP_ID"),
  META_APP_SECRET: getEnv("META_APP_SECRET"),
  META_REDIRECT_URI: getEnv("META_REDIRECT_URI"),
  META_WEBHOOK_VERIFY_TOKEN: getEnv("META_WEBHOOK_VERIFY_TOKEN"),

  // WhatsApp Business API (Meta - Optional)
  WHATSAPP_BUSINESS_PHONE_NUMBER: getEnv("WHATSAPP_BUSINESS_PHONE_NUMBER") ?? "+27 76 147 8369",
  WHATSAPP_BUSINESS_ACCOUNT_ID: getEnv("WHATSAPP_BUSINESS_ACCOUNT_ID"),
  WHATSAPP_ACCESS_TOKEN: getEnv("WHATSAPP_ACCESS_TOKEN"),

  // WhatsApp Cloud API (Direct Meta API - Alternative)
  WHATSAPP_CLOUD_API_PHONE_NUMBER_ID: getEnv("WHATSAPP_CLOUD_API_PHONE_NUMBER_ID"),
  WHATSAPP_CLOUD_API_ACCESS_TOKEN: getEnv("WHATSAPP_CLOUD_API_ACCESS_TOKEN"),
  WHATSAPP_CLOUD_API_APP_ID: getEnv("WHATSAPP_CLOUD_API_APP_ID"),
  WHATSAPP_CLOUD_API_APP_SECRET: getEnv("WHATSAPP_CLOUD_API_APP_SECRET"),

  // Twilio WhatsApp API (Recommended Alternative)
  TWILIO_ACCOUNT_SID: getEnv("TWILIO_ACCOUNT_SID"),
  TWILIO_AUTH_TOKEN: getEnv("TWILIO_AUTH_TOKEN"),
  TWILIO_WHATSAPP_FROM: getEnv("TWILIO_WHATSAPP_FROM"),

  // MessageBird WhatsApp API (Alternative)
  MESSAGEBIRD_API_KEY: getEnv("MESSAGEBIRD_API_KEY"),
  MESSAGEBIRD_CHANNEL_ID: getEnv("MESSAGEBIRD_CHANNEL_ID"),

  // Third-Party WhatsApp Provider
  WHATSAPP_PROVIDER: getEnv("WHATSAPP_PROVIDER"),
  WHATSAPP_PROVIDER_API_KEY: getEnv("WHATSAPP_PROVIDER_API_KEY"),
  WHATSAPP_PROVIDER_API_URL: getEnv("WHATSAPP_PROVIDER_API_URL"),

  TIKTOK_CLIENT_KEY: getEnv("TIKTOK_CLIENT_KEY"),
  TIKTOK_CLIENT_SECRET: getEnv("TIKTOK_CLIENT_SECRET"),
  TIKTOK_REDIRECT_URI: getEnv("TIKTOK_REDIRECT_URI"),

  // Clerk Auth — Clerk SDK reads these directly from process.env;
  // we expose them here for reference but do not crash on missing.
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: getEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  CLERK_SECRET_KEY: getEnv("CLERK_SECRET_KEY"),
} as const;



