import React, { useState, useEffect } from 'react';
import InfoBubble from '../components/InfoBubble';

interface Deploy {
  id: string;
  platform: string;
  status: string;
  externalId?: string;
  errorMessage?: string;
  deployedAt: string;
}

interface Props {
  platforms: string[];
  schedulerStatus: { isRunning: boolean; tenantsCount: number; tenants: string[] } | null;
}

const PLATFORM_META: Record<string, { icon: string; color: string }> = {
  twitter:   { icon: '𝕏', color: 'var(--twitter-color)' },
  discord:   { icon: '💬', color: 'var(--discord-color)' },
  telegram:  { icon: '✈️', color: 'var(--telegram-color)' },
  facebook:  { icon: 'f',  color: 'var(--facebook-color)' },
  instagram: { icon: '📷', color: 'var(--instagram-color)' },
  nextdoor:  { icon: '🏘️', color: 'var(--nextdoor-color)' },
  linkedin:  { icon: 'in', color: 'var(--linkedin-color)' },
  reddit:    { icon: '🤖', color: 'var(--reddit-color)' },
  pinterest: { icon: '📌', color: 'var(--pinterest-color)' },
};

const ALL_PLATFORMS = ['twitter', 'discord', 'telegram', 'facebook', 'instagram', 'nextdoor', 'linkedin', 'reddit', 'pinterest'];

