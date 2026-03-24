import React, { useState, useEffect } from 'react';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  features: string[];
  popular?: boolean;
}

const TIER_ACCENTS: Record<string, { border: string; glow: string }> = {
  starter:       { border: 'rgba(0,180,216,0.3)',  glow: 'rgba(0,180,216,0.08)' },
  pro:           { border: 'rgba(0,255,212,0.5)',  glow: 'rgba(0,255,212,0.12)' },
  pro_trustgen:  { border: 'rgba(138,92,246,0.4)', glow: 'rgba(138,92,246,0.1)' },
  ultimate:      { border: 'rgba(255,215,0,0.4)',  glow: 'rgba(255,215,0,0.08)' },
};

export default function PricingView() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stripe/pricing').then(r => r.json()).then(d => setTiers(d.tiers)).catch(() => {});
  }, []);

  const handleCheckout = async (tierId: string) => {
    setLoading(tierId);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, tenantId: 'direct' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
    setLoading(null);
  };

  return (
    <div className="animate-in">
      <div className="view-header text-center" style={{ marginBottom: 40, marginTop: 16 }}>
        <h1 className="view-title" style={{ fontSize: '2rem' }}>One Signal. Every Platform.</h1>
        <p className="view-subtitle" style={{ maxWidth: 550, margin: '8px auto 0' }}>
          Automate your social media presence across 9 platforms with AI-powered scheduling and ecosystem-wide distribution.
        </p>
      </div>

      {/* Tier Cards */}
      <div className="bento-grid bento-4 mb-24">
        {tiers.map((tier, i) => {
          const accent = TIER_ACCENTS[tier.id] || TIER_ACCENTS.starter;
          return (
            <div
              key={tier.id}
              className={`glass-panel pricing-card ${tier.popular ? 'popular' : ''} animate-in`}
              style={{
                animationDelay: `${i * 0.08}s`,
                borderColor: accent.border,
                boxShadow: tier.popular ? `0 0 30px ${accent.glow}` : undefined,
              }}
            >
              {tier.popular && <div className="pricing-popular-badge">Most Popular</div>}
              <h3 className="pricing-name" style={{ color: tier.popular ? 'var(--accent)' : 'var(--text-primary)' }}>
                {tier.name}
              </h3>
              <div className="pricing-price">
                <span style={{
                  background: tier.popular
                    ? 'linear-gradient(135deg, var(--accent), var(--accent-dim))'
                    : 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {tier.priceDisplay}
                </span>
                <span className="period">/mo</span>
              </div>
              <ul className="pricing-features">
                {tier.features.map((f, j) => (
                  <li key={j}><span className="check">✦</span> {f}</li>
                ))}
              </ul>
              <button
                className={`btn w-full ${tier.popular ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCheckout(tier.id)}
                disabled={loading === tier.id}
                style={{ justifyContent: 'center' }}
              >
                {loading === tier.id ? 'Redirecting...' : 'Get Started'}
              </button>
            </div>
          );
        })}
      </div>

      {/* All Plans Include */}
      <div className="glass-panel mb-24 animate-in animate-in-delay-3">
        <div className="panel-header">
          <span className="panel-title" style={{ margin: '0 auto' }}>
            <span className="icon">✨</span> All Plans Include
          </span>
        </div>
        <div className="panel-body">
          <div className="feature-grid">
            {[
              { icon: '📡', title: 'Multi-Platform Broadcasting', desc: 'Post once, publish everywhere' },
              { icon: '⏰', title: 'Smart Scheduling', desc: 'AI-optimized posting times' },
              { icon: '📊', title: 'Analytics Dashboard', desc: 'Track reach, engagement, clicks' },
              { icon: '🔐', title: 'Trust Layer SSO', desc: 'One identity across the ecosystem' },
              { icon: '🎨', title: 'Content Library', desc: 'Manage and rotate your best posts' },
              { icon: '🏷️', title: 'Multi-Tenant', desc: 'Manage multiple brands from one account' },
            ].map((f, i) => (
              <div key={i} className="feature-item">
                <span className="icon">{f.icon}</span>
                <div className="title">{f.title}</div>
                <div className="desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platforms Strip */}
      <div className="glass-panel animate-in animate-in-delay-4">
        <div className="panel-header">
          <span className="panel-title" style={{ margin: '0 auto' }}>
            <span className="icon">⚡</span> 9 Platforms. One Click.
          </span>
        </div>
        <div className="panel-body">
          <div className="platform-strip">
            {[
              { name: 'X / Twitter', icon: '𝕏' }, { name: 'Facebook', icon: 'f' },
              { name: 'Instagram', icon: '📷' }, { name: 'Discord', icon: '💬' },
              { name: 'Telegram', icon: '✈️' }, { name: 'LinkedIn', icon: 'in' },
              { name: 'Reddit', icon: '🤖' }, { name: 'Pinterest', icon: '📌' },
              { name: 'Nextdoor', icon: '🏘️' },
            ].map((p, i) => (
              <div key={i} className="platform-chip">
                <span className="icon">{p.icon}</span> {p.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
