import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.firstName
          ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
          : null,
        primaryEmail: user.emailAddresses?.[0]?.emailAddress ?? null,
      },
    });
  } catch (error: unknown) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}
