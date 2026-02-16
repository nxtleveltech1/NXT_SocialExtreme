import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default async function middleware(req: NextRequest) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

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
          // Auth failed — let through
        }
      }
    });

    return handler(req, {} as any);
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
