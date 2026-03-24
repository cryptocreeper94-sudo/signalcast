import React, { useState, useEffect } from 'react';
import InfoBubble from '../components/InfoBubble';

const TENANT_ID = 'direct'; // Default tenant for self-service users

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  devPortal: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  steps: string[];
  tips: string[];
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'twitter', name: 'X / Twitter', icon: '𝕏', color: '#1da1f2',
    devPortal: 'https://developer.twitter.com/en/portal/dashboard',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter your API Key (Consumer Key)' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'Enter your API Secret (Consumer Secret)' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Enter your Access Token' },
      { key: 'accessTokenSecret', label: 'Access Token Secret', placeholder: 'Enter your Access Token Secret' },
    ],
    steps: [
      'Go to developer.twitter.com and sign in with your X account',
      'Click "Developer Portal" → "Projects & Apps" → "+ Add App"',
      'Name your app (e.g., "SignalCast Automation")',
      'In your app settings, go to "Keys and Tokens" tab',
      'Under "Consumer Keys", click "Regenerate" and copy API Key + Secret',
      'Under "Authentication Tokens", click "Generate" and copy Access Token + Secret',
      'Make sure your App has "Read and Write" permissions (Settings → User auth settings)',
      'Paste all 4 values below and click "Test Connection"',
    ],
    tips: [
      'Free tier allows 1,500 tweets/month (50/day)',
      'Basic tier ($100/mo) allows 3,000 tweets/month',
      'Always set app permissions to "Read and Write" before generating tokens',
    ],
  },
  {
    id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877f2',
    devPortal: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'pageId', label: 'Page ID', placeholder: 'Your Facebook Page ID (numeric)' },
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'Long-lived Page Access Token' },
    ],
    steps: [
      'Go to developers.facebook.com and create a new app (type: "Business")',
      'In the App Dashboard, add the "Facebook Login" and "Pages" products',
      'Go to your Facebook Page → "About" section to find your Page ID',
      'Use the Graph API Explorer (developers.facebook.com/tools/explorer/)',
      'Select your app, click "Get User Access Token" with pages_manage_posts permission',
      'Click "Generate Access Token" and authorize your Page',
      'Exchange for a long-lived token: GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT_TOKEN',
      'Get the Page token: GET /PAGE_ID?fields=access_token&access_token=LONG_LIVED_USER_TOKEN',
      'Paste Page ID and Page Access Token below',
    ],
    tips: [
      'Long-lived page tokens never expire — you only need to set this up once',
      'Make sure you have admin access to the Facebook Page',
      'The test button verifies your token by fetching the Page name',
    ],
  },
  {
    id: 'instagram', name: 'Instagram', icon: '📷', color: '#e4405f',
    devPortal: 'https://developers.facebook.com/apps/',
    fields: [
      { key: 'accountId', label: 'Instagram Business Account ID', placeholder: 'Numeric Instagram Account ID' },
      { key: 'username', label: 'Instagram Username', placeholder: '@yourusername (optional, for display)' },
    ],
    steps: [
      'You must have an Instagram Business or Creator account (switch in IG settings)',
      'Link your Instagram Business account to a Facebook Page',
      'Set up Facebook credentials first (Instagram uses the same app and token)',
      'Use the Graph API Explorer: GET /me/accounts?fields=instagram_business_account',
      'The instagram_business_account.id is your Instagram Account ID',
      'Paste the Account ID below — posting uses your Facebook Page Access Token',
    ],
    tips: [
      'Instagram posting requires a valid image URL — text-only posts are not supported',
      'Images must be publicly accessible URLs (not local files)',
      'The Container API creates a media container first, then publishes it',
    ],
  },
  {
    id: 'discord', name: 'Discord', icon: '💬', color: '#5865f2',
    devPortal: 'https://discord.com/developers/applications',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', type: 'url' },
    ],
    steps: [
      'Open your Discord server and go to Server Settings',
      'Click "Integrations" → "Webhooks" → "New Webhook"',
      'Name the webhook (e.g., "SignalCast") and select the channel to post in',
      'Click "Copy Webhook URL"',
      'Paste the URL below — that\'s it! Discord is the simplest setup.',
    ],
    tips: [
      'Webhooks are channel-specific — create one for each channel you want to post in',
      'Posts appear as rich embeds with your webhook name and avatar',
      'No rate limits to worry about for normal posting frequency',
    ],
  },
  {
    id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088cc',
    devPortal: 'https://t.me/BotFather',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' },
      { key: 'channelId', label: 'Channel ID', placeholder: '@yourchannel or -1001234567890' },
    ],
    steps: [
      'Open Telegram and search for @BotFather',
      'Send /newbot and follow the prompts to create your bot',
      'Copy the bot token provided by BotFather',
      'Create a Telegram channel (or use an existing one)',
      'Add your bot as an admin to the channel',
      'The Channel ID is either @username (public) or the numeric ID (private)',
      'For private channels: forward a message to @RawDataBot to get the ID',
      'Paste bot token and channel ID below',
    ],
    tips: [
      'Make sure the bot is an admin in your channel with "Post Messages" permission',
      'Public channel IDs start with @ (e.g., @mychannel)',
      'Private channel IDs are negative numbers (e.g., -1001234567890)',
    ],
  },
  {
    id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0a66c2',
    devPortal: 'https://www.linkedin.com/developers/apps',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'OAuth 2.0 Access Token' },
      { key: 'organizationId', label: 'Organization ID', placeholder: 'Your LinkedIn Company Page ID' },
    ],
    steps: [
      'Go to linkedin.com/developers/apps and create a new app',
      'Request the "Share on LinkedIn" and "Marketing Developer Platform" products',
      'Once approved, go to the "Auth" tab for your app',
      'Generate an OAuth 2.0 access token with scope: w_member_social, w_organization_social',
      'Find your Organization ID in your Company Page URL (linkedin.com/company/ID)',
      'Paste access token and org ID below',
    ],
    tips: [
      'LinkedIn access tokens expire in 60 days — you\'ll need to refresh periodically',
      'You must be an admin of the Company Page to post on its behalf',
      'Marketing Developer Platform approval can take 1-2 weeks',
    ],
  },
  {
    id: 'reddit', name: 'Reddit', icon: '🤖', color: '#ff4500',
    devPortal: 'https://www.reddit.com/prefs/apps',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'App Client ID (under app name)' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'App Client Secret' },
      { key: 'refreshToken', label: 'Refresh Token', placeholder: 'OAuth2 Refresh Token' },
      { key: 'subreddit', label: 'Subreddit', placeholder: 'Target subreddit (without r/)' },
    ],
    steps: [
      'Go to reddit.com/prefs/apps and click "create another app"',
      'Select "script" type, name it, set redirect URI to http://localhost:8080',
      'Copy the Client ID (shown under the app name) and Secret',
      'To get a Refresh Token, use the OAuth2 authorization flow:',
      'Visit: https://www.reddit.com/api/v1/authorize?client_id=YOUR_ID&response_type=code&state=test&redirect_uri=http://localhost:8080&duration=permanent&scope=submit,identity',
      'After authorizing, exchange the code for a refresh token via POST to /api/v1/access_token',
      'Paste all credentials and your target subreddit below',
    ],
    tips: [
      'Reddit has strict rate limits — max 1 post per 10 minutes per subreddit',
      'Self-posts work best; link posts may be filtered by subreddit rules',
      'Some subreddits require minimum karma to post',
    ],
  },
  {
    id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#e60023',
    devPortal: 'https://developers.pinterest.com/apps/',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'Pinterest API v5 Access Token' },
      { key: 'boardId', label: 'Board ID', placeholder: 'Target Board ID (numeric)' },
    ],
    steps: [
      'Go to developers.pinterest.com and create a new app',
      'Once approved, go to the app settings to generate an access token',
      'Select pins:read, pins:write, boards:read scopes',
      'To find your Board ID, use the API: GET /v5/boards',
      'Or check the board URL — it often contains the board slug',
      'Paste access token and board ID below',
    ],
    tips: [
      'Every Pinterest pin requires an image URL — text-only pins are not possible',
      'Pins should have descriptive titles and use relevant keywords for discoverability',
      'Pinterest favors vertical images (2:3 aspect ratio)',
    ],
  },
  {
    id: 'nextdoor', name: 'Nextdoor', icon: '🏘️', color: '#8dd14f',
    devPortal: 'https://nextdoor.com/agency/',
    fields: [
      { key: 'agencyId', label: 'Agency ID', placeholder: 'Your Nextdoor Agency ID' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Bearer access token' },
    ],
    steps: [
      'Contact Nextdoor\'s partner team or apply for Agency API access',
      'Once approved, you\'ll receive an Agency ID and API credentials',
      'Generate a bearer access token through the OAuth flow',
      'Paste Agency ID and Bearer token below',
    ],
    tips: [
      'Nextdoor API access is limited to agency partners',
      'Posts are published to your managed neighborhood feeds',
      'Content should be locally relevant — Nextdoor is a community-first platform',
    ],
  },
];

