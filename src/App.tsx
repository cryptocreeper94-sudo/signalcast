import React, { useState, useEffect, useMemo } from 'react';
import CommandCenter from './views/CommandCenter';
import ComposerView from './views/ComposerView';
import SetupWizard from './views/SetupWizard';
import AnalyticsView from './views/AnalyticsView';
import PricingView from './views/PricingView';
import RulesView from './views/RulesView';
import TemplatesView from './views/TemplatesView';
import CampaignsView from './views/CampaignsView';

type View = 'command' | 'compose' | 'setup' | 'rules' | 'templates' | 'campaigns' | 'analytics' | 'pricing';

interface SchedulerStatus {
  isRunning: boolean;
  tenantsCount: number;
  tenants: string[];
}

const NAV_ITEMS: { id: View; icon: string; label: string; section?: string }[] = [
  { id: 'command', icon: '◉', label: 'Command Center' },
  { id: 'compose', icon: '✍', label: 'Compose' },
  { id: 'setup', icon: '🔌', label: 'Setup', section: 'divider' },
  { id: 'rules', icon: '⚙', label: 'Rules' },
  { id: 'templates', icon: '📄', label: 'Templates' },
  { id: 'campaigns', icon: '📢', label: 'Campaigns' },
  { id: 'analytics', icon: '📊', label: 'Analytics', section: 'divider' },
  { id: 'pricing', icon: '💎', label: 'Pricing' },
];

export default function App() {
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') return 'command';
    const hash = window.location.hash.slice(1) as View;
    return NAV_ITEMS.some(n => n.id === hash) ? hash : 'command';
  });
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/scheduler/status').then(r => r.json()).then(setSchedulerStatus).catch(() => {});
    fetch('/api/platforms').then(r => r.json()).then(d => setPlatforms(d.platforms)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutSuccess(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    window.location.hash = view;
  }, [view]);

  // Live clock
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const cstTime = useMemo(() => {
    return time.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  }, [time]);

  return (
    <div className="app-shell">
      {/* ─── SIDEBAR ─── */}
      <nav className="sidebar">
        <div className="sidebar-logo">📡</div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map((item, i) => (
            <React.Fragment key={item.id}>
              {item.section === 'divider' && i > 0 && (
                <div style={{ width: '60%', height: 1, background: 'var(--void-border)', margin: '4px auto' }} />
              )}
              <button
                className={`sidebar-item ${view === item.id ? 'active' : ''}`}
                data-tooltip={item.label}
                onClick={() => setView(item.id)}
              >
                {item.icon}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div className="sidebar-spacer" />
        <span className="sidebar-badge">v2.0</span>
      </nav>

      {/* ─── MAIN AREA ─── */}
      <div className="app-main">
        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-bar-left">
            <div className="status-indicator">
              <span className={`status-dot ${schedulerStatus?.isRunning ? 'live' : 'off'}`} />
              {schedulerStatus?.isRunning ? 'Scheduler Live' : 'Scheduler Off'}
            </div>
            <div className="status-divider" />
            <div className="status-indicator">
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{platforms.length}</span>
              Platforms
            </div>
            <div className="status-divider" />
            <div className="status-indicator">
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{schedulerStatus?.tenantsCount || 0}</span>
              Tenants
            </div>
          </div>
          <div className="status-bar-right">
            <span className="status-clock">{cstTime} CST</span>
          </div>
        </div>

        {/* Checkout Success */}
        {checkoutSuccess && (
          <div className="success-banner">
            ✓ Subscription activated! Welcome to SignalCast.
          </div>
        )}

        {/* Content */}
        <div className="app-content">
          {view === 'command' && <CommandCenter platforms={platforms} schedulerStatus={schedulerStatus} />}
          {view === 'compose' && <ComposerView platforms={platforms} />}
          {view === 'setup' && <SetupWizard />}
          {view === 'rules' && <RulesView />}
          {view === 'templates' && <TemplatesView />}
          {view === 'campaigns' && <CampaignsView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'pricing' && <PricingView />}
        </div>
      </div>
    </div>
  );
}
