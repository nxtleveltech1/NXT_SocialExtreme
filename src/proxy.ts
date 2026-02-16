import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function handleClerkProxy(req: NextRequest): NextResponse | null {
  if (!req.nextUrl.pathname.startsWith("/__clerk")) {
    return null;
  }

  const proxyHeaders = new Headers(req.headers);
  proxyHeaders.set(
    "Clerk-Proxy-Url",
    process.env.NEXT_PUBLIC_CLERK_PROXY_URL || ""
  );
  proxyHeaders.set(
    "Clerk-Secret-Key",
    process.env.CLERK_SECRET_KEY || ""
  );
  proxyHeaders.set(
    "X-Forwarded-For",
    req.headers.get("X-Forwarded-For") || req.headers.get("x-real-ip") || ""
  );

  const proxyUrl = new URL(req.url);
  proxyUrl.host = "frontend-api.clerk.dev";
  proxyUrl.port = "443";
  proxyUrl.protocol = "https";
  proxyUrl.pathname = proxyUrl.pathname.replace("/__clerk", "");

  return NextResponse.rewrite(proxyUrl, {
    request: { headers: proxyHeaders },
  });
}

export default async function middleware(req: NextRequest) {
  const proxyResponse = handleClerkProxy(req);
  if (proxyResponse) {
    return proxyResponse;
  }

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
    "/(api|trpc|__clerk)(.*)",
  ],
};