export default function CommandCenter({ platforms, schedulerStatus }: Props) {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [stats, setStats] = useState<{ total: number; success: number; failed: number } | null>(null);

  useEffect(() => {
    fetch('/api/deploys?limit=10').then(r => r.json()).then(setDeploys).catch(() => {});
    fetch('/api/deploys?limit=200').then(r => r.json()).then((all: Deploy[]) => {
      const total = all.length;
      const success = all.filter(d => d.status === 'success').length;
      setStats({ total, success, failed: total - success });
    }).catch(() => {});
  }, []);

  const successRate = stats ? (stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0) : 0;

  return (
    <div className="animate-in">
      {/* Hero Banner */}
      <div className="hero-image-card mb-24 animate-in">
        <img src="/images/hero.png" alt="SignalCast Command Center" />
        <div className="hero-image-overlay">
          <div>
            <div className="hero-image-label">Command Center</div>
            <div className="hero-image-sublabel">Real-time overview of your social media operations</div>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="bento-grid bento-4 mb-24">
        <div className="glass-panel metric-card animate-in animate-in-delay-1">
          <div className="flex items-center gap-4">
            <span className="metric-label">Total Deploys</span>
            <InfoBubble
              title="Total Deploys"
              content={<>
                <p><strong>What are deploys?</strong> Every time SignalCast sends a post to a social media platform, it creates a "deploy" record. This number shows the total count of all posts sent across all your connected platforms.</p>
                <p>This includes both successful and failed attempts, giving you a complete picture of your posting activity.</p>
              </>}
            />
          </div>
          <span className="metric-value">{stats?.total ?? '—'}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-2">
          <div className="flex items-center gap-4">
            <span className="metric-label">Platforms Active</span>
            <InfoBubble
              title="Platforms Active"
              content={<>
                <p><strong>Connected platforms</strong> are social media services with valid API credentials configured. SignalCast supports 9 platforms:</p>
                <ul>
                  <li>X/Twitter (OAuth 1.0a)</li>
                  <li>Facebook Pages (Graph API)</li>
                  <li>Instagram (Meta Container API)</li>
                  <li>Discord (Webhook)</li>
                  <li>Telegram (Bot API)</li>
                  <li>LinkedIn (UGC API)</li>
                  <li>Reddit (OAuth2)</li>
                  <li>Pinterest (v5 API)</li>
                  <li>Nextdoor (Agency API)</li>
                </ul>
                <p>Head to the <strong>Platforms</strong> tab to see which are connected and get setup instructions for each.</p>
              </>}
            />
          </div>
          <span className="metric-value">{platforms.length}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-3">
          <div className="flex items-center gap-4">
            <span className="metric-label">Success Rate</span>
            <InfoBubble
              title="Success Rate"
              content={<>
                <p><strong>Success rate</strong> measures the percentage of deploy attempts that completed without errors. A healthy rate is <strong>90%+</strong>.</p>
                <p>Common reasons for failures include:</p>
                <ul>
                  <li>Expired API tokens — refresh in platform settings</li>
                  <li>Rate limiting — posting too frequently to one platform</li>
                  <li>Content policy violations — check platform-specific rules</li>
                  <li>Network timeouts — usually resolve automatically</li>
                </ul>
                <p>Check the <strong>Analytics</strong> tab for a detailed breakdown by platform.</p>
              </>}
            />
          </div>
          <span className="metric-value">{stats ? `${successRate}%` : '—'}</span>
          {stats && stats.total > 0 && (
            <span className={`metric-trend ${successRate >= 90 ? 'up' : 'down'}`}>
              {successRate >= 90 ? '↑' : '↓'} {successRate >= 90 ? 'Healthy' : 'Needs attention'}
            </span>
          )}
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-4">
          <div className="flex items-center gap-4">
            <span className="metric-label">Tenants</span>
            <InfoBubble
              title="Ecosystem Tenants"
              content={<>
                <p><strong>Tenants</strong> are the brands or services within the Trust Layer ecosystem that SignalCast automatically posts for.</p>
                <p>The scheduler rotates through all active tenants on an hourly basis between <strong>6am–10pm CST</strong>, distributing content evenly so each brand gets regular exposure across Facebook, Instagram, and X/Twitter.</p>
                <p>Each tenant has its own content library of marketing images and posts that rotate automatically.</p>
              </>}
            />
          </div>
          <span className="metric-value">{schedulerStatus?.tenantsCount ?? '—'}</span>
        </div>
      </div>

      {/* Two-column: Deploy Feed + Platform Health */}
      <div className="bento-grid bento-2 mb-24">
        {/* Deploy Feed */}
        <div className="glass-panel animate-in animate-in-delay-3">
          <div className="panel-header">
            <span className="panel-title">
              <span className="icon">📋</span> Recent Deploys
              <InfoBubble
                title="Deploy Feed"
                content={<>
                  <p>This feed shows your <strong>most recent post deployments</strong> in real-time. Each entry represents a post sent to a specific platform.</p>
                  <p><strong>Status codes:</strong></p>
                  <ul>
                    <li><strong>Success</strong> — Post was published and is live</li>
                    <li><strong>Failed</strong> — Something went wrong; check error details in Analytics</li>
                    <li><strong>Pending</strong> — Post is queued and will be sent shortly</li>
                  </ul>
                  <p>The feed auto-updates. Use the <strong>Analytics</strong> tab for filtering and full history.</p>
                </>}
              />
            </span>
            <span className="panel-subtitle">{deploys.length} latest</span>
          </div>
          <div className="panel-body flex flex-col gap-8">
            {deploys.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📡</span>
                <span className="label">No deploys yet. Compose a post to get started.</span>
              </div>
            ) : (
              deploys.map((d, i) => {
                const meta = PLATFORM_META[d.platform] || { icon: '?', color: '#888' };
                return (
                  <div key={d.id} className="deploy-item" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="deploy-item-left">
                      <span className="deploy-item-platform">{meta.icon}</span>
                      <span className="deploy-item-name">{d.platform}</span>
                    </div>
                    <div className="deploy-item-right">
                      <span className={`deploy-status ${d.status}`}>{d.status}</span>
                      <span className="deploy-time">
                        {new Date(d.deployedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Platform Health Grid */}
        <div className="glass-panel animate-in animate-in-delay-4">
          <div className="panel-header">
            <span className="panel-title">
              <span className="icon">⚡</span> Platform Health
              <InfoBubble
                title="Platform Health"
                content={<>
                  <p>This grid shows the <strong>connection status</strong> of all 9 supported platforms at a glance.</p>
                  <ul>
                    <li><strong>Live</strong> (cyan glow) — API credentials are configured and active</li>
                    <li><strong>Off</strong> (dimmed) — Platform needs API keys configured in your environment</li>
                  </ul>
                  <p>Click any platform in the <strong>Platforms</strong> tab to see setup instructions and required environment variables.</p>
                </>}
              />
            </span>
            <span className="panel-subtitle">{platforms.length}/9 connected</span>
          </div>
          <div className="panel-body">
            <div className="section-image">
              <img src="/images/platforms.png" alt="Platform network" />
            </div>
            <div className="bento-grid bento-3" style={{ gap: 8 }}>
              {ALL_PLATFORMS.map(p => {
                const meta = PLATFORM_META[p] || { icon: '?', color: '#888' };
                const connected = platforms.includes(p);
                return (
                  <div
                    key={p}
                    className={`platform-card glass-panel ${connected ? 'connected' : 'disconnected'}`}
                    style={{ padding: 14, borderRadius: 12 }}
                  >
                    <div className="platform-card-icon" style={{ width: 36, height: 36, fontSize: '1.1rem', borderRadius: 10 }}>
                      {meta.icon}
                    </div>
                    <span className="platform-card-name" style={{ fontSize: '0.7rem' }}>{p}</span>
                    <span className="platform-card-status" style={{ fontSize: '0.55rem' }}>
                      {connected ? 'Live' : 'Off'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler Status */}
      <div className="glass-panel animate-in animate-in-delay-5">
        <div className="panel-header">
          <span className="panel-title">
            <span className="icon">🔄</span> Scheduler
            <InfoBubble
              title="Automated Scheduler"
              content={<>
                <p>The scheduler is SignalCast's <strong>autonomous posting engine</strong>. It runs 24/7 on the server with no manual intervention needed.</p>
                <p><strong>How it works:</strong></p>
                <ul>
                  <li>Checks every 60 seconds for pending posting slots</li>
                  <li>Posts hourly between 6am–10pm CST (17 posts/day)</li>
                  <li>Rotates through ecosystem tenants so each brand gets regular coverage</li>
                  <li>Pulls from each tenant's content library (marketing images + posts)</li>
                  <li>Posts to Facebook, Instagram, and X/Twitter with rate-limit protection</li>
                </ul>
                <p>The scheduler respects X/Twitter's aggressive rate limits by capping posts per restart cycle.</p>
              </>}
            />
            <span className={`deploy-status ${schedulerStatus?.isRunning ? 'success' : 'failed'}`} style={{ marginLeft: 8 }}>
              {schedulerStatus?.isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </span>
        </div>
        <div className="panel-body">
          <p className="text-sm text-muted mb-8">Hourly posts 6am–10pm CST • 17 posts/day across ecosystem tenants</p>
          {schedulerStatus?.tenants && (
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {schedulerStatus.tenants.map(t => (
                <span key={t} className="toggle-chip selected" style={{ cursor: 'default' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
