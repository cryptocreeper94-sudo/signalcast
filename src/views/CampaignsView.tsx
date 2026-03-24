import React, { useState, useEffect } from 'react';
import InfoBubble from '../components/InfoBubble';

const TENANT_ID = 'direct';

interface Campaign {
  id: string;
  tenantId: string;
  platform: string;
  name: string;
  objective: string;
  status: string;
  dailyBudget?: string;
  totalBudget?: string;
  spent?: string;
  startDate?: string;
  endDate?: string;
  targeting: { ageMin?: number; ageMax?: number; locations?: string[]; interests?: string[]; gender?: string };
  adContent: string;
  adHeadline?: string;
  imageUrl?: string;
  callToAction: string;
  destinationUrl?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  reach: number;
  affiliateCode?: string;
  hallmarkId?: string;
}

const PLATFORM_ICONS: Record<string, string> = {
  facebook: 'f', instagram: '📷', twitter: '𝕏', linkedin: 'in', pinterest: '📌', reddit: '🤖',
};

const AD_PLATFORMS = [
  { id: 'facebook', name: 'Facebook Ads', icon: 'f', hasAds: true },
  { id: 'instagram', name: 'Instagram Ads', icon: '📷', hasAds: true },
  { id: 'twitter', name: 'X / Twitter Ads', icon: '𝕏', hasAds: true },
  { id: 'linkedin', name: 'LinkedIn Ads', icon: 'in', hasAds: true },
  { id: 'pinterest', name: 'Pinterest Ads', icon: '📌', hasAds: true },
  { id: 'reddit', name: 'Reddit Ads', icon: '🤖', hasAds: true },
];

const OBJECTIVES = [
  { value: 'awareness', label: 'Brand Awareness', icon: '👁️', desc: 'Maximize reach and impressions' },
  { value: 'traffic', label: 'Website Traffic', icon: '🔗', desc: 'Drive clicks to your website' },
  { value: 'engagement', label: 'Engagement', icon: '💬', desc: 'Get likes, comments, and shares' },
  { value: 'conversions', label: 'Conversions', icon: '🎯', desc: 'Drive purchases or sign-ups' },
  { value: 'leads', label: 'Lead Generation', icon: '📋', desc: 'Collect leads via forms' },
];

const CTAs = ['Learn More', 'Shop Now', 'Sign Up', 'Book Now', 'Get Quote', 'Contact Us', 'Download', 'Apply Now'];

