import React, { useState, useEffect } from 'react';

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
    // Aggregate stats from deploys
    fetch('/api/deploys?limit=200').then(r => r.json()).then((all: Deploy[]) => {
      const total = all.length;
      const success = all.filter(d => d.status === 'success').length;
      setStats({ total, success, failed: total - success });
    }).catch(() => {});
  }, []);

  const successRate = stats ? (stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0) : 0;

  return (
    <div className="animate-in">
      <div className="view-header">
        <h1 className="view-title">Command Center</h1>
        <p className="view-subtitle">Mission control for your social media operations</p>
      </div>

      {/* Metric Cards */}
      <div className="bento-grid bento-4 mb-24">
        <div className="glass-panel metric-card animate-in animate-in-delay-1">
          <span className="metric-label">Total Deploys</span>
          <span className="metric-value">{stats?.total ?? '—'}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-2">
          <span className="metric-label">Platforms Active</span>
          <span className="metric-value">{platforms.length}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-3">
          <span className="metric-label">Success Rate</span>
          <span className="metric-value">{stats ? `${successRate}%` : '—'}</span>
          {stats && stats.total > 0 && (
            <span className={`metric-trend ${successRate >= 90 ? 'up' : 'down'}`}>
              {successRate >= 90 ? '↑' : '↓'} {successRate >= 90 ? 'Healthy' : 'Needs attention'}
            </span>
          )}
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-4">
          <span className="metric-label">Tenants</span>
          <span className="metric-value">{schedulerStatus?.tenantsCount ?? '—'}</span>
        </div>
      </div>

      {/* Two-column: Deploy Feed + Platform Health */}
      <div className="bento-grid bento-2 mb-24">
        {/* Deploy Feed */}
        <div className="glass-panel animate-in animate-in-delay-3">
          <div className="panel-header">
            <span className="panel-title"><span className="icon">📋</span> Recent Deploys</span>
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
            <span className="panel-title"><span className="icon">⚡</span> Platform Health</span>
            <span className="panel-subtitle">{platforms.length}/9 connected</span>
          </div>
          <div className="panel-body">
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
