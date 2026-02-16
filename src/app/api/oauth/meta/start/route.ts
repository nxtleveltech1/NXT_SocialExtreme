import { env } from "@/lib/env";
import { createOAuthState } from "@/lib/oauth/state";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function requireMetaEnv() {
  if (!env.META_APP_ID || !env.META_APP_SECRET || !env.META_REDIRECT_URI) {
    throw new Error(
      "Missing META_APP_ID / META_APP_SECRET / META_REDIRECT_URI. Configure these env vars before connecting Meta."
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    requireMetaEnv();

    const url = new URL(req.url);
    const channelIdRaw = url.searchParams.get("channelId");
    const channelId = Number(channelIdRaw);
    if (!channelIdRaw || !Number.isFinite(channelId)) {
      return NextResponse.json({ error: "Invalid channelId" }, { status: 400 });
    }

    const state = createOAuthState({ channelId, userId: "system", provider: "meta" });

    // Request superset scopes needed for FB Pages + IG Business publishing + insights.
    const scope = [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_engagement",
      "pages_manage_metadata",
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_comments",
      "instagram_manage_insights",
    ].join(",");

    const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
    authUrl.searchParams.set("client_id", env.META_APP_ID!);
    authUrl.searchParams.set("redirect_uri", env.META_REDIRECT_URI!);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("scope", scope);

    return NextResponse.redirect(authUrl.toString());
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to start Meta OAuth";
    console.error("Meta OAuth start error:", errorMsg);
    
    // If accessed via browser redirect, return HTML error page
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("text/html")) {
      const missingVars = [];
      if (!env.META_APP_ID) missingVars.push("META_APP_ID");
      if (!env.META_APP_SECRET) missingVars.push("META_APP_SECRET");
      if (!env.META_REDIRECT_URI) missingVars.push("META_REDIRECT_URI");
      
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <title>Meta API Keys Required</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; max-width: 700px; margin: 0 auto; line-height: 1.6; }
    h1 { color: #dc2626; margin-top: 0; }
    .error { background: #fee2e2; border: 2px solid #ef4444; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
    .info { background: #dbeafe; border: 2px solid #3b82f6; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; }
    .code-block { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-family: 'Courier New', monospace; font-size: 0.9em; overflow-x: auto; }
    code { background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; margin-top: 1rem; text-decoration: none; }
    .button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <h1>⚠️ Meta API Keys Required</h1>
  
  <div class="error">
    <strong>Missing Environment Variables:</strong>
    <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
      ${missingVars.map(v => `<li><code>${v}</code></li>`).join("")}
    </ul>
  </div>

  <div class="info">
    <strong>You have a Meta API key? Great!</strong><br>
    Add these to your <code>.env.local</code> file in the project root:
  </div>

  <div class="code-block">
META_APP_ID="your_app_id_here"<br>
META_APP_SECRET="your_app_secret_here"<br>
META_REDIRECT_URI="http://localhost:3000/api/oauth/meta/callback"
  </div>

  <p><strong>Where to find these:</strong></p>
  <ol>
    <li>Go to <a href="https://developers.facebook.com/apps/" target="_blank">developers.facebook.com/apps/</a></li>
    <li>Select your app (or create one if needed)</li>
    <li>Go to Settings → Basic</li>
    <li>Copy <strong>App ID</strong> → that's your <code>META_APP_ID</code></li>
    <li>Click "Show" next to <strong>App Secret</strong> → that's your <code>META_APP_SECRET</code></li>
    <li>Add the redirect URI above to your app's "Valid OAuth Redirect URIs"</li>
  </ol>

  <p style="color: #6b7280; font-size: 0.9em; margin-top: 2rem;">
    <strong>After adding:</strong> Restart your dev server (<code>bun dev</code>) and try connecting again.
  </p>

  <a href="/channels" class="button">← Back to Channels</a>
</body>
</html>`,
        { status: 500, headers: { "Content-Type": "text/html" } }
      );
    }
    
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}



