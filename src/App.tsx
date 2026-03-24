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

export default function App() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [deploys, setDeploys] = useState<Deploy[]>([]);
  const [postContent, setPostContent] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/scheduler/status').then(r => r.json()).then(setStatus).catch(() => {});
    fetch('/api/platforms').then(r => r.json()).then(d => setPlatforms(d.platforms)).catch(() => {});
    fetch('/api/deploys?limit=20').then(r => r.json()).then(setDeploys).catch(() => {});
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
      // Refresh deploys
      fetch('/api/deploys?limit=20').then(r => r.json()).then(setDeploys).catch(() => {});
    } catch (err) {
      setMessage(`Error: ${err}`);
    }
    setPosting(false);
  };

  const platformIcons: Record<string, string> = {
    twitter: '𝕏', discord: '💬', telegram: '✈️', facebook: 'f',
    instagram: '📷', nextdoor: '🏘️', linkedin: 'in', reddit: '🤖', pinterest: '📌',
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
        {status && (
          <div style={{
            marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap',
          }}>
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

      <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
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
      </main>

      <footer style={{
        textAlign: 'center', padding: '40px 24px', color: '#444', fontSize: '0.8rem',
      }}>
        SignalCast v1.0.0 — Part of the Trust Layer Ecosystem
      </footer>
    </div>
  );
}
