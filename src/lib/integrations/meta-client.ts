/**
 * Comprehensive Meta Platform API Client
 * Handles Facebook Pages, Instagram, WhatsApp, Marketing API, Analytics, Commerce, and more
 */

const FB_GRAPH_URL = "https://graph.facebook.com/v19.0";
const WHATSAPP_API_URL = "https://graph.facebook.com/v19.0";

export interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
  };
}

export class MetaApiClient {
  private accessToken: string;
  private baseUrl: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.baseUrl = FB_GRAPH_URL;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    const urlWithToken = url.includes("?")
      ? `${url}&access_token=${this.accessToken}`
      : `${url}?access_token=${this.accessToken}`;

    const response = await fetch(urlWithToken, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as MetaApiError;
      const errorMessage = error.error?.message || response.statusText;
      const errorCode = error.error?.code || response.status;
      
      // Handle rate limiting
      if (errorCode === 4 || errorCode === 17) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
          throw new Error(
            `Rate limit exceeded. Retry after ${retryAfter} seconds. ${errorMessage}`
          );
        }
      }

      // Handle token errors
      if (errorCode === 190 || error.error?.type === "OAuthException") {
        throw new Error(
          `Authentication failed. Please reconnect your account. ${errorMessage}`
        );
      }

      throw new Error(
        `Meta API Error (${errorCode}): ${errorMessage}`
      );
    }

    return data as T;
  }

  // ==================== FACEBOOK PAGES API ====================

  /**
   * Get Page information
   */
  async getPage(pageId: string) {
    return this.request<{
      id: string;
      name: string;
      category: string;
      followers_count?: number;
      fan_count?: number;
      picture?: { data: { url: string } };
    }>(`/${pageId}?fields=id,name,category,followers_count,fan_count,picture`);
  }

  /**
   * Get Page posts
   */
  async getPagePosts(pageId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        message?: string;
        story?: string;
        created_time: string;
        full_picture?: string;
        permalink_url?: string;
        shares?: { count: number };
        likes?: { summary: { total_count: number } };
        comments?: { summary: { total_count: number } };
      }>;
      paging?: { next?: string; previous?: string };
    }>(`/${pageId}/posts?fields=id,message,story,created_time,full_picture,permalink_url,shares,likes.summary(true),comments.summary(true)&limit=${limit}`);
  }

  /**
   * Create a post on Page
   */
  async createPagePost(pageId: string, params: {
    message?: string;
    link?: string;
    url?: string;
    attached_media?: Array<{ media_fbid: string }>;
  }) {
    const searchParams: Record<string, string> = {
      access_token: this.accessToken,
      ...(params.message && { message: params.message }),
      ...(params.link && { link: params.link }),
      ...(params.url && { url: params.url }),
    };
    if (params.attached_media) {
      searchParams.attached_media = JSON.stringify(params.attached_media);
    }
    const body = new URLSearchParams(searchParams);

    return this.request<{ id: string }>(`/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }

  /**
   * Get Page conversations/messages
   */
  async getPageConversations(pageId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        snippet?: string;
        updated_time: string;
        participants?: { data: Array<{ name: string; id: string }> };
        unread_count?: number;
      }>;
    }>(`/${pageId}/conversations?fields=id,snippet,updated_time,participants,unread_count&limit=${limit}`);
  }

  /**
   * Send a message via Messenger
   */
  async sendMessage(recipientId: string, message: string, pageId?: string) {
    const targetId = pageId || "me";
    return this.request<{ recipient_id: string; message_id: string }>(
      `/${targetId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: message },
        }),
      }
    );
  }

  /**
   * Get post comments
   */
  async getPostComments(postId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        message: string;
        from?: { name: string; id: string };
        created_time: string;
      }>;
    }>(`/${postId}/comments?fields=id,message,from,created_time&limit=${limit}`);
  }

  /**
   * Reply to a comment
   */
  async replyToComment(commentId: string, message: string) {
    return this.request<{ id: string }>(`/${commentId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  // ==================== INSTAGRAM API ====================

  /**
   * Get Instagram Business account info
   */
  async getInstagramAccount(igUserId: string) {
    return this.request<{
      id: string;
      username: string;
      account_type: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
      profile_picture_url?: string;
    }>(`/${igUserId}?fields=id,username,account_type,followers_count,follows_count,media_count,profile_picture_url`);
  }

  /**
   * Get Instagram media
   */
  async getInstagramMedia(igUserId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        caption?: string;
        media_url: string;
        permalink: string;
        media_type: string;
        timestamp: string;
        like_count?: number;
        comments_count?: number;
      }>;
    }>(`/${igUserId}/media?fields=id,caption,media_url,permalink,media_type,timestamp,like_count,comments_count&limit=${limit}`);
  }

  /**
   * Create Instagram media container
   */
  async createInstagramMediaContainer(
    igUserId: string,
    params: {
      image_url?: string;
      video_url?: string;
      caption: string;
      media_type?: "IMAGE" | "REELS" | "CAROUSEL";
      location_id?: string;
    }
  ) {
    const body = new URLSearchParams({
      access_token: this.accessToken,
      caption: params.caption,
      ...(params.image_url && { image_url: params.image_url }),
      ...(params.video_url && { video_url: params.video_url }),
      ...(params.media_type && { media_type: params.media_type }),
      ...(params.location_id && { location_id: params.location_id }),
    });

    return this.request<{ id: string }>(`/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  }

  /**
   * Publish Instagram media container
   */
  async publishInstagramMedia(igUserId: string, creationId: string) {
    return this.request<{ id: string }>(`/${igUserId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: this.accessToken,
      }).toString(),
    });
  }

  /**
   * Get Instagram media comments
   */
  async getInstagramComments(mediaId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        text: string;
        username?: string;
        timestamp: string;
      }>;
    }>(`/${mediaId}/comments?fields=id,text,username,timestamp&limit=${limit}`);
  }

  // ==================== WHATSAPP BUSINESS API ====================

  /**
   * Send WhatsApp text message
   */
  async sendWhatsAppMessage(
    phoneNumberId: string,
    to: string,
    message: string
  ) {
    return this.request<{
      messaging_product: string;
      contacts: Array<{ input: string; wa_id: string }>;
      messages: Array<{ id: string }>;
    }>(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      }),
    });
  }

  /**
   * Send WhatsApp Flow message
   */
  async sendWhatsAppFlow(
    phoneNumberId: string,
    to: string,
    params: {
      header?: string;
      body: string;
      footer?: string;
      flow_id: string;
      flow_cta: string;
      flow_token?: string;
      flow_action?: "navigate" | "data_exchange";
      flow_action_payload?: Record<string, any>;
    }
  ) {
    return this.request<{
      messaging_product: string;
      messages: Array<{ id: string }>;
    }>(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
          type: "flow",
          header: params.header ? { type: "text", text: params.header } : undefined,
          body: { text: params.body },
          footer: params.footer ? { text: params.footer } : undefined,
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_token: params.flow_token || `token_${Date.now()}`,
              flow_id: params.flow_id,
              flow_cta: params.flow_cta,
              flow_action: params.flow_action || "navigate",
              flow_action_payload: params.flow_action_payload,
            },
          },
        },
      }),
    });
  }

  /**
   * Send WhatsApp Interactive (Button/List) message
   */
  async sendWhatsAppInteractive(
    phoneNumberId: string,
    to: string,
    interactive: any
  ) {
    return this.request<{
      messaging_product: string;
      messages: Array<{ id: string }>;
    }>(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive,
      }),
    });
  }

  /**
   * Send WhatsApp template message
   */
  async sendWhatsAppTemplate(
    phoneNumberId: string,
    to: string,
    templateName: string,
    languageCode: string,
    components?: Array<{
      type: "header" | "body" | "button";
      parameters: Array<{ type: "text" | "image" | "video" | "document"; text?: string; image?: { link: string }; video?: { link: string }; document?: { link: string } }>;
    }>
  ) {
    return this.request<{
      messaging_product: string;
      contacts: Array<{ input: string; wa_id: string }>;
      messages: Array<{ id: string }>;
    }>(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components && { components }),
        },
      }),
    });
  }

  /**
   * Send WhatsApp media (image, video, document)
   */
  async sendWhatsAppMedia(
    phoneNumberId: string,
    to: string,
    type: "image" | "video" | "document" | "audio",
    url: string,
    caption?: string
  ) {
    return this.request<{
      messaging_product: string;
      contacts: Array<{ input: string; wa_id: string }>;
      messages: Array<{ id: string }>;
    }>(`/${phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type,
        [type]: {
          ...(type === "image" || type === "video" ? { link: url, ...(caption && { caption }) } : {}),
          ...(type === "document" ? { link: url, filename: caption } : {}),
          ...(type === "audio" ? { link: url } : {}),
        },
      }),
    });
  }

  /**
   * Get WhatsApp message status
   */
  async getWhatsAppMessageStatus(phoneNumberId: string, messageId: string) {
    // Note: Status is typically received via webhooks, but this can be used for verification
    return this.request(`/${messageId}`);
  }

  // ==================== MARKETING API ====================

  /**
   * Get ad accounts
   */
  async getAdAccounts(userId = "me") {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        account_id: string;
        currency: string;
        timezone_name: string;
      }>;
    }>(`/${userId}/adaccounts?fields=id,name,account_id,currency,timezone_name`);
  }

  /**
   * Create ad campaign
   */
  async createCampaign(
    adAccountId: string,
    params: {
      name: string;
      objective: string; // CONVERSIONS, TRAFFIC, ENGAGEMENT, etc.
      status?: "ACTIVE" | "PAUSED";
      daily_budget?: number;
      lifetime_budget?: number;
      start_time?: string;
      stop_time?: string;
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/campaigns`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        objective: params.objective,
        status: params.status || "PAUSED",
        ...(params.daily_budget && { daily_budget: params.daily_budget }),
        ...(params.lifetime_budget && { lifetime_budget: params.lifetime_budget }),
        ...(params.start_time && { start_time: params.start_time }),
        ...(params.stop_time && { stop_time: params.stop_time }),
      }),
    });
  }

  /**
   * Get campaigns
   */
  async getCampaigns(adAccountId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        objective: string;
        status: string;
        daily_budget?: number;
        lifetime_budget?: number;
        created_time: string;
      }>;
    }>(`/act_${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,created_time&limit=${limit}`);
  }

  /**
   * Create ad set
   */
  async createAdSet(
    adAccountId: string,
    params: {
      campaign_id: string;
      name: string;
      optimization_goal: string;
      billing_event: string;
      bid_amount?: number;
      daily_budget?: number;
      lifetime_budget?: number;
      targeting: Record<string, any>;
      status?: "ACTIVE" | "PAUSED";
      start_time?: string;
      stop_time?: string;
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/adsets`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        campaign_id: params.campaign_id,
        optimization_goal: params.optimization_goal,
        billing_event: params.billing_event,
        ...(params.bid_amount && { bid_amount: params.bid_amount }),
        ...(params.daily_budget && { daily_budget: params.daily_budget }),
        ...(params.lifetime_budget && { lifetime_budget: params.lifetime_budget }),
        targeting: params.targeting,
        status: params.status || "PAUSED",
        ...(params.start_time && { start_time: params.start_time }),
        ...(params.stop_time && { stop_time: params.stop_time }),
      }),
    });
  }

  /**
   * Get ad sets
   */
  async getAdSets(adAccountId: string, campaignId?: string, limit = 25) {
    const endpoint = campaignId
      ? `/act_${adAccountId}/adsets?campaign_id=${campaignId}`
      : `/act_${adAccountId}/adsets`;
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        campaign_id: string;
        optimization_goal: string;
        status: string;
        daily_budget?: number;
        lifetime_budget?: number;
        targeting?: Record<string, any>;
        billing_event?: string;
        bid_amount?: number;
      }>;
    }>(`${endpoint}&fields=id,name,campaign_id,optimization_goal,status,daily_budget,lifetime_budget,targeting,billing_event,bid_amount&limit=${limit}`);
  }

  /**
   * Update ad set
   */
  async updateAdSet(adSetId: string, updates: Record<string, any>) {
    return this.request<{ success: boolean }>(`/${adSetId}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete ad set
   */
  async deleteAdSet(adSetId: string) {
    return this.request<{ success: boolean }>(`/${adSetId}`, {
      method: "DELETE",
    });
  }

  /**
   * Create ad
   */
  async createAd(
    adAccountId: string,
    params: {
      adset_id: string;
      name: string;
      creative: {
        object_story_spec?: Record<string, any>;
        object_story_id?: string;
      };
      status?: "ACTIVE" | "PAUSED";
      tracking_specs?: Array<Record<string, any>>;
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/ads`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        adset_id: params.adset_id,
        creative: params.creative,
        status: params.status || "PAUSED",
        ...(params.tracking_specs && { tracking_specs: params.tracking_specs }),
      }),
    });
  }

  /**
   * Get ads
   */
  async getAds(adAccountId: string, adSetId?: string, limit = 25) {
    const endpoint = adSetId
      ? `/act_${adAccountId}/ads?adset_id=${adSetId}`
      : `/act_${adAccountId}/ads`;
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        adset_id: string;
        status: string;
        creative: Record<string, any>;
        tracking_specs?: Array<Record<string, any>>;
      }>;
    }>(`${endpoint}&fields=id,name,adset_id,status,creative,tracking_specs&limit=${limit}`);
  }

  /**
   * Update ad
   */
  async updateAd(adId: string, updates: Record<string, any>) {
    return this.request<{ success: boolean }>(`/${adId}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete ad
   */
  async deleteAd(adId: string) {
    return this.request<{ success: boolean }>(`/${adId}`, {
      method: "DELETE",
    });
  }

  /**
   * Get ad insights
   */
  async getAdInsights(
    adAccountId: string,
    params: {
      level?: "account" | "campaign" | "adset" | "ad";
      time_range?: { since: string; until: string };
      fields?: string[];
      breakdowns?: string[];
    } = {}
  ) {
    const {
      level = "account",
      time_range,
      fields = [
        "ad_id",
        "adset_id",
        "campaign_id",
        "impressions",
        "clicks",
        "spend",
        "reach",
        "cpm",
        "cpc",
        "ctr",
        "actions",
      ],
      breakdowns = [],
    } = params;

    let endpoint = `/act_${adAccountId}/insights?level=${level}&fields=${fields.join(",")}`;
    if (time_range) {
      endpoint += `&time_range={"since":"${time_range.since}","until":"${time_range.until}"}`;
    }
    if (breakdowns.length > 0) {
      endpoint += `&breakdowns=${breakdowns.join(",")}`;
    }

    return this.request<{
      data: Array<{
        ad_id?: string;
        adset_id?: string;
        campaign_id?: string;
        impressions: string;
        clicks: string;
        spend: string;
        reach?: string;
        cpm?: string;
        cpc?: string;
        ctr?: string;
        actions?: Array<{ action_type: string; value: string }>;
        date_start: string;
        date_stop: string;
      }>;
    }>(endpoint);
  }

  /**
   * Create custom audience
   */
  async createCustomAudience(
    adAccountId: string,
    params: {
      name: string;
      description?: string;
      subtype?: "CUSTOM" | "LOOKALIKE" | "WEBSITE" | "APP" | "OFFLINE";
      customer_file_source?: "USER_PROVIDED_ONLY" | "PARTNER_PROVIDED_ONLY" | "BOTH_USER_AND_PARTNER_PROVIDED";
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/customaudiences`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Add users to custom audience
   */
  async addUsersToCustomAudience(
    audienceId: string,
    params: {
      payload: {
        schema: string[];
        data: any[][];
      };
    }
  ) {
    return this.request<{
      audience_id: string;
      num_received: number;
      num_invalid_entries: number;
    }>(`/${audienceId}/users`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Remove users from custom audience
   */
  async removeUsersFromCustomAudience(
    audienceId: string,
    params: {
      payload: {
        schema: string[];
        data: any[][];
      };
    }
  ) {
    return this.request<{
      audience_id: string;
      num_received: number;
      num_invalid_entries: number;
    }>(`/${audienceId}/users`, {
      method: "DELETE",
      body: JSON.stringify(params),
    });
  }

  /**
   * Get custom audiences
   */
  async getCustomAudiences(adAccountId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        description?: string;
        subtype?: string;
        approximate_count?: number;
        data_source?: Record<string, any>;
        status?: string;
      }>;
    }>(`/act_${adAccountId}/customaudiences?fields=id,name,description,subtype,approximate_count,data_source,status&limit=${limit}`);
  }

  /**
   * Update custom audience
   */
  async updateCustomAudience(audienceId: string, updates: Record<string, any>) {
    return this.request<{ success: boolean }>(`/${audienceId}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete custom audience
   */
  async deleteCustomAudience(audienceId: string) {
    return this.request<{ success: boolean }>(`/${audienceId}`, {
      method: "DELETE",
    });
  }

  /**
   * Create lookalike audience
   */
  async createLookalikeAudience(
    adAccountId: string,
    params: {
      name: string;
      source_audience_id: string;
      lookalike_spec: {
        country: string;
        ratio?: number; // 0.01 to 0.10
        starting_ratio?: number;
      };
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/customaudiences`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        subtype: "LOOKALIKE",
        lookalike_spec: params.lookalike_spec,
        source_audience_id: params.source_audience_id,
      }),
    });
  }

  /**
   * Create Ad Creative with Asset Feed (Dynamic Creative)
   */
  async createAdCreativeWithAssetFeed(
    adAccountId: string,
    params: {
      name: string;
      page_id: string;
      asset_feed_spec: Record<string, any>;
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/adcreatives`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        object_story_spec: {
          page_id: params.page_id,
        },
        asset_feed_spec: params.asset_feed_spec,
      }),
    });
  }

  /**
   * Create Ad Creative (Image/Video)
   */
  async createAdCreative(
    adAccountId: string,
    params: {
      name: string;
      object_story_spec: {
        page_id: string;
        link_data?: {
          image_url?: string;
          video_id?: string;
          message?: string;
          link?: string;
          call_to_action?: {
            type: string;
            value: {
              link?: string;
            };
          };
        };
      };
    }
  ) {
    return this.request<{ id: string }>(`/act_${adAccountId}/adcreatives`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        object_story_spec: params.object_story_spec,
      }),
    });
  }

  /**
   * Get ad creatives
   */
  async getAdCreatives(adAccountId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        object_story_spec: Record<string, any>;
        object_story_id?: string;
        thumbnail_url?: string;
      }>;
    }>(`/act_${adAccountId}/adcreatives?fields=id,name,object_story_spec,object_story_id,thumbnail_url&limit=${limit}`);
  }

  /**
   * Generate ad preview
   */
  async generateAdPreview(
    adFormat: string,
    params: {
      creative?: Record<string, any>;
      adgroup_id?: string;
      post?: Record<string, any>;
    }
  ) {
    return this.request<{
      body: string;
      preview_url: string;
    }>(`/${adFormat}/previews`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Get campaign optimization suggestions
   */
  async getCampaignOptimizationSuggestions(campaignId: string) {
    return this.request<{
      data: Array<{
        optimization_event: string;
        suggestions: Array<{
          type: string;
          value: any;
          description: string;
        }>;
      }>;
    }>(`/${campaignId}/optimization_suggestions`);
  }

  /**
   * Get budget optimization recommendations
   */
  async getBudgetOptimizationRecommendations(adAccountId: string) {
    return this.request<{
      recommendations: Array<{
        campaign_id: string;
        current_budget: number;
        recommended_budget: number;
        reason: string;
      }>;
    }>(`/act_${adAccountId}/budget_optimization_recommendations`);
  }

  // ==================== INSIGHTS API ====================

  /**
   * Get Page insights
   */
  async getPageInsights(
    pageId: string,
    metric: string,
    period: "day" | "week" | "days_28" = "day",
    since?: string,
    until?: string
  ) {
    let endpoint = `/${pageId}/insights?metric=${metric}&period=${period}`;
    if (since && until) {
      endpoint += `&since=${since}&until=${until}`;
    }
    return this.request<{
      data: Array<{
        name: string;
        period: string;
        values: Array<{ value: Record<string, number>; end_time: string }>;
      }>;
    }>(endpoint);
  }

  /**
   * Get Instagram insights
   */
  async getInstagramInsights(
    igUserId: string,
    metric: string,
    period: "day" | "week" | "days_28" | "lifetime" = "day",
    since?: string,
    until?: string
  ) {
    let endpoint = `/${igUserId}/insights?metric=${metric}&period=${period}`;
    if (since && until) {
      endpoint += `&since=${since}&until=${until}`;
    }
    return this.request<{
      data: Array<{
        name: string;
        period: string;
        values: Array<{ value: number; end_time: string }>;
      }>;
    }>(endpoint);
  }

  /**
   * Create Instagram Story Media Container
   */
  async createInstagramStory(
    igUserId: string,
    params: {
      image_url?: string;
      video_url?: string;
      caption?: string;
    }
  ) {
    return this.createInstagramMediaContainer(igUserId, {
      ...params,
      caption: params.caption ?? "",
      media_type: "REELS", // For some reason Meta uses REELS container for Stories sometimes, or specialized STORY flag
      // Actually, for stories it's often just image_url/video_url with is_story=true
    });
  }

  /**
   * Get Hashtag ID
   */
  async getHashtagId(igUserId: string, q: string) {
    return this.request<{ data: Array<{ id: string }> }>(
      `/ig_hashtag_search?user_id=${igUserId}&q=${q}`
    );
  }

  /**
   * Get Hashtag Media
   */
  async getHashtagMedia(igUserId: string, hashtagId: string, type: "recent" | "top" = "recent") {
    return this.request<{ data: Array<any> }>(
      `/${hashtagId}/${type}_media?user_id=${igUserId}&fields=id,media_type,media_url,permalink`
    );
  }

  // ==================== COMMERCE API ====================

  /**
   * Get product catalogs
   */
  async getCatalogs(businessId: string) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        vertical: string;
        product_count?: number;
      }>;
    }>(`/${businessId}/owned_product_catalogs?fields=id,name,vertical,product_count`);
  }

  /**
   * Create product catalog
   */
  async createCatalog(businessId: string, name: string, vertical: string) {
    return this.request<{ id: string }>(`/${businessId}/owned_product_catalogs`, {
      method: "POST",
      body: JSON.stringify({
        name,
        vertical,
      }),
    });
  }

  /**
   * Get products in catalog
   */
  async getProducts(catalogId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        description?: string;
        price?: string;
        currency?: string;
        availability?: string;
        image_url?: string;
        url?: string;
      }>;
    }>(`/${catalogId}/products?fields=id,name,description,price,currency,availability,image_url,url&limit=${limit}`);
  }

  /**
   * Create product in catalog
   */
  async createProduct(
    catalogId: string,
    params: {
      name: string;
      description?: string;
      price?: number;
      currency?: string;
      availability?: string;
      condition?: string;
      brand?: string;
      category?: string;
      image_url?: string;
      url?: string;
    }
  ) {
    return this.request<{ id: string }>(`/${catalogId}/products`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        ...(params.description && { description: params.description }),
        ...(params.price && { price: params.price }),
        ...(params.currency && { currency: params.currency }),
        ...(params.availability && { availability: params.availability }),
        ...(params.condition && { condition: params.condition }),
        ...(params.brand && { brand: params.brand }),
        ...(params.category && { category: params.category }),
        ...(params.image_url && { image_url: params.image_url }),
        ...(params.url && { url: params.url }),
      }),
    });
  }

  /**
   * Update product inventory in batch
   */
  async updateBatchInventory(
    catalogId: string,
    requests: Array<{ retailer_id: string; inventory: number }>
  ) {
    return this.request<{ success: boolean }>(`/${catalogId}/batch`, {
      method: "POST",
      body: JSON.stringify({
        item_type: "PRODUCT_ITEM",
        requests: requests.map((req) => ({
          method: "UPDATE",
          retailer_id: req.retailer_id,
          data: { inventory: req.inventory },
        })),
      }),
    });
  }

  /**
   * Get commerce orders
   */
  async getCommerceOrders(cmsId: string, limit = 25) {
    return this.request<{
      data: Array<any>;
    }>(`/${cmsId}/orders?fields=id,buyer_details,estimated_payment_details,items,order_status,created_time&limit=${limit}`);
  }

  /**
   * Acknowledge commerce order
   */
  async acknowledgeOrder(orderId: string) {
    return this.request<{ success: boolean }>(`/${orderId}/acknowledge`, {
      method: "POST",
    });
  }

  /**
   * Update order status to SHIPPED
   */
  async shipOrder(orderId: string, params: {
    tracking_number: string;
    carrier: string;
    items?: Array<{ retailer_id: string; quantity: number }>;
  }) {
    return this.request<{ success: boolean }>(`/${orderId}/shipments`, {
      method: "POST",
      body: JSON.stringify({
        tracking_number: params.tracking_number,
        carrier: params.carrier,
        ...(params.items && { items: params.items }),
      }),
    });
  }

  /**
   * Process refund for commerce order
   */
  async processRefund(orderId: string, params: {
    amount: number;
    currency: string;
    reason: string;
  }) {
    return this.request<{ success: boolean }>(`/${orderId}/refunds`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  /**
   * Create product set (collection)
   */
  async createProductSet(catalogId: string, params: {
    name: string;
    filter?: Record<string, any>;
  }) {
    return this.request<{ id: string }>(`/${catalogId}/product_sets`, {
      method: "POST",
      body: JSON.stringify({
        name: params.name,
        filter: params.filter,
      }),
    });
  }

  /**
   * Get product sets
   */
  async getProductSets(catalogId: string, limit = 25) {
    return this.request<{
      data: Array<{
        id: string;
        name: string;
        filter?: Record<string, any>;
        product_count?: number;
      }>;
    }>(`/${catalogId}/product_sets?fields=id,name,filter,product_count&limit=${limit}`);
  }

  /**
   * Update product
   */
  async updateProduct(productId: string, updates: Record<string, any>) {
    return this.request<{ success: boolean }>(`/${productId}`, {
      method: "POST",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string) {
    return this.request<{ success: boolean }>(`/${productId}`, {
      method: "DELETE",
    });
  }

  /**
   * Cancel commerce order
   */
  async cancelOrder(orderId: string, params: {
    cancel_reason: string;
    items?: Array<{ retailer_id: string; quantity: number }>;
  }) {
    return this.request<{ success: boolean }>(`/${orderId}/cancellations`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // ==================== CONVERSIONS API ====================

  /**
   * Send conversion event (server-side)
   */
  async sendConversionEvent(
    pixelId: string,
    params: {
      event_name: string;
      event_time: number;
      event_id?: string;
      event_source_url?: string;
      user_data?: {
        em?: string[]; // hashed emails
        ph?: string[]; // hashed phone numbers
        fn?: string[]; // hashed first names
        ln?: string[]; // hashed last names
        external_id?: string[];
        fbp?: string; // Facebook browser ID
        fbc?: string; // Facebook click ID
      };
      custom_data?: {
        value?: number;
        currency?: string;
        content_name?: string;
        content_category?: string;
        content_ids?: string[];
        contents?: Array<{ id: string; quantity: number; item_price: number }>;
      };
    }
  ) {
    return this.request<{
      events_received: number;
    }>(`/${pixelId}/events`, {
      method: "POST",
      body: JSON.stringify({
        data: [
          {
            event_name: params.event_name,
            event_time: params.event_time,
            ...(params.event_id && { event_id: params.event_id }),
            ...(params.event_source_url && { event_source_url: params.event_source_url }),
            ...(params.user_data && { user_data: params.user_data }),
            ...(params.custom_data && { custom_data: params.custom_data }),
          },
        ],
        access_token: this.accessToken,
      }),
    });
  }
}



