import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Next.js 16: `middleware.ts` is deprecated in favor of `proxy.ts`.
 *
 * IMPORTANT: We intentionally do NOT hard-gate routes here.
 * Route access is handled by the app shell (`src/app/layout.tsx`), which shows
 * the login landing when no user exists.
 *
 * This prevents the `/meta` -> `/?redirect=/meta` loop that made the app look
 * like it was “doing nothing”.
 */
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip internals + static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};



