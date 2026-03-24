import React, { useState, useEffect } from 'react';
import InfoBubble from '../components/InfoBubble';

const TENANT_ID = 'direct';

interface Rule {
  id: string;
  tenantId: string;
  platform: string;
  frequency: string;
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
  rotationMode: string;
  maxPostsPerDay: number;
  requireImage: boolean;
  hashtagStrategy: string;
  autoHashtags: string[];
  isActive: boolean;
}

const PLATFORM_ICONS: Record<string, string> = {
  twitter: '𝕏', facebook: 'f', instagram: '📷', discord: '💬',
  telegram: '✈️', linkedin: 'in', reddit: '🤖', pinterest: '📌', nextdoor: '🏘️',
};

const FREQUENCIES = [
  { value: 'hourly', label: 'Every Hour', postsPerDay: '~17' },
  { value: '2x-daily', label: '2x Daily', postsPerDay: '2' },
  { value: '3x-daily', label: '3x Daily', postsPerDay: '3' },
  { value: '4x-daily', label: '4x Daily', postsPerDay: '4' },
  { value: 'daily', label: 'Once Daily', postsPerDay: '1' },
  { value: 'weekly', label: 'Once Weekly', postsPerDay: '~0.14' },
];

const DAYS = [
  { value: 0, label: 'Sun' }, { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const ROTATIONS = [
  { value: 'round-robin', label: 'Round Robin', desc: 'Posts content in sequence, one after another' },
  { value: 'random', label: 'Random', desc: 'Picks a random post from your content library each time' },
  { value: 'performance', label: 'Performance-Weighted', desc: 'Favors content with higher engagement rates' },
];

export default function RulesView() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<Rule>>({});

  useEffect(() => {
    fetch('/api/platforms').then(r => r.json()).then(d => setConnectedPlatforms(d.platforms || [])).catch(() => {});
    fetch(`/api/rules/${TENANT_ID}`).then(r => r.json()).then(setRules).catch(() => {});
  }, []);

  const startNew = (platform: string) => {
    setDraft({
      tenantId: TENANT_ID,
      platform,
      frequency: 'daily',
      startHour: 9,
      endHour: 21,
      daysOfWeek: [1, 2, 3, 4, 5],
      rotationMode: 'round-robin',
      maxPostsPerDay: 4,
      requireImage: false,
      hashtagStrategy: 'auto',
      autoHashtags: [],
      isActive: true,
    });
    setEditing('new');
  };

  const editRule = (rule: Rule) => {
    setDraft(rule);
    setEditing(rule.id);
  };

  const saveRule = async () => {
    setSaving(true);
    try {
      if (editing === 'new') {
        const res = await fetch('/api/rules', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        const rule = await res.json();
        setRules(prev => [...prev, rule]);
      } else {
        const res = await fetch(`/api/rules/${editing}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        const updated = await res.json();
        setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
      }
      setEditing(null);
      setDraft({});
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const toggleRuleActive = async (rule: Rule) => {
    const res = await fetch(`/api/rules/${rule.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    const updated = await res.json();
    setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/rules/${id}`, { method: 'DELETE' });
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const toggleDay = (day: number) => {
    const days = (draft.daysOfWeek || []) as number[];
    setDraft(prev => ({
      ...prev,
      daysOfWeek: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort(),
    }));
  };

  const platformsWithoutRules = connectedPlatforms.filter(p => !rules.some(r => r.platform === p));

  return (
    <div className="animate-in">
      <div className="view-header">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="view-title">Automation Rules</h1>
            <p className="view-subtitle">Configure posting schedules for each platform</p>
          </div>
          <InfoBubble
            title="Automation Rules"
            content={<>
              <p>Automation rules control <strong>how and when</strong> SignalCast posts to each platform.</p>
              <p><strong>For each platform you can configure:</strong></p>
              <ul>
                <li><strong>Frequency</strong> — How often to post (hourly, daily, weekly)</li>
                <li><strong>Time window</strong> — Active hours (e.g., 9am–9pm)</li>
                <li><strong>Days of week</strong> — Which days to post (weekdays, weekends, all)</li>
                <li><strong>Content rotation</strong> — How to pick the next post (round-robin, random, performance-weighted)</li>
                <li><strong>Image requirements</strong> — Force image-only posts for visual platforms</li>
                <li><strong>Hashtag strategy</strong> — Auto-generate, use manual sets, or none</li>
              </ul>
              <p>The scheduler reads these rules and executes them autonomously. Toggle rules on/off anytime.</p>
            </>}
          />
        </div>
      </div>

      {/* Active Rules */}
      {rules.length > 0 && (
        <div className="mb-24">
          <h3 className="text-sm font-bold text-muted mb-12" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Rules ({rules.filter(r => r.isActive).length})</h3>
          <div className="flex flex-col gap-8">
            {rules.map(rule => (
              <div key={rule.id} className={`glass-panel ${!rule.isActive ? 'disconnected' : ''}`} style={{ padding: 16 }}>
                <div className="flex items-center gap-12" style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.3rem' }}>{PLATFORM_ICONS[rule.platform] || '?'}</span>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div className="text-sm font-bold" style={{ textTransform: 'capitalize' }}>{rule.platform}</div>
                    <div className="text-xs text-muted">
                      {FREQUENCIES.find(f => f.value === rule.frequency)?.label} • {rule.startHour}:00–{rule.endHour}:00 • {(rule.daysOfWeek as number[])?.length || 7} days/week
                    </div>
                  </div>
                  <span className="text-xs text-muted">{rule.rotationMode}</span>
                  <button className={`toggle-chip ${rule.isActive ? 'selected' : ''}`} onClick={() => toggleRuleActive(rule)} style={{ minWidth: 50 }}>
                    {rule.isActive ? 'ON' : 'OFF'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => editRule(rule)} style={{ padding: '4px 12px', fontSize: '0.65rem' }}>Edit</button>
                  <button className="btn btn-secondary" onClick={() => deleteRule(rule.id)} style={{ padding: '4px 12px', fontSize: '0.65rem', color: 'var(--error)' }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Rule */}
      {platformsWithoutRules.length > 0 && !editing && (
        <div className="glass-panel mb-24" style={{ padding: 20 }}>
          <h3 className="text-sm font-bold mb-12">Add Automation Rule</h3>
          <p className="text-xs text-muted mb-12">Select a connected platform to configure:</p>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            {platformsWithoutRules.map(p => (
              <button key={p} className="toggle-chip" onClick={() => startNew(p)}>
                {PLATFORM_ICONS[p]} {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {connectedPlatforms.length === 0 && (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <div className="empty-state">
            <span className="icon">🔌</span>
            <span className="label">Connect platforms first in the Setup tab to create automation rules</span>
          </div>
        </div>
      )}

      {/* Rule Editor */}
      {editing && (
        <div className="glass-panel animate-in" style={{ padding: 24, borderColor: 'var(--accent-border)' }}>
          <h3 className="text-sm font-bold mb-20 flex items-center gap-8">
            <span>{PLATFORM_ICONS[draft.platform || ''] || '?'}</span>
            {editing === 'new' ? 'New Rule' : 'Edit Rule'} — <span style={{ textTransform: 'capitalize' }}>{draft.platform}</span>
          </h3>

          {/* Frequency */}
          <div className="mb-20">
            <label className="text-xs font-bold text-muted mb-8" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Posting Frequency
            </label>
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {FREQUENCIES.map(f => (
                <button key={f.value} className={`toggle-chip ${draft.frequency === f.value ? 'selected' : ''}`} onClick={() => setDraft(p => ({...p, frequency: f.value}))}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Window */}
          <div className="mb-20">
            <label className="text-xs font-bold text-muted mb-8" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Hours (CST)
            </label>
            <div className="flex items-center gap-8">
              <select className="composer-textarea" style={{ minHeight: 36, width: 100, fontSize: '0.8rem' }} value={draft.startHour || 9} onChange={e => setDraft(p => ({...p, startHour: parseInt(e.target.value)}))}>
                {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{i}:00</option>)}
              </select>
              <span className="text-sm text-muted">to</span>
              <select className="composer-textarea" style={{ minHeight: 36, width: 100, fontSize: '0.8rem' }} value={draft.endHour || 21} onChange={e => setDraft(p => ({...p, endHour: parseInt(e.target.value)}))}>
                {Array.from({length: 24}, (_, i) => <option key={i} value={i}>{i}:00</option>)}
              </select>
            </div>
          </div>

          {/* Days */}
          <div className="mb-20">
            <label className="text-xs font-bold text-muted mb-8" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Days of Week
            </label>
            <div className="flex gap-6">
              {DAYS.map(d => (
                <button key={d.value} className={`toggle-chip ${((draft.daysOfWeek || []) as number[]).includes(d.value) ? 'selected' : ''}`} onClick={() => toggleDay(d.value)} style={{ minWidth: 40, justifyContent: 'center' }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Mode */}
          <div className="mb-20">
            <label className="text-xs font-bold text-muted mb-8" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Content Rotation
            </label>
            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
              {ROTATIONS.map(r => (
                <button key={r.value} className={`toggle-chip ${draft.rotationMode === r.value ? 'selected' : ''}`} onClick={() => setDraft(p => ({...p, rotationMode: r.value}))}>
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted mt-4">{ROTATIONS.find(r => r.value === draft.rotationMode)?.desc}</p>
          </div>

          {/* Options */}
          <div className="mb-20 flex gap-16" style={{ flexWrap: 'wrap' }}>
            <label className="flex items-center gap-8 text-sm" style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={draft.requireImage || false} onChange={e => setDraft(p => ({...p, requireImage: e.target.checked}))} />
              Require image on every post
            </label>
            <div>
              <label className="text-xs font-bold text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max posts/day</label>
              <input type="number" className="composer-textarea" style={{ minHeight: 36, width: 60, fontSize: '0.8rem', marginLeft: 8 }} value={draft.maxPostsPerDay || 4} min={1} max={50} onChange={e => setDraft(p => ({...p, maxPostsPerDay: parseInt(e.target.value)}))} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-12">
            <button className="btn btn-primary" onClick={saveRule} disabled={saving}>
              {saving ? 'Saving...' : editing === 'new' ? '✓ Create Rule' : '✓ Save Changes'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setEditing(null); setDraft({}); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
