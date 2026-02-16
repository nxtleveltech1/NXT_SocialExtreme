/**
 * Campaign Management API
 * POST - Create campaign | Execute campaign | Sync templates
 * GET  - List campaigns | Get campaign stats
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { broadcastCampaigns, messageTemplates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import {
  createCampaign,
  executeCampaign,
  getCampaign,
  getCampaignDeliveryStats,
  syncWhatsAppTemplates,
} from "@/lib/campaigns/broadcast-engine";

// ---------------------------------------------------------------------------
// GET — list campaigns or get single campaign with stats
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const campaignId = url.searchParams.get("id");
    const action = url.searchParams.get("action");

    if (campaignId) {
      const campaign = await getCampaign(parseInt(campaignId));

      if (action === "stats") {
        const stats = await getCampaignDeliveryStats(parseInt(campaignId));
        return NextResponse.json({ campaign, stats });
      }

      return NextResponse.json(campaign);
    }

    // List all campaigns
    const campaigns = await db
      .select()
      .from(broadcastCampaigns)
      .orderBy(desc(broadcastCampaigns.createdAt))
      .limit(50);

    return NextResponse.json({ campaigns });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch campaigns";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — create, execute, or sync templates
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  action: z.literal("create"),
  channelId: z.number(),
  name: z.string().min(1),
  templateId: z.number().optional(),
  recipients: z.array(z.string()),
  scheduledAt: z.string().datetime().optional(),
  customMessage: z.string().optional(),
});

const ExecuteSchema = z.object({
  action: z.literal("execute"),
  campaignId: z.number(),
  templateParams: z.record(z.string(), z.string()).optional(),
  customMessage: z.string().optional(),
});

const SyncTemplatesSchema = z.object({
  action: z.literal("sync_templates"),
  channelId: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;

    // Create campaign
    if (action === "create") {
      const validated = CreateSchema.parse(body);
      const id = await createCampaign({
        ...validated,
        scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : undefined,
      });
      return NextResponse.json({ success: true, campaignId: id });
    }

    // Execute campaign
    if (action === "execute") {
      const validated = ExecuteSchema.parse(body);
      const result = await executeCampaign(validated.campaignId, {
        templateParams: validated.templateParams,
        customMessage: validated.customMessage,
      });
      return NextResponse.json(result);
    }

    // Sync templates from Meta
    if (action === "sync_templates") {
      const validated = SyncTemplatesSchema.parse(body);
      const count = await syncWhatsAppTemplates(validated.channelId);
      return NextResponse.json({ success: true, templatesSynced: count });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Campaign operation failed";
    console.error("Campaign API error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
