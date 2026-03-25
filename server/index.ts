/**
 * SignalCast — Express Server
 * 
 * API endpoints for the social media automation engine.
 * Serves the widget embed and dashboard.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { db } from './db.js';
import {
  marketingPosts, marketingDeploys, marketingScheduleConfigs,
  metaIntegrations, autopilotSubscriptions, scheduledPosts,
  automationRules, contentTemplates, adCampaigns
} from '../shared/schema.js';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import { getConnector, getConfiguredPlatforms, type Platform } from './connectors.js';
import { startScheduler, stopScheduler, getSchedulerStatus } from './scheduler.js';

import { stripeRouter, handleStripeWebhook } from './stripe.js';
import { registerTrustLayerSSO } from './trustLayerSSO.js';
import { registerHallmarkRoutes } from './hallmarkRoutes.js';
import { registerAffiliateRoutes } from './affiliateRoutes.js';
import { registerEcosystemRoutes } from './ecosystemRoutes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// ─── File Upload Config ─────────────────────────────────────
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// Serve uploaded images
app.use('/uploads', express.static(uploadsDir));

// Stripe webhook needs raw body — MUST come before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Mount Stripe routes
app.use('/api/stripe', stripeRouter);

// Trust Layer SSO — "Sign in with Trust Layer" consumer endpoints
registerTrustLayerSSO(app);

// Trust Layer Ecosystem — Hallmarks, Affiliate, Ecosystem Status
registerHallmarkRoutes(app);
registerAffiliateRoutes(app);
registerEcosystemRoutes(app);

// ─── Health ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'signalcast', version: '2.1.0' });
});

// ─── Image Upload ───────────────────────────────────────────
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url, filename: req.file.filename, size: req.file.size });
});

// ─── Scheduler Status ───────────────────────────────────────
app.get('/api/scheduler/status', (_req, res) => {
  res.json(getSchedulerStatus());
});

app.post('/api/scheduler/start', (_req, res) => {
  startScheduler();
  res.json({ success: true, message: 'Scheduler started' });
});

app.post('/api/scheduler/stop', (_req, res) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped' });
});

// ─── Configured Platforms ───────────────────────────────────
app.get('/api/platforms', (_req, res) => {
  res.json({ platforms: getConfiguredPlatforms() });
});

// ─── Manual Post to Platform ────────────────────────────────
app.post('/api/post', async (req, res) => {
  const { platform, content, imageUrl } = req.body;
  if (!platform || !content) {
    return res.status(400).json({ error: 'platform and content required' });
  }
  const connector = getConnector(platform as Platform);
  if (!connector) {
    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  }
  if (!connector.isConfigured()) {
    return res.status(400).json({ error: `${platform} not configured` });
  }
  const result = await connector.post(content, imageUrl);

  await db.insert(marketingDeploys).values({
    platform,
    status: result.success ? 'success' : 'failed',
    externalId: result.externalId,
    errorMessage: result.error,
  });

  res.json(result);
});

// ─── Broadcast to All Configured Platforms ──────────────────
app.post('/api/broadcast', async (req, res) => {
  const { content, imageUrl, platforms } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const targetPlatforms = (platforms as Platform[]) || getConfiguredPlatforms();
  const results: Record<string, any> = {};

  for (const platform of targetPlatforms) {
    const connector = getConnector(platform);
    if (!connector?.isConfigured()) {
      results[platform] = { success: false, error: 'Not configured' };
      continue;
    }
    results[platform] = await connector.post(content, imageUrl);

    await db.insert(marketingDeploys).values({
      platform,
      status: results[platform].success ? 'success' : 'failed',
      externalId: results[platform].externalId,
      errorMessage: results[platform].error,
    });
  }

  res.json({ results });
});

// ─── Marketing Posts CRUD ───────────────────────────────────
app.get('/api/posts', async (req, res) => {
  const tenantId = (req.query.tenantId as string) || 'shared';
  const posts = await db.select().from(marketingPosts)
    .where(eq(marketingPosts.tenantId, tenantId))
    .orderBy(desc(marketingPosts.createdAt))
    .limit(100);
  res.json(posts);
});

app.post('/api/posts', async (req, res) => {
  const { tenantId, content, category, imageUrl } = req.body;
  const [post] = await db.insert(marketingPosts).values({
    tenantId: tenantId || 'shared',
    content,
    category: category || 'general',
    imageUrl,
  }).returning();
  res.json(post);
});

app.delete('/api/posts/:id', async (req, res) => {
  await db.update(marketingPosts)
    .set({ isActive: false })
    .where(eq(marketingPosts.id, req.params.id));
  res.json({ success: true });
});

// ─── Deploy History ─────────────────────────────────────────
app.get('/api/deploys', async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const deploys = await db.select().from(marketingDeploys)
    .orderBy(desc(marketingDeploys.deployedAt))
    .limit(limit);
  res.json(deploys);
});

// ═══════════════════════════════════════════════════════════════
// PLATFORM CREDENTIALS — Test & Save
// ═══════════════════════════════════════════════════════════════

app.post('/api/platforms/test', async (req, res) => {
  const { platform, credentials } = req.body;
  if (!platform || !credentials) {
    return res.status(400).json({ error: 'platform and credentials required' });
  }

  try {
    let success = false;
    let message = '';

    switch (platform) {
      case 'twitter': {
        const { apiKey, apiSecret, accessToken, accessTokenSecret } = credentials;
        if (apiKey && apiSecret && accessToken && accessTokenSecret) {
          success = true;
          message = 'X/Twitter credentials validated — will verify on first post';
        } else {
          message = 'Missing required: API Key, API Secret, Access Token, Access Token Secret';
        }
        break;
      }
      case 'facebook': {
        const { pageId, pageAccessToken } = credentials;
        if (!pageId || !pageAccessToken) { message = 'Missing: Page ID or Page Access Token'; break; }
        try {
          const fbRes = await fetch(`https://graph.facebook.com/v21.0/${pageId}?access_token=${pageAccessToken}&fields=name`);
          if (fbRes.ok) {
            const data = await fbRes.json() as any;
            success = true;
            message = `✓ Connected to Facebook Page: ${data.name}`;
          } else { message = 'Invalid token or Page ID — check your credentials'; }
        } catch { message = 'Could not reach Facebook API'; }
        break;
      }
      case 'instagram': {
        const { accountId } = credentials;
        if (!accountId) { message = 'Missing: Instagram Business Account ID'; break; }
        success = true;
        message = 'Instagram Account ID saved — requires Facebook Page token for posting';
        break;
      }
      case 'discord': {
        const { webhookUrl } = credentials;
        if (!webhookUrl?.includes('discord.com/api/webhooks')) { message = 'Invalid Discord webhook URL format'; break; }
        success = true;
        message = '✓ Discord webhook URL validated';
        break;
      }
      case 'telegram': {
        const { botToken, channelId } = credentials;
        if (!botToken || !channelId) { message = 'Missing: Bot Token or Channel ID'; break; }
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
          if (tgRes.ok) {
            const data = await tgRes.json() as any;
            success = true;
            message = `✓ Connected as Telegram bot: @${data.result?.username}`;
          } else { message = 'Invalid bot token'; }
        } catch { message = 'Could not reach Telegram API'; }
        break;
      }
      case 'linkedin': {
        const { accessToken, organizationId } = credentials;
        if (!accessToken || !organizationId) { message = 'Missing: Access Token or Organization ID'; break; }
        success = true;
        message = '✓ LinkedIn credentials saved — will verify on first post';
        break;
      }
      case 'reddit': {
        const { clientId, clientSecret, refreshToken, subreddit } = credentials;
        if (!clientId || !clientSecret || !refreshToken) { message = 'Missing: Client ID, Client Secret, or Refresh Token'; break; }
        success = true;
        message = `✓ Reddit credentials saved${subreddit ? ` for r/${subreddit}` : ''}`;
        break;
      }
      case 'pinterest': {
        const { accessToken, boardId } = credentials;
        if (!accessToken || !boardId) { message = 'Missing: Access Token or Board ID'; break; }
        success = true;
        message = '✓ Pinterest credentials saved — will verify on first pin';
        break;
      }
      case 'nextdoor': {
        const { agencyId, accessToken } = credentials;
        if (!agencyId || !accessToken) { message = 'Missing: Agency ID or Access Token'; break; }
        success = true;
        message = '✓ Nextdoor Agency credentials saved';
        break;
      }
      default:
        message = `Unknown platform: ${platform}`;
    }

    res.json({ success, message, platform });
  } catch (err: any) {
    res.json({ success: false, message: err.message, platform });
  }
});

app.put('/api/platforms/credentials', async (req, res) => {
  const { tenantId, platform, credentials } = req.body;
  if (!tenantId || !platform || !credentials) {
    return res.status(400).json({ error: 'tenantId, platform, and credentials required' });
  }

  try {
    const updateData: Record<string, any> = { updatedAt: new Date() };

    switch (platform) {
      case 'twitter':
        updateData.twitterApiKey = credentials.apiKey;
        updateData.twitterApiSecret = credentials.apiSecret;
        updateData.twitterAccessToken = credentials.accessToken;
        updateData.twitterAccessTokenSecret = credentials.accessTokenSecret;
        updateData.twitterConnected = true;
        break;
      case 'facebook':
        updateData.facebookPageId = credentials.pageId;
        updateData.facebookPageAccessToken = credentials.pageAccessToken;
        updateData.facebookPageName = credentials.pageName || '';
        updateData.facebookConnected = true;
        break;
      case 'instagram':
        updateData.instagramAccountId = credentials.accountId;
        updateData.instagramUsername = credentials.username || '';
        updateData.instagramConnected = true;
        break;
      case 'linkedin':
        updateData.linkedinAccessToken = credentials.accessToken;
        updateData.linkedinOrganizationId = credentials.organizationId;
        updateData.linkedinConnected = true;
        break;
      case 'reddit':
        updateData.redditClientId = credentials.clientId;
        updateData.redditClientSecret = credentials.clientSecret;
        updateData.redditRefreshToken = credentials.refreshToken;
        updateData.redditSubreddit = credentials.subreddit;
        updateData.redditConnected = true;
        break;
      case 'pinterest':
        updateData.pinterestAccessToken = credentials.accessToken;
        updateData.pinterestBoardId = credentials.boardId;
        updateData.pinterestConnected = true;
        break;
      case 'nextdoor':
        updateData.nextdoorAgencyId = credentials.agencyId;
        updateData.nextdoorAccessToken = credentials.accessToken;
        updateData.nextdoorConnected = true;
        break;
    }

    const existing = await db.select().from(metaIntegrations)
      .where(eq(metaIntegrations.tenantId, tenantId));

    if (existing.length > 0) {
      const [updated] = await db.update(metaIntegrations)
        .set(updateData)
        .where(eq(metaIntegrations.tenantId, tenantId))
        .returning();
      res.json({ success: true, integration: updated });
    } else {
      const [created] = await db.insert(metaIntegrations)
        .values({ tenantId, ...updateData })
        .returning();
      res.json({ success: true, integration: created });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Meta Integrations ──────────────────────────────────────
app.get('/api/integrations/:tenantId', async (req, res) => {
  const [integration] = await db.select().from(metaIntegrations)
    .where(eq(metaIntegrations.tenantId, req.params.tenantId));
  res.json(integration || null);
});

app.put('/api/integrations/:tenantId', async (req, res) => {
  const existing = await db.select().from(metaIntegrations)
    .where(eq(metaIntegrations.tenantId, req.params.tenantId));

  if (existing.length > 0) {
    const [updated] = await db.update(metaIntegrations)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(metaIntegrations.tenantId, req.params.tenantId))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(metaIntegrations)
      .values({ tenantId: req.params.tenantId, ...req.body })
      .returning();
    res.json(created);
  }
});

// ═══════════════════════════════════════════════════════════════
// AUTOMATION RULES
// ═══════════════════════════════════════════════════════════════

app.get('/api/rules/:tenantId', async (req, res) => {
  const rules = await db.select().from(automationRules)
    .where(eq(automationRules.tenantId, req.params.tenantId))
    .orderBy(asc(automationRules.platform));
  res.json(rules);
});

app.post('/api/rules', async (req, res) => {
  const [rule] = await db.insert(automationRules).values(req.body).returning();
  res.json(rule);
});

app.put('/api/rules/:id', async (req, res) => {
  const [updated] = await db.update(automationRules)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(automationRules.id, req.params.id))
    .returning();
  res.json(updated);
});

app.delete('/api/rules/:id', async (req, res) => {
  await db.delete(automationRules).where(eq(automationRules.id, req.params.id));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// CONTENT TEMPLATES
// ═══════════════════════════════════════════════════════════════

app.get('/api/templates', async (req, res) => {
  const tenantId = (req.query.tenantId as string) || 'shared';
  const category = req.query.category as string;

  const templates = await db.select().from(contentTemplates)
    .where(eq(contentTemplates.isActive, true))
    .orderBy(desc(contentTemplates.createdAt))
    .limit(200);

  const filtered = templates.filter(t => t.tenantId === 'shared' || t.tenantId === tenantId);
  const result = category ? filtered.filter(t => t.category === category) : filtered;

  res.json(result);
});

app.post('/api/templates', async (req, res) => {
  const [template] = await db.insert(contentTemplates).values(req.body).returning();
  res.json(template);
});

app.put('/api/templates/:id', async (req, res) => {
  const [updated] = await db.update(contentTemplates)
    .set(req.body)
    .where(eq(contentTemplates.id, req.params.id))
    .returning();
  res.json(updated);
});

app.delete('/api/templates/:id', async (req, res) => {
  await db.update(contentTemplates)
    .set({ isActive: false })
    .where(eq(contentTemplates.id, req.params.id));
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// AD CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

app.get('/api/campaigns', async (req, res) => {
  const tenantId = req.query.tenantId as string;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required' });

  const campaigns = await db.select().from(adCampaigns)
    .where(eq(adCampaigns.tenantId, tenantId))
    .orderBy(desc(adCampaigns.createdAt));
  res.json(campaigns);
});

app.post('/api/campaigns', async (req, res) => {
  const [campaign] = await db.insert(adCampaigns).values(req.body).returning();
  res.json(campaign);
});

app.put('/api/campaigns/:id', async (req, res) => {
  const [updated] = await db.update(adCampaigns)
    .set({ ...req.body, updatedAt: new Date() })
    .where(eq(adCampaigns.id, req.params.id))
    .returning();
  res.json(updated);
});

app.delete('/api/campaigns/:id', async (req, res) => {
  await db.delete(adCampaigns).where(eq(adCampaigns.id, req.params.id));
  res.json({ success: true });
});

// ─── Autopilot Subscriptions ────────────────────────────────
app.get('/api/subscriptions', async (_req, res) => {
  const subs = await db.select().from(autopilotSubscriptions)
    .orderBy(desc(autopilotSubscriptions.createdAt));
  res.json(subs);
});

// ─── Widget Embed Script ────────────────────────────────────
app.get('/widget.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  var SC_BASE = '${process.env.APP_URL || 'https://signalcast.tlid.io'}';
  var container = document.createElement('div');
  container.id = 'signalcast-widget';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';
  var btn = document.createElement('button');
  btn.id = 'signalcast-toggle';
  btn.innerHTML = '📡';
  btn.style.cssText = 'width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#0a0a0a,#1a1a2e);color:#00ffd4;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(0,255,212,0.3);transition:all 0.3s;';
  var panel = document.createElement('iframe');
  panel.id = 'signalcast-panel';
  panel.src = SC_BASE + '/widget';
  panel.style.cssText = 'width:380px;height:560px;border:none;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,0.5);display:none;margin-bottom:12px;background:#0a0a0a;';
  btn.onclick = function() {
    var isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    btn.innerHTML = isOpen ? '📡' : '✕';
  };
  container.appendChild(panel);
  container.appendChild(btn);
  document.body.appendChild(container);
})();
  `.trim());
});

// ─── Serve static in production ─────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

// ─── Start ──────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[SignalCast] Server running on port ${PORT}`);
  console.log(`[SignalCast] Platforms: ${getConfiguredPlatforms().join(', ') || 'none configured'}`);

  if (process.env.DATABASE_URL) {
    startScheduler();
  } else {
    console.log('[SignalCast] No DATABASE_URL — scheduler not started');
  }
});

export default app;
