import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  handle: text("handle").notNull(),
  followers: text("followers"),
  status: text("status").default("Healthy"),
  lastSync: timestamp("last_sync").defaultNow(),
  branch: text("branch"),
  isConnected: boolean("is_connected").default(false),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type").default("bearer"),
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenScopes: text("token_scopes").array(),
  connectedAt: timestamp("connected_at"),
  username: text("username"),
  password: text("password"),
  authType: text("auth_type").default("oauth"),
  platformId: text("platform_id"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("channels_platform_idx").on(t.platform),
  index("channels_is_connected_idx").on(t.isConnected),
  index("channels_platform_id_idx").on(t.platformId),
]));

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  platform: text("platform").notNull(),
  platformPostId: text("platform_post_id").unique(),
  date: timestamp("date").defaultNow(),
  content: text("content").notNull(),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  image: text("image"),
  tags: text("tags").array(),
  status: text("status").default("published"),
  scheduledAt: timestamp("scheduled_at"),
  mediaUrls: text("media_urls").array(),
  mediaAssetIds: integer("media_asset_ids").array(),
  aiGenerated: boolean("ai_generated").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("posts_channel_id_idx").on(t.channelId),
  index("posts_platform_idx").on(t.platform),
  index("posts_status_idx").on(t.status),
  index("posts_channel_date_idx").on(t.channelId, t.date),
]));

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  platformConversationId: text("platform_conversation_id").unique(),
  userName: text("user_name").notNull(),
  platform: text("platform").notNull(),
  lastMessage: text("last_message").notNull(),
  time: timestamp("time").defaultNow(),
  unread: boolean("unread").default(true),
  avatar: text("avatar"),
  priority: text("priority").default("normal"),
  assignedTo: text("assigned_to"),
  status: text("status").default("open"),
  slaDeadline: timestamp("sla_deadline"),
  tags: text("tags").array(),
  sentiment: text("sentiment"),
  participantId: text("participant_id"),
  participantPhone: text("participant_phone"),
  participantEmail: text("participant_email"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("conversations_channel_id_idx").on(t.channelId),
  index("conversations_platform_idx").on(t.platform),
  index("conversations_unread_idx").on(t.unread),
  index("conversations_status_idx").on(t.status),
  index("conversations_assigned_to_idx").on(t.assignedTo),
]));

/**
 * Unified Messages Table - Stores all messages from all platforms
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  channelId: integer("channel_id").references(() => channels.id),
  platform: text("platform").notNull(),
  platformMessageId: text("platform_message_id"),
  direction: text("direction").notNull(),
  messageType: text("message_type").notNull().default("text"),
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  thumbnailUrl: text("thumbnail_url"),
  attachments: jsonb("attachments"),
  quickReplies: jsonb("quick_replies"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  status: text("status"),
  readAt: timestamp("read_at"),
  deliveredAt: timestamp("delivered_at"),
  metadata: jsonb("metadata"),
  replyToMessageId: integer("reply_to_message_id").references((): AnyPgColumn => messages.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("messages_conversation_id_idx").on(t.conversationId),
  index("messages_channel_id_idx").on(t.channelId),
  index("messages_platform_idx").on(t.platform),
  index("messages_direction_idx").on(t.direction),
  index("messages_status_idx").on(t.status),
  index("messages_conversation_ts_idx").on(t.conversationId, t.timestamp),
  index("messages_platform_message_id_idx").on(t.platformMessageId),
]));

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
  engagementScore: integer("engagement_score").default(0),
  segment: text("segment").default("New Lead"),
  joinedAt: timestamp("joined_at"),
  lastActive: timestamp("last_active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("followers_platform_idx").on(t.platform),
  index("followers_segment_idx").on(t.segment),
  index("followers_platform_id_idx").on(t.platformId),
]));

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
  status: text("status").default("pending").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(5).notNull(),
  lockedAt: timestamp("locked_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("publish_jobs_post_id_idx").on(t.postId),
  index("publish_jobs_channel_id_idx").on(t.channelId),
  index("publish_jobs_status_idx").on(t.status),
  index("publish_jobs_run_at_idx").on(t.runAt),
]));

/**
 * Raw webhook events for auditing + async processing.
 */
