import React, { useState, useEffect } from 'react';

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

  // Platform breakdown
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
        <h1 className="view-title">Analytics</h1>
        <p className="view-subtitle">Deploy history and performance metrics</p>
      </div>

      {/* Summary Stats */}
      <div className="bento-grid bento-4 mb-24">
        <div className="glass-panel metric-card animate-in animate-in-delay-1">
          <span className="metric-label">Total Deploys</span>
          <span className="metric-value">{total}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-2">
          <span className="metric-label">Successful</span>
          <span className="metric-value" style={{ background: 'linear-gradient(135deg, #00ff78, #00cc60)', WebkitBackgroundClip: 'text' }}>{success}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-3">
          <span className="metric-label">Failed</span>
          <span className="metric-value neutral">{failed}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-4">
          <span className="metric-label">Success Rate</span>
          <span className="metric-value">{rate}%</span>
        </div>
      </div>

      <div className="bento-grid bento-2 mb-24">
        {/* Platform Breakdown */}
        <div className="glass-panel animate-in animate-in-delay-3">
          <div className="panel-header">
            <span className="panel-title"><span className="icon">📈</span> Platform Breakdown</span>
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
            <span className="panel-title"><span className="icon">🔍</span> Filters</span>
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
          <span className="panel-title"><span className="icon">📋</span> Deploy Log</span>
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
