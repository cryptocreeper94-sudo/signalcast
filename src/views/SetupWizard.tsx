import React, { useState, useEffect, useRef } from 'react';
import InfoBubble from '../components/InfoBubble';

const TENANT_ID = 'direct'; // Default tenant for self-service users

interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  devPortal: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  timeEstimate: string;
  quickStart: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  steps: { title: string; detail: string }[];
  tips: string[];
  warnings?: string[];
}

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: 'rgba(0, 255, 120, 0.08)', text: 'var(--success)', border: 'rgba(0, 255, 120, 0.2)' },
  Medium: { bg: 'rgba(255, 200, 0, 0.08)', text: '#ffcc00', border: 'rgba(255, 200, 0, 0.2)' },
  Advanced: { bg: 'rgba(255, 100, 60, 0.08)', text: '#ff6b3c', border: 'rgba(255, 100, 60, 0.2)' },
};

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'twitter', name: 'X / Twitter', icon: '𝕏', color: '#1da1f2',
    devPortal: 'https://developer.twitter.com/en/portal/dashboard',
    difficulty: 'Medium', timeEstimate: '10 min',
    quickStart: 'Get 4 API keys from the X Developer Portal and paste them below. You need a developer account with "Read and Write" permissions.',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Consumer API Key' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'Your Consumer API Secret' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Your Access Token' },
      { key: 'accessTokenSecret', label: 'Access Token Secret', placeholder: 'Your Access Token Secret' },
    ],
    steps: [
      { title: 'Sign in to Developer Portal', detail: 'Go to developer.twitter.com and sign in with the X account you want to post from.' },
      { title: 'Create a new App', detail: 'Click "Projects & Apps" → "Overview" → "Create App". Name it something like "SignalCast Automation".' },
      { title: 'Set App Permissions', detail: 'In Settings → User authentication → set app permissions to "Read and Write". This is critical — without it, posts will fail.' },
      { title: 'Generate API Keys', detail: 'Go to "Keys and Tokens" tab. Under "Consumer Keys", click "Regenerate" and copy both the API Key and API Secret.' },
      { title: 'Generate Access Tokens', detail: 'Under "Authentication Tokens", click "Generate" for Access Token and Secret. Copy both values.' },
      { title: 'Paste & Connect', detail: 'Paste all 4 values in the fields below, click "Test Connection", then "Save & Activate".' },
    ],
    tips: [
      'Free tier: 1,500 tweets/month (50/day)',
      'Basic tier ($100/mo): 3,000 tweets/month',
      'Always set permissions BEFORE generating tokens',
    ],
    warnings: ['If posts fail with 403, your app permissions are still set to "Read Only" — regenerate tokens after changing permissions.'],
  },
  {
    id: 'facebook', name: 'Facebook', icon: 'f', color: '#1877f2',
    devPortal: 'https://developers.facebook.com/apps/',
    difficulty: 'Advanced', timeEstimate: '15 min',
    quickStart: 'You need a Facebook Page and a long-lived Page Access Token from the Meta developer tools. Instagram uses the same token.',
    fields: [
      { key: 'pageId', label: 'Page ID', placeholder: 'Your Facebook Page ID (numeric)' },
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'Long-lived Page Access Token' },
    ],
    steps: [
      { title: 'Create a Meta App', detail: 'Go to developers.facebook.com → "Create App" → select "Business" type. This takes 2 minutes.' },
      { title: 'Add Products', detail: 'In the App Dashboard, add "Facebook Login" and "Pages" products to your app.' },
      { title: 'Find your Page ID', detail: 'Go to your Facebook Page → About section. The Page ID is displayed (a long number like 123456789).' },
      { title: 'Open Graph API Explorer', detail: 'Go to developers.facebook.com/tools/explorer/. Select your app from the dropdown.' },
      { title: 'Get User Token', detail: 'Click "Generate Access Token". Select permissions: pages_manage_posts, pages_read_engagement. Authorize.' },
      { title: 'Exchange for Long-Lived Token', detail: 'Use the token debugger or API call: GET /oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_TOKEN}' },
      { title: 'Get Page Token', detail: 'Call: GET /{PAGE_ID}?fields=access_token&access_token={LONG_LIVED_USER_TOKEN}. The returned token never expires.' },
      { title: 'Paste & Connect', detail: 'Paste the Page ID and Page Access Token below, test, and activate.' },
    ],
    tips: [
      'Long-lived page tokens never expire — set up once and forget',
      'You must be an admin of the Facebook Page',
      'The test button verifies by fetching your Page name',
    ],
  },
  {
    id: 'instagram', name: 'Instagram', icon: '📷', color: '#e4405f',
    devPortal: 'https://developers.facebook.com/apps/',
    difficulty: 'Medium', timeEstimate: '5 min',
    quickStart: 'Instagram uses your Facebook Page token. Set up Facebook first, then just add your Instagram Business Account ID.',
    fields: [
      { key: 'accountId', label: 'Instagram Business Account ID', placeholder: 'Numeric Instagram Account ID' },
      { key: 'username', label: 'Instagram Username', placeholder: '@yourusername (optional, for display)' },
    ],
    steps: [
      { title: 'Switch to Business Account', detail: 'In Instagram app: Settings → Account → Switch to Professional Account → Business.' },
      { title: 'Link to Facebook Page', detail: 'In Instagram settings, connect your account to the Facebook Page you set up above.' },
      { title: 'Set up Facebook First', detail: 'Complete the Facebook setup above — Instagram uses the exact same app and token.' },
      { title: 'Get Instagram Account ID', detail: 'In Graph API Explorer: GET /me/accounts?fields=instagram_business_account. The ID is in the response.' },
      { title: 'Paste & Connect', detail: 'Enter your Account ID below. Posts will use your Facebook Page Access Token automatically.' },
    ],
    tips: [
      'Instagram requires a valid image URL — text-only posts are not supported',
      'Images must be publicly accessible URLs',
      'The Container API creates media first, then publishes (takes ~15 seconds)',
    ],
    warnings: ['You MUST set up Facebook first. Instagram posting depends on the Facebook Page Access Token.'],
  },
  {
    id: 'discord', name: 'Discord', icon: '💬', color: '#5865f2',
    devPortal: 'https://discord.com/developers/applications',
    difficulty: 'Easy', timeEstimate: '2 min',
    quickStart: 'Just create a webhook in your Discord server and paste the URL. That\'s literally it — the easiest platform to set up.',
    fields: [
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...', type: 'url' },
    ],
    steps: [
      { title: 'Open Server Settings', detail: 'Right-click your Discord server name → "Server Settings".' },
      { title: 'Create Webhook', detail: 'Click "Integrations" → "Webhooks" → "New Webhook".' },
      { title: 'Configure & Copy', detail: 'Name the webhook "SignalCast", pick the channel to post in, then click "Copy Webhook URL".' },
      { title: 'Paste & Connect', detail: 'Paste the webhook URL below — done! Click test to verify.' },
    ],
    tips: [
      'Webhooks are channel-specific — one webhook per channel',
      'Posts appear as rich embeds with your webhook name and avatar',
      'No rate limits for normal posting frequency',
    ],
  },
  {
    id: 'telegram', name: 'Telegram', icon: '✈️', color: '#0088cc',
    devPortal: 'https://t.me/BotFather',
    difficulty: 'Easy', timeEstimate: '3 min',
    quickStart: 'Create a bot with @BotFather, add it to your channel as admin, and paste the token + channel ID.',
    fields: [
      { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11' },
      { key: 'channelId', label: 'Channel ID', placeholder: '@yourchannel or -1001234567890' },
    ],
    steps: [
      { title: 'Create a Bot', detail: 'Open Telegram, search for @BotFather, send /newbot and follow the prompts.' },
      { title: 'Copy Bot Token', detail: 'BotFather will give you a token like 123456:ABC-DEF.... Copy it.' },
      { title: 'Set up a Channel', detail: 'Create a Telegram channel (or use existing). Add your bot as an admin with "Post Messages" permission.' },
      { title: 'Get Channel ID', detail: 'Public: use @username format. Private: forward a message to @RawDataBot to get the numeric ID.' },
      { title: 'Paste & Connect', detail: 'Enter bot token and channel ID below, test, and activate.' },
    ],
    tips: [
      'Bot must be admin in the channel with "Post Messages" permission',
      'Public channels: @mychannel format',
      'Private channels: -1001234567890 format',
    ],
  },
  {
    id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0a66c2',
    devPortal: 'https://www.linkedin.com/developers/apps',
    difficulty: 'Advanced', timeEstimate: '20 min',
    quickStart: 'Requires a LinkedIn Company Page, a developer app with Marketing API access (needs approval), and an OAuth token.',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'OAuth 2.0 Access Token' },
      { key: 'organizationId', label: 'Organization ID', placeholder: 'Your LinkedIn Company Page ID' },
    ],
    steps: [
      { title: 'Create Developer App', detail: 'Go to linkedin.com/developers/apps → "Create app". Attach it to your Company Page.' },
      { title: 'Request API Products', detail: 'In your app, request "Share on LinkedIn" and "Marketing Developer Platform" products.' },
      { title: 'Wait for Approval', detail: 'Share on LinkedIn is instant. Marketing Developer Platform may take 1-2 weeks for approval.' },
      { title: 'Generate Access Token', detail: 'Once approved, go to Auth tab. Generate an OAuth 2.0 token with scopes: w_member_social, w_organization_social.' },
      { title: 'Find Organization ID', detail: 'Your Organization ID is in your Company Page URL: linkedin.com/company/{ID}.' },
      { title: 'Paste & Connect', detail: 'Enter access token and Organization ID below.' },
    ],
    tips: [
      'Access tokens expire in 60 days — you\'ll need to refresh periodically',
      'You must be an admin of the Company Page',
      'Marketing Developer Platform approval can take 1-2 weeks',
    ],
    warnings: ['LinkedIn tokens expire every 60 days. Set a calendar reminder to refresh.'],
  },
  {
    id: 'reddit', name: 'Reddit', icon: '🤖', color: '#ff4500',
    devPortal: 'https://www.reddit.com/prefs/apps',
    difficulty: 'Advanced', timeEstimate: '15 min',
    quickStart: 'Create a Reddit "script" app, get OAuth credentials, and generate a refresh token through the authorization flow.',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'App Client ID (under app name)' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'App Client Secret' },
      { key: 'refreshToken', label: 'Refresh Token', placeholder: 'OAuth2 Refresh Token' },
      { key: 'subreddit', label: 'Subreddit', placeholder: 'Target subreddit (without r/)' },
    ],
    steps: [
      { title: 'Create Reddit App', detail: 'Go to reddit.com/prefs/apps → "create another app". Select "script" type.' },
      { title: 'Configure App', detail: 'Name it, set redirect URI to http://localhost:8080, and create.' },
      { title: 'Copy Credentials', detail: 'Your Client ID is shown under the app name. The Secret is labeled below.' },
      { title: 'Authorize & Get Code', detail: 'Visit: https://www.reddit.com/api/v1/authorize?client_id=YOUR_ID&response_type=code&state=test&redirect_uri=http://localhost:8080&duration=permanent&scope=submit,identity' },
      { title: 'Exchange for Refresh Token', detail: 'POST to /api/v1/access_token with the authorization code to get a permanent refresh token.' },
      { title: 'Paste & Connect', detail: 'Enter all credentials and your target subreddit below.' },
    ],
    tips: [
      'Max 1 post per 10 minutes per subreddit',
      'Self-posts work best; link posts may be filtered',
      'Some subreddits require minimum karma to post',
    ],
    warnings: ['Reddit aggressively rate-limits automated posting. Space your posts at least 10 minutes apart.'],
  },
  {
    id: 'pinterest', name: 'Pinterest', icon: '📌', color: '#e60023',
    devPortal: 'https://developers.pinterest.com/apps/',
    difficulty: 'Medium', timeEstimate: '10 min',
    quickStart: 'Create a Pinterest developer app, generate an API v5 token with pin write access, and specify which board to pin to.',
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'Pinterest API v5 Access Token' },
      { key: 'boardId', label: 'Board ID', placeholder: 'Target Board ID (numeric)' },
    ],
    steps: [
      { title: 'Create Developer App', detail: 'Go to developers.pinterest.com → create a new app.' },
      { title: 'Generate Access Token', detail: 'In app settings, generate a token with scopes: pins:read, pins:write, boards:read.' },
      { title: 'Find Board ID', detail: 'Use the API: GET /v5/boards to list your boards and IDs. Or check the board URL.' },
      { title: 'Paste & Connect', detail: 'Enter access token and target board ID below.' },
    ],
    tips: [
      'Every pin requires an image URL — text-only pins are not possible',
      'Pinterest favors vertical images (2:3 aspect ratio)',
      'Use descriptive titles with keywords for discoverability',
    ],
  },
  {
    id: 'nextdoor', name: 'Nextdoor', icon: '🏘️', color: '#8dd14f',
    devPortal: 'https://nextdoor.com/agency/',
    difficulty: 'Advanced', timeEstimate: '30+ min',
    quickStart: 'Nextdoor API access requires agency partner status. Apply through their partner program.',
    fields: [
      { key: 'agencyId', label: 'Agency ID', placeholder: 'Your Nextdoor Agency ID' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'Bearer access token' },
    ],
    steps: [
      { title: 'Apply for Agency Access', detail: 'Contact Nextdoor\'s partner team or apply at nextdoor.com/agency/ for Agency API access.' },
      { title: 'Receive Credentials', detail: 'Once approved, you\'ll receive an Agency ID and API credentials via email.' },
      { title: 'Generate Bearer Token', detail: 'Use the provided OAuth flow to generate a Bearer access token.' },
      { title: 'Paste & Connect', detail: 'Enter Agency ID and Bearer token below.' },
    ],
    tips: [
      'API access is limited to agency partners',
      'Content should be locally relevant — community-first platform',
      'Posts go to your managed neighborhood feeds',
    ],
    warnings: ['Nextdoor API access is invite-only. Most users will not have access.'],
  },
];

