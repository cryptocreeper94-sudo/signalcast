import React, { useState, useEffect } from 'react';

interface SchedulerStatus {
  isRunning: boolean;
  tenantsCount: number;
  tenants: string[];
}

interface Deploy {
  id: string;
  platform: string;
  status: string;
  externalId?: string;
  errorMessage?: string;
  deployedAt: string;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  features: string[];
  popular?: boolean;
}

type View = 'dashboard' | 'pricing';

export default function App() {
  const [view, setView] = useState<View>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') return 'dashboard';
    return 'pricing';
  });
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [postContent, setPostContent] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/scheduler/status').then(r => r.json()).then(setStatus).catch(() => {});
    fetch('/api/platforms').then(r => r.json()).then(d => setPlatforms(d.platforms)).catch(() => {});
    fetch('/api/deploys?limit=20').then(r => r.json()).then(setDeploys).catch(() => {});
    fetch('/api/stripe/pricing').then(r => r.json()).then(d => setTiers(d.tiers)).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutSuccess(true);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const handlePost = async () => {
    if (!postContent.trim()) return;
    setPosting(true);
    setMessage('');
    try {
      const endpoint = selectedPlatform ? '/api/post' : '/api/broadcast';
      const body = selectedPlatform
        ? { platform: selectedPlatform, content: postContent }
        : { content: postContent };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMessage(selectedPlatform
        ? (data.success ? `✓ Posted to ${selectedPlatform}` : `✗ ${data.error}`)
        : `Broadcast complete`);
      setPostContent('');
      fetch('/api/deploys?limit=20').then(r => r.json()).then(setDeploys).catch(() => {});
    } catch (err) {
      setMessage(`Error: ${err}`);
    }
    setPosting(false);
  };

  const handleCheckout = async (tierId: string) => {
    setCheckoutLoading(tierId);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId, tenantId: 'direct' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setMessage(data.error || 'Failed to create checkout');
      }
    } catch (err) {
      setMessage(`Checkout error: ${err}`);
    }
    setCheckoutLoading(null);
  };

  const platformIcons: Record<string, string> = {
    twitter: '𝕏', discord: '💬', telegram: '✈️', facebook: 'f',
    instagram: '📷', nextdoor: '🏘️', linkedin: 'in', reddit: '🤖', pinterest: '📌',
  };

  const tierAccents: Record<string, { border: string; glow: string; bg: string }> = {
    starter: { border: 'rgba(0,180,216,0.3)', glow: 'rgba(0,180,216,0.1)', bg: 'rgba(0,180,216,0.05)' },
    pro: { border: 'rgba(0,255,212,0.5)', glow: 'rgba(0,255,212,0.15)', bg: 'rgba(0,255,212,0.08)' },
    pro_trustgen: { border: 'rgba(138,92,246,0.4)', glow: 'rgba(138,92,246,0.12)', bg: 'rgba(138,92,246,0.06)' },
    ultimate: { border: 'rgba(255,215,0,0.4)', glow: 'rgba(255,215,0,0.1)', bg: 'rgba(255,215,0,0.05)' },
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a', color: '#e0e0e0',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        padding: '40px 24px 24px',
        background: 'linear-gradient(180deg, rgba(0,255,212,0.08) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(0,255,212,0.1)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{
              fontSize: '2.5rem', fontWeight: 800,
              background: 'linear-gradient(135deg, #00ffd4, #00b4d8)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 8,
            }}>
              📡 SignalCast
            </h1>
            <p style={{ color: '#888', fontSize: '1rem' }}>
              AI-Powered Social Media Automation — Trust Layer Ecosystem
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setView('pricing')}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: view === 'pricing' ? 'linear-gradient(135deg, #00ffd4, #00b4d8)' : 'rgba(255,255,255,0.06)',
                color: view === 'pricing' ? '#0a0a0a' : '#aaa',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              Plans & Pricing
            </button>
            <button
              onClick={() => setView('dashboard')}
              style={{
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: view === 'dashboard' ? 'linear-gradient(135deg, #00ffd4, #00b4d8)' : 'rgba(255,255,255,0.06)',
                color: view === 'dashboard' ? '#0a0a0a' : '#aaa',
                fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                transition: 'all 0.2s',
              }}
            >
              Dashboard
            </button>
          </div>
        </div>

        {view === 'dashboard' && status && (
          <div style={{ maxWidth: 1100, margin: '16px auto 0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem',
              background: status.isRunning ? 'rgba(0,255,120,0.15)' : 'rgba(255,60,60,0.15)',
              color: status.isRunning ? '#00ff78' : '#ff3c3c',
              border: `1px solid ${status.isRunning ? 'rgba(0,255,120,0.3)' : 'rgba(255,60,60,0.3)'}`,
            }}>
              {status.isRunning ? '● Scheduler Running' : '○ Scheduler Stopped'}
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem',
              background: 'rgba(0,255,212,0.1)', color: '#00ffd4',
              border: '1px solid rgba(0,255,212,0.2)',
            }}>
              {status.tenantsCount} tenants
            </span>
            <span style={{
              padding: '4px 12px', borderRadius: 20, fontSize: '0.8rem',
              background: 'rgba(0,180,216,0.1)', color: '#00b4d8',
              border: '1px solid rgba(0,180,216,0.2)',
            }}>
              {platforms.length} platforms connected
            </span>
          </div>
        )}
      </header>

      {/* Checkout Success Banner */}
      {checkoutSuccess && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(0,255,120,0.12), rgba(0,255,212,0.12))',
          borderBottom: '1px solid rgba(0,255,120,0.2)',
          padding: '16px 24px', textAlign: 'center',
        }}>
          <span style={{ color: '#00ff78', fontWeight: 700 }}>
            ✓ Subscription activated! Welcome to SignalCast.
          </span>
        </div>
      )}

      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        {view === 'pricing' ? (
          /* ─── PRICING PAGE ─── */
          <>
            <div style={{ textAlign: 'center', marginBottom: 48, marginTop: 24 }}>
              <h2 style={{
                fontSize: '2.2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #00ffd4, #00b4d8, #8a5cf6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 12,
              }}>
                One Signal. Every Platform.
              </h2>
              <p style={{ color: '#888', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
                Automate your social media presence across 9 platforms with AI-powered scheduling, 
                analytics, and ecosystem-wide content distribution.
              </p>
            </div>

            {/* Tier Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 20,
              marginBottom: 48,
            }}>
              {tiers.map(tier => {
                const accent = tierAccents[tier.id] || tierAccents.starter;
                return (
                  <div
                    key={tier.id}
                    style={{
                      background: accent.bg,
                      border: `1px solid ${accent.border}`,
                      borderRadius: 20,
                      padding: 28,
                      position: 'relative',
                      backdropFilter: 'blur(12px)',
                      transition: 'all 0.3s',
                      boxShadow: tier.popular ? `0 0 40px ${accent.glow}` : 'none',
                      transform: tier.popular ? 'scale(1.02)' : 'none',
                    }}
                  >
                    {tier.popular && (
                      <div style={{
                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #00ffd4, #00b4d8)',
                        color: '#0a0a0a', fontWeight: 800, fontSize: '0.7rem',
                        padding: '4px 16px', borderRadius: 20, textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Most Popular
                      </div>
                    )}

                    <h3 style={{
                      fontSize: '1.2rem', fontWeight: 700, marginBottom: 8,
                      color: tier.popular ? '#00ffd4' : '#e0e0e0',
                    }}>
                      {tier.name}
                    </h3>

                    <div style={{ marginBottom: 20 }}>
                      <span style={{
                        fontSize: '2.5rem', fontWeight: 800,
                        background: tier.popular
                          ? 'linear-gradient(135deg, #00ffd4, #00b4d8)'
                          : 'linear-gradient(135deg, #e0e0e0, #aaa)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                      }}>
                        {tier.priceDisplay}
                      </span>
                      <span style={{ color: '#666', fontSize: '0.9rem' }}>/mo</span>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                      {tier.features.map((feature, i) => (
                        <li key={i} style={{
                          padding: '6px 0', fontSize: '0.85rem', color: '#bbb',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ color: '#00ffd4', fontSize: '0.7rem' }}>✦</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleCheckout(tier.id)}
                      disabled={checkoutLoading === tier.id}
                      style={{
                        width: '100%', padding: '12px 20px', borderRadius: 12,
                        border: tier.popular ? 'none' : `1px solid ${accent.border}`,
                        background: tier.popular
                          ? 'linear-gradient(135deg, #00ffd4, #00b4d8)'
                          : 'rgba(255,255,255,0.04)',
                        color: tier.popular ? '#0a0a0a' : '#e0e0e0',
                        fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        opacity: checkoutLoading === tier.id ? 0.6 : 1,
                      }}
                    >
                      {checkoutLoading === tier.id ? 'Redirecting...' : 'Get Started'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Feature Comparison */}
            <section style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.05)', padding: 32,
              marginBottom: 32,
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24, color: '#00ffd4', textAlign: 'center' }}>
                All Plans Include
              </h3>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}>
                {[
                  { icon: '📡', title: 'Multi-Platform Broadcasting', desc: 'Post once, publish everywhere' },
                  { icon: '⏰', title: 'Smart Scheduling', desc: 'AI-optimized posting times' },
                  { icon: '📊', title: 'Analytics Dashboard', desc: 'Track reach, engagement, clicks' },
                  { icon: '🔐', title: 'Trust Layer SSO', desc: 'One identity across the ecosystem' },
                  { icon: '🎨', title: 'Content Library', desc: 'Manage and rotate your best posts' },
                  { icon: '🏷️', title: 'Multi-Tenant', desc: 'Manage multiple brands from one account' },
                ].map((feature, i) => (
                  <div key={i} style={{
                    padding: 16, borderRadius: 12,
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{feature.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{feature.title}</div>
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>{feature.desc}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Platforms Grid */}
            <section style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.05)', padding: 32,
            }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: 24, color: '#00ffd4', textAlign: 'center' }}>
                9 Platforms. One Click.
              </h3>
              <div style={{
                display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12,
              }}>
                {[
                  { name: 'X / Twitter', icon: '𝕏' },
                  { name: 'Facebook', icon: 'f' },
                  { name: 'Instagram', icon: '📷' },
                  { name: 'Discord', icon: '💬' },
                  { name: 'Telegram', icon: '✈️' },
                  { name: 'LinkedIn', icon: 'in' },
                  { name: 'Reddit', icon: '🤖' },
                  { name: 'Pinterest', icon: '📌' },
                  { name: 'Nextdoor', icon: '🏘️' },
                ].map((p, i) => (
                  <div key={i} style={{
                    padding: '12px 20px', borderRadius: 14,
                    background: 'rgba(0,255,212,0.06)', border: '1px solid rgba(0,255,212,0.12)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: '0.85rem', fontWeight: 600, color: '#00ffd4',
                  }}>
                    <span style={{ fontSize: '1.1rem' }}>{p.icon}</span>
                    {p.name}
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* ─── DASHBOARD ─── */
          <>
            {/* Post Composer */}
            <section style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)', padding: 24, marginBottom: 24,
            }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 16, color: '#00ffd4' }}>
                Quick Post
              </h2>
              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                placeholder="What would you like to broadcast?"
                style={{
                  width: '100%', height: 100, background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                  color: '#e0e0e0', padding: 16, fontSize: '0.95rem', resize: 'vertical',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, color: '#e0e0e0', padding: '8px 12px', fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  <option value="">All Platforms (Broadcast)</option>
                  {platforms.map(p => (
                    <option key={p} value={p}>{platformIcons[p] || ''} {p}</option>
                  ))}
                </select>
                <button
                  onClick={handlePost}
                  disabled={posting || !postContent.trim()}
                  style={{
                    padding: '8px 24px', borderRadius: 8, border: 'none',
                    background: posting ? '#333' : 'linear-gradient(135deg, #00ffd4, #00b4d8)',
                    color: posting ? '#666' : '#0a0a0a', fontWeight: 700,
                    cursor: posting ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                  }}
                >
                  {posting ? 'Posting...' : selectedPlatform ? `Post to ${selectedPlatform}` : '📡 Broadcast All'}
                </button>
                {message && <span style={{ fontSize: '0.85rem', color: message.startsWith('✓') ? '#00ff78' : '#ff8c00' }}>{message}</span>}
              </div>
            </section>

            {/* Connected Platforms */}
            <section style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)', padding: 24, marginBottom: 24,
            }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 16, color: '#00ffd4' }}>
                Connected Platforms
              </h2>
              {platforms.length === 0 ? (
                <p style={{ color: '#666' }}>No platforms configured. Add API keys to .env</p>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {platforms.map(p => (
                    <span key={p} style={{
                      padding: '8px 16px', borderRadius: 12,
                      background: 'rgba(0,255,212,0.08)', border: '1px solid rgba(0,255,212,0.15)',
                      color: '#00ffd4', fontSize: '0.9rem', fontWeight: 600,
                    }}>
                      {platformIcons[p]} {p}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Deploys */}
            <section style={{
              background: 'rgba(255,255,255,0.03)', borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)', padding: 24,
            }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: 16, color: '#00ffd4' }}>
                Recent Deploys
              </h2>
              {deploys.length === 0 ? (
                <p style={{ color: '#666' }}>No deploys yet</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {deploys.map(d => (
                    <div key={d.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 16px', borderRadius: 10,
                      background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem' }}>{platformIcons[d.platform] || '?'}</span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{d.platform}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem',
                          background: d.status === 'success' ? 'rgba(0,255,120,0.15)' : 'rgba(255,60,60,0.15)',
                          color: d.status === 'success' ? '#00ff78' : '#ff3c3c',
                        }}>
                          {d.status}
                        </span>
                        <span style={{ color: '#555', fontSize: '0.8rem' }}>
                          {new Date(d.deployedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer style={{
        textAlign: 'center', padding: '40px 24px', color: '#444', fontSize: '0.8rem',
      }}>
        SignalCast v1.0.0 — Part of the Trust Layer Ecosystem
      </footer>
    </div>
  );
}
