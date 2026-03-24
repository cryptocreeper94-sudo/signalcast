import {
  pgTable, varchar, text, integer, boolean, timestamp,
  real, decimal, index, jsonb
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================
// SIGNALCAST SCHEMA
// Social media automation for the Trust Layer ecosystem
// ============================================

// Marketing Posts - Content library for social media rotation (tenant-scoped)
export const marketingPosts = pgTable("marketing_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().default("shared"),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"), // general, promo, tips, testimonial
  imageUrl: text("image_url"),
  usageCount: integer("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_marketing_posts_tenant").on(table.tenantId),
  index("idx_marketing_posts_category").on(table.category),
  index("idx_marketing_posts_active").on(table.isActive),
]);

export const insertMarketingPostSchema = createInsertSchema(marketingPosts).omit({
  id: true, usageCount: true, lastUsedAt: true, createdAt: true,
});
export type InsertMarketingPost = z.infer<typeof insertMarketingPostSchema>;
export type MarketingPost = typeof marketingPosts.$inferSelect;

// Marketing Images - Image library for rotation
export const marketingImages = pgTable("marketing_images", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  filename: text("filename").notNull(),
  filePath: text("file_path").notNull(),
  altText: text("alt_text"),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  tags: text("tags").array(),
  width: integer("width"),
  height: integer("height"),
  aspectRatio: text("aspect_ratio"),
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  isActive: boolean("is_active").default(true),
  isFavorite: boolean("is_favorite").default(false),
  isUserUploaded: boolean("is_user_uploaded").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_marketing_images_tenant").on(table.tenantId),
  index("idx_marketing_images_category").on(table.category),
  index("idx_marketing_images_active").on(table.isActive),
]);

export const insertMarketingImageSchema = createInsertSchema(marketingImages).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMarketingImage = z.infer<typeof insertMarketingImageSchema>;
export type MarketingImage = typeof marketingImages.$inferSelect;

// Marketing Schedule Configs - Per-platform posting schedules
export const marketingScheduleConfigs = pgTable("marketing_schedule_configs", {
  platform: text("platform").primaryKey(),
  intervalMinutes: integer("interval_minutes").default(240).notNull(),
  lastDeployedAt: timestamp("last_deployed_at"),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMarketingScheduleConfigSchema = createInsertSchema(marketingScheduleConfigs).omit({
  lastDeployedAt: true, createdAt: true, updatedAt: true,
});
export type InsertMarketingScheduleConfig = z.infer<typeof insertMarketingScheduleConfigSchema>;
export type MarketingScheduleConfig = typeof marketingScheduleConfigs.$inferSelect;

// Marketing Deploys - History of all deployments
export const marketingDeploys = pgTable("marketing_deploys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => marketingPosts.id),
  platform: text("platform").notNull(),
  status: text("status").notNull().default("pending"),
  externalId: text("external_id"),
  errorMessage: text("error_message"),
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
}, (table) => [
  index("idx_marketing_deploys_platform").on(table.platform),
  index("idx_marketing_deploys_status").on(table.status),
  index("idx_marketing_deploys_deployed_at").on(table.deployedAt),
]);

export const insertMarketingDeploySchema = createInsertSchema(marketingDeploys).omit({
  id: true, deployedAt: true,
});
export type InsertMarketingDeploy = z.infer<typeof insertMarketingDeploySchema>;
export type MarketingDeploy = typeof marketingDeploys.$inferSelect;

// Meta Integrations - Facebook, Instagram, X, Nextdoor credentials per tenant
export const metaIntegrations = pgTable("meta_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull().unique(),
  appId: text("app_id"),

  // Facebook
  facebookPageId: text("facebook_page_id"),
  facebookPageName: text("facebook_page_name"),
  facebookPageAccessToken: text("facebook_page_access_token"),
  facebookConnected: boolean("facebook_connected").default(false),

  // Instagram
  instagramAccountId: text("instagram_account_id"),
  instagramUsername: text("instagram_username"),
  instagramConnected: boolean("instagram_connected").default(false),

  // Token metadata
  tokenExpiresAt: timestamp("token_expires_at"),
  tokenType: text("token_type").default("long_lived"),
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),

  // Analytics cache
  facebookFollowers: integer("facebook_followers"),
  facebookReach: integer("facebook_reach"),
  instagramFollowers: integer("instagram_followers"),
  instagramReach: integer("instagram_reach"),

  // X/Twitter
  twitterApiKey: text("twitter_api_key"),
  twitterApiSecret: text("twitter_api_secret"),
  twitterAccessToken: text("twitter_access_token"),
  twitterAccessTokenSecret: text("twitter_access_token_secret"),
  twitterUsername: text("twitter_username"),
  twitterConnected: boolean("twitter_connected").default(false),

  // Nextdoor
  nextdoorAgencyId: text("nextdoor_agency_id"),
  nextdoorAccessToken: text("nextdoor_access_token"),
  nextdoorRefreshToken: text("nextdoor_refresh_token"),
  nextdoorTokenExpiresAt: timestamp("nextdoor_token_expires_at"),
  nextdoorConnected: boolean("nextdoor_connected").default(false),

  // LinkedIn
  linkedinAccessToken: text("linkedin_access_token"),
  linkedinOrganizationId: text("linkedin_organization_id"),
  linkedinConnected: boolean("linkedin_connected").default(false),

  // Reddit
  redditClientId: text("reddit_client_id"),
  redditClientSecret: text("reddit_client_secret"),
  redditRefreshToken: text("reddit_refresh_token"),
  redditSubreddit: text("reddit_subreddit"),
  redditConnected: boolean("reddit_connected").default(false),

  // Pinterest
  pinterestAccessToken: text("pinterest_access_token"),
  pinterestBoardId: text("pinterest_board_id"),
  pinterestConnected: boolean("pinterest_connected").default(false),

  // Meta Ads
  adAccountId: text("ad_account_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_meta_integrations_tenant").on(table.tenantId),
]);

