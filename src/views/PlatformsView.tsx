import React from 'react';

interface Props {
  platforms: string[];
}

const ALL_PLATFORMS = [
  { id: 'twitter',   icon: '𝕏',  name: 'X / Twitter',  desc: 'Post tweets with text and media via OAuth 1.0a', envKeys: ['TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN_SECRET'] },
  { id: 'facebook',  icon: 'f',   name: 'Facebook',     desc: 'Post to Pages via Meta Graph API v21.0', envKeys: ['FACEBOOK_PAGE_ID', 'FACEBOOK_PAGE_ACCESS_TOKEN'] },
  { id: 'instagram', icon: '📷', name: 'Instagram',    desc: 'Publish photos via Meta container → publish flow', envKeys: ['(via Meta Integration table)'] },
  { id: 'discord',   icon: '💬', name: 'Discord',      desc: 'Send messages and embeds via webhook URL', envKeys: ['DISCORD_WEBHOOK_URL'] },
  { id: 'telegram',  icon: '✈️', name: 'Telegram',     desc: 'Send messages and photos via Bot API', envKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID'] },
  { id: 'linkedin',  icon: 'in',  name: 'LinkedIn',     desc: 'Post to company pages via UGC API', envKeys: ['(via Integration table)'] },
  { id: 'nextdoor',  icon: '🏘️', name: 'Nextdoor',     desc: 'Post via Agency API with bearer auth', envKeys: ['(via Integration table)'] },
  { id: 'reddit',    icon: '🤖', name: 'Reddit',       desc: 'Submit self-posts via OAuth2 refresh flow', envKeys: ['(via Integration table)'] },
  { id: 'pinterest', icon: '📌', name: 'Pinterest',    desc: 'Create pins with images via v5 API', envKeys: ['(via Integration table)'] },
];

export default function PlatformsView({ platforms }: Props) {
  return (
    <div className="animate-in">
      <div className="view-header">
        <h1 className="view-title">Platforms</h1>
        <p className="view-subtitle">{platforms.length} of 9 connectors active</p>
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
