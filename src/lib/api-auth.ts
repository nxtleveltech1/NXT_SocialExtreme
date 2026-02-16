import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * Require authentication for API routes using Clerk
 * Returns userId if authenticated, throws error if not
 */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return { userId };
}

/**
 * Get the full Clerk user object (use when you need name/email)
 */
export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth(
  handler: (
    user: Awaited<ReturnType<typeof requireAuth>>,
    req: Request
  ) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      const user = await requireAuth();
      return handler(user, req);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      throw error;
    }
  };
}
