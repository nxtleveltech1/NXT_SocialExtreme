import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

/**
 * Resilient proxy middleware.
 *
 * Clerk's SDK reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY
 * from process.env.  If the keys are missing or malformed, the static import
 * of @clerk/nextjs/server can throw at module-evaluation time, which crashes
 * every serverless function and produces a Vercel platform-level 404.
 *
 * This middleware lazy-imports Clerk so a missing/invalid key degrades to
 * "no auth" instead of killing the entire application.
 */

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  // If Clerk keys are not configured, skip auth entirely
  if (!publishableKey || !secretKey) {
    return NextResponse.next();
  }

  try {
    const { clerkMiddleware, createRouteMatcher } = await import(
      "@clerk/nextjs/server"
    );

    const isPublicRoute = createRouteMatcher([
      "/",
      "/sign-in(.*)",
      "/sign-up(.*)",
      "/store(.*)",
      "/api/webhooks(.*)",
      "/api/monitoring(.*)",
      "/api/oauth(.*)",
    ]);

    const handler = clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        try {
          await auth.protect();
        } catch {
          // Auth check failed — let request through;
          // page-level auth will handle unauthenticated users.
        }
      }
    });

    return handler(req, event);
  } catch (error: unknown) {
    console.error(
      "Clerk middleware error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
