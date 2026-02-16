/**
 * Meta Business SDK Wrapper
 * Provides a cleaner, type-safe interface using the official Meta Business SDK
 * Reference: https://developers.facebook.com/docs/business-sdk/getting-started
 */

import * as bizSdk from "facebook-nodejs-business-sdk";

const FacebookAdsApi = bizSdk.FacebookAdsApi;
const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;
const AdSet = bizSdk.AdSet;
const Ad = bizSdk.Ad;
const Page = bizSdk.Page;
const InstagramAccount = bizSdk.InstagramAccount;
const ProductCatalog = bizSdk.ProductCatalog;
const ProductItem = bizSdk.ProductItem;

export interface MetaSDKConfig {
  accessToken: string;
  appSecret?: string;
  appId?: string;
}

export class MetaBusinessSDK {
  private api: typeof FacebookAdsApi;
  private accessToken: string;

  constructor(config: MetaSDKConfig) {
    this.accessToken = config.accessToken;
    
    // Initialize the SDK
    if (config.appId && config.appSecret) {
      FacebookAdsApi.init(config.accessToken, config.appSecret);
    } else {
      FacebookAdsApi.init(config.accessToken);
    }
    
    this.api = FacebookAdsApi;
  }

  // ==================== AD ACCOUNT OPERATIONS ====================

  /**
   * Get ad account details
   */
  async getAdAccount(accountId: string) {
    const account = new AdAccount(accountId);
    return await account.read([AdAccount.Fields.name, AdAccount.Fields.account_id, AdAccount.Fields.currency]);
  }

  /**
   * List all ad accounts for a user
   */
  async getAdAccounts(userId: string = "me") {
    // This would require a user access token
    // For now, we'll use the ad account directly
    throw new Error("Use getAdAccount with specific account ID");
  }

