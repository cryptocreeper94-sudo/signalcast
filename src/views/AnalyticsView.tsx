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

const PLATFORM_META: Record<string, { icon: string }> = {
  twitter: { icon: '𝕏' }, discord: { icon: '💬' }, telegram: { icon: '✈️' },
  facebook: { icon: 'f' }, instagram: { icon: '📷' }, nextdoor: { icon: '🏘️' },
  linkedin: { icon: 'in' }, reddit: { icon: '🤖' }, pinterest: { icon: '📌' },
};

export default function AnalyticsView() {
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetch('/api/deploys?limit=100').then(r => r.json()).then(setDeploys).catch(() => {});
  }, []);

  const filtered = deploys.filter(d => {
    if (filter !== 'all' && d.platform !== filter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    return true;
  });

  const total = deploys.length;
  const success = deploys.filter(d => d.status === 'success').length;
  const failed = total - success;
  const rate = total > 0 ? Math.round((success / total) * 100) : 0;

  const platformBreakdown = Object.entries(
    deploys.reduce<Record<string, number>>((acc, d) => {
      acc[d.platform] = (acc[d.platform] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const uniquePlatforms = Array.from(new Set(deploys.map(d => d.platform)));

  return (
    <div className="animate-in">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title">Analytics</h1>
            <p className="view-subtitle">Deploy history and performance metrics</p>
          </div>
          <InfoBubble
            title="Analytics Dashboard"
            content={<>
              <p>The analytics dashboard gives you <strong>complete visibility</strong> into your SignalCast deployment activity.</p>
              <p><strong>What's tracked:</strong></p>
              <ul>
                <li>Every post sent to every platform</li>
                <li>Success and failure rates per platform</li>
                <li>Platform usage distribution</li>
                <li>Timestamps and external post IDs for verification</li>
              </ul>
              <p>Use the <strong>filters</strong> below to drill down by platform or status. Click any deploy row to see its external post ID for cross-referencing on the platform itself.</p>
            </>}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-image-card mb-24 animate-in">
        <img src="/images/analytics.png" alt="Analytics dashboard" />
        <div className="hero-image-overlay">
          <div>
            <div className="hero-image-label">Performance Metrics</div>
            <div className="hero-image-sublabel">Track every deployment across your platform network</div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bento-grid bento-4 mb-24">
        <div className="glass-panel metric-card animate-in animate-in-delay-1">
          <div className="flex items-center gap-4">
            <span className="metric-label">Total Deploys</span>
            <InfoBubble title="Total Deploys" content="The total number of post deployment attempts across all platforms. Each broadcast to a single platform counts as one deploy." />
          </div>
          <span className="metric-value">{total}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-2">
          <div className="flex items-center gap-4">
            <span className="metric-label">Successful</span>
            <InfoBubble title="Successful Deploys" content="Posts that were successfully published to the target platform and received a confirmation response. These posts are live and visible on the platform." />
          </div>
          <span className="metric-value" style={{ background: 'linear-gradient(135deg, #00ff78, #00cc60)', WebkitBackgroundClip: 'text' }}>{success}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-3">
          <div className="flex items-center gap-4">
            <span className="metric-label">Failed</span>
            <InfoBubble
              title="Failed Deploys"
              content={<>
                <p>Posts that encountered an error during publishing. Common causes:</p>
                <ul>
                  <li>Expired or invalid API tokens</li>
                  <li>Platform rate limiting (too many posts too fast)</li>
                  <li>Content policy violations</li>
                  <li>Network connectivity issues</li>
                  <li>Missing required fields (e.g., no image for Instagram)</li>
                </ul>
                <p>Check the deploy log below for specific error details on each failure.</p>
              </>}
            />
          </div>
          <span className="metric-value neutral">{failed}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-4">
          <div className="flex items-center gap-4">
            <span className="metric-label">Success Rate</span>
            <InfoBubble title="Success Rate" content="Percentage of all deployment attempts that completed successfully. A healthy system should maintain 90%+ success rate. Below that, check for expired tokens or rate limiting issues." />
          </div>
          <span className="metric-value">{rate}%</span>
        </div>
      </div>

      <div className="bento-grid bento-2 mb-24">
        {/* Platform Breakdown */}
        <div className="glass-panel animate-in animate-in-delay-3">
          <div className="panel-header">
            <span className="panel-title">
              <span className="icon">📈</span> Platform Breakdown
              <InfoBubble
                title="Platform Breakdown"
                content={<>
                  <p>Visual breakdown of how your deploys are distributed across platforms. The bar length represents each platform's share of total deploys.</p>
                  <p>An <strong>even distribution</strong> means your content is reaching all platforms equally. Uneven distribution may indicate some platforms are failing or aren't configured.</p>
                </>}
              />
            </span>
          </div>
          <div className="panel-body flex flex-col gap-8">
            {platformBreakdown.length === 0 ? (
              <div className="empty-state"><span className="label">No data yet</span></div>
            ) : (
              platformBreakdown.map(([platform, count]) => {
                const meta = PLATFORM_META[platform] || { icon: '?' };
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={platform} className="flex items-center gap-12" style={{ padding: '6px 0' }}>
                    <span style={{ fontSize: '1.1rem', width: 28, textAlign: 'center' }}>{meta.icon}</span>
                    <span className="text-sm font-bold" style={{ width: 80, textTransform: 'capitalize' }}>{platform}</span>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: 'linear-gradient(90deg, var(--accent), var(--accent-dim))',
                        borderRadius: 3, transition: 'width 0.6s var(--ease-out)',
                      }} />
                    </div>
                    <span className="text-xs text-muted" style={{ width: 36, textAlign: 'right' }}>{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel animate-in animate-in-delay-4">
          <div className="panel-header">
            <span className="panel-title">
              <span className="icon">🔍</span> Filters
              <InfoBubble
                title="Deploy Filters"
                content={<>
                  <p>Use filters to narrow down the deploy log below:</p>
                  <ul>
                    <li><strong>Platform filter</strong> — Show deploys for a specific platform only</li>
                    <li><strong>Status filter</strong> — Show only successful or failed deploys</li>
                  </ul>
                  <p>Filters combine — selecting "Facebook" + "Failed" shows only failed Facebook deploys. Click "All" to reset a filter.</p>
                </>}
              />
            </span>
          </div>
          <div className="panel-body">
            <p className="text-xs font-bold text-muted mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Platform</p>
            <div className="flex gap-8 mb-16" style={{ flexWrap: 'wrap' }}>
              <button className={`toggle-chip ${filter === 'all' ? 'selected' : ''}`} onClick={() => setFilter('all')}>All</button>
              {uniquePlatforms.map(p => (
                <button key={p} className={`toggle-chip ${filter === p ? 'selected' : ''}`} onClick={() => setFilter(p)}>
                  {PLATFORM_META[p]?.icon || '?'} {p}
                </button>
              ))}
            </div>
            <p className="text-xs font-bold text-muted mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</p>
            <div className="flex gap-8">
              <button className={`toggle-chip ${statusFilter === 'all' ? 'selected' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
              <button className={`toggle-chip ${statusFilter === 'success' ? 'selected' : ''}`} onClick={() => setStatusFilter('success')}>Success</button>
              <button className={`toggle-chip ${statusFilter === 'failed' ? 'selected' : ''}`} onClick={() => setStatusFilter('failed')}>Failed</button>
            </div>
            <p className="text-xs text-muted mt-16">{filtered.length} results</p>
          </div>
        </div>
      </div>

      {/* Deploy Table */}
      <div className="glass-panel animate-in animate-in-delay-5">
        <div className="panel-header">
          <span className="panel-title">
            <span className="icon">📋</span> Deploy Log
            <InfoBubble
              title="Deploy Log"
              content={<>
                <p>Complete log of all deployment activity. Each row represents a single post sent to a specific platform.</p>
                <p><strong>Columns:</strong></p>
                <ul>
                  <li><strong>Platform</strong> — The social media service the post was sent to</li>
                  <li><strong>Status</strong> — Whether the deploy succeeded or failed</li>
                  <li><strong>External ID</strong> — The post ID returned by the platform (useful for finding the post on the platform itself)</li>
                  <li><strong>Time</strong> — When the deployment occurred</li>
                </ul>
              </>}
            />
          </span>
          <span className="panel-subtitle">{filtered.length} entries</span>
        </div>
        <div style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Platform</th>
                <th>Status</th>
                <th>External ID</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4}><div className="empty-state"><span className="label">No matching deploys</span></div></td></tr>
              ) : (
                filtered.map(d => {
                  const meta = PLATFORM_META[d.platform] || { icon: '?' };
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className="flex items-center gap-8">
                          <span>{meta.icon}</span>
                          <span style={{ textTransform: 'capitalize' }}>{d.platform}</span>
                        </span>
                      </td>
                      <td><span className={`deploy-status ${d.status}`}>{d.status}</span></td>
                      <td><span className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>{d.externalId || '—'}</span></td>
                      <td><span className="text-xs text-muted">{new Date(d.deployedAt).toLocaleString()}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
