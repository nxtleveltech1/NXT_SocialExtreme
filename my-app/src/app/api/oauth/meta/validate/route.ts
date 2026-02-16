import { env } from "@/lib/env";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Pre-flight validation endpoint for Meta OAuth
 * Checks if all required environment variables are configured
 */
export async function GET() {
  const missing: string[] = [];

  if (!env.META_APP_ID) {
    missing.push("META_APP_ID");
  }

  if (!env.META_APP_SECRET) {
    missing.push("META_APP_SECRET");
  }

  if (!env.META_REDIRECT_URI) {
    missing.push("META_REDIRECT_URI");
  }

  if (missing.length > 0) {
    return NextResponse.json({
      valid: false,
      message: `Missing required environment variables: ${missing.join(", ")}`,
      missing,
      hint: "Add these to your .env.local file and restart the development server.",
    });
  }

  // Validate redirect URI format
  try {
    const redirectUrl = new URL(env.META_REDIRECT_URI!);
    if (!redirectUrl.pathname.includes("/api/oauth/meta/callback")) {
      return NextResponse.json({
        valid: false,
        message: "META_REDIRECT_URI should point to /api/oauth/meta/callback",
        hint: `Current value: ${env.META_REDIRECT_URI}`,
      });
    }
  } catch {
    return NextResponse.json({
      valid: false,
      message: "META_REDIRECT_URI is not a valid URL",
      hint: `Current value: ${env.META_REDIRECT_URI}`,
    });
  }

  return NextResponse.json({
    valid: true,
    message: "Meta OAuth is configured correctly",
    appId: env.META_APP_ID,
    redirectUri: env.META_REDIRECT_URI,
  });
}
