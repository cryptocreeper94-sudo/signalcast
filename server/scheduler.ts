/**
 * SignalCast — Unified Ecosystem Scheduler
 * 
 * Posts hourly 6am-10pm CST, rotating across all ecosystem tenants.
 * Posts to Facebook, Instagram, and X/Twitter with rate-limit protection.
 */

import { db } from './db.js';
import { metaIntegrations, marketingImages, marketingPosts } from '../shared/schema.js';
import { eq, and, asc, sql } from 'drizzle-orm';
import { TwitterConnector, type DeployResult } from './connectors.js';

let postingInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;
const CHECK_INTERVAL_MS = 60 * 1000;

// Ecosystem tenants that rotate through posting slots
const ECOSYSTEM_TENANTS = [
  'darkwave', 'dwtl', 'pulse', 'tlid', 'tradeworksai',
  'paintpros', 'tldriverconnect', 'garagebot', 'trustshield',
  'lotopspro', 'vedasolus', 'brewboard', 'orbitstaffing',
  'orbycommander', 'strikeagent'
];

const TENANT_URLS: Record<string, string> = {
  'darkwave': 'https://dwsc.io/welcome',
  'dwtl': 'https://dwtl.io/welcome',
  'pulse': 'https://dwsc.io/welcome',
  'tlid': 'https://tlid.io',
  'tradeworksai': 'https://tradeworksai.com',
  'paintpros': 'https://paintpros.io',
  'tldriverconnect': 'https://dwsc.io/welcome',
  'garagebot': 'https://dwsc.io/welcome',
  'trustshield': 'https://trustshield.tech',
  'lotopspro': 'https://dwsc.io/welcome',
  'vedasolus': 'https://dwsc.io/welcome',
  'brewboard': 'https://dwsc.io/welcome',
  'orbitstaffing': 'https://dwsc.io/welcome',
  'orbycommander': 'https://dwsc.io/welcome',
  'strikeagent': 'https://dwsc.io/welcome'
};

// Hourly posting 6am-10pm CST = 17 slots/day
const POSTING_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

// X/Twitter rate limit protection
let xPostsThisSession: Map<string, number> = new Map();
const MAX_X_POSTS_PER_RESTART = 1;

function getCurrentCSTTime(): { hour: number; minute: number; dayOfWeek: number } {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return { hour: cstTime.getHours(), minute: cstTime.getMinutes(), dayOfWeek: cstTime.getDay() };
}

async function getIntegration(tenantId: string = 'darkwave') {
  const [integration] = await db.select().from(metaIntegrations)
    .where(eq(metaIntegrations.tenantId, tenantId)).limit(1);
  return integration;
}

async function getPageAccessToken(pageId: string, systemToken: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${systemToken}`
    );
    if (!response.ok) return null;
    const data = await response.json() as { access_token?: string };
    return data.access_token || null;
  } catch { return null; }
}

async function getNextImageForTenant(tenantId: string) {
  const images = await db.select().from(marketingImages)
    .where(and(eq(marketingImages.tenantId, tenantId), eq(marketingImages.isActive, true)))
    .orderBy(asc(marketingImages.usageCount), asc(marketingImages.lastUsedAt))
    .limit(1);
  return images[0] || null;
}

async function getNextPostForTenant(tenantId: string) {
  const posts = await db.select().from(marketingPosts)
    .where(and(eq(marketingPosts.tenantId, tenantId), eq(marketingPosts.isActive, true)))
    .orderBy(asc(marketingPosts.usageCount), asc(marketingPosts.lastUsedAt))
    .limit(1);
  return posts[0] || null;
}

async function postToFacebook(
  pageId: string, pageToken: string, message: string, imageUrl?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const url = imageUrl
      ? `https://graph.facebook.com/v21.0/${pageId}/photos`
      : `https://graph.facebook.com/v21.0/${pageId}/feed`;
    const body = new URLSearchParams(imageUrl
      ? { url: imageUrl, caption: message, access_token: pageToken }
      : { message, access_token: pageToken });
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      const error = await response.json() as any;
      return { success: false, error: error.error?.message || 'Post failed' };
    }
    const data = await response.json() as any;
    return { success: true, postId: data.post_id || data.id };
  } catch (error) { return { success: false, error: String(error) }; }
}

async function postToInstagram(
  igAccountId: string, pageToken: string, message: string, imageUrl: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    const containerResponse = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image_url: imageUrl, caption: message, access_token: pageToken }),
    });
    if (!containerResponse.ok) {
      const err = await containerResponse.json() as any;
      return { success: false, error: err.error?.message || 'Container failed' };
    }
    const containerData = await containerResponse.json() as { id: string };
    await new Promise(resolve => setTimeout(resolve, 5000));
    const publishResponse = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: containerData.id, access_token: pageToken }),
    });
    if (!publishResponse.ok) {
      const err = await publishResponse.json() as any;
      return { success: false, error: err.error?.message || 'Publish failed' };
    }
    const publishData = await publishResponse.json() as { id: string };
    return { success: true, mediaId: publishData.id };
  } catch (error) { return { success: false, error: String(error) }; }
}

const executedSlots: Map<string, Set<string>> = new Map();

function getTodayKey(): string {
  const now = new Date();
  const cstTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return `${cstTime.getFullYear()}-${cstTime.getMonth()}-${cstTime.getDate()}`;
}

