import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Minimal no-op proxy to isolate deployment issue.
 * All auth is handled at page level.
 */
export default function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
