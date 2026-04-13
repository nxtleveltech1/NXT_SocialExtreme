import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { auth } from "@clerk/nextjs/server";
import {
  PLATFORM_DEFS,
  listPlatformCredentials,
  upsertPlatformCredential,
  type PlatformSlug,
} from "@/lib/platform-credentials";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const credentials = await listPlatformCredentials(userId);
    return NextResponse.json({ credentials, platforms: PLATFORM_DEFS });
  } catch (error: unknown) {
    console.error("Integrations GET error:", error);
    return NextResponse.json({ error: "Failed to load integration credentials" }, { status: 500 });
  }
}

const updateSchema = z.object({
  platform: z.enum(["meta", "tiktok", "whatsapp"]),
  updates: z.record(z.string(), z.string().nullable()),
});

export async function PUT(req: NextRequest) {
  try {
    await requireAuth();
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = updateSchema.parse(await req.json());
    const { platform, updates } = body;

    const platformDef = PLATFORM_DEFS[platform as PlatformSlug];
    if (!platformDef) {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }

    const credDefs = new Map(platformDef.credentials.map((c) => [c.key, c]));

    for (const [key, value] of Object.entries(updates)) {
      const def = credDefs.get(key);
      if (!def) continue; // ignore unknown keys
      await upsertPlatformCredential(userId, platform as PlatformSlug, key, value, def.isSecret);
    }

    const credentials = await listPlatformCredentials(userId);
    return NextResponse.json({ success: true, credentials });
  } catch (error: unknown) {
    console.error("Integrations PUT error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}
