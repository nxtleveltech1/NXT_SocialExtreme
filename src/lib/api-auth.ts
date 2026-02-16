import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

/**
 * Require authentication for API routes using Stack Auth
 * Returns user if authenticated, throws error if not
 */
export async function requireAuth() {
  const user = await stackServerApp.getUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth(handler: (user: Awaited<ReturnType<typeof requireAuth>>, req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      const user = await requireAuth();
      return handler(user, req);
    } catch (error: any) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      throw error;
    }
  };
}

