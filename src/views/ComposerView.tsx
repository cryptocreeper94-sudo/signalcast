import React, { useState } from 'react';

interface Props {
  platforms: string[];
}

const PLATFORM_META: Record<string, { icon: string; label: string }> = {
  twitter:   { icon: '𝕏', label: 'X / Twitter' },
  discord:   { icon: '💬', label: 'Discord' },
  telegram:  { icon: '✈️', label: 'Telegram' },
  facebook:  { icon: 'f',  label: 'Facebook' },
  instagram: { icon: '📷', label: 'Instagram' },
  nextdoor:  { icon: '🏘️', label: 'Nextdoor' },
  linkedin:  { icon: 'in', label: 'LinkedIn' },
  reddit:    { icon: '🤖', label: 'Reddit' },
  pinterest: { icon: '📌', label: 'Pinterest' },
};

export default function ComposerView({ platforms }: Props) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState('');
  const [broadcastAll, setBroadcastAll] = useState(true);

  const togglePlatform = (p: string) => {
    setBroadcastAll(false);
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleBroadcastAll = () => {
    setBroadcastAll(true);
    setSelectedPlatforms([]);
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    setResult('');
    try {
      if (broadcastAll) {
        const res = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, imageUrl: imageUrl || undefined }),
        });
        const data = await res.json();
        const platforms = Object.keys(data.results || {});
        const successes = platforms.filter(p => data.results[p]?.success).length;
        setResult(`✓ Broadcast complete — ${successes}/${platforms.length} succeeded`);
      } else if (selectedPlatforms.length === 1) {
        const res = await fetch('/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: selectedPlatforms[0], content, imageUrl: imageUrl || undefined }),
        });
        const data = await res.json();
        setResult(data.success ? `✓ Posted to ${selectedPlatforms[0]}` : `✗ ${data.error}`);
      } else {
        const res = await fetch('/api/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, imageUrl: imageUrl || undefined, platforms: selectedPlatforms }),
        });
        const data = await res.json();
        const total = Object.keys(data.results || {}).length;
        const successes = Object.values(data.results || {}).filter((r: any) => r.success).length;
        setResult(`✓ Sent to ${successes}/${total} platforms`);
      }
      setContent('');
      setImageUrl('');
    } catch (err) {
      setResult(`✗ Error: ${err}`);
    }
    setPosting(false);
  };

  const charCount = content.length;
  const twitterLimit = 280;

  return (
    <div className="animate-in">
      <div className="view-header">
        <h1 className="view-title">Compose</h1>
        <p className="view-subtitle">Create and broadcast to your connected platforms</p>
      </div>

      <div className="bento-grid bento-2">
        {/* Composer */}
        <div className="glass-panel animate-in animate-in-delay-1">
          <div className="panel-header">
            <span className="panel-title"><span className="icon">✍️</span> New Post</span>
          </div>
          <div className="panel-body">
            <textarea
              className="composer-textarea"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What would you like to broadcast to the world?"
            />
            <div className="composer-toolbar">
              <span className={`composer-char-count ${charCount > twitterLimit ? 'over' : charCount > twitterLimit - 20 ? 'warn' : ''}`}>
                {charCount} / {twitterLimit}
              </span>
            </div>

            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="composer-textarea mt-16"
              style={{ minHeight: 42, fontSize: '0.8rem' }}
            />

            <div className="mt-16">
              <p className="text-xs font-bold text-muted mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Target Platforms
              </p>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                <button
                  className={`toggle-chip ${broadcastAll ? 'selected' : ''}`}
                  onClick={handleBroadcastAll}
                >
                  📡 All Platforms
                </button>
                {platforms.map(p => {
                  const meta = PLATFORM_META[p] || { icon: '?', label: p };
                  return (
                    <button
                      key={p}
                      className={`toggle-chip ${!broadcastAll && selectedPlatforms.includes(p) ? 'selected' : ''}`}
                      onClick={() => togglePlatform(p)}
                    >
                      {meta.icon} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-24 flex gap-12 items-center">
              <button
                className="btn btn-primary"
                onClick={handlePost}
                disabled={posting || !content.trim()}
              >
                {posting ? 'Sending...' : broadcastAll ? '📡 Broadcast All' : `Send to ${selectedPlatforms.length || 'selected'}`}
              </button>
              {result && (
                <span className="text-sm" style={{ color: result.startsWith('✓') ? 'var(--success)' : 'var(--error)' }}>
                  {result}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="glass-panel animate-in animate-in-delay-2">
          <div className="panel-header">
            <span className="panel-title"><span className="icon">👁️</span> Preview</span>
          </div>
          <div className="panel-body">
            {content.trim() ? (
              <div className="glass-panel" style={{ padding: 20, background: 'rgba(0,0,0,0.3)' }}>
                <div className="flex items-center gap-8 mb-16">
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-dim))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem',
                  }}>
                    📡
                  </div>
                  <div>
                    <div className="text-sm font-bold">SignalCast</div>
                    <div className="text-xs text-muted">Just now</div>
                  </div>
                </div>
                <p className="text-sm" style={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content}</p>
                {imageUrl && (
                  <div style={{
                    marginTop: 12, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    border: '1px solid var(--void-border)',
                  }}>
                    <img
                      src={imageUrl}
                      alt="Post preview"
                      style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <span className="icon">✍️</span>
                <span className="label">Start typing to see a preview</span>
              </div>
            )}

            <div className="mt-24">
              <p className="text-xs font-bold text-muted mb-8" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Will post to
              </p>
              <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                {(broadcastAll ? platforms : selectedPlatforms).map(p => {
                  const meta = PLATFORM_META[p] || { icon: '?', label: p };
                  return (
                    <span key={p} className="platform-badge connected">
                      <span className="platform-icon">{meta.icon}</span>
                      <span className="platform-name">{meta.label}</span>
                      <span className="platform-dot" />
                    </span>
                  );
                })}
                {!broadcastAll && selectedPlatforms.length === 0 && (
                  <span className="text-xs text-muted">Select platforms above</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
