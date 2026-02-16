/**
 * Input validation utilities for Meta API requests
 */

import { z } from "zod";

export const ChannelIdSchema = z.number().int().positive();
export const AdAccountIdSchema = z.string().regex(/^act_\d+$/, "Invalid ad account ID format");
export const CampaignIdSchema = z.string().regex(/^\d+$/, "Invalid campaign ID format");
export const AdSetIdSchema = z.string().regex(/^\d+$/, "Invalid ad set ID format");
export const AdIdSchema = z.string().regex(/^\d+$/, "Invalid ad ID format");
export const AudienceIdSchema = z.string().regex(/^\d+$/, "Invalid audience ID format");
export const CatalogIdSchema = z.string().regex(/^\d+$/, "Invalid catalog ID format");
export const ProductIdSchema = z.string().regex(/^\d+$/, "Invalid product ID format");
export const PageIdSchema = z.string().regex(/^\d+$/, "Invalid page ID format");
export const PhoneNumberSchema = z.string().regex(/^\+\d{10,15}$/, "Invalid phone number format");
export const UrlSchema = z.string().url("Invalid URL format");

export const CreateCampaignSchema = z.object({
  channelId: ChannelIdSchema,
  adAccountId: AdAccountIdSchema,
  name: z.string().min(1).max(256),
  objective: z.enum([
    "CONVERSIONS",
    "TRAFFIC",
    "ENGAGEMENT",
    "REACH",
    "BRAND_AWARENESS",
    "APP_INSTALLS",
    "VIDEO_VIEWS",
    "LEAD_GENERATION",
    "MESSAGES",
    "CATALOG_SALES",
    "STORE_VISITS",
  ]),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  startTime: z.string().datetime().optional(),
  stopTime: z.string().datetime().optional(),
});

export const CreateAdSetSchema = z.object({
  channelId: ChannelIdSchema,
  adAccountId: AdAccountIdSchema,
  campaignId: CampaignIdSchema,
  name: z.string().min(1).max(256),
  optimizationGoal: z.string().min(1),
  billingEvent: z.string().min(1),
  dailyBudget: z.number().int().positive().optional(),
  lifetimeBudget: z.number().int().positive().optional(),
  targeting: z.record(z.string(), z.any()).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  startTime: z.string().datetime().optional(),
  stopTime: z.string().datetime().optional(),
});

export const CreateAdSchema = z.object({
  channelId: ChannelIdSchema,
  adAccountId: AdAccountIdSchema,
  adSetId: AdSetIdSchema,
  name: z.string().min(1).max(256),
  creative: z.record(z.string(), z.any()),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  trackingSpecs: z.array(z.record(z.string(), z.any())).optional(),
});

export const CreateAudienceSchema = z.object({
  channelId: ChannelIdSchema,
  adAccountId: AdAccountIdSchema,
  name: z.string().min(1).max(256),
  description: z.string().max(500).optional(),
  subtype: z.enum(["CUSTOM", "LOOKALIKE", "WEBSITE", "APP", "OFFLINE"]).optional(),
  customerFileSource: z
    .enum(["USER_PROVIDED_ONLY", "PARTNER_PROVIDED_ONLY", "BOTH_USER_AND_PARTNER_PROVIDED"])
    .optional(),
});

export const UpdateInventorySchema = z.object({
  channelId: ChannelIdSchema,
  catalogId: CatalogIdSchema,
  updates: z.array(
    z.object({
      retailer_id: z.string().min(1),
      inventory: z.number().int().min(0),
    })
  ).min(1),
});

export const BroadcastMessageSchema = z.object({
  channelId: ChannelIdSchema,
  recipients: z.array(PhoneNumberSchema).min(1).max(1000),
  message: z.string().optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  templateParams: z.record(z.string(), z.any()).optional(),
  mediaUrl: UrlSchema.optional(),
  mediaType: z.enum(["image", "video", "document", "audio"]).optional(),
});

export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`
      );
    }
    throw error;
  }
}

