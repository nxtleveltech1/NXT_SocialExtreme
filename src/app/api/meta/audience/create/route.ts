import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { channels } from "@/db/schema";
import { eq } from "drizzle-orm";
import { MetaApiClient } from "@/lib/integrations/meta-client";
import { decryptSecret } from "@/lib/crypto";
import { z } from "zod";

const CreateAudienceSchema = z.object({
  channelId: z.number(),
  adAccountId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  subtype: z.enum(["CUSTOM", "LOOKALIKE", "WEBSITE", "APP", "OFFLINE"]).optional(),
  customerFileSource: z.enum(["USER_PROVIDED_ONLY", "PARTNER_PROVIDED_ONLY", "BOTH_USER_AND_PARTNER_PROVIDED"]).optional(),
});

const CreateLookalikeSchema = z.object({
  channelId: z.number(),
  adAccountId: z.string(),
  name: z.string().min(1),
  sourceAudienceId: z.string(),
  country: z.string().length(2),
  ratio: z.number().min(0.01).max(0.10).optional(),
  startingRatio: z.number().min(0.01).max(0.10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if it's a lookalike audience
    if (body.sourceAudienceId) {
      const validated = CreateLookalikeSchema.parse(body);
      
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, validated.channelId))
        .limit(1);

      if (!channel || !channel.accessToken) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }

      const accessToken = decryptSecret(channel.accessToken);
      const client = new MetaApiClient(accessToken);

      const audience = await client.createLookalikeAudience(validated.adAccountId, {
        name: validated.name,
        source_audience_id: validated.sourceAudienceId,
        lookalike_spec: {
          country: validated.country,
          ratio: validated.ratio,
          starting_ratio: validated.startingRatio,
        },
      });

      return NextResponse.json({ audience });
    } else {
      const validated = CreateAudienceSchema.parse(body);
      
      const [channel] = await db
        .select()
        .from(channels)
        .where(eq(channels.id, validated.channelId))
        .limit(1);

      if (!channel || !channel.accessToken) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }

      const accessToken = decryptSecret(channel.accessToken);
      const client = new MetaApiClient(accessToken);

      const audience = await client.createCustomAudience(validated.adAccountId, {
        name: validated.name,
        description: validated.description,
        subtype: validated.subtype || "CUSTOM",
        customer_file_source: validated.customerFileSource || "USER_PROVIDED_ONLY",
      });

      return NextResponse.json({ audience });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating audience:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create audience" },
      { status: 500 }
    );
  }
}

