import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  handle: text("handle").notNull(),
  followers: text("followers"),
  status: text("status").default("Healthy"),
  lastSync: timestamp("last_sync").defaultNow(),
  branch: text("branch"),
  // Integration fields
  isConnected: boolean("is_connected").default(false),
  // OAuth-based authentication
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("bearer"),
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenScopes: text("token_scopes").array(),
  connectedAt: timestamp("connected_at"),
  // Username/password authentication
  username: text("username"),
  password: text("password"), // Will be encrypted
  authType: text("auth_type").default("oauth"), // 'oauth' or 'username_password'
  // Platform-specific fields
  platformId: text("platform_id"), // ID from the social platform
  settings: jsonb("settings"), // Flexible platform-specific settings
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  platform: text("platform").notNull(),
  platformPostId: text("platform_post_id").unique(), // Unique ID from FB/IG
  date: timestamp("date").defaultNow(), // Published date
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  impressions: integer("impressions").default(0), // New Insight
  reach: integer("reach").default(0), // New Insight
  image: text("image"),
  tags: text("tags").array(),
  // Advanced Content Management
  status: text("status").default("published"), 
  scheduledAt: timestamp("scheduled_at"),
  mediaUrls: text("media_urls").array(),
  mediaAssetIds: integer("media_asset_ids").array(),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id), // Link to connected channel
  platformConversationId: text("platform_conversation_id").unique(), // Unique ID from platform
  userName: text("user_name").notNull(),
  platform: text("platform").notNull(),
  lastMessage: text("last_message").notNull(),
  time: timestamp("time").defaultNow(),
  unread: boolean("unread").default(true),
  avatar: text("avatar"),
  // Response & CRM fields
  priority: text("priority").default("normal"),
  assignedTo: text("assigned_to"),
  status: text("status").default("open"),
  slaDeadline: timestamp("sla_deadline"),
  tags: text("tags").array(),
  sentiment: text("sentiment"),
  // Unified messaging fields
  participantId: text("participant_id"), // User ID on the platform
  participantPhone: text("participant_phone"), // For WhatsApp
  participantEmail: text("participant_email"), // For email-based platforms
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Unified Messages Table - Stores all messages from all platforms
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  channelId: integer("channel_id").references(() => channels.id),
  platform: text("platform").notNull(), // Facebook, Instagram, WhatsApp, TikTok
  platformMessageId: text("platform_message_id"), // Unique ID from platform
  direction: text("direction").notNull(), // inbound, outbound
  messageType: text("message_type").notNull().default("text"), // text, image, video, audio, document, sticker, location, etc.
  content: text("content"), // Message text content
  mediaUrl: text("media_url"), // URL to media file
  mediaType: text("media_type"), // image/jpeg, video/mp4, etc.
  thumbnailUrl: text("thumbnail_url"), // Thumbnail for media
  // Rich content
  attachments: jsonb("attachments"), // Array of attachment objects
  quickReplies: jsonb("quick_replies"), // Quick reply buttons (WhatsApp, Messenger)
  // Metadata
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status"), // sent, delivered, read, failed, pending
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  // Platform-specific data
  metadata: jsonb("metadata"), // Platform-specific fields
  // Threading
  replyToMessageId: integer("reply_to_message_id").references(() => messages.id), // For threaded replies
  createdAt: timestamp("created_at").defaultNow(),
});

export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  platformId: text("platform_id").notNull(),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  location: text("location"),
  isVerified: boolean("is_verified").default(false),
  followerCount: integer("follower_count"),
  engagementScore: integer("engagement_score").default(0), // 0-100
  segment: text("segment").default("New Lead"), // 'VIP', 'Local', 'Influencer'
  joinedAt: timestamp("joined_at"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Media assets stored in Vercel Blob (or other storage).
 * Posts may reference these via posts.mediaAssetIds.
 */
export const mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  pathname: text("pathname").notNull(),
  contentType: text("content_type"),
  size: integer("size"),
  width: integer("width"),
  height: integer("height"),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Publishing job queue (drives scheduled publishing and retries).
 */
export const publishJobs = pgTable("publish_jobs", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  runAt: timestamp("run_at").notNull(),
  status: text("status").default("pending").notNull(), // pending|running|succeeded|failed|cancelled
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(5).notNull(),
  lockedAt: timestamp("locked_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Raw webhook events for auditing + async processing.
 */
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // meta|tiktok
  eventType: text("event_type").notNull(),
  externalId: text("external_id"), // optional provider event id for de-dupe
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  status: text("status").default("received").notNull(), // received|processed|failed
  error: text("error"),
});

/**
 * Snapshot metrics per post (time-series).
 */
export const postMetricSnapshots = pgTable("post_metric_snapshots", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  platform: text("platform").notNull(),
  collectedAt: timestamp("collected_at").defaultNow(),
  metrics: jsonb("metrics").notNull(),
});

