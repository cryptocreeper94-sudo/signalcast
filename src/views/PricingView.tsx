import React, { useState, useEffect } from 'react';
import InfoBubble from '../components/InfoBubble';

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

const TIER_HELP: Record<string, string> = {
  starter: 'Perfect for individuals and small businesses getting started with social media automation. Includes core broadcasting features across all connected platforms with basic scheduling.',
  pro: 'Built for growing businesses that need advanced scheduling, analytics, and priority support. Includes AI-optimized posting times and content performance insights.',
  pro_trustgen: 'Everything in Pro plus full TrustGen 3D integration — generate AI-powered 3D marketing assets, product renders, and animated content directly from SignalCast.',
  ultimate: 'The complete package. Unlimited everything, white-label options, dedicated API access, custom integrations, and priority 24/7 support. Perfect for agencies and enterprises.',
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
      <div className="view-header text-center" style={{ marginBottom: 24, marginTop: 16 }}>
        <div className="flex items-center gap-8" style={{ justifyContent: 'center' }}>
          <h1 className="view-title" style={{ fontSize: '2rem' }}>One Signal. Every Platform.</h1>
          <InfoBubble
            title="SignalCast Pricing"
            content={<>
              <p>Choose a plan that fits your needs. All plans include access to all 9 platform connectors and the core broadcasting engine.</p>
              <p><strong>Key differences between plans:</strong></p>
              <ul>
                <li><strong>Starter</strong> — Core features, limited scheduling</li>
                <li><strong>Pro</strong> — Advanced scheduling, full analytics, priority support</li>
                <li><strong>Pro + TrustGen</strong> — Everything in Pro plus AI-powered 3D asset generation</li>
                <li><strong>Ultimate</strong> — Unlimited everything, white-label, dedicated API, 24/7 support</li>
              </ul>
              <p>All subscriptions are billed monthly via Stripe. You can upgrade, downgrade, or cancel anytime from your billing portal.</p>
            </>}
          />
        </div>
        <p className="view-subtitle" style={{ maxWidth: 550, margin: '8px auto 0' }}>
          Automate your social media presence across 9 platforms with AI-powered scheduling and ecosystem-wide distribution.
        </p>
      </div>

      {/* Hero */}
      <div className="hero-image-card mb-24 animate-in">
        <img src="/images/hero.png" alt="SignalCast premium platform" />
        <div className="hero-image-overlay">
          <div>
            <div className="hero-image-label">Premium Social Media Automation</div>
            <div className="hero-image-sublabel">Powered by the Trust Layer Ecosystem</div>
          </div>
        </div>
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
              <div className="flex items-center gap-4">
                <h3 className="pricing-name" style={{ color: tier.popular ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {tier.name}
                </h3>
                <InfoBubble
                  title={`${tier.name} Plan`}
                  content={<>
                    <p>{TIER_HELP[tier.id] || 'Contact us for details on this plan.'}</p>
                    <p><strong>Includes:</strong></p>
                    <ul>
                      {tier.features.map((f, j) => <li key={j}>{f}</li>)}
                    </ul>
                    <p><strong>Price:</strong> {tier.priceDisplay}/month, billed monthly. Cancel anytime.</p>
                  </>}
                />
              </div>
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
            <InfoBubble
              title="Core Features"
              content={<>
                <p>Every SignalCast plan includes these foundational features at no extra cost:</p>
                <ul>
                  <li><strong>Multi-Platform Broadcasting</strong> — Write one post and publish it to all 9 platforms simultaneously</li>
                  <li><strong>Smart Scheduling</strong> — AI determines optimal posting times based on audience activity</li>
                  <li><strong>Analytics Dashboard</strong> — Track deploys, success rates, and platform performance</li>
                  <li><strong>Trust Layer SSO</strong> — Single sign-on across the entire ecosystem</li>
                  <li><strong>Content Library</strong> — Save and rotate your best-performing posts and images</li>
                  <li><strong>Multi-Tenant</strong> — Manage multiple brands from one SignalCast account</li>
                </ul>
              </>}
            />
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
            <InfoBubble
              title="Supported Platforms"
              content={<>
                <p>SignalCast supports <strong>9 social media platforms</strong>, each with a dedicated connector:</p>
                <ul>
                  <li><strong>X / Twitter</strong> — Text + media posts via OAuth 1.0a</li>
                  <li><strong>Facebook</strong> — Page feed posts via Graph API</li>
                  <li><strong>Instagram</strong> — Photo posts via Meta Container API</li>
                  <li><strong>Discord</strong> — Rich embeds via Webhooks</li>
                  <li><strong>Telegram</strong> — Messages + photos via Bot API</li>
                  <li><strong>LinkedIn</strong> — Company page updates via UGC API</li>
                  <li><strong>Reddit</strong> — Self-posts via OAuth2</li>
                  <li><strong>Pinterest</strong> — Pin creation via v5 API</li>
                  <li><strong>Nextdoor</strong> — Community posts via Agency API</li>
                </ul>
              </>}
            />
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
