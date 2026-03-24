import React from 'react';
import InfoBubble from '../components/InfoBubble';

interface Props {
  platforms: string[];
}

const ALL_PLATFORMS = [
  { id: 'twitter',   icon: '𝕏',  name: 'X / Twitter',  desc: 'Post tweets with text and media via OAuth 1.0a',
    help: 'X/Twitter uses OAuth 1.0a for authentication. You need 4 credentials: API Key, API Secret, Access Token, and Access Token Secret. Get these from developer.twitter.com by creating a project and generating keys. SignalCast supports text posts and media uploads.',
    envKeys: ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'] },
  { id: 'facebook',  icon: 'f',   name: 'Facebook',     desc: 'Post to Pages via Meta Graph API v21.0',
    help: 'Facebook uses the Meta Graph API v21.0. You need a Page Access Token and Page ID. Create these at developers.facebook.com by setting up an app, adding the "Pages" product, and generating a long-lived token. SignalCast posts text and photo content to your Page feed.',
    envKeys: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'] },
  { id: 'instagram', icon: '📷', name: 'Instagram',    desc: 'Publish photos via Meta container → publish flow',
    help: 'Instagram uses the Meta Container API, which requires a two-step process: first creating a media container with the image URL and caption, then publishing it. You need an Instagram Business Account linked to a Facebook Page. Images are required for all Instagram posts.',
    envKeys: ['(via Meta Integration table)'] },
  { id: 'discord',   icon: '💬', name: 'Discord',      desc: 'Send messages and embeds via webhook URL',
    help: 'Discord is the simplest connector — just create a webhook URL in your Discord server settings (Server Settings → Integrations → Webhooks → New Webhook). Copy the URL and add it to your environment. Posts appear as rich embeds with optional images.',
    envKeys: ['DISCORD_WEBHOOK_URL'] },
  { id: 'telegram',  icon: '✈️', name: 'Telegram',     desc: 'Send messages and photos via Bot API',
    help: 'Create a Telegram bot via @BotFather, get the bot token, and add the bot to your channel as an admin. The channel ID is typically the @username or the numeric ID. SignalCast sends both text messages and photos with captions.',
    envKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID'] },
  { id: 'linkedin',  icon: 'in',  name: 'LinkedIn',     desc: 'Post to company pages via UGC API',
    help: 'LinkedIn uses the UGC (User Generated Content) API for company page posting. You need an OAuth access token with the w_organization_social scope and your Organization ID. Posts appear as company page updates visible to followers.',
    envKeys: ['(via Integration table)'] },
  { id: 'nextdoor',  icon: '🏘️', name: 'Nextdoor',     desc: 'Post via Agency API with bearer auth',
    help: 'Nextdoor\'s Agency API requires an Agency ID and Bearer access token. Posts are published to your local community. Contact Nextdoor\'s partner team for API access and credentials.',
    envKeys: ['(via Integration table)'] },
  { id: 'reddit',    icon: '🤖', name: 'Reddit',       desc: 'Submit self-posts via OAuth2 refresh flow',
    help: 'Reddit uses OAuth2 with a refresh token flow. Create an app at reddit.com/prefs/apps (choose "script" type). You need Client ID, Client Secret, and a Refresh Token. SignalCast submits self-posts to your configured subreddit.',
    envKeys: ['(via Integration table)'] },
  { id: 'pinterest', icon: '📌', name: 'Pinterest',    desc: 'Create pins with images via v5 API',
    help: 'Pinterest\'s v5 API creates pins on your boards. You need an access token and Board ID. Images are required for all Pinterest pins. Get credentials from developers.pinterest.com. Pins include a title, description, and image.',
    envKeys: ['(via Integration table)'] },
];

export default function PlatformsView({ platforms }: Props) {
  return (
    <div className="animate-in">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title">Platforms</h1>
            <p className="view-subtitle">{platforms.length} of 9 connectors active</p>
          </div>
          <InfoBubble
            title="Platform Connectors"
            content={<>
              <p>SignalCast connects to <strong>9 social media platforms</strong> through their official APIs. Each platform has its own connector with dedicated authentication and posting logic.</p>
              <p><strong>How to connect a platform:</strong></p>
              <ul>
                <li>Get API credentials from the platform's developer portal</li>
                <li>Add the credentials as environment variables on your server (Render, Vercel, etc.)</li>
                <li>Restart the service — SignalCast auto-detects configured platforms</li>
              </ul>
              <p>Each card below shows the required environment variables. Click the <strong>ⓘ</strong> icon on any platform for step-by-step setup instructions.</p>
            </>}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-image-card mb-24 animate-in">
        <img src="/images/platforms.png" alt="Connected platforms network" />
        <div className="hero-image-overlay">
          <div>
            <div className="hero-image-label">Platform Network</div>
            <div className="hero-image-sublabel">9 platforms connected through unified API connectors</div>
          </div>
        </div>
      </div>

      <div className="bento-grid bento-3">
        {ALL_PLATFORMS.map((p, i) => {
          const connected = platforms.includes(p.id);
          return (
            <div
              key={p.id}
              className={`glass-panel platform-card ${connected ? 'connected' : 'disconnected'} interactive animate-in`}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center gap-4" style={{ width: '100%', justifyContent: 'flex-end', position: 'absolute', top: 12, right: 12 }}>
                <InfoBubble
                  title={`${p.name} Setup`}
                  content={<>
                    <p>{p.help}</p>
                    <p><strong>Required credentials:</strong></p>
                    <ul>
                      {p.envKeys.map((k, j) => <li key={j}><code>{k}</code></li>)}
                    </ul>
                    <p><strong>Status:</strong> {connected ? '✓ Connected and active' : '○ Not configured — add credentials to connect'}</p>
                  </>}
                />
              </div>
              <div className="platform-card-icon">{p.icon}</div>
              <span className="platform-card-name">{p.name}</span>
              <span className="platform-card-status">
                {connected ? '● Connected' : '○ Not configured'}
              </span>
              <p className="text-xs text-muted" style={{ marginTop: 4, lineHeight: 1.5 }}>{p.desc}</p>
              {!connected && (
                <div className="mt-8" style={{ width: '100%' }}>
                  <p className="text-xs text-muted" style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: 6, fontSize: '0.6rem' }}>
                    {p.envKeys.join(', ')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
