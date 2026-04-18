/**
 * SignalCast — Social Platform Connectors
 * 
 * Unified interface for posting to all social platforms.
 * Each connector implements the same post(content, imageUrl?) interface.
 */

import https from 'https';
import http from 'http';
import crypto from 'crypto';

export interface DeployResult {
  success: boolean;
  platform: string;
  externalId?: string;
  error?: string;
}

// ─── Image Download Helper ──────────────────────────────────
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location!).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// ─── OAuth 1.0a Signature (for Twitter) ─────────────────────
function generateOAuthSignature(
  method: string, url: string,
  params: Record<string, string>,
  consumerSecret: string, tokenSecret: string
): string {
  const sortedParams = Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const baseString = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
}

// ═══════════════════════════════════════════════════════════════
// TWITTER / X
// ═══════════════════════════════════════════════════════════════

export interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export class TwitterConnector {
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessTokenSecret: string;

  constructor(credentials: TwitterCredentials) {
    this.apiKey = credentials.apiKey;
    this.apiSecret = credentials.apiSecret;
    this.accessToken = credentials.accessToken;
    this.accessTokenSecret = credentials.accessTokenSecret;
  }

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret && this.accessToken && this.accessTokenSecret);
  }

  static forTenant(integration: { twitterApiKey?: string | null; twitterApiSecret?: string | null; twitterAccessToken?: string | null; twitterAccessTokenSecret?: string | null }): TwitterConnector | null {
    if (!integration.twitterApiKey || !integration.twitterApiSecret ||
        !integration.twitterAccessToken || !integration.twitterAccessTokenSecret) return null;
    return new TwitterConnector({
      apiKey: integration.twitterApiKey,
      apiSecret: integration.twitterApiSecret,
      accessToken: integration.twitterAccessToken,
      accessTokenSecret: integration.twitterAccessTokenSecret,
    });
  }

  private getOAuthHeader(method: string, url: string, additionalParams: Record<string, string> = {}): string {
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_token: this.accessToken,
      oauth_version: '1.0',
      ...additionalParams,
    };
    const signature = generateOAuthSignature(method, url, oauthParams, this.apiSecret, this.accessTokenSecret);
    oauthParams.oauth_signature = signature;
    const headerParts = Object.keys(oauthParams)
      .filter(k => k.startsWith('oauth_')).sort()
      .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`);
    return `OAuth ${headerParts.join(', ')}`;
  }

  async uploadMedia(imageUrl: string): Promise<string | null> {
    if (!this.isConfigured()) return null;
    try {
      const imageBuffer = await downloadImage(imageUrl);
      const base64Image = imageBuffer.toString('base64');
      const url = 'https://upload.twitter.com/1.1/media/upload.json';
      const bodyParams = { media_data: base64Image };
      const body = `media_data=${encodeURIComponent(base64Image)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.getOAuthHeader('POST', url, bodyParams),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      if (!response.ok) { console.error('[Twitter] Media upload failed:', await response.text()); return null; }
      const data = await response.json() as { media_id_string: string };
      return data.media_id_string;
    } catch (error) { console.error('[Twitter] Media upload error:', error); return null; }
  }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'twitter', error: 'Twitter not configured' };
    try {
      let mediaId: string | null = null;
      if (imageUrl) mediaId = await this.uploadMedia(imageUrl);
      const url = 'https://api.twitter.com/2/tweets';
      const body: { text: string; media?: { media_ids: string[] } } = { text: content };
      if (mediaId) body.media = { media_ids: [mediaId] };
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': this.getOAuthHeader('POST', url), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Twitter] Post failed:', errorText);
        return { success: false, platform: 'twitter', error: errorText };
      }
      const data = await response.json() as { data: { id: string } };
      return { success: true, platform: 'twitter', externalId: data.data.id };
    } catch (error) { return { success: false, platform: 'twitter', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// DISCORD
// ═══════════════════════════════════════════════════════════════

export class DiscordConnector {
  private webhookUrl: string;
  constructor(webhookUrl?: string) {
    this.webhookUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL || '';
  }
  isConfigured(): boolean { return !!this.webhookUrl; }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'discord', error: 'Discord not configured' };
    try {
      const body: { content: string; embeds?: { image: { url: string } }[] } = { content };
      if (imageUrl) body.embeds = [{ image: { url: imageUrl } }];
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return { success: false, platform: 'discord', error: await response.text() };
      return { success: true, platform: 'discord' };
    } catch (error) { return { success: false, platform: 'discord', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// TELEGRAM
// ═══════════════════════════════════════════════════════════════

export class TelegramConnector {
  private botToken: string;
  private channelId: string;
  constructor(botToken?: string, channelId?: string) {
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.channelId = channelId || process.env.TELEGRAM_CHANNEL_ID || '';
  }
  isConfigured(): boolean { return !!(this.botToken && this.channelId); }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'telegram', error: 'Telegram not configured' };
    try {
      const url = imageUrl
        ? `https://api.telegram.org/bot${this.botToken}/sendPhoto`
        : `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const body = imageUrl
        ? { chat_id: this.channelId, photo: imageUrl, caption: content }
        : { chat_id: this.channelId, text: content };
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return { success: false, platform: 'telegram', error: await response.text() };
      const data = await response.json() as { result: { message_id: number } };
      return { success: true, platform: 'telegram', externalId: String(data.result.message_id) };
    } catch (error) { return { success: false, platform: 'telegram', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// FACEBOOK
// ═══════════════════════════════════════════════════════════════

export class FacebookConnector {
  private pageId: string;
  private pageAccessToken: string;
  constructor(pageId?: string, token?: string) {
    this.pageId = pageId || process.env.FACEBOOK_PAGE_ID || '';
    this.pageAccessToken = token || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';
  }
  isConfigured(): boolean { return !!(this.pageId && this.pageAccessToken); }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'facebook', error: 'Facebook not configured' };
    try {
      const url = imageUrl
        ? `https://graph.facebook.com/v21.0/${this.pageId}/photos`
        : `https://graph.facebook.com/v21.0/${this.pageId}/feed`;
      const body = new URLSearchParams(imageUrl
        ? { url: imageUrl, caption: content, access_token: this.pageAccessToken }
        : { message: content, access_token: this.pageAccessToken });
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) {
        const err = await response.json() as any;
        return { success: false, platform: 'facebook', error: err.error?.message || 'Post failed' };
      }
      const data = await response.json() as { id?: string; post_id?: string };
      return { success: true, platform: 'facebook', externalId: data.post_id || data.id };
    } catch (error) { return { success: false, platform: 'facebook', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// INSTAGRAM (via Meta Graph API)
// ═══════════════════════════════════════════════════════════════

export class InstagramConnector {
  private accountId: string;
  private accessToken: string;
  constructor(accountId?: string, token?: string) {
    this.accountId = accountId || '';
    this.accessToken = token || '';
  }
  isConfigured(): boolean { return !!(this.accountId && this.accessToken); }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured() || !imageUrl) {
      return { success: false, platform: 'instagram', error: imageUrl ? 'Instagram not configured' : 'Instagram requires an image' };
    }
    try {
      // Step 1: Create media container
      const containerResponse = await fetch(`https://graph.facebook.com/v21.0/${this.accountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ image_url: imageUrl, caption: content, access_token: this.accessToken }),
      });
      if (!containerResponse.ok) {
        const err = await containerResponse.json() as any;
        return { success: false, platform: 'instagram', error: err.error?.message || 'Container failed' };
      }
      const containerData = await containerResponse.json() as { id: string };

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 2: Publish
      const publishResponse = await fetch(`https://graph.facebook.com/v21.0/${this.accountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ creation_id: containerData.id, access_token: this.accessToken }),
      });
      if (!publishResponse.ok) {
        const err = await publishResponse.json() as any;
        return { success: false, platform: 'instagram', error: err.error?.message || 'Publish failed' };
      }
      const publishData = await publishResponse.json() as { id: string };
      return { success: true, platform: 'instagram', externalId: publishData.id };
    } catch (error) { return { success: false, platform: 'instagram', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// NEXTDOOR
// ═══════════════════════════════════════════════════════════════

export class NextdoorConnector {
  private agencyId: string;
  private accessToken: string;
  constructor(agencyId?: string, token?: string) {
    this.agencyId = agencyId || '';
    this.accessToken = token || '';
  }
  isConfigured(): boolean { return !!(this.agencyId && this.accessToken); }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'nextdoor', error: 'Nextdoor not configured' };
    try {
      const body: { body: string; image_url?: string } = { body: content };
      if (imageUrl) body.image_url = imageUrl;
      const response = await fetch('https://nextdoor.com/api/agency/v1/post/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Nextdoor-Agency-ID': this.agencyId,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return { success: false, platform: 'nextdoor', error: await response.text() };
      const data = await response.json() as { id: string };
      return { success: true, platform: 'nextdoor', externalId: data.id };
    } catch (error) { return { success: false, platform: 'nextdoor', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// LINKEDIN (Company Page)
// ═══════════════════════════════════════════════════════════════

export class LinkedInConnector {
  private accessToken: string;
  private organizationId: string;
  constructor(accessToken?: string, organizationId?: string) {
    this.accessToken = accessToken || '';
    this.organizationId = organizationId || '';
  }
  isConfigured(): boolean { return !!(this.accessToken && this.organizationId); }

  async post(content: string, _imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'linkedin', error: 'LinkedIn not configured' };
    try {
      const body = {
        author: `urn:li:organization:${this.organizationId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      };
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return { success: false, platform: 'linkedin', error: await response.text() };
      const data = await response.json() as { id: string };
      return { success: true, platform: 'linkedin', externalId: data.id };
    } catch (error) { return { success: false, platform: 'linkedin', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// REDDIT
// ═══════════════════════════════════════════════════════════════

export class RedditConnector {
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;
  private subreddit: string;
  constructor(clientId?: string, clientSecret?: string, refreshToken?: string, subreddit?: string) {
    this.clientId = clientId || '';
    this.clientSecret = clientSecret || '';
    this.refreshToken = refreshToken || '';
    this.subreddit = subreddit || '';
  }
  isConfigured(): boolean { return !!(this.clientId && this.clientSecret && this.refreshToken && this.subreddit); }

  private async getAccessToken(): Promise<string | null> {
    try {
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: this.refreshToken }),
      });
      if (!response.ok) return null;
      const data = await response.json() as { access_token: string };
      return data.access_token;
    } catch { return null; }
  }

  async post(content: string, _imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'reddit', error: 'Reddit not configured' };
    try {
      const token = await this.getAccessToken();
      if (!token) return { success: false, platform: 'reddit', error: 'Failed to get Reddit access token' };
      const response = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SignalCast/1.0',
        },
        body: new URLSearchParams({
          sr: this.subreddit, kind: 'self', title: content.substring(0, 100),
          text: content, api_type: 'json',
        }),
      });
      if (!response.ok) return { success: false, platform: 'reddit', error: await response.text() };
      const data = await response.json() as { json: { data: { name: string } } };
      return { success: true, platform: 'reddit', externalId: data.json?.data?.name };
    } catch (error) { return { success: false, platform: 'reddit', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// PINTEREST
// ═══════════════════════════════════════════════════════════════

export class PinterestConnector {
  private accessToken: string;
  private boardId: string;
  constructor(accessToken?: string, boardId?: string) {
    this.accessToken = accessToken || '';
    this.boardId = boardId || '';
  }
  isConfigured(): boolean { return !!(this.accessToken && this.boardId); }

  async post(content: string, imageUrl?: string): Promise<DeployResult> {
    if (!this.isConfigured()) return { success: false, platform: 'pinterest', error: 'Pinterest not configured' };
    if (!imageUrl) return { success: false, platform: 'pinterest', error: 'Pinterest requires an image' };
    try {
      const response = await fetch('https://api.pinterest.com/v5/pins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_id: this.boardId,
          title: content.substring(0, 100),
          description: content,
          media_source: { source_type: 'image_url', url: imageUrl },
        }),
      });
      if (!response.ok) return { success: false, platform: 'pinterest', error: await response.text() };
      const data = await response.json() as { id: string };
      return { success: true, platform: 'pinterest', externalId: data.id };
    } catch (error) { return { success: false, platform: 'pinterest', error: String(error) }; }
  }
}

// ═══════════════════════════════════════════════════════════════
// CONNECTOR REGISTRY
// ═══════════════════════════════════════════════════════════════

export type Platform = 'twitter' | 'discord' | 'telegram' | 'facebook' | 'instagram' | 'nextdoor' | 'linkedin' | 'reddit' | 'pinterest';

export const platformConnectors = {
  twitter: new TwitterConnector({
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
  }),
  discord: new DiscordConnector(),
  telegram: new TelegramConnector(),
  facebook: new FacebookConnector(),
  instagram: new InstagramConnector(),
  nextdoor: new NextdoorConnector(),
  linkedin: new LinkedInConnector(),
  reddit: new RedditConnector(),
  pinterest: new PinterestConnector(),
};

export function getConnector(platform: Platform) {
  return platformConnectors[platform];
}

export function getConfiguredPlatforms(): Platform[] {
  return (Object.keys(platformConnectors) as Platform[]).filter(p => platformConnectors[p].isConfigured());
}
