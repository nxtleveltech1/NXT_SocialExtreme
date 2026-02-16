import { NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({ 
      user: {
        id: user.id,
        displayName: user.displayName,
        primaryEmail: user.primaryEmail,
      }
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user" },
      { status: 500 }
    );
  }
}