async function checkAndExecuteScheduledPosts(): Promise<void> {
  const { hour } = getCurrentCSTTime();
  const todayKey = getTodayKey();
  if (!executedSlots.has(todayKey)) {
    executedSlots.clear();
    executedSlots.set(todayKey, new Set());
  }
  const todayExecuted = executedSlots.get(todayKey)!;
  const dueHours = POSTING_HOURS.filter(h => h <= hour);
  const pendingSlots = dueHours.filter(h => !todayExecuted.has(`${h}`));
  if (pendingSlots.length === 0) return;

  console.log(`[SignalCast] ${pendingSlots.length} pending slot(s) to execute`);

  const integration = await getIntegration();
  if (!integration || !integration.facebookPageAccessToken) {
    console.log('[SignalCast] No Meta integration found');
    return;
  }

  const pageToken = await getPageAccessToken(integration.facebookPageId!, integration.facebookPageAccessToken);
  const effectiveToken = pageToken || integration.facebookPageAccessToken;

  for (const slotHour of pendingSlots) {
    const tenantIndex = slotHour % ECOSYSTEM_TENANTS.length;
    const tenant = ECOSYSTEM_TENANTS[tenantIndex];
    console.log(`[SignalCast] Slot ${slotHour}:00 CST - Posting for ${tenant}`);

    const post = await getNextPostForTenant(tenant);
    const image = await getNextImageForTenant(tenant);

    if (!post && !image) {
      console.log(`[SignalCast] No content for ${tenant}, skipping`);
      todayExecuted.add(`${slotHour}`);
      continue;
    }

    const tenantUrl = TENANT_URLS[tenant] || 'https://dwsc.io/welcome';
    const baseMessage = post?.content || 'Discover more about what we do';
    const message = `${baseMessage}\n\n${tenantUrl}`;
    const baseUrl = `https://${process.env.APP_DOMAIN || 'signalcast.ad'}`;
    const imageUrl = image ? `${baseUrl}${image.filePath}` : undefined;

    // Facebook
    if (integration.facebookPageId) {
      const fbResult = await postToFacebook(integration.facebookPageId, effectiveToken, message, imageUrl);
      if (fbResult.success && post) {
        await db.update(marketingPosts)
          .set({ usageCount: sql`${marketingPosts.usageCount} + 1`, lastUsedAt: new Date() })
          .where(eq(marketingPosts.id, post.id));
      }
      console.log(`[SignalCast FB] ${fbResult.success ? '✓' : '✗'} ${fbResult.postId || fbResult.error || ''}`);
    }

    // Instagram
    if (integration.instagramAccountId && imageUrl) {
      const igResult = await postToInstagram(integration.instagramAccountId, effectiveToken, message, imageUrl);
      if (igResult.success && image) {
        await db.update(marketingImages)
          .set({ usageCount: sql`${marketingImages.usageCount} + 1`, lastUsedAt: new Date() })
          .where(eq(marketingImages.id, image.id));
      }
      console.log(`[SignalCast IG] ${igResult.success ? '✓' : '✗'} ${igResult.mediaId || igResult.error || ''}`);
    }

    // X/Twitter (rate-limited)
    const twitter = TwitterConnector.forTenant(integration);
    if (twitter) {
      const currentRate = xPostsThisSession.get(tenant) || 0;
      if (currentRate < MAX_X_POSTS_PER_RESTART || pendingSlots.length === 1) {
        
        let xMessage = message;
        // Dynamic generation for master tenant
        if (tenant === 'master' || tenant === 'darkwave' || tenant === 'cryptocreeper94') {
             try {
               const { generateLumeTweet } = await import('./ai-social-generator.js');
               xMessage = await generateLumeTweet();
             } catch (e) {
               console.error('[SignalCast X] Dynamic generation failed, falling back to db content', e);
             }
        }

        const xResult = await twitter.post(xMessage, imageUrl);
        xPostsThisSession.set(tenant, currentRate + 1);
        console.log(`[SignalCast X] ${xResult.success ? '✓' : '✗'} ${xResult.externalId || xResult.error || ''}`);
        if (xResult.error?.includes('429') || xResult.error?.includes('Too Many')) {
          xPostsThisSession.set(tenant, MAX_X_POSTS_PER_RESTART + 10);
          console.log(`[SignalCast X] Rate limited — skipping X for ${tenant} for remaining catch-ups`);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    todayExecuted.add(`${slotHour}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

export function startScheduler(): void {
  if (isRunning) { console.log('[SignalCast] Scheduler already running'); return; }
  console.log('[SignalCast] Starting Unified Ecosystem Scheduler...');
  console.log(`[SignalCast] Tenants: ${ECOSYSTEM_TENANTS.join(', ')}`);
  console.log('[SignalCast] Organic posts hourly 6am-10pm CST (17 posts/day)');

  xPostsThisSession.clear();
  isRunning = true;

  checkAndExecuteScheduledPosts().catch(err => console.error('[SignalCast] Initial check error:', err));
  postingInterval = setInterval(() => {
    checkAndExecuteScheduledPosts().catch(err => console.error('[SignalCast] Check error:', err));
  }, CHECK_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (postingInterval) { clearInterval(postingInterval); postingInterval = null; }
  isRunning = false;
  console.log('[SignalCast] Scheduler stopped');
}

export function getSchedulerStatus() {
  return { isRunning, tenantsCount: ECOSYSTEM_TENANTS.length, tenants: ECOSYSTEM_TENANTS };
}