export const insertMetaIntegrationSchema = createInsertSchema(metaIntegrations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMetaIntegration = z.infer<typeof insertMetaIntegrationSchema>;
export type MetaIntegration = typeof metaIntegrations.$inferSelect;

// Autopilot Subscriptions - B2B marketing service subscribers
export const autopilotSubscriptions = pgTable("autopilot_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").notNull(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  website: text("website"),
  status: text("status").notNull().default("pending"),
  isInternal: boolean("is_internal").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  metaConnected: boolean("meta_connected").default(false),
  facebookPageId: text("facebook_page_id"),
  facebookPageName: text("facebook_page_name"),
  instagramAccountId: text("instagram_account_id"),
  instagramUsername: text("instagram_username"),
  postingSchedule: text("posting_schedule").default("4x-daily"),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).default("59.00"),
  activatedAt: timestamp("activated_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAutopilotSubscriptionSchema = createInsertSchema(autopilotSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutopilotSubscription = z.infer<typeof insertAutopilotSubscriptionSchema>;
export type AutopilotSubscription = typeof autopilotSubscriptions.$inferSelect;

// Scheduled Posts - Track posts scheduled via API
export const scheduledPosts = pgTable("scheduled_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  message: text("message").notNull(),
  messageEs: text("message_es"),
  imageUrl: text("image_url"),
  platform: text("platform").notNull(),
  language: text("language").default("en"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  publishedAt: timestamp("published_at"),
  status: text("status").default("scheduled"),
  facebookPostId: text("facebook_post_id"),
  instagramMediaId: text("instagram_media_id"),
  errorMessage: text("error_message"),
  contentType: text("content_type"),
  contentCategory: text("content_category"),
  rotationType: text("rotation_type"),
  contentLibraryId: varchar("content_library_id"),
  adCampaignId: varchar("ad_campaign_id"),
  impressions: integer("impressions"),
  reach: integer("reach"),
  engagement: integer("engagement"),
  clicks: integer("clicks"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  saves: integer("saves"),
  leadsGenerated: integer("leads_generated"),
  performanceScore: real("performance_score"),
  lastAnalyticsSync: timestamp("last_analytics_sync"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_scheduled_posts_tenant").on(table.tenantId),
  index("idx_scheduled_posts_status").on(table.status),
  index("idx_scheduled_posts_scheduled").on(table.scheduledAt),
  index("idx_scheduled_posts_content_type").on(table.contentType),
]);

export const insertScheduledPostSchema = createInsertSchema(scheduledPosts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScheduledPost = z.infer<typeof insertScheduledPostSchema>;
export type ScheduledPost = typeof scheduledPosts.$inferSelect;

// Content Performance Analytics
export const contentAnalytics = pgTable("content_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  postId: varchar("post_id").references(() => scheduledPosts.id),
  platform: text("platform").notNull(),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  engagement: integer("engagement").default(0),
  clicks: integer("clicks").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
});

export type ContentAnalytic = typeof contentAnalytics.$inferSelect;