export const webhookEvents = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  eventType: text("event_type").notNull(),
  externalId: text("external_id"),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  status: text("status").default("received").notNull(),
  error: text("error"),
}, (t) => ([
  index("webhook_events_provider_idx").on(t.provider),
  index("webhook_events_status_idx").on(t.status),
  index("webhook_events_received_at_idx").on(t.receivedAt),
  index("webhook_events_external_id_idx").on(t.externalId),
]));

/**
 * Snapshot metrics per post (time-series).
 */
export const postMetricSnapshots = pgTable("post_metric_snapshots", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id),
  platform: text("platform").notNull(),
  collectedAt: timestamp("collected_at").defaultNow(),
  metrics: jsonb("metrics").notNull(),
}, (t) => ([
  index("post_metric_snapshots_post_id_idx").on(t.postId),
]));

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
}, (t) => ([
  index("channel_daily_metrics_channel_id_idx").on(t.channelId),
  uniqueIndex("channel_daily_metrics_channel_date_uniq").on(t.channelId, t.date),
]));

/**
 * Meta Ad Campaigns
 */
export const adCampaigns = pgTable("ad_campaigns", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  platformCampaignId: text("platform_campaign_id").unique(),
  name: text("name").notNull(),
  objective: text("objective"),
  status: text("status").default("ACTIVE"),
  dailyBudget: integer("daily_budget"),
  lifetimeBudget: integer("lifetime_budget"),
  startTime: timestamp("start_time"),
  stopTime: timestamp("stop_time"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("ad_campaigns_channel_id_idx").on(t.channelId),
  index("ad_campaigns_status_idx").on(t.status),
]));

/**
 * Meta Ad Sets
 */
export const adSets = pgTable("ad_sets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id")
    .notNull()
    .references(() => adCampaigns.id),
  platformAdSetId: text("platform_ad_set_id").unique(),
  name: text("name").notNull(),
  status: text("status").default("ACTIVE"),
  dailyBudget: integer("daily_budget"),
  lifetimeBudget: integer("lifetime_budget"),
  targeting: jsonb("targeting"),
  optimizationGoal: text("optimization_goal"),
  billingEvent: text("billing_event"),
  startTime: timestamp("start_time"),
  stopTime: timestamp("stop_time"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("ad_sets_campaign_id_idx").on(t.campaignId),
  index("ad_sets_status_idx").on(t.status),
]));

/**
 * Meta Ads
 */
export const ads = pgTable("ads", {
  id: serial("id").primaryKey(),
  adSetId: integer("ad_set_id")
    .notNull()
    .references(() => adSets.id),
  platformAdId: text("platform_ad_id").unique(),
  name: text("name").notNull(),
  status: text("status").default("ACTIVE"),
  creative: jsonb("creative"),
  trackingSpecs: jsonb("tracking_specs"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("ads_ad_set_id_idx").on(t.adSetId),
  index("ads_status_idx").on(t.status),
]));

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
  spend: integer("spend").default(0),
  reach: integer("reach").default(0),
  cpm: integer("cpm").default(0),
  cpc: integer("cpc").default(0),
  ctr: integer("ctr").default(0),
  conversions: integer("conversions").default(0),
  conversionValue: integer("conversion_value").default(0),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("ad_insights_ad_id_idx").on(t.adId),
  index("ad_insights_ad_set_id_idx").on(t.adSetId),
  index("ad_insights_campaign_id_idx").on(t.campaignId),
  index("ad_insights_campaign_date_idx").on(t.campaignId, t.date),
]));

/**
 * Product Catalogs (for Commerce)
 */
export const productCatalogs = pgTable("product_catalogs", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  platformCatalogId: text("platform_catalog_id").unique(),
  name: text("name").notNull(),
  vertical: text("vertical"),
  status: text("status").default("ACTIVE"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("product_catalogs_channel_id_idx").on(t.channelId),
]));

/**
 * Products (for Commerce)
 */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id")
    .notNull()
    .references(() => productCatalogs.id),
  platformProductId: text("platform_product_id").unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"),
  currency: text("currency").default("ZAR"),
  availability: text("availability").default("in stock"),
  condition: text("condition"),
  brand: text("brand"),
  category: text("category"),
  imageUrl: text("image_url"),
  url: text("url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("products_catalog_id_idx").on(t.catalogId),
]));

