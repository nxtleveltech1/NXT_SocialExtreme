import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { currentUser } from "@clerk/nextjs/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAuth();
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const settings = (user.publicMetadata?.settings as Record<string, unknown>) ?? {};

    return NextResponse.json({
      businessName: settings.businessName ?? "",
      businessEmail: settings.businessEmail ?? user.emailAddresses?.[0]?.emailAddress ?? "",
      businessPhone: settings.businessPhone ?? "",
      businessAddress: settings.businessAddress ?? "",
      businessWebsite: settings.businessWebsite ?? "",
      defaultCurrency: settings.defaultCurrency ?? "ZAR",
      timezone: settings.timezone ?? "Africa/Johannesburg",
      language: settings.language ?? "en",
      notifications: settings.notifications ?? {
        email: true,
        push: true,
        sms: false,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load settings";
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        settings: {
          businessName: body.businessName,
          businessEmail: body.businessEmail,
          businessPhone: body.businessPhone,
          businessAddress: body.businessAddress,
          businessWebsite: body.businessWebsite,
          defaultCurrency: body.defaultCurrency,
          timezone: body.timezone,
          language: body.language,
          notifications: body.notifications,
        },
      },
    });

    return NextResponse.json({ success: true, message: "Settings saved" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save settings";
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
