#!/usr/bin/env node
/**
 * Meta/WhatsApp MCP Server for Cursor
 * Provides tools for WhatsApp messaging, Facebook Pages, Instagram, Ads, and Analytics
 * Uses stdio transport for Cursor integration
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function metaRequest<T>(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith("http") ? endpoint : `${FB_GRAPH_URL}${endpoint}`;
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${sep}access_token=${accessToken}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = (data as any)?.error?.message ?? res.statusText;
    throw new Error(`Meta API ${res.status}: ${msg}`);
  }

  return data as T;
}

function getToken(): string {
  const token =
    process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN ??
    process.env.WHATSAPP_ACCESS_TOKEN ??
    process.env.META_ACCESS_TOKEN;
  if (!token) throw new Error("No Meta access token found in environment");
  return token;
}

function getPhoneNumberId(): string {
  const id =
    process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID ??
    process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!id) throw new Error("No WhatsApp phone number ID found in environment");
  return id;
}

function getAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new Error("META_AD_ACCOUNT_ID not set");
  return id;
}

function getBusinessId(): string {
  const id = process.env.META_BUSINESS_ID;
  if (!id) throw new Error("META_BUSINESS_ID not set");
  return id;
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "meta-whatsapp",
  version: "1.0.0",
});

// ==================== WHATSAPP TOOLS ====================

server.tool(
  "whatsapp_send_text",
  "Send a text message via WhatsApp Cloud API",
  {
    to: z.string().describe("Recipient phone number with country code (e.g. 27821234567)"),
    message: z.string().describe("Text message body"),
  },
  async ({ to, message }) => {
    const token = getToken();
    const phoneNumberId = getPhoneNumberId();
    const result = await metaRequest<any>(token, `/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "whatsapp_send_template",
  "Send a WhatsApp template message (for cold outreach / marketing)",
  {
    to: z.string().describe("Recipient phone number"),
    template_name: z.string().describe("Approved template name"),
    language_code: z.string().default("en").describe("Template language code"),
    parameters: z.array(z.string()).optional().describe("Template body parameter values"),
  },
  async ({ to, template_name, language_code, parameters }) => {
    const token = getToken();
    const phoneNumberId = getPhoneNumberId();
    const components = parameters?.length
      ? [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }]
      : undefined;

    const result = await metaRequest<any>(token, `/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template_name,
          language: { code: language_code },
          ...(components && { components }),
        },
      }),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "whatsapp_send_media",
  "Send a media message (image, video, document, audio) via WhatsApp",
  {
    to: z.string().describe("Recipient phone number"),
    media_type: z.enum(["image", "video", "document", "audio"]).describe("Media type"),
    url: z.string().url().describe("Public URL of the media file"),
    caption: z.string().optional().describe("Caption for image/video or filename for document"),
  },
  async ({ to, media_type, url, caption }) => {
    const token = getToken();
    const phoneNumberId = getPhoneNumberId();

    const mediaPayload: Record<string, any> = { link: url };
    if (media_type === "image" || media_type === "video") {
      if (caption) mediaPayload.caption = caption;
    } else if (media_type === "document") {
      if (caption) mediaPayload.filename = caption;
    }

    const result = await metaRequest<any>(token, `/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: media_type,
        [media_type]: mediaPayload,
      }),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "whatsapp_send_interactive",
  "Send an interactive (button or list) message via WhatsApp",
  {
    to: z.string().describe("Recipient phone number"),
    interactive: z.string().describe("Interactive payload as JSON string"),
  },
  async ({ to, interactive }) => {
    const token = getToken();
    const phoneNumberId = getPhoneNumberId();
    const result = await metaRequest<any>(token, `/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: JSON.parse(interactive),
      }),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "whatsapp_get_templates",
  "List approved WhatsApp message templates for the business account",
  {
    limit: z.number().default(20).describe("Max templates to return"),
  },
  async ({ limit }) => {
    const token = getToken();
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    if (!wabaId) throw new Error("WHATSAPP_BUSINESS_ACCOUNT_ID not set");

    const result = await metaRequest<any>(
      token,
      `/${wabaId}/message_templates?fields=name,status,language,category,components&limit=${limit}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ==================== FACEBOOK PAGE TOOLS ====================

server.tool(
  "facebook_get_page",
  "Get Facebook Page information",
  {
    page_id: z.string().describe("Facebook Page ID"),
  },
  async ({ page_id }) => {
    const token = getToken();
    const result = await metaRequest<any>(
      token,
      `/${page_id}?fields=id,name,category,followers_count,fan_count,picture,about`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "facebook_get_posts",
  "Get recent Facebook Page posts with engagement metrics",
  {
    page_id: z.string().describe("Facebook Page ID"),
    limit: z.number().default(10).describe("Number of posts"),
  },
  async ({ page_id, limit }) => {
    const token = getToken();
    const result = await metaRequest<any>(
      token,
      `/${page_id}/posts?fields=id,message,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=${limit}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "facebook_create_post",
  "Create a new post on a Facebook Page",
  {
    page_id: z.string().describe("Facebook Page ID"),
    message: z.string().describe("Post message text"),
    link: z.string().url().optional().describe("URL to attach"),
  },
  async ({ page_id, message, link }) => {
    const token = getToken();
    const body: Record<string, string> = { message };
    if (link) body.link = link;

    const result = await metaRequest<any>(token, `/${page_id}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...body, access_token: token }).toString(),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "facebook_get_page_insights",
  "Get Page analytics (fans, impressions, engagement)",
  {
    page_id: z.string().describe("Facebook Page ID"),
    metric: z.string().default("page_fans,page_impressions,page_engaged_users").describe("Comma-separated metrics"),
    period: z.enum(["day", "week", "days_28"]).default("day"),
    days_back: z.number().default(7).describe("Number of days to look back"),
  },
  async ({ page_id, metric, period, days_back }) => {
    const token = getToken();
    const until = Math.floor(Date.now() / 1000);
    const since = until - days_back * 86400;
    const result = await metaRequest<any>(
      token,
      `/${page_id}/insights?metric=${metric}&period=${period}&since=${since}&until=${until}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ==================== INSTAGRAM TOOLS ====================

server.tool(
  "instagram_get_account",
  "Get Instagram Business account info",
  {
    ig_user_id: z.string().describe("Instagram Business user ID"),
  },
  async ({ ig_user_id }) => {
    const token = getToken();
    const result = await metaRequest<any>(
      token,
      `/${ig_user_id}?fields=id,username,account_type,followers_count,follows_count,media_count,profile_picture_url`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "instagram_get_media",
  "Get recent Instagram posts with engagement",
  {
    ig_user_id: z.string().describe("Instagram Business user ID"),
    limit: z.number().default(10),
  },
  async ({ ig_user_id, limit }) => {
    const token = getToken();
    const result = await metaRequest<any>(
      token,
      `/${ig_user_id}/media?fields=id,caption,media_url,permalink,media_type,timestamp,like_count,comments_count&limit=${limit}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ==================== ADS TOOLS ====================

server.tool(
  "ads_get_campaigns",
  "List ad campaigns for the ad account",
  {
    limit: z.number().default(25),
  },
  async ({ limit }) => {
    const token = getToken();
    const adAccountId = getAdAccountId();
    const result = await metaRequest<any>(
      token,
      `/act_${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time&limit=${limit}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "ads_get_insights",
  "Get ad performance insights (impressions, clicks, spend, conversions)",
  {
    level: z.enum(["account", "campaign", "adset", "ad"]).default("campaign"),
    since: z.string().optional().describe("Start date YYYY-MM-DD"),
    until: z.string().optional().describe("End date YYYY-MM-DD"),
  },
  async ({ level, since, until }) => {
    const token = getToken();
    const adAccountId = getAdAccountId();
    const fields = "campaign_name,impressions,clicks,spend,reach,cpm,cpc,ctr,actions";
    let endpoint = `/act_${adAccountId}/insights?level=${level}&fields=${fields}`;
    if (since && until) {
      endpoint += `&time_range={"since":"${since}","until":"${until}"}`;
    }
    const result = await metaRequest<any>(token, endpoint);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "ads_create_campaign",
  "Create a new ad campaign",
  {
    name: z.string().describe("Campaign name"),
    objective: z.string().describe("Campaign objective (CONVERSIONS, TRAFFIC, ENGAGEMENT, etc.)"),
    daily_budget: z.number().optional().describe("Daily budget in cents"),
    status: z.enum(["ACTIVE", "PAUSED"]).default("PAUSED"),
  },
  async ({ name, objective, daily_budget, status }) => {
    const token = getToken();
    const adAccountId = getAdAccountId();
    const result = await metaRequest<any>(token, `/act_${adAccountId}/campaigns`, {
      method: "POST",
      body: JSON.stringify({
        name,
        objective,
        status,
        ...(daily_budget && { daily_budget }),
      }),
    });
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ==================== COMMERCE TOOLS ====================

server.tool(
  "commerce_get_catalogs",
  "List product catalogs for the business",
  {},
  async () => {
    const token = getToken();
    const businessId = getBusinessId();
    const result = await metaRequest<any>(
      token,
      `/${businessId}/owned_product_catalogs?fields=id,name,vertical,product_count`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

server.tool(
  "commerce_get_products",
  "List products in a catalog",
  {
    catalog_id: z.string().describe("Product catalog ID"),
    limit: z.number().default(25),
  },
  async ({ catalog_id, limit }) => {
    const token = getToken();
    const result = await metaRequest<any>(
      token,
      `/${catalog_id}/products?fields=id,name,description,price,currency,availability,image_url&limit=${limit}`
    );
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    };
  }
);

// ==================== BROADCAST TOOL ====================

server.tool(
  "whatsapp_broadcast",
  "Send a WhatsApp template or text to multiple recipients",
  {
    recipients: z.array(z.string()).describe("Array of phone numbers"),
    template_name: z.string().optional().describe("Template name (for marketing)"),
    language_code: z.string().default("en"),
    message: z.string().optional().describe("Text message (for session replies only)"),
    parameters: z.array(z.string()).optional().describe("Template body parameter values"),
  },
  async ({ recipients, template_name, language_code, message, parameters }) => {
    const token = getToken();
    const phoneNumberId = getPhoneNumberId();

    const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = [];

    for (const to of recipients) {
      try {
        let result: any;
        if (template_name) {
          const components = parameters?.length
            ? [{ type: "body", parameters: parameters.map((p) => ({ type: "text", text: p })) }]
            : undefined;
          result = await metaRequest<any>(token, `/${phoneNumberId}/messages`, {
            method: "POST",
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "template",
              template: {
                name: template_name,
                language: { code: language_code },
                ...(components && { components }),
              },
            }),
          });
        } else if (message) {
          result = await metaRequest<any>(token, `/${phoneNumberId}/messages`, {
            method: "POST",
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              type: "text",
              text: { body: message },
            }),
          });
        } else {
          results.push({ to, success: false, error: "No template or message provided" });
          continue;
        }
        results.push({ to, success: true, messageId: result.messages?.[0]?.id });
      } catch (err: any) {
        results.push({ to, success: false, error: err.message });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ sent, failed, total: recipients.length, results }, null, 2),
        },
      ],
    };
  }
);

// ==================== START ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP Server failed:", err);
  process.exit(1);
});