/**
 * WhatsApp Conversations (separate from general conversations)
 */
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  phoneNumber: text("phone_number").notNull(),
  platformConversationId: text("platform_conversation_id").unique(),
  userName: text("user_name"),
  lastMessage: text("last_message"),
  lastMessageTime: timestamp("last_message_time"),
  unread: boolean("unread").default(true),
  status: text("status").default("open"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("wa_conversations_channel_id_idx").on(t.channelId),
  index("wa_conversations_phone_number_idx").on(t.phoneNumber),
  index("wa_conversations_unread_idx").on(t.unread),
  index("wa_conversations_status_idx").on(t.status),
]));

/**
 * WhatsApp Messages
 */
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => whatsappConversations.id),
  platformMessageId: text("platform_message_id").unique(),
  direction: text("direction").notNull(),
  messageType: text("message_type").notNull(),
  content: text("content"),
  mediaUrl: text("media_url"),
  timestamp: timestamp("timestamp").notNull(),
  status: text("status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("wa_messages_conversation_id_idx").on(t.conversationId),
  index("wa_messages_direction_idx").on(t.direction),
  index("wa_messages_status_idx").on(t.status),
  index("wa_messages_conversation_ts_idx").on(t.conversationId, t.timestamp),
]));

/**
 * Meta Pixel Events (Conversions API tracking)
 */
export const pixelEvents = pgTable("pixel_events", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  eventName: text("event_name").notNull(),
  eventId: text("event_id").unique(),
  userData: jsonb("user_data"),
  customData: jsonb("custom_data"),
  sourceUrl: text("source_url"),
  userAgent: text("user_agent"),
  fbp: text("fbp"),
  fbc: text("fbc"),
  sentToMeta: boolean("sent_to_meta").default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("pixel_events_channel_id_idx").on(t.channelId),
  index("pixel_events_event_name_idx").on(t.eventName),
]));

/**
 * WhatsApp Sales Products (independent from Meta Commerce)
 */
export const salesProducts = pgTable("sales_products", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  currency: text("currency").default("ZAR"),
  image: text("image"),
  category: text("category"),
  features: text("features").array(),
  specifications: jsonb("specifications"),
  availability: text("availability").default("in stock"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("sales_products_channel_id_idx").on(t.channelId),
  index("sales_products_is_active_idx").on(t.isActive),
  index("sales_products_category_idx").on(t.category),
]));

/**
 * Shopping Carts (per conversation/user)
 */
export const shoppingCarts = pgTable("shopping_carts", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => whatsappConversations.id),
  userId: text("user_id"),
  phoneNumber: text("phone_number"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("shopping_carts_conversation_id_idx").on(t.conversationId),
  index("shopping_carts_status_idx").on(t.status),
]));

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
  priceAtTime: integer("price_at_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("cart_items_cart_id_idx").on(t.cartId),
  index("cart_items_product_id_idx").on(t.productId),
]));

/**
 * Orders (converted from carts)
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  platformOrderId: text("platform_order_id"),
  cartId: integer("cart_id").references(() => shoppingCarts.id),
  conversationId: integer("conversation_id").references(() => whatsappConversations.id),
  phoneNumber: text("phone_number").notNull(),
  userName: text("user_name"),
  status: text("status").default("pending"),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").default("ZAR"),
  shippingAddress: jsonb("shipping_address"),
  notes: text("notes"),
  whatsappMessageId: text("whatsapp_message_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("orders_cart_id_idx").on(t.cartId),
  index("orders_conversation_id_idx").on(t.conversationId),
  index("orders_status_idx").on(t.status),
  index("orders_phone_number_idx").on(t.phoneNumber),
]));

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
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  priceAtTime: integer("price_at_time").notNull(),
  subtotal: integer("subtotal").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("order_items_order_id_idx").on(t.orderId),
  index("order_items_product_id_idx").on(t.productId),
]));

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
  subtype: text("subtype").default("CUSTOM"),
  approximateCount: integer("approximate_count"),
  status: text("status").default("ACTIVE"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("custom_audiences_channel_id_idx").on(t.channelId),
]));

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
}, (t) => ([
  index("audience_users_audience_id_idx").on(t.audienceId),
]));

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
}, (t) => ([
  index("ad_creatives_channel_id_idx").on(t.channelId),
]));

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
}, (t) => ([
  index("ad_previews_ad_id_idx").on(t.adId),
  index("ad_previews_creative_id_idx").on(t.creativeId),
]));

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
}, (t) => ([
  index("product_sets_catalog_id_idx").on(t.catalogId),
]));

/**
 * Product Feed Syncs
 */
