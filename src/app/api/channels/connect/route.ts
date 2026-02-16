import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {

    // Password-based “connections” are not compliant with Meta/TikTok platform policies.
    // Use official OAuth via /api/oauth/*.
    return NextResponse.json(
      {
        error:
          "This endpoint is deprecated. Use OAuth connection flow (Meta/TikTok) via /api/oauth/*.",
      },
      { status: 410 }
    );

  } catch (error: unknown) {
    console.error("Connection Error:", error);
    return NextResponse.json(
      { error: "Failed to connect platform" },
      { status: 500 }
    );
  }
}