  // ==================== CAMPAIGN OPERATIONS ====================

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(accountId: string, fields?: string[], params?: Record<string, any>) {
    const account = new AdAccount(accountId);
    const campaigns = await account.getCampaigns(
      fields || [Campaign.Fields.id, Campaign.Fields.name, Campaign.Fields.objective, Campaign.Fields.status, Campaign.Fields.daily_budget, Campaign.Fields.lifetime_budget, Campaign.Fields.created_time],
      params || { limit: 25 }
    );
    return campaigns;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(accountId: string, params: {
    name: string;
    objective: string;
    status?: "ACTIVE" | "PAUSED";
    daily_budget?: number;
    lifetime_budget?: number;
    start_time?: string;
    stop_time?: string;
  }) {
    const account = new AdAccount(accountId);
    const campaign = new Campaign(null, account.getParentId());
    
    campaign.setData({
      [Campaign.Fields.name]: params.name,
      [Campaign.Fields.objective]: params.objective,
      [Campaign.Fields.status]: params.status || "PAUSED",
      ...(params.daily_budget && { [Campaign.Fields.daily_budget]: params.daily_budget }),
      ...(params.lifetime_budget && { [Campaign.Fields.lifetime_budget]: params.lifetime_budget }),
      ...(params.start_time && { [Campaign.Fields.start_time]: params.start_time }),
      ...(params.stop_time && { [Campaign.Fields.stop_time]: params.stop_time }),
    });

    return await campaign.create();
  }

  /**
   * Update a campaign
   */
  async updateCampaign(campaignId: string, updates: Record<string, any>) {
    const campaign = new Campaign(campaignId);
    campaign.setData(updates);
    return await campaign.update();
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(campaignId: string) {
    const campaign = new Campaign(campaignId);
    return await campaign.delete();
  }

  // ==================== AD SET OPERATIONS ====================

  /**
   * Get ad sets for a campaign or account
   */
  async getAdSets(accountId: string, campaignId?: string, fields?: string[], params?: Record<string, any>) {
    const account = new AdAccount(accountId);
    const requestParams: Record<string, any> = { limit: 25, ...params };
    if (campaignId) {
      requestParams.filtering = [{ field: "campaign.id", operator: "EQUAL", value: campaignId }];
    }
    
    const adSets = await account.getAdSets(
      fields || [AdSet.Fields.id, AdSet.Fields.name, AdSet.Fields.campaign_id, AdSet.Fields.optimization_goal, AdSet.Fields.status, AdSet.Fields.daily_budget],
      requestParams
    );
    return adSets;
  }

  /**
   * Create an ad set
   */
  async createAdSet(accountId: string, params: {
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
  }) {
    const account = new AdAccount(accountId);
    const adSet = new AdSet(null, account.getParentId());
    
    adSet.setData({
      [AdSet.Fields.name]: params.name,
      [AdSet.Fields.campaign_id]: params.campaign_id,
      [AdSet.Fields.optimization_goal]: params.optimization_goal,
      [AdSet.Fields.billing_event]: params.billing_event,
      [AdSet.Fields.targeting]: params.targeting,
      [AdSet.Fields.status]: params.status || "PAUSED",
      ...(params.bid_amount && { [AdSet.Fields.bid_amount]: params.bid_amount }),
      ...(params.daily_budget && { [AdSet.Fields.daily_budget]: params.daily_budget }),
      ...(params.lifetime_budget && { [AdSet.Fields.lifetime_budget]: params.lifetime_budget }),
      ...(params.start_time && { [AdSet.Fields.start_time]: params.start_time }),
      ...(params.stop_time && { [AdSet.Fields.stop_time]: params.stop_time }),
    });

    return await adSet.create();
  }

  // ==================== AD OPERATIONS ====================

  /**
   * Get ads for an ad set or account
   */
  async getAds(accountId: string, adSetId?: string, fields?: string[], params?: Record<string, any>) {
    const account = new AdAccount(accountId);
    const requestParams: Record<string, any> = { limit: 25, ...params };
    if (adSetId) {
      requestParams.filtering = [{ field: "adset.id", operator: "EQUAL", value: adSetId }];
    }
    
    const ads = await account.getAds(
      fields || [Ad.Fields.id, Ad.Fields.name, Ad.Fields.adset_id, Ad.Fields.status, Ad.Fields.creative],
      requestParams
    );
    return ads;
  }

  /**
   * Create an ad
   */
  async createAd(accountId: string, params: {
    adset_id: string;
    name: string;
    creative: {
      object_story_spec?: Record<string, any>;
      object_story_id?: string;
    };
    status?: "ACTIVE" | "PAUSED";
    tracking_specs?: Array<Record<string, any>>;
  }) {
    const account = new AdAccount(accountId);
    const ad = new Ad(null, account.getParentId());
    
    ad.setData({
      [Ad.Fields.name]: params.name,
      [Ad.Fields.adset_id]: params.adset_id,
      [Ad.Fields.creative]: params.creative,
      [Ad.Fields.status]: params.status || "PAUSED",
      ...(params.tracking_specs && { [Ad.Fields.tracking_specs]: params.tracking_specs }),
    });

    return await ad.create();
  }

  // ==================== INSIGHTS OPERATIONS ====================

  /**
   * Get insights for campaigns, ad sets, or ads
   */
  async getInsights(
    accountId: string,
    level: "account" | "campaign" | "adset" | "ad" = "account",
    fields?: string[],
    params?: {
      time_range?: { since: string; until: string };
      breakdowns?: string[];
      time_increment?: number;
    }
  ) {
    const account = new AdAccount(accountId);
    const requestParams: Record<string, any> = {
      level,
      ...(params?.time_range && {
        time_range: {
          since: params.time_range.since,
          until: params.time_range.until,
        },
      }),
      ...(params?.breakdowns && { breakdowns: params.breakdowns }),
      ...(params?.time_increment && { time_increment: params.time_increment }),
    };

    const insights = await account.getInsights(
      fields || [
        "impressions",
        "clicks",
        "spend",
        "reach",
        "cpm",
        "cpc",
        "ctr",
        "actions",
      ],
      requestParams
    );
    return insights;
  }

  // ==================== PAGE OPERATIONS ====================

  /**
   * Get page details
   */
  async getPage(pageId: string, fields?: string[]) {
    const page = new Page(pageId);
    return await page.read(
      fields || [
        Page.Fields.id,
        Page.Fields.name,
        Page.Fields.category,
        Page.Fields.followers_count,
        Page.Fields.fan_count,
        Page.Fields.picture,
      ]
    );
  }

  /**
   * Get page posts
   */
  async getPagePosts(pageId: string, fields?: string[], params?: Record<string, any>) {
    const page = new Page(pageId);
    const posts = await page.getPosts(
      fields || [
        "id",
        "message",
        "story",
        "created_time",
        "full_picture",
        "permalink_url",
        "shares",
        "likes.summary(true)",
        "comments.summary(true)",
      ],
      params || { limit: 25 }
    );
    return posts;
  }

  /**
   * Create a page post
   */
  async createPagePost(pageId: string, params: {
    message?: string;
    link?: string;
    url?: string;
    attached_media?: Array<{ media_fbid: string }>;
  }) {
    const page = new Page(pageId);
    const post = await page.createFeed(
      [],
      {
        message: params.message,
        link: params.link,
        url: params.url,
        ...(params.attached_media && { attached_media: params.attached_media }),
      }
    );
    return post;
  }

  // ==================== INSTAGRAM OPERATIONS ====================

  /**
   * Get Instagram account details
   */
  async getInstagramAccount(igUserId: string, fields?: string[]) {
    const account = new InstagramAccount(igUserId);
    return await account.read(
      fields || [
        InstagramAccount.Fields.id,
        InstagramAccount.Fields.username,
        InstagramAccount.Fields.account_type,
        InstagramAccount.Fields.followers_count,
        InstagramAccount.Fields.follows_count,
        InstagramAccount.Fields.media_count,
        InstagramAccount.Fields.profile_picture_url,
      ]
    );
  }

  /**
   * Get Instagram media
   */
  async getInstagramMedia(igUserId: string, fields?: string[], params?: Record<string, any>) {
    const account = new InstagramAccount(igUserId);
    const media = await account.getMedia(
      fields || [
        "id",
        "caption",
        "media_url",
        "permalink",
        "media_type",
        "timestamp",
        "like_count",
        "comments_count",
      ],
      params || { limit: 25 }
    );
    return media;
  }

  // ==================== COMMERCE OPERATIONS ====================

  /**
   * Get product catalogs for a business
   */
  async getCatalogs(businessId: string, fields?: string[]) {
    const business = new bizSdk.Business(businessId);
    const catalogs = await business.getOwnedProductCatalogs(
      fields || [
        ProductCatalog.Fields.id,
        ProductCatalog.Fields.name,
        ProductCatalog.Fields.vertical,
        ProductCatalog.Fields.product_count,
      ]
    );
    return catalogs;
  }

  /**
   * Create a product catalog
   */
  async createCatalog(businessId: string, name: string, vertical: string) {
    const business = new bizSdk.Business(businessId);
    const catalog = new ProductCatalog(null, business.getParentId());
    catalog.setData({
      [ProductCatalog.Fields.name]: name,
      [ProductCatalog.Fields.vertical]: vertical,
    });
    return await catalog.create();
  }

  /**
   * Get products in a catalog
   */
  async getProducts(catalogId: string, fields?: string[], params?: Record<string, any>) {
    const catalog = new ProductCatalog(catalogId);
    const products = await catalog.getProducts(
      fields || [
        ProductItem.Fields.id,
        ProductItem.Fields.name,
        ProductItem.Fields.description,
        ProductItem.Fields.price,
        ProductItem.Fields.currency,
        ProductItem.Fields.availability,
        ProductItem.Fields.image_url,
        ProductItem.Fields.url,
      ],
      params || { limit: 25 }
    );
    return products;
  }

  /**
   * Create a product
   */
  async createProduct(catalogId: string, params: {
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
  }) {
    const catalog = new ProductCatalog(catalogId);
    const product = new ProductItem(null, catalog.getParentId());
    product.setData({
      [ProductItem.Fields.name]: params.name,
      ...(params.description && { [ProductItem.Fields.description]: params.description }),
      ...(params.price && { [ProductItem.Fields.price]: params.price }),
      ...(params.currency && { [ProductItem.Fields.currency]: params.currency }),
      ...(params.availability && { [ProductItem.Fields.availability]: params.availability }),
      ...(params.condition && { [ProductItem.Fields.condition]: params.condition }),
      ...(params.brand && { [ProductItem.Fields.brand]: params.brand }),
      ...(params.category && { [ProductItem.Fields.category]: params.category }),
      ...(params.image_url && { [ProductItem.Fields.image_url]: params.image_url }),
      ...(params.url && { [ProductItem.Fields.url]: params.url }),
    });
    return await product.create();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Enable debug mode for API calls
   */
  enableDebug() {
    this.api.setDebug(true);
  }

  /**
   * Set API version
   */
  setApiVersion(version: string) {
    this.api.setVersion(version);
  }

  /**
   * Get current API instance
   */
  getApi() {
    return this.api;
  }
}