export const productFeedSyncs = pgTable("product_feed_syncs", {
  id: serial("id").primaryKey(),
  catalogId: integer("catalog_id")
    .notNull()
    .references(() => productCatalogs.id),
  feedUrl: text("feed_url"),
  syncStatus: text("sync_status").default("pending"),
  productsSynced: integer("products_synced").default(0),
  productsFailed: integer("products_failed").default(0),
  error: text("error"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => ([
  index("product_feed_syncs_catalog_id_idx").on(t.catalogId),
]));

/**
 * Order Fulfillments
 */
export const orderFulfillments = pgTable("order_fulfillments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  fulfillmentType: text("fulfillment_type").notNull(),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  status: text("status").default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("order_fulfillments_order_id_idx").on(t.orderId),
]));

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
}, (t) => ([
  index("inventory_snapshots_catalog_id_idx").on(t.catalogId),
  index("inventory_snapshots_product_id_idx").on(t.productId),
]));

/**
 * Message Templates
 */
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  platform: text("platform").notNull(),
  templateName: text("template_name").notNull(),
  templateId: text("template_id"),
  category: text("category"),
  language: text("language").default("en"),
  content: jsonb("content").notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("message_templates_channel_id_idx").on(t.channelId),
  index("message_templates_platform_idx").on(t.platform),
  index("message_templates_status_idx").on(t.status),
]));

/**
 * Broadcast Campaigns
 */
export const broadcastCampaigns = pgTable("broadcast_campaigns", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  name: text("name").notNull(),
  platform: text("platform").notNull(),
  templateId: integer("template_id").references(() => messageTemplates.id),
  recipients: jsonb("recipients").notNull(),
  status: text("status").default("draft"),
  scheduledAt: timestamp("scheduled_at"),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("broadcast_campaigns_channel_id_idx").on(t.channelId),
  index("broadcast_campaigns_template_id_idx").on(t.templateId),
  index("broadcast_campaigns_status_idx").on(t.status),
]));

/**
 * Auto Response Rules
 */
export const autoResponseRules = pgTable("auto_response_rules", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  name: text("name").notNull(),
  trigger: text("trigger").notNull(),
  triggerValue: text("trigger_value"),
  response: text("response").notNull(),
  templateId: integer("template_id").references(() => messageTemplates.id),
  isActive: boolean("is_active").default(true),
  priority: integer("priority").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ([
  index("auto_response_rules_channel_id_idx").on(t.channelId),
  index("auto_response_rules_is_active_idx").on(t.isActive),
]));

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
}, (t) => ([
  index("post_insights_post_id_idx").on(t.postId),
  uniqueIndex("post_insights_post_date_uniq").on(t.postId, t.date),
]));

/**
 * Audience Insights (demographics and behavior)
 */
export const audienceInsights = pgTable("audience_insights", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  date: timestamp("date").notNull(),
  demographics: jsonb("demographics"),
  locations: jsonb("locations"),
  interests: jsonb("interests"),
  behaviors: jsonb("behaviors"),
  devices: jsonb("devices"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("audience_insights_channel_id_idx").on(t.channelId),
  uniqueIndex("audience_insights_channel_date_uniq").on(t.channelId, t.date),
]));

/**
 * Conversion Events (tracking)
 */
export const conversionEvents = pgTable("conversion_events", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").references(() => channels.id),
  pixelId: text("pixel_id"),
  eventName: text("event_name").notNull(),
  eventId: text("event_id").unique(),
  eventValue: integer("event_value"),
  currency: text("currency").default("ZAR"),
  userData: jsonb("user_data"),
  customData: jsonb("custom_data"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ([
  index("conversion_events_channel_id_idx").on(t.channelId),
  index("conversion_events_event_name_idx").on(t.eventName),
]));

