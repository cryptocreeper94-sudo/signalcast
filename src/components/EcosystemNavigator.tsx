/**
 * EcosystemNavigator V1 — Trust Layer Visual TOC
 * ================================================
 * Three-tab full-screen overlay:
 *   🗺️ Map       — SVG radial burst, 42 apps, click to highlight connections
 *   📋 Directory — Searchable TOC grouped by vertical
 *   ⚙️ Tech      — Stack breakdown + ecosystem metrics
 *
 * Pure TSX, zero external dependencies.
 * Float trigger: bottom-center (distinct from EcosystemAccountHub at top-right).
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// ── Data ──────────────────────────────────────────────────────────────────────

interface Vertical { id: string; label: string; icon: string; color: string; glow: string; }
interface App      { id: string; v: string; n: string; i: string; u: string; hook: string; }

const VERTICALS: Vertical[] = [
  { id:'core',       label:'Core Identity',     icon:'🌊', color:'#06b6d4', glow:'rgba(6,182,212,0.18)'   },
  { id:'language',   label:'Language & Dev',    icon:'💡', color:'#a78bfa', glow:'rgba(167,139,250,0.18)' },
  { id:'creative',   label:'Creative Studio',   icon:'🎨', color:'#f43f5e', glow:'rgba(244,63,94,0.18)'  },
  { id:'gaming',     label:'Gaming & Social',   icon:'🎮', color:'#8b5cf6', glow:'rgba(139,92,246,0.18)' },
  { id:'enterprise', label:'Enterprise & Ops',  icon:'🏢', color:'#10b981', glow:'rgba(16,185,129,0.18)' },
  { id:'automotive', label:'Automotive',         icon:'🚗', color:'#f59e0b', glow:'rgba(245,158,11,0.18)' },
  { id:'lifestyle',  label:'Lifestyle & Health', icon:'🌿', color:'#84cc16', glow:'rgba(132,204,22,0.18)'  },
  { id:'security',   label:'Finance & Security', icon:'🔐', color:'#ec4899', glow:'rgba(236,72,153,0.18)' },
];

const APPS: App[] = [
  // Core Identity (5)
  { id:'trust-layer',    v:'core',       n:'Trust Layer',         i:'🌊', u:'https://dwtl.io',                 hook:'The Foundation of Trust'         },
  { id:'trust-hub',      v:'core',       n:'Trust Hub',           i:'🛡️', u:'https://trusthub.tlid.io',        hook:'Ecosystem Command Center'        },
  { id:'tlid',           v:'core',       n:'TLID.io',             i:'🆔', u:'https://tlid.io',                 hook:'Your Blockchain Identity'        },
  { id:'trust-vault',    v:'core',       n:'TrustVault',          i:'🔒', u:'https://trustvault.tlid.io',      hook:'Multi-Chain Secure Vault'        },
  { id:'trust-home',     v:'core',       n:'TrustHome',           i:'🏠', u:'https://trusthome.tlid.io',       hook:'Real Estate Powered by Trust'    },
  // Language & Dev (5)
  { id:'lume',           v:'language',   n:'Lume',                i:'💡', u:'https://lume-lang.org',           hook:'Deterministic Natural Language'  },
  { id:'happyeats-lume', v:'language',   n:'HappyEats Lume',      i:'🍀', u:'https://happyeats.tlid.io',       hook:'First Lume-Native Production App'},
  { id:'dw-studio',      v:'language',   n:'DW Studio',           i:'🖥️', u:'https://studio.tlid.io',          hook:'Ecosystem IDE for Lume'          },
  { id:'dw-academy',     v:'language',   n:'DW Academy',          i:'📖', u:'https://academy.tlid.io',         hook:'Learn the Ecosystem'             },
  { id:'lumeline',       v:'language',   n:'LumeLine',            i:'📊', u:'https://lumeline.app',            hook:'Sharp Sports Intelligence'       },
  // Creative Studio (5)
  { id:'trustgen',       v:'creative',   n:'TrustGen 3D',         i:'🎨', u:'https://trustgen.tlid.io',        hook:'AI 3D Creation Studio'           },
  { id:'darkwavestudios',v:'creative',   n:'DarkWave Studios',    i:'🎛️', u:'https://darkwavestudios.io',      hook:'Premium Web Agency'              },
  { id:'trust-book',     v:'creative',   n:'Trust Book',          i:'📚', u:'https://dwtl.io/trust-book',      hook:'Censorship-Free Publishing'      },
  { id:'through-veil',   v:'creative',   n:'Through The Veil',    i:'🔮', u:'https://throughtheveil.tlid.io',  hook:'The Novel That Started It All'   },
  { id:'signalcast',     v:'creative',   n:'SignalCast',           i:'📡', u:'https://signalcast.tlid.io',      hook:'One Signal. Every Platform.'    },
  // Gaming & Social (5)
  { id:'chronicles',     v:'gaming',     n:'Chronicles',          i:'📜', u:'https://yourlegacy.io',           hook:'Not a Game. A Life.'             },
  { id:'bomber-golf',    v:'gaming',     n:'Bomber Golf',         i:'⛳', u:'https://bombergolf.tlid.io',      hook:'Crush It Off the Tee'            },
  { id:'the-arcade',     v:'gaming',     n:'The Arcade',          i:'🕹️', u:'https://darkwavegames.io',        hook:'Provably Fair Gaming'            },
  { id:'trust-golf',     v:'gaming',     n:'Trust Golf',          i:'🏌️', u:'https://trustgolf.app',           hook:'Premium Golf Companion'          },
  { id:'the-void',       v:'gaming',     n:'THE VOID',            i:'🕳️', u:'https://intothevoid.app',         hook:'Cathartic Voice-First Wellness'  },
  // Enterprise & Ops (5)
  { id:'orbit',          v:'enterprise', n:'ORBIT',               i:'🌐', u:'https://orbitstaffing.io',        hook:'Blockchain-Powered HR'           },
  { id:'orby',           v:'enterprise', n:'Orby Commander',      i:'📍', u:'https://getorby.io',              hook:'Venue & Event Operations'        },
  { id:'tradeworks',     v:'enterprise', n:'TradeWorks AI',       i:'🔧', u:'https://tradeworksai.io',         hook:'AI-Powered Field Services'       },
  { id:'lotops',         v:'enterprise', n:'Lot Ops Pro',         i:'🚙', u:'https://lotopspro.io',            hook:'Autonomous Lot Management'       },
  { id:'driver-connect', v:'enterprise', n:'TL Driver Connect',   i:'🚚', u:'https://tldriverconnect.com',     hook:'Verified Driver Coordination'    },
  // Automotive (5)
  { id:'garagebot',      v:'automotive', n:'GarageBot',           i:'🔩', u:'https://garagebot.io',            hook:'IoT Garage Automation'           },
  { id:'torque',         v:'automotive', n:'TORQUE',              i:'🏎️', u:'https://garagebot.io/torque',     hook:'Verified Automotive Marketplace' },
  { id:'brew-board',     v:'automotive', n:'Brew & Board',        i:'☕', u:'https://brewandboard.coffee',     hook:'Social Gaming Meets Coffee'      },
  { id:'dwsc',           v:'automotive', n:'DWSC Portal',         i:'◈',  u:'https://dwsc.io',                 hook:'Ecosystem Portal'                },
  { id:'signal-chat',    v:'automotive', n:'Signal Chat',         i:'💬', u:'https://dwtl.io/signal-chat',     hook:'Blockchain-Verified Messaging'   },
  // Lifestyle & Health (6)
  { id:'verdara',        v:'lifestyle',  n:'Verdara',             i:'🌲', u:'https://verdara.tlid.io',         hook:'AI Outdoor Command Center'       },
  { id:'arbora',         v:'lifestyle',  n:'Arbora',              i:'🌳', u:'https://verdara.tlid.io/arbora',  hook:'Pro Arborist Business Suite'     },
  { id:'vedasolus',      v:'lifestyle',  n:'VedaSolus',           i:'🌿', u:'https://vedasolus.io',            hook:'Ancient Wisdom Meets Science'    },
  { id:'happyeats',      v:'lifestyle',  n:'HappyEats',           i:'🍔', u:'https://happyeats.app',           hook:'Local Food Truck Ordering'       },
  { id:'paintpros',      v:'lifestyle',  n:'PaintPros',           i:'🪣', u:'https://paintpros.io',            hook:'Painting Business Platform'      },
  { id:'nashpaintpros',  v:'lifestyle',  n:'Nashville Paint Pros',i:'🏚️', u:'https://nashpaintpros.io',        hook:"Nashville's Premier Painters"    },
  // Finance & Security (6)
  { id:'guardian-scanner', v:'security', n:'Guardian Scanner',   i:'🤖', u:'https://dwtl.io/guardian',        hook:'Verify Any AI Agent'             },
  { id:'guardian-screener',v:'security', n:'Guardian Screener',  i:'🔍', u:'https://dwtl.io/guardian-screener',hook:'AI-Powered DEX Intelligence'     },
  { id:'strikeagent',    v:'security',   n:'StrikeAgent',         i:'⚡', u:'https://strikeagent.io',          hook:'AI Trading Intelligence'         },
  { id:'trustshield',    v:'security',   n:'TrustShield',         i:'🛡️', u:'https://trustshield.tech',        hook:'Enterprise Security'             },
  { id:'pulse',          v:'security',   n:'Pulse',               i:'📈', u:'https://darkwavepulse.com',       hook:'Predictive Market Intelligence'  },
  { id:'trust-layer-id', v:'security',   n:'Trust Layer ID',      i:'🪪', u:'https://dwtl.io/identity',        hook:'Universal Identity Protocol'     },
];
// Total: 5+5+5+5+5+5+6+6 = 42 ✓

const TECH_STACK = [
  { cat:'Language',    icon:'💡', items:['Lume v1.1.0 (native)', 'TypeScript 5.x', 'JavaScript ES2022'] },
  { cat:'Frontend',   icon:'⚛️', items:['React 18', 'Vite 8', 'Three.js r169', 'React Native + Expo 54'] },
  { cat:'Backend',    icon:'🖥️', items:['Node.js 22', 'Express 5', 'Drizzle ORM', 'WebSocket (ws)'] },
  { cat:'Database',   icon:'🗄️', items:['PostgreSQL (Neon)', 'Redis (KV cache)', 'IPFS (content)'] },
  { cat:'Chain',      icon:'⛓️', items:['PoA L1 (Ed25519)', 'LTC v1.0 Certificates', 'Custom consensus'] },
  { cat:'AI',         icon:'🤖', items:['OpenAI GPT-4o', 'Lume-V deterministic wrapper', 'Guardian Scanner'] },
  { cat:'Deploy',     icon:'🚀', items:['Render (42 services)', 'Cloudflare (CDN + DNS)', 'GitHub CI'] },
  { cat:'Standards',  icon:'📐', items:['PWA (all 42 apps)', 'WCAG 2.1 AA', 'Trust Layer Std v1.0'] },
];

// ── SVG Map computation ───────────────────────────────────────────────────────

const CX = 480, CY = 480, V_RADIUS = 185, A_RADIUS = 330;

function computeMapPositions() {
  const vPos: Record<string, { x: number; y: number; angle: number }> = {};
  const aPos: Record<string, { x: number; y: number }> = {};

  VERTICALS.forEach((v, i) => {
    const angle = (i / VERTICALS.length) * Math.PI * 2 - Math.PI / 2;
    vPos[v.id] = { x: CX + V_RADIUS * Math.cos(angle), y: CY + V_RADIUS * Math.sin(angle), angle };
  });

  APPS.forEach(app => {
    const vp = vPos[app.v];
    if (!vp) return;
    const siblings = APPS.filter(a => a.v === app.v);
    const idx = siblings.indexOf(app);
    const spread = Math.min(0.55, 0.9 / Math.max(siblings.length - 1, 1));
    const offset = (idx - (siblings.length - 1) / 2) * spread;
    const angle = vp.angle + offset;
    const r = A_RADIUS + (idx % 2 === 0 ? 0 : 28);
    aPos[app.id] = { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  });

  return { vPos, aPos };
}

const { vPos, aPos } = computeMapPositions();

// ── Component ─────────────────────────────────────────────────────────────────

type Tab = 'map' | 'directory' | 'tech';

export function EcosystemNavigator() {
  const [open, setOpen]             = useState(false);
  const [tab, setTab]               = useState<Tab>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'directory' : 'map'
  );
  const [focused, setFocused]       = useState<string | null>(null); // app id
  const [query, setQuery]           = useState('');
  const [tooltip, setTooltip]       = useState<{ app: App; x: number; y: number } | null>(null);
  const svgRef                      = useRef<SVGSVGElement>(null);

  const toggle = useCallback(() => setOpen(o => !o), []);
  const close  = useCallback(() => { setOpen(false); setFocused(null); }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = ''; };
  }, [open, close]);

  const focusedVertical = useMemo(() =>
    focused ? APPS.find(a => a.id === focused)?.v ?? null : null
  , [focused]);

  const filtered = useMemo(() => {
    if (!query.trim()) return APPS;
    const q = query.toLowerCase();
    return APPS.filter(a => a.n.toLowerCase().includes(q) || a.hook.toLowerCase().includes(q));
  }, [query]);

  // ── render helpers ──

  function appOpacity(appId: string) {
    if (!focused) return 1;
    if (appId === focused) return 1;
    if (APPS.find(a => a.id === appId)?.v === focusedVertical) return 0.55;
    return 0.12;
  }

  function lineOpacity(appId: string) {
    if (!focused) return 0.18;
    if (appId === focused) return 0.9;
    if (APPS.find(a => a.id === appId)?.v === focusedVertical) return 0.4;
    return 0.04;
  }

  function vNodeOpacity(vId: string) {
    if (!focused) return 1;
    return vId === focusedVertical ? 1 : 0.2;
  }

  function handleAppClick(app: App, e: React.MouseEvent) {
    e.stopPropagation();
    if (focused === app.id) { window.open(app.u, '_blank', 'noopener,noreferrer'); setFocused(null); }
    else setFocused(app.id);
  }

  function handleAppHover(app: App, rect: DOMRect) {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    setTooltip({ app, x: rect.left - svgRect.left + rect.width / 2, y: rect.top - svgRect.top - 12 });
  }

  // ── SVG Map tab ──
  const MapTab = () => (
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 0, right: 0, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', pointerEvents: 'none' }}>
        Click any app to highlight its connections · Click again to open
      </div>
      <svg
        ref={svgRef}
        viewBox="0 0 960 960"
        style={{ width: '100%', height: '100%', cursor: focused ? 'pointer' : 'default' }}
        onClick={() => setFocused(null)}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Center glow */}
        <circle cx={CX} cy={CY} r={60} fill="url(#centerGlow)" />

        {/* Spoke lines: center → vertical */}
        {VERTICALS.map(v => {
          const vp = vPos[v.id];
          return (
            <line key={`sv-${v.id}`}
              x1={CX} y1={CY} x2={vp.x} y2={vp.y}
              stroke={v.color}
              strokeWidth={focused && focusedVertical !== v.id ? 0.5 : 1.5}
              strokeOpacity={focused ? (focusedVertical === v.id ? 0.7 : 0.08) : 0.35}
              style={{ transition: 'all 0.3s ease' }}
            />
          );
        })}

        {/* App → vertical lines */}
        {APPS.map(app => {
          const ap = aPos[app.id];
          const vp = vPos[app.v];
          const vert = VERTICALS.find(v => v.id === app.v)!;
          if (!ap || !vp) return null;
          return (
            <line key={`av-${app.id}`}
              x1={ap.x} y1={ap.y} x2={vp.x} y2={vp.y}
              stroke={vert.color}
              strokeWidth={focused === app.id ? 2 : 1}
              strokeOpacity={lineOpacity(app.id)}
              style={{ transition: 'all 0.25s ease' }}
            />
          );
        })}

        {/* Vertical nodes */}
        {VERTICALS.map(v => {
          const vp = vPos[v.id];
          const op = vNodeOpacity(v.id);
          return (
            <g key={v.id} style={{ opacity: op, transition: 'opacity 0.25s ease', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); setFocused(f => f && APPS.find(a=>a.id===f)?.v === v.id ? null : (APPS.find(a=>a.v===v.id)?.id ?? null)); }}>
              <circle cx={vp.x} cy={vp.y} r={22} fill={v.glow} stroke={v.color} strokeWidth={1.5} />
              <text x={vp.x} y={vp.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize={16}>{v.icon}</text>
              <text x={vp.x} y={vp.y + 34} textAnchor="middle" fontSize={9} fill={v.color} fontWeight={700} letterSpacing={0.5}
                style={{ textTransform: 'uppercase' }}>{v.label}</text>
            </g>
          );
        })}

        {/* App nodes */}
        {APPS.map(app => {
          const ap = aPos[app.id];
          const vert = VERTICALS.find(v => v.id === app.v)!;
          if (!ap) return null;
          const isFocused = focused === app.id;
          return (
            <g key={app.id}
              style={{ opacity: appOpacity(app.id), transition: 'opacity 0.25s ease', cursor: 'pointer' }}
              onClick={(e) => handleAppClick(app, e)}
              onMouseEnter={(e) => handleAppHover(app, (e.currentTarget as SVGGElement).getBoundingClientRect())}
              onMouseLeave={() => setTooltip(null)}
              filter={isFocused ? 'url(#glow)' : undefined}>
              <circle cx={ap.x} cy={ap.y} r={isFocused ? 15 : 12}
                fill={isFocused ? vert.color : 'rgba(255,255,255,0.06)'}
                stroke={isFocused ? '#fff' : vert.color}
                strokeWidth={isFocused ? 2 : 1}
                style={{ transition: 'all 0.2s ease' }} />
              <text x={ap.x} y={ap.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize={isFocused ? 10 : 9}>{app.i}</text>
              <text x={ap.x} y={ap.y + (isFocused ? 24 : 20)} textAnchor="middle"
                fontSize={isFocused ? 9 : 7.5} fill={isFocused ? '#fff' : 'rgba(255,255,255,0.55)'}
                fontWeight={isFocused ? 700 : 400}
                style={{ transition: 'all 0.2s ease' }}>{app.n}</text>
            </g>
          );
        })}

        {/* Center node */}
        <g style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setFocused(null); }}>
          <circle cx={CX} cy={CY} r={36} fill="rgba(6,182,212,0.08)" stroke="#06b6d4" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={28} fill="rgba(6,182,212,0.12)" />
          <text x={CX} y={CY - 5} textAnchor="middle" dominantBaseline="middle" fontSize={20}>🌊</text>
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize={9} fill="#67e8f9" fontWeight={800} letterSpacing={1}>TRUST LAYER</text>
        </g>

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect x={tooltip.x - 70} y={tooltip.y - 34} width={140} height={32} rx={6}
              fill="rgba(3,6,14,0.95)" stroke="rgba(6,182,212,0.25)" strokeWidth={1} />
            <text x={tooltip.x} y={tooltip.y - 22} textAnchor="middle" fontSize={10} fill="#fff" fontWeight={700}>{tooltip.app.n}</text>
            <text x={tooltip.x} y={tooltip.y - 10} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.45)">{tooltip.app.hook}</text>
          </g>
        )}
      </svg>
    </div>
  );

  // ── Directory tab ──
  const DirectoryTab = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
      {/* Search */}
      <div style={{ position: 'sticky', top: 0, background: 'rgba(3,5,12,0.97)', paddingTop: 4, paddingBottom: 10, zIndex: 2 }}>
        <input
          placeholder="Search 42 apps…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {query.trim() ? (
        // Search results
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {filtered.map(app => {
            const vert = VERTICALS.find(v => v.id === app.v)!;
            return (
              <a key={app.id} href={app.u} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${vert.color}22`,
                  textDecoration: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 600 }}>
                <span style={{ fontSize: 16 }}>{app.i}</span>
                <div>
                  <div>{app.n}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>{app.hook}</div>
                </div>
              </a>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: '24px 0' }}>No apps match "{query}"</div>
          )}
        </div>
      ) : (
        // All verticals
        VERTICALS.map(vert => {
          const vertApps = APPS.filter(a => a.v === vert.id);
          return (
            <div key={vert.id} style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: vert.glow, border: `1px solid ${vert.color}40`, fontSize: 16,
                }}>
                  {vert.icon}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: vert.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{vert.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{vertApps.length} app{vertApps.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
                {vertApps.map(app => (
                  <a key={app.id} href={app.u} target="_blank" rel="noopener noreferrer"
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = vert.glow; (e.currentTarget as HTMLAnchorElement).style.borderColor = `${vert.color}40`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.02)'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                      textDecoration: 'none', transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.2 }}>{app.i}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.88)', marginBottom: 2 }}>{app.n}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{app.hook}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  // ── Tech Stack tab ──
  const TechTab = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 32px' }}>
      {/* Big metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Apps', value: '42', icon: '📱', color: '#06b6d4' },
          { label: 'Papers', value: '42', icon: '📄', color: '#a78bfa' },
          { label: 'LOC', value: '2.1M+', icon: '💻', color: '#10b981' },
          { label: 'Verticals', value: '8', icon: '◈', color: '#f59e0b' },
          { label: 'Papers', value: '42', icon: '🎓', color: '#ec4899' },
          { label: 'Zenodo DOIs', value: '42', icon: '🔗', color: '#84cc16' },
        ].map(m => (
          <div key={m.label + m.value} style={{
            padding: '16px', borderRadius: 14, textAlign: 'center',
            background: `${m.color}0a`, border: `1px solid ${m.color}20`,
          }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{m.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: m.color, fontFamily: "'JetBrains Mono',monospace" }}>{m.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Stack breakdown */}
      <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>
        Technology Stack
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10 }}>
        {TECH_STACK.map(cat => (
          <div key={cat.cat} style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>{cat.icon}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{cat.cat}</span>
            </div>
            {cat.items.map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#06b6d4', flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{item}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Governance banner */}
      <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 12, background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.15)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#c4b5fd', marginBottom: 6 }}>🔒 Trust Layer Deployment Standard v1.0 — ACTIVE</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
          All 42 applications are governed by the Lume-V deployment standard. Every non-Lume app is wrapped in a
          deterministic governance envelope before deployment. 2 apps are Lume-native. Architecture is locked
          at 42/42 (apps/papers) — the symmetric, deterministic form.
        </div>
      </div>

      {/* Citation */}
      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1.7 }}>
          Built by DarkWave Studios LLC · Nashville, TN · All 42 canon papers available on Zenodo via community{' '}
          <a href="https://zenodo.org/communities/lume-daigs-ecosystem" target="_blank" rel="noopener noreferrer"
            style={{ color: 'rgba(6,182,212,0.6)', textDecoration: 'none' }}>lume-daigs-ecosystem</a>
        </div>
      </div>
    </div>
  );

  // ── Main render ──
  const isMob = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <>
      {/* Trigger — bottom-center, distinct from account hub */}
      <button
        onClick={toggle}
        aria-label="Ecosystem Navigator"
        data-testid="btn-ecosystem-navigator"
        style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9997, display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 18px', borderRadius: 999,
          background: open ? 'rgba(6,182,212,0.12)' : 'rgba(8,10,18,0.88)',
          border: `1px solid ${open ? 'rgba(6,182,212,0.4)' : 'rgba(6,182,212,0.18)'}`,
          backdropFilter: 'blur(20px)', cursor: 'pointer', outline: 'none',
          color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700,
          fontFamily: 'inherit', letterSpacing: '0.04em',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
          transition: 'all 0.2s ease',
        }}>
        <span style={{ fontSize: 14 }}>{open ? '✕' : '◈'}</span>
        {open ? 'Close' : 'Ecosystem'}
      </button>

      {/* Backdrop */}
      {open && (
        <div onClick={close} style={{
          position: 'fixed', inset: 0, zIndex: 9995,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        }} />
      )}

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: isMob ? 0 : '3vh',
          left: isMob ? 0 : '50%',
          transform: isMob ? 'none' : 'translateX(-50%)',
          width: isMob ? '100vw' : 'min(1100px, 95vw)',
          height: isMob ? '100dvh' : '94vh',
          zIndex: 9996,
          background: 'linear-gradient(180deg,rgba(3,5,12,0.99),rgba(2,4,10,0.995))',
          border: isMob ? 'none' : '1px solid rgba(6,182,212,0.12)',
          borderRadius: isMob ? 0 : 20,
          backdropFilter: 'blur(60px)',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
          overflowY: tab !== 'map' ? 'auto' : 'hidden',
        }}>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px 0',
            borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: 14, flexShrink: 0,
          }}>
            <div style={{ fontSize: 22 }}>◈</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}>
                Trust Layer Ecosystem
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>
                42 applications · 42 papers · 8 verticals · Lume-V governed
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              {([['map','🗺️','Map'],['directory','📋','Directory'],['tech','⚙️','Tech']] as const).map(([t,ico,lbl]) => (
                <button key={t} onClick={() => setTab(t as Tab)} style={{
                  padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'rgba(6,182,212,0.12)' : 'rgba(255,255,255,0.03)',
                  color: tab === t ? '#67e8f9' : 'rgba(255,255,255,0.4)',
                  fontSize: 12, fontWeight: tab === t ? 700 : 500,
                  fontFamily: 'inherit',
                  borderBottom: tab === t ? '2px solid #06b6d4' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}>
                  {ico} {lbl}
                </button>
              ))}
              <button onClick={close} style={{
                marginLeft: 4, width: 30, height: 30, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                fontFamily: 'inherit',
              }}>✕</button>
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingTop: 16 }}>
            {tab === 'map'       && <MapTab />}
            {tab === 'directory' && <DirectoryTab />}
            {tab === 'tech'      && <TechTab />}
          </div>
        </div>
      )}
    </>
  );
}