export default function SetupWizard() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/platforms').then(r => r.json()).then(d => setConnectedPlatforms(d.platforms || [])).catch(() => {});
  }, []);

  const updateField = (platformId: string, key: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [platformId]: { ...(prev[platformId] || {}), [key]: value },
    }));
  };

  const testConnection = async (platform: PlatformConfig) => {
    setTesting(platform.id);
    setTestResults(prev => ({ ...prev, [platform.id]: { success: false, message: 'Testing...' } }));
    try {
      const res = await fetch('/api/platforms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platform.id, credentials: credentials[platform.id] || {} }),
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [platform.id]: data }));
    } catch (err) {
      setTestResults(prev => ({ ...prev, [platform.id]: { success: false, message: 'Network error' } }));
    }
    setTesting(null);
  };

  const saveCredentials = async (platform: PlatformConfig) => {
    setSaving(platform.id);
    try {
      const res = await fetch('/api/platforms/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          platform: platform.id,
          credentials: credentials[platform.id] || {},
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConnectedPlatforms(prev => [...new Set([...prev, platform.id])]);
        setTestResults(prev => ({ ...prev, [platform.id]: { success: true, message: '✓ Credentials saved and platform activated!' } }));
      }
    } catch (err) {
      setTestResults(prev => ({ ...prev, [platform.id]: { success: false, message: 'Failed to save' } }));
    }
    setSaving(null);
  };

  return (
    <div className="animate-in">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title">Platform Setup</h1>
            <p className="view-subtitle">{connectedPlatforms.length} of 9 platforms connected</p>
          </div>
          <InfoBubble
            title="Platform Setup Wizard"
            content={<>
              <p>Connect your social media accounts in <strong>3 simple steps</strong>:</p>
              <ol>
                <li><strong>Click a platform</strong> to expand its setup guide</li>
                <li><strong>Follow the steps</strong> to get your API credentials from the platform's developer portal</li>
                <li><strong>Paste your credentials</strong> and click "Test Connection" to validate, then "Save & Activate"</li>
              </ol>
              <p>Once connected, the platform will appear as <strong>Live</strong> and will be available for broadcasting and automation rules.</p>
              <p>Your credentials are stored securely in the database and never exposed in the UI after saving.</p>
            </>}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-panel mb-24 animate-in" style={{ padding: 20 }}>
        <div className="flex items-center gap-12 mb-8">
          <span className="text-sm font-bold">Connection Progress</span>
          <span className="text-xs text-muted">{connectedPlatforms.length}/9 platforms</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            width: `${(connectedPlatforms.length / 9) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent), var(--accent-dim))',
            borderRadius: 3,
            transition: 'width 0.6s var(--ease-out)',
          }} />
        </div>
        <div className="flex gap-6 mt-12" style={{ flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => (
            <span key={p.id} className={`platform-badge ${connectedPlatforms.includes(p.id) ? 'connected' : ''}`} style={{ fontSize: '0.65rem' }}>
              <span className="platform-icon">{p.icon}</span>
              <span className="platform-name">{p.name}</span>
              {connectedPlatforms.includes(p.id) && <span className="platform-dot" />}
            </span>
          ))}
        </div>
      </div>

      {/* Platform Cards */}
      <div className="flex flex-col gap-12">
        {PLATFORMS.map((platform, i) => {
          const isExpanded = expanded === platform.id;
          const isConnected = connectedPlatforms.includes(platform.id);
          const result = testResults[platform.id];

          return (
            <div
              key={platform.id}
              className={`glass-panel interactive animate-in ${isConnected ? 'connected' : ''}`}
              style={{ animationDelay: `${i * 0.04}s`, borderColor: isConnected ? 'rgba(0,255,212,0.3)' : undefined }}
            >
              {/* Header */}
              <div
                className="panel-header"
                onClick={() => setExpanded(isExpanded ? null : platform.id)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <span className="panel-title">
                  <span className="icon" style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                  {platform.name}
                  {isConnected && <span className="deploy-status success" style={{ marginLeft: 8 }}>LIVE</span>}
                </span>
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="panel-body animate-in" style={{ borderTop: '1px solid var(--void-border)' }}>
                  {/* Setup Steps */}
                  <div className="mb-24">
                    <h4 className="text-sm font-bold mb-12 flex items-center gap-8">
                      <span className="icon">📋</span> Setup Steps
                      <a href={platform.devPortal} target="_blank" rel="noopener" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '0.65rem', marginLeft: 'auto' }}>
                        Open Developer Portal ↗
                      </a>
                    </h4>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      {platform.steps.map((step, j) => (
                        <li key={j} className="text-sm text-muted" style={{ marginBottom: 8, lineHeight: 1.6 }}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Tips */}
                  <div className="glass-panel mb-24" style={{ padding: 16, background: 'rgba(0,255,212,0.03)', borderColor: 'rgba(0,255,212,0.1)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>💡 Tips</span>
                    <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                      {platform.tips.map((tip, j) => (
                        <li key={j} className="text-xs text-muted" style={{ marginBottom: 4, lineHeight: 1.5 }}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Credential Inputs */}
                  <div className="mb-24">
                    <h4 className="text-sm font-bold mb-12 flex items-center gap-8">
                      <span className="icon">🔐</span> Credentials
                    </h4>
                    <div className="flex flex-col gap-8">
                      {platform.fields.map(field => (
                        <div key={field.key}>
                          <label className="text-xs font-bold text-muted" style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {field.label}
                          </label>
                          <input
                            type={field.type || 'text'}
                            className="composer-textarea"
                            style={{ minHeight: 40, fontSize: '0.8rem', fontFamily: 'monospace' }}
                            value={credentials[platform.id]?.[field.key] || ''}
                            onChange={e => updateField(platform.id, field.key, e.target.value)}
                            placeholder={field.placeholder}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Test & Save Buttons */}
                  <div className="flex gap-12 items-center">
                    <button
                      className="btn btn-secondary"
                      onClick={() => testConnection(platform)}
                      disabled={testing === platform.id}
                    >
                      {testing === platform.id ? '⏳ Testing...' : '🔍 Test Connection'}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => saveCredentials(platform)}
                      disabled={saving === platform.id || !result?.success}
                    >
                      {saving === platform.id ? '⏳ Saving...' : '✓ Save & Activate'}
                    </button>
                    {result && (
                      <span className="text-sm" style={{ color: result.success ? 'var(--success)' : 'var(--error)' }}>
                        {result.message}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
