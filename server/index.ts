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
import { fileURLToPath } from 'url';
import { db } from './db.js';
import {
  marketingPosts, marketingDeploys, marketingScheduleConfigs,
  metaIntegrations, autopilotSubscriptions, scheduledPosts
} from '../shared/schema.js';
import { eq, desc, asc, and, sql } from 'drizzle-orm';
import { getConnector, getConfiguredPlatforms, type Platform } from './connectors.js';
import { startScheduler, stopScheduler, getSchedulerStatus } from './scheduler.js';

import { stripeRouter, handleStripeWebhook } from './stripe.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Stripe webhook needs raw body — MUST come before express.json()
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(express.json());

// Mount Stripe routes
app.use('/api/stripe', stripeRouter);

// ─── Health ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'signalcast', version: '1.0.0' });
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

  // Log deploy
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
  var SC_BASE = '${process.env.APP_URL || 'https://signalcast.ad'}';
  
  // Create widget container
  var container = document.createElement('div');
  container.id = 'signalcast-widget';
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;';
  
  // Create toggle button
  var btn = document.createElement('button');
  btn.id = 'signalcast-toggle';
  btn.innerHTML = '📡';
  btn.style.cssText = 'width:56px;height:56px;border-radius:50%;border:none;background:linear-gradient(135deg,#0a0a0a,#1a1a2e);color:#00ffd4;font-size:24px;cursor:pointer;box-shadow:0 4px 20px rgba(0,255,212,0.3);transition:all 0.3s;';
  btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };
  
  // Create iframe panel
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
  console.log(`[SignalCast] Widget embed: /widget.js`);
  console.log(`[SignalCast] Platforms: ${getConfiguredPlatforms().join(', ') || 'none configured'}`);

  // Auto-start scheduler if DB is configured
  if (process.env.DATABASE_URL) {
    startScheduler();
  } else {
    console.log('[SignalCast] No DATABASE_URL — scheduler not started');
  }
});

export default app;