export default function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Campaign>>({
    tenantId: TENANT_ID, platform: 'facebook', objective: 'awareness', status: 'draft',
    callToAction: 'Learn More', targeting: {},
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch(`/api/campaigns?tenantId=${TENANT_ID}`).then(r => r.json()).then(setCampaigns).catch(() => {});
  }, []);

  const saveCampaign = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const campaign = await res.json();
      setCampaigns(prev => [campaign, ...prev]);
      setCreating(false);
      setDraft({ tenantId: TENANT_ID, platform: 'facebook', objective: 'awareness', status: 'draft', callToAction: 'Learn More', targeting: {} });
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/campaigns/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const deleteCampaign = async (id: string) => {
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    setCampaigns(prev => prev.filter(c => c.id !== id));
  };

  const filtered = filter === 'all' ? campaigns : campaigns.filter(c => c.status === filter);
  const totalSpend = campaigns.reduce((s, c) => s + parseFloat(c.spent || '0'), 0);
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);

  return (
    <div className="animate-in">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title">Ad Campaigns</h1>
            <p className="view-subtitle">{campaigns.length} campaigns • ${totalSpend.toFixed(2)} spent</p>
          </div>
          <InfoBubble
            title="Ad Campaign Manager"
            content={<>
              <p>Create and manage <strong>paid ad campaigns</strong> across 6 platforms that support advertising:</p>
              <ul>
                <li><strong>Facebook & Instagram Ads</strong> — Full Meta Ads Manager integration</li>
                <li><strong>X/Twitter Ads</strong> — Promoted tweets and campaigns</li>
                <li><strong>LinkedIn Ads</strong> — Sponsored content for B2B</li>
                <li><strong>Pinterest Ads</strong> — Promoted pins for e-commerce</li>
                <li><strong>Reddit Ads</strong> — Promoted posts in targeted subreddits</li>
              </ul>
              <p><strong>Campaign types:</strong></p>
              <ul>
                <li>Brand Awareness — maximize reach</li>
                <li>Traffic — drive website visits</li>
                <li>Engagement — boost interactions</li>
                <li>Conversions — drive purchases</li>
                <li>Lead Generation — collect contact info</li>
              </ul>
              <p>Set daily/total budgets, targeting options, and track performance in real-time.</p>
            </>}
          />
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="bento-grid bento-4 mb-24">
        <div className="glass-panel metric-card animate-in animate-in-delay-1">
          <span className="metric-label">Active Campaigns</span>
          <span className="metric-value">{campaigns.filter(c => c.status === 'active').length}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-2">
          <span className="metric-label">Total Spend</span>
          <span className="metric-value">${totalSpend.toFixed(0)}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-3">
          <span className="metric-label">Impressions</span>
          <span className="metric-value">{totalImpressions.toLocaleString()}</span>
        </div>
        <div className="glass-panel metric-card animate-in animate-in-delay-4">
          <span className="metric-label">Clicks</span>
          <span className="metric-value">{totalClicks.toLocaleString()}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-12 mb-24 items-center" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => setCreating(true)} disabled={creating}>
          + New Campaign
        </button>
        <div className="flex gap-6">
          {['all', 'draft', 'active', 'paused', 'completed'].map(s => (
            <button key={s} className={`toggle-chip ${filter === s ? 'selected' : ''}`} onClick={() => setFilter(s)} style={{ textTransform: 'capitalize' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Creator */}
      {creating && (
        <div className="glass-panel mb-24 animate-in" style={{ padding: 24, borderColor: 'var(--accent-border)' }}>
          <h3 className="text-sm font-bold mb-20">New Ad Campaign</h3>

          <div className="bento-grid bento-2 mb-16">
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Campaign Name</label>
              <input className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.name || ''} onChange={e => setDraft(p => ({...p, name: e.target.value}))} placeholder="e.g., Summer Launch Campaign" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Platform</label>
              <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
                {AD_PLATFORMS.map(p => (
                  <button key={p.id} className={`toggle-chip ${draft.platform === p.id ? 'selected' : ''}`} onClick={() => setDraft(prev => ({...prev, platform: p.id}))}>
                    {p.icon} {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-16">
            <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Objective</label>
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {OBJECTIVES.map(o => (
                <button key={o.value} className={`toggle-chip ${draft.objective === o.value ? 'selected' : ''}`} onClick={() => setDraft(p => ({...p, objective: o.value}))}>
                  {o.icon} {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">{OBJECTIVES.find(o => o.value === draft.objective)?.desc}</p>
          </div>

          <div className="bento-grid bento-2 mb-16">
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Ad Content</label>
              <textarea className="composer-textarea" style={{ minHeight: 80 }} value={draft.adContent || ''} onChange={e => setDraft(p => ({...p, adContent: e.target.value}))} placeholder="Write your ad copy..." />
            </div>
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Headline</label>
              <input className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.adHeadline || ''} onChange={e => setDraft(p => ({...p, adHeadline: e.target.value}))} placeholder="Attention-grabbing headline" />
              <label className="text-xs font-bold text-muted mb-4 mt-8" style={{ display: 'block', textTransform: 'uppercase' }}>Image URL</label>
              <input className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.imageUrl || ''} onChange={e => setDraft(p => ({...p, imageUrl: e.target.value}))} placeholder="https://..." />
            </div>
          </div>

          <div className="bento-grid bento-3 mb-16">
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Daily Budget ($)</label>
              <input type="number" className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.dailyBudget || ''} onChange={e => setDraft(p => ({...p, dailyBudget: e.target.value}))} placeholder="25.00" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Total Budget ($)</label>
              <input type="number" className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.totalBudget || ''} onChange={e => setDraft(p => ({...p, totalBudget: e.target.value}))} placeholder="500.00" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Call to Action</label>
              <select className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.callToAction || ''} onChange={e => setDraft(p => ({...p, callToAction: e.target.value}))}>
                {CTAs.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-16">
            <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Destination URL</label>
            <input className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.destinationUrl || ''} onChange={e => setDraft(p => ({...p, destinationUrl: e.target.value}))} placeholder="https://yoursite.com/landing-page" />
          </div>

          <div className="bento-grid bento-2 mb-16">
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Affiliate Code</label>
              <input className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.affiliateCode || ''} onChange={e => setDraft(p => ({...p, affiliateCode: e.target.value}))} placeholder="Optional affiliate/tracking code" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted mb-4" style={{ display: 'block', textTransform: 'uppercase' }}>Hallmark ID</label>
              <input className="composer-textarea" style={{ minHeight: 40, fontSize: '0.8rem' }} value={draft.hallmarkId || ''} onChange={e => setDraft(p => ({...p, hallmarkId: e.target.value}))} placeholder="Trust Layer hallmark ID" />
            </div>
          </div>

          <div className="flex gap-12 mt-20">
            <button className="btn btn-primary" onClick={saveCampaign} disabled={saving || !draft.name || !draft.adContent}>
              {saving ? 'Saving...' : '✓ Create Campaign'}
            </button>
            <button className="btn btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <div className="empty-state">
            <span className="icon">📢</span>
            <span className="label">{campaigns.length === 0 ? 'No campaigns yet. Create your first ad campaign!' : 'No campaigns match this filter'}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {filtered.map(c => (
            <div key={c.id} className="glass-panel" style={{ padding: 16 }}>
              <div className="flex items-center gap-12" style={{ flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.3rem' }}>{PLATFORM_ICONS[c.platform] || '?'}</span>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="text-xs text-muted">
                    {OBJECTIVES.find(o => o.value === c.objective)?.label} • {c.platform}
                    {c.dailyBudget && ` • $${c.dailyBudget}/day`}
                  </div>
                </div>
                <div className="flex gap-16 text-xs text-muted" style={{ flexWrap: 'wrap' }}>
                  <span>{(c.impressions || 0).toLocaleString()} impr</span>
                  <span>{(c.clicks || 0).toLocaleString()} clicks</span>
                  <span>${parseFloat(c.spent || '0').toFixed(2)} spent</span>
                </div>
                <span className={`deploy-status ${c.status === 'active' ? 'success' : c.status === 'draft' ? '' : 'failed'}`}>
                  {c.status}
                </span>
                <div className="flex gap-4">
                  {c.status === 'draft' && <button className="btn btn-primary" onClick={() => updateStatus(c.id, 'active')} style={{ padding: '4px 12px', fontSize: '0.65rem' }}>Launch</button>}
                  {c.status === 'active' && <button className="btn btn-secondary" onClick={() => updateStatus(c.id, 'paused')} style={{ padding: '4px 12px', fontSize: '0.65rem' }}>Pause</button>}
                  {c.status === 'paused' && <button className="btn btn-primary" onClick={() => updateStatus(c.id, 'active')} style={{ padding: '4px 12px', fontSize: '0.65rem' }}>Resume</button>}
                  <button className="btn btn-secondary" onClick={() => deleteCampaign(c.id)} style={{ padding: '4px 12px', fontSize: '0.65rem', color: 'var(--error)' }}>✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