interface SetupProps {
  initialPlatform?: string | null;
  onPlatformOpened?: () => void;
}

export default function SetupWizard({ initialPlatform, onPlatformOpened }: SetupProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, Record<string, string>>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Record<string, Set<number>>>({});
  const platformRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetch('/api/platforms').then(r => r.json()).then(d => setConnectedPlatforms(d.platforms || [])).catch(() => {});
  }, []);

  // Auto-expand the platform selected from Command Center
  useEffect(() => {
    if (initialPlatform) {
      setExpanded(initialPlatform);
      onPlatformOpened?.();
      // Scroll to the platform card after a short delay for rendering
      setTimeout(() => {
        platformRefs.current[initialPlatform]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [initialPlatform]);

  const toggleStep = (platformId: string, stepIndex: number) => {
    setCompletedSteps(prev => {
      const current = new Set(prev[platformId] || []);
      if (current.has(stepIndex)) current.delete(stepIndex); else current.add(stepIndex);
      return { ...prev, [platformId]: current };
    });
  };

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

  const getFilledFieldCount = (platformId: string, totalFields: number) => {
    const creds = credentials[platformId] || {};
    return Object.values(creds).filter(v => v.trim().length > 0).length;
  };

  return (
    <div className="entrance-stagger">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title shimmer-text">Platform Setup</h1>
            <p className="view-subtitle">{connectedPlatforms.length} of 9 platforms connected • Click any platform below for a full walkthrough</p>
          </div>
          <InfoBubble
            title="Platform Setup Wizard"
            content={<>
              <p>Connect your social media accounts in <strong>3 simple steps</strong>:</p>
              <ol>
                <li><strong>Click a platform</strong> to expand its complete setup guide</li>
                <li><strong>Follow the numbered steps</strong> — each one tells you exactly what to do</li>
                <li><strong>Paste your credentials</strong>, click "Test Connection", then "Save & Activate"</li>
              </ol>
              <p>Once connected, the platform appears as <strong>Live</strong> and is available for broadcasting.</p>
              <p>Your credentials are stored securely in the database and never exposed after saving.</p>
            </>}
          />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="glass-panel mb-24 entrance-stagger entrance-stagger-1" style={{ padding: 20 }}>
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

        {/* Quick-pick platform strip */}
        <div className="flex gap-8 mt-16" style={{ flexWrap: 'wrap' }}>
          {PLATFORMS.map(p => {
            const isConnected = connectedPlatforms.includes(p.id);
            const diffStyle = DIFFICULTY_COLORS[p.difficulty];
            return (
              <button
                key={p.id}
                className={`toggle-chip ${expanded === p.id ? 'selected' : ''}`}
                onClick={() => {
                  setExpanded(expanded === p.id ? null : p.id);
                  setTimeout(() => platformRefs.current[p.id]?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                }}
                style={{
                  gap: 6,
                  borderColor: isConnected ? 'rgba(0,255,212,0.3)' : undefined,
                }}
              >
                <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                <span>{p.name}</span>
                {isConnected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 6px var(--success)', flexShrink: 0 }} />}
                {!isConnected && (
                  <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 100, background: diffStyle.bg, color: diffStyle.text, border: `1px solid ${diffStyle.border}` }}>
                    {p.difficulty}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform Cards */}
      <div className="flex flex-col gap-12">
        {PLATFORMS.map((platform, i) => {
          const isExpanded = expanded === platform.id;
          const isConnected = connectedPlatforms.includes(platform.id);
          const result = testResults[platform.id];
          const diffStyle = DIFFICULTY_COLORS[platform.difficulty];
          const stepsCompleted = completedSteps[platform.id]?.size || 0;
          const filledFields = getFilledFieldCount(platform.id, platform.fields.length);

          return (
            <div
              key={platform.id}
              ref={el => { platformRefs.current[platform.id] = el; }}
              className={`glass-panel interactive hover-lift entrance-stagger ${isConnected ? 'connected' : ''}`}
              style={{
                animationDelay: `${i * 0.04}s`,
                borderColor: isExpanded ? 'rgba(0,255,212,0.2)' : isConnected ? 'rgba(0,255,212,0.3)' : undefined,
                boxShadow: isExpanded ? '0 0 30px rgba(0,255,212,0.04)' : undefined,
              }}
            >
              {/* Header */}
              <div
                className="panel-header energy-line"
                onClick={() => setExpanded(isExpanded ? null : platform.id)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <span className="panel-title" style={{ gap: 10 }}>
                  <span className="icon" style={{ fontSize: '1.4rem' }}>{platform.icon}</span>
                  <span>{platform.name}</span>
                  {isConnected && <span className="deploy-status success" style={{ marginLeft: 4 }}>LIVE</span>}
                  {!isConnected && (
                    <span style={{
                      fontSize: '0.6rem', padding: '2px 8px', borderRadius: 100, fontWeight: 700,
                      background: diffStyle.bg, color: diffStyle.text, border: `1px solid ${diffStyle.border}`,
                    }}>
                      {platform.difficulty} • {platform.timeEstimate}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-8">
                  {!isExpanded && !isConnected && (
                    <span className="text-xs" style={{ color: 'var(--accent)', fontWeight: 600 }}>Set Up →</span>
                  )}
                  <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', transition: 'transform 0.3s var(--ease-spring)', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="panel-body animate-in" style={{ borderTop: '1px solid var(--void-border)' }}>

                  {/* Quick Start Banner */}
                  <div className="glass-panel mb-24" style={{ padding: 16, background: 'rgba(0,255,212,0.03)', borderColor: 'rgba(0,255,212,0.12)' }}>
                    <div className="flex items-center gap-8 mb-4">
                      <span style={{ fontSize: '1rem' }}>⚡</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>Quick Start</span>
                      <a href={platform.devPortal} target="_blank" rel="noopener" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                        Open {platform.name} Developer Portal ↗
                      </a>
                    </div>
                    <p className="text-sm text-muted" style={{ lineHeight: 1.6, margin: 0 }}>{platform.quickStart}</p>
                  </div>

                  {/* Warnings */}
                  {platform.warnings?.map((w, j) => (
                    <div key={j} className="glass-panel mb-16" style={{ padding: 12, background: 'rgba(255,60,60,0.04)', borderColor: 'rgba(255,60,60,0.15)' }}>
                      <span className="text-xs" style={{ color: 'var(--error)' }}>⚠️ {w}</span>
                    </div>
                  ))}

                  {/* Step-by-Step Guide */}
                  <div className="mb-24">
                    <div className="flex items-center gap-8 mb-16">
                      <span className="text-sm font-bold">📋 Step-by-Step Guide</span>
                      <span className="text-xs text-muted">{stepsCompleted}/{platform.steps.length} completed</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {platform.steps.map((step, j) => {
                        const isDone = completedSteps[platform.id]?.has(j);
                        return (
                          <div
                            key={j}
                            onClick={() => toggleStep(platform.id, j)}
                            style={{
                              display: 'flex', alignItems: 'flex-start', gap: 12,
                              padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                              background: isDone ? 'rgba(0,255,120,0.04)' : 'rgba(0,0,0,0.15)',
                              border: `1px solid ${isDone ? 'rgba(0,255,120,0.15)' : 'transparent'}`,
                              transition: 'all 0.2s var(--ease-out)',
                            }}
                          >
                            {/* Step number / check */}
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.7rem', fontWeight: 800,
                              background: isDone ? 'var(--success)' : 'rgba(255,255,255,0.06)',
                              color: isDone ? 'var(--void-black)' : 'var(--text-muted)',
                              transition: 'all 0.2s',
                            }}>
                              {isDone ? '✓' : j + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '0.8rem', fontWeight: 700, marginBottom: 2,
                                color: isDone ? 'var(--success)' : 'var(--text-primary)',
                                textDecoration: isDone ? 'line-through' : 'none',
                                opacity: isDone ? 0.7 : 1,
                              }}>
                                {step.title}
                              </div>
                              <div style={{
                                fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5,
                                opacity: isDone ? 0.5 : 1,
                              }}>
                                {step.detail}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tips */}
                  <div className="glass-panel mb-24" style={{ padding: 16, background: 'rgba(0,255,212,0.02)', borderColor: 'rgba(0,255,212,0.08)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>💡 Pro Tips</span>
                    <ul style={{ margin: '8px 0 0', paddingLeft: 16 }}>
                      {platform.tips.map((tip, j) => (
                        <li key={j} className="text-xs text-muted" style={{ marginBottom: 4, lineHeight: 1.5 }}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Credential Inputs */}
                  <div className="mb-24">
                    <div className="flex items-center gap-8 mb-12">
                      <span className="text-sm font-bold">🔐 Credentials</span>
                      <span className="text-xs text-muted">{filledFields}/{platform.fields.length} fields filled</span>
                      {filledFields === platform.fields.length && (
                        <span style={{ fontSize: '0.6rem', padding: '2px 8px', borderRadius: 100, background: 'rgba(0,255,120,0.1)', color: 'var(--success)', border: '1px solid rgba(0,255,120,0.2)', fontWeight: 700 }}>
                          Ready to test
                        </span>
                      )}
                    </div>
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

                  {/* Action Buttons */}
                  <div className="glass-panel" style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderColor: 'var(--void-border)' }}>
                    <div className="flex gap-12 items-center" style={{ flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => testConnection(platform)}
                        disabled={testing === platform.id || filledFields === 0}
                        style={{ gap: 6 }}
                      >
                        {testing === platform.id ? '⏳ Testing...' : '🔍 Test Connection'}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => saveCredentials(platform)}
                        disabled={saving === platform.id || !result?.success}
                        style={{ gap: 6 }}
                      >
                        {saving === platform.id ? '⏳ Saving...' : '🚀 Save & Activate'}
                      </button>
                      {result && (
                        <span className="text-sm" style={{ color: result.success ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
                          {result.message}
                        </span>
                      )}
                    </div>
                    {!result && (
                      <p className="text-xs text-muted mt-8" style={{ margin: '8px 0 0' }}>
                        Fill in your credentials above, then click "Test Connection" to verify they work. Once verified, click "Save & Activate" to go live.
                      </p>
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