/**
 * Daily channel metrics (time-series).
 */
export const channelDailyMetrics = pgTable("channel_daily_metrics", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  date: timestamp("date").notNull(),
  metrics: jsonb("metrics").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Meta Ad Campaigns
 */
export const adCampaigns = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  platformCampaignId: text("platform_campaign_id").unique(), // Meta campaign ID
  name: text("name").notNull(),
  objective: text("objective"), // CONVERSIONS, TRAFFIC, ENGAGEMENT, etc.
  status: text("status").default("ACTIVE"), // ACTIVE, PAUSED, DELETED, ARCHIVED
  dailyBudget: integer("daily_budget"), // in cents
  lifetimeBudget: integer("lifetime_budget"), // in cents
  startTime: timestamp("start_time"),
  stopTime: timestamp("stop_time"),
  metadata: jsonb("metadata"), // Full campaign data from Meta
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Meta Ad Sets
 */
export const adSets = pgTable("ad_sets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => adCampaigns.id),
  platformAdSetId: text("platform_ad_set_id").unique(), // Meta ad set ID
  name: text("name").notNull(),
  status: text("status").default("ACTIVE"),
  dailyBudget: integer("daily_budget"), // in cents
  lifetimeBudget: integer("lifetime_budget"), // in cents
  targeting: jsonb("targeting"), // Audience targeting criteria
  optimizationGoal: text("optimization_goal"), // LINK_CLICKS, CONVERSIONS, etc.
  billingEvent: text("billing_event"), // IMPRESSIONS, LINK_CLICKS, etc.
  startTime: timestamp("start_time"),
  stopTime: timestamp("stop_time"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Meta Ads
 */
export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  adSetId: integer("ad_set_id")
    .notNull()
    .references(() => adSets.id),
  platformAdId: text("platform_ad_id").unique(), // Meta ad ID
  name: text("name").notNull(),
  status: text("status").default("ACTIVE"), // ACTIVE, PAUSED, DELETED, ARCHIVED
  creative: jsonb("creative"), // Ad creative (images, videos, text, etc.)
  trackingSpecs: jsonb("tracking_specs"), // Conversion tracking
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Meta Ad Insights (performance metrics)
 */
export const adInsights = pgTable("ad_insights", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").references(() => ads.id),
  adSetId: integer("ad_set_id").references(() => adSets.id),
  campaignId: integer("campaign_id").references(() => adCampaigns.id),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  spend: integer("spend").default(0), // in cents
  reach: integer("reach").default(0),
  cpm: integer("cpm").default(0), // cost per mille in cents
  cpc: integer("cpc").default(0), // cost per click in cents
  ctr: integer("ctr").default(0), // click-through rate (percentage * 100)
  conversions: integer("conversions").default(0),
  conversionValue: integer("conversion_value").default(0), // in cents
  metrics: jsonb("metrics"), // Additional metrics from Meta
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Product Catalogs (for Commerce)
 */
export const productCatalogs = pgTable("product_catalogs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  platformCatalogId: text("platform_catalog_id").unique(), // Meta catalog ID
  name: text("name").notNull(),
  vertical: text("vertical"), // RETAIL, HOTEL, FLIGHT, etc.
  status: text("status").default("ACTIVE"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Products (for Commerce)
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id")
    .notNull()
    .references(() => productCatalogs.id),
  platformProductId: text("platform_product_id").unique(), // Meta product ID
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"), // in cents
  currency: text("currency").default("USD"),
  availability: text("availability").default("in stock"), // in stock, out of stock, preorder
  condition: text("condition"), // new, refurbished, used
  brand: text("brand"),
  category: text("category"),
  imageUrl: text("image_url"),
  url: text("url"), // Product page URL
  metadata: jsonb("metadata"), // Full product data from Meta
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * WhatsApp Conversations (separate from general conversations)
 */
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  phoneNumber: text("phone_number").notNull(), // Customer phone number
  platformConversationId: text("platform_conversation_id").unique(),
  userName: text("user_name"),
  lastMessage: text("last_message"),
  lastMessageTime: timestamp("last_message_time"),
  unread: boolean("unread").default(true),
  status: text("status").default("open"), // open, closed, archived
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * WhatsApp Messages
 */
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => whatsappConversations.id),
  platformMessageId: text("platform_message_id").unique(),
  direction: text("direction").notNull(), // inbound, outbound
  messageType: text("message_type").notNull(), // text, image, video, audio, document, etc.
  content: text("content"),
  mediaUrl: text("media_url"),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status"), // sent, delivered, read, failed
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Meta Pixel Events (Conversions API tracking)
 */
export const pixelEvents = pgTable("pixel_events", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  eventName: text("event_name").notNull(), // PageView, Purchase, Lead, etc.
  eventId: text("event_id").unique(), // Unique event ID for deduplication
  userData: jsonb("user_data"), // Hashed user data (email, phone, etc.)
  customData: jsonb("custom_data"), // Event-specific data (value, currency, etc.)
  sourceUrl: text("source_url"),
  userAgent: text("user_agent"),
  fbp: text("fbp"), // Facebook browser ID
  fbc: text("fbc"), // Facebook click ID
  sentToMeta: boolean("sent_to_meta").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * WhatsApp Sales Products (independent from Meta Commerce)
 */
export const salesProducts = pgTable("sales_products", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id), // Optional: link to WhatsApp channel
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // Price in cents
  currency: text("currency").default("ZAR"), // ZAR, USD, etc.
  image: text("image"), // Image URL or path
  category: text("category"),
  features: text("features").array(), // Array of feature strings
  specifications: jsonb("specifications"), // Flexible JSON for product specs
  availability: text("availability").default("in stock"), // in stock, out of stock, preorder
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Shopping Carts (per conversation/user)
 */
export const shoppingCarts = pgTable("shopping_carts", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => whatsappConversations.id),
  userId: text("user_id"), // Optional: link to user if authenticated
  phoneNumber: text("phone_number"), // Customer phone number
  status: text("status").default("active"), // active, abandoned, converted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Cart Items
 */
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: integer("cart_id")
    .notNull()
    .references(() => shoppingCarts.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => salesProducts.id),
  quantity: integer("quantity").notNull().default(1),
  priceAtTime: integer("price_at_time").notNull(), // Price snapshot when added
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Orders (converted from carts)
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  platformOrderId: text("platform_order_id"), // Meta commerce order id (if applicable)
  cartId: integer("cart_id").references(() => shoppingCarts.id),
  conversationId: integer("conversation_id").references(() => whatsappConversations.id),
  phoneNumber: text("phone_number").notNull(),
  userName: text("user_name"),
  status: text("status").default("pending"), // pending, confirmed, processing, shipped, delivered, cancelled
  totalAmount: integer("total_amount").notNull(), // Total in cents
  currency: text("currency").default("BRL"),
  shippingAddress: jsonb("shipping_address"), // Flexible address data
  notes: text("notes"),
  whatsappMessageId: text("whatsapp_message_id"), // Link to sent WhatsApp message
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Order Items
 */
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id")
    .notNull()
    .references(() => salesProducts.id),
  productName: text("product_name").notNull(), // Snapshot of product name
  quantity: integer("quantity").notNull(),
  priceAtTime: integer("price_at_time").notNull(), // Price snapshot
  subtotal: integer("subtotal").notNull(), // quantity * priceAtTime
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Custom Audiences (for Marketing API)
 */
export const customAudiences = pgTable("custom_audiences", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  platformAudienceId: text("platform_audience_id").unique(),
  name: text("name").notNull(),
  description: text("description"),
  subtype: text("subtype").default("CUSTOM"), // CUSTOM, LOOKALIKE, WEBSITE, APP, OFFLINE
  approximateCount: integer("approximate_count"),
  status: text("status").default("ACTIVE"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Audience Users (membership tracking)
 */
export const audienceUsers = pgTable("audience_users", {
  id: serial("id").primaryKey(),
  audienceId: integer("audience_id")
    .notNull()
    .references(() => customAudiences.id, { onDelete: "cascade" }),
  emailHash: text("email_hash"),
  phoneHash: text("phone_hash"),
  externalId: text("external_id"),
  addedAt: timestamp("added_at").defaultNow(),
});

/**
 * Ad Creatives
 */
export const adCreatives = pgTable("ad_creatives", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  platformCreativeId: text("platform_creative_id").unique(),
  name: text("name").notNull(),
  objectStorySpec: jsonb("object_story_spec"),
  objectStoryId: text("object_story_id"),
  thumbnailUrl: text("thumbnail_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Ad Previews
 */
export const adPreviews = pgTable("ad_previews", {
  id: serial("id").primaryKey(),
  adId: integer("ad_id").references(() => ads.id),
  creativeId: integer("creative_id").references(() => adCreatives.id),
  adFormat: text("ad_format").notNull(),
  previewUrl: text("preview_url"),
  previewBody: text("preview_body"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Product Sets (collections)
 */
export const productSets = pgTable("product_sets", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id")
    .notNull()
    .references(() => productCatalogs.id),
  platformProductSetId: text("platform_product_set_id").unique(),
  name: text("name").notNull(),
  filter: jsonb("filter"),
  productCount: integer("product_count"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Product Feed Syncs
 */
export const productFeedSyncs = pgTable("product_feed_syncs", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id")
    .notNull()
    .references(() => productCatalogs.id),
  feedUrl: text("feed_url"),
  syncStatus: text("sync_status").default("pending"), // pending, processing, completed, failed
  productsSynced: integer("products_synced").default(0),
  productsFailed: integer("products_failed").default(0),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

/**
 * Order Fulfillments
 */
export const orderFulfillments = pgTable("order_fulfillments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  fulfillmentType: text("fulfillment_type").notNull(), // acknowledge, ship, refund, cancel
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  status: text("status").default("pending"), // pending, completed, failed
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Inventory Snapshots (history tracking)
 */
export const inventorySnapshots = pgTable("inventory_snapshots", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id")
    .notNull()
    .references(() => productCatalogs.id),
  productId: integer("product_id").references(() => products.id),
  retailerId: text("retailer_id"),
  quantity: integer("quantity").notNull(),
  snapshotDate: timestamp("snapshot_date").defaultNow(),
});

/**
 * Message Templates
 */
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  platform: text("platform").notNull(), // WhatsApp, Messenger, Instagram
  templateName: text("template_name").notNull(),
  templateId: text("template_id"), // Platform template ID
  category: text("category"), // MARKETING, UTILITY, AUTHENTICATION
  language: text("language").default("en"),
  content: jsonb("content").notNull(), // Template structure
  status: text("status").default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Broadcast Campaigns
 */
export const broadcastCampaigns = pgTable("broadcast_campaigns", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  name: text("name").notNull(),
  platform: text("platform").notNull(), // WhatsApp, Messenger
  templateId: integer("template_id").references(() => messageTemplates.id),
  recipients: jsonb("recipients").notNull(), // Array of phone numbers or user IDs
  status: text("status").default("draft"), // draft, scheduled, sending, completed, failed
  scheduledAt: timestamp("scheduled_at"),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Auto Response Rules
 */
export const autoResponseRules = pgTable("auto_response_rules", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(), // keyword, time, absence
  triggerValue: text("trigger_value"), // Keyword text or time threshold
  response: text("response").notNull(),
  templateId: integer("template_id").references(() => messageTemplates.id),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Post Insights (individual post analytics)
 */
export const postInsights = pgTable("post_insights", {
  id: serial("id").primaryKey(),
  postId: integer("post_id")
    .notNull()
    .references(() => posts.id),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  engagement: integer("engagement").default(0),
  clicks: integer("clicks").default(0),
  saves: integer("saves").default(0),
  shares: integer("shares").default(0),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Audience Insights (demographics and behavior)
 */
export const audienceInsights = pgTable("audience_insights", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  date: timestamp("date").notNull(),
  demographics: jsonb("demographics"), // Age, gender breakdown
  locations: jsonb("locations"), // Top locations
  interests: jsonb("interests"), // Top interests
  behaviors: jsonb("behaviors"), // Behaviors
  devices: jsonb("devices"), // Device breakdown
  createdAt: timestamp("created_at").defaultNow(),
});

/**
 * Conversion Events (tracking)
 */
export const conversionEvents = pgTable("conversion_events", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  pixelId: text("pixel_id"),
  eventName: text("event_name").notNull(), // PageView, Purchase, Lead, etc.
  eventId: text("event_id").unique(),
  eventValue: integer("event_value"), // in cents
  currency: text("currency").default("USD"),
  userData: jsonb("user_data"),
  customData: jsonb("custom_data"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

