/**
 * EcosystemFooter — Trust Layer Cross-App Contextual Footer
 * Drop-in: <EcosystemFooter appId="garagebot" />
 * Shows vertical siblings + Trust Hub anchor. Zero external deps.
 */
import { useState } from 'react';

interface AppEntry { id:string; v:string; n:string; i:string; u:string; hook:string; }

const VERTICALS: Record<string,{label:string;icon:string;color:string}> = {
  core:       { label:'Core Identity',     icon:'🌊', color:'#06b6d4' },
  language:   { label:'Language & Dev',    icon:'💡', color:'#a78bfa' },
  creative:   { label:'Creative Studio',   icon:'🎨', color:'#f43f5e' },
  gaming:     { label:'Gaming & Social',   icon:'🎮', color:'#8b5cf6' },
  enterprise: { label:'Enterprise & Ops',  icon:'🏢', color:'#10b981' },
  automotive: { label:'Automotive',        icon:'🚗', color:'#f59e0b' },
  lifestyle:  { label:'Lifestyle & Health',icon:'🌿', color:'#84cc16' },
  security:   { label:'Finance & Security',icon:'🔐', color:'#ec4899' },
};

const APPS: AppEntry[] = [
  { id:'trust-layer',    v:'core',       n:'Trust Layer',         i:'🌊', u:'https://dwtl.io',                hook:'The Foundation of Trust'         },
  { id:'trust-hub',      v:'core',       n:'Trust Hub',           i:'🛡️', u:'https://trusthub.tlid.io',       hook:'Ecosystem Command Center'        },
  { id:'tlid',           v:'core',       n:'TLID.io',             i:'🆔', u:'https://tlid.io',                hook:'Your Blockchain Identity'        },
  { id:'trust-vault',    v:'core',       n:'TrustVault',          i:'🔒', u:'https://trustvault.tlid.io',     hook:'Multi-Chain Secure Vault'        },
  { id:'trust-home',     v:'core',       n:'TrustHome',           i:'🏠', u:'https://trusthome.tlid.io',      hook:'Real Estate on Trust Layer'      },
  { id:'lume',           v:'language',   n:'Lume',                i:'💡', u:'https://lume-lang.org',          hook:'Deterministic Natural Language'  },
  { id:'happyeats-lume', v:'language',   n:'HappyEats Lume',      i:'🍀', u:'https://happyeats.tlid.io',      hook:'First Lume-Native App'           },
  { id:'dw-studio',      v:'language',   n:'DW Studio',           i:'🖥️', u:'https://studio.tlid.io',         hook:'Ecosystem IDE for Lume'          },
  { id:'dw-academy',     v:'language',   n:'DW Academy',          i:'📖', u:'https://academy.tlid.io',        hook:'Learn the Ecosystem'             },
  { id:'lumeline',       v:'language',   n:'LumeLine',            i:'📊', u:'https://lumeline.app',           hook:'Sharp Sports Intelligence'       },
  { id:'trustgen',       v:'creative',   n:'TrustGen 3D',         i:'🎨', u:'https://trustgen.tlid.io',       hook:'AI 3D Creation Studio'           },
  { id:'darkwavestudios',v:'creative',   n:'DarkWave Studios',    i:'🎛️', u:'https://darkwavestudios.io',     hook:'Premium Web Agency'              },
  { id:'trust-book',     v:'creative',   n:'Trust Book',          i:'📚', u:'https://dwtl.io/trust-book',     hook:'Censorship-Free Publishing'      },
  { id:'through-veil',   v:'creative',   n:'Through The Veil',    i:'🔮', u:'https://throughtheveil.tlid.io', hook:'The Novel That Started It All'   },
  { id:'signalcast',     v:'creative',   n:'SignalCast',           i:'📡', u:'https://signalcast.tlid.io',     hook:'One Signal. Every Platform.'    },
  { id:'chronicles',     v:'gaming',     n:'Chronicles',          i:'📜', u:'https://yourlegacy.io',          hook:'Not a Game. A Life.'             },
  { id:'bomber-golf',    v:'gaming',     n:'Bomber Golf',         i:'⛳', u:'https://bombergolf.tlid.io',     hook:'Crush It Off the Tee'            },
  { id:'the-arcade',     v:'gaming',     n:'The Arcade',          i:'🕹️', u:'https://darkwavegames.io',       hook:'Provably Fair Gaming'            },
  { id:'trust-golf',     v:'gaming',     n:'Trust Golf',          i:'🏌️', u:'https://trustgolf.app',          hook:'Premium Golf Companion'          },
  { id:'the-void',       v:'gaming',     n:'THE VOID',            i:'🕳️', u:'https://intothevoid.app',        hook:'Cathartic Voice-First Wellness'  },
  { id:'orbit',          v:'enterprise', n:'ORBIT',               i:'🌐', u:'https://orbitstaffing.io',       hook:'Blockchain-Powered HR'           },
  { id:'orby',           v:'enterprise', n:'Orby Commander',      i:'📍', u:'https://getorby.io',             hook:'Venue & Event Operations'        },
  { id:'tradeworks',     v:'enterprise', n:'TradeWorks AI',       i:'🔧', u:'https://tradeworksai.io',        hook:'AI-Powered Field Services'       },
  { id:'lotops',         v:'enterprise', n:'Lot Ops Pro',         i:'🚙', u:'https://lotopspro.io',           hook:'Autonomous Lot Management'       },
  { id:'driver-connect', v:'enterprise', n:'TL Driver Connect',   i:'🚚', u:'https://tldriverconnect.com',    hook:'Verified Driver Coordination'    },
  { id:'garagebot',      v:'automotive', n:'GarageBot',           i:'🔩', u:'https://garagebot.io',           hook:'IoT Garage Automation'           },
  { id:'torque',         v:'automotive', n:'TORQUE',              i:'🏎️', u:'https://garagebot.io/torque',    hook:'Verified Automotive Marketplace' },
  { id:'brew-board',     v:'automotive', n:'Brew & Board',        i:'☕', u:'https://brewandboard.coffee',    hook:'Social Gaming Meets Coffee'      },
  { id:'dwsc',           v:'automotive', n:'DWSC Portal',         i:'◈',  u:'https://dwsc.io',                hook:'Ecosystem Portal'                },
  { id:'signal-chat',    v:'automotive', n:'Signal Chat',         i:'💬', u:'https://dwtl.io/signal-chat',    hook:'Blockchain-Verified Messaging'   },
  { id:'verdara',        v:'lifestyle',  n:'Verdara',             i:'🌲', u:'https://verdara.tlid.io',        hook:'AI Outdoor Command Center'       },
  { id:'arbora',         v:'lifestyle',  n:'Arbora',              i:'🌳', u:'https://verdara.tlid.io/arbora', hook:'Pro Arborist Business Suite'     },
  { id:'vedasolus',      v:'lifestyle',  n:'VedaSolus',           i:'🌿', u:'https://vedasolus.io',           hook:'Ancient Wisdom Meets Science'    },
  { id:'happyeats',      v:'lifestyle',  n:'HappyEats',           i:'🍔', u:'https://happyeats.app',          hook:'Local Food Truck Ordering'       },
  { id:'paintpros',      v:'lifestyle',  n:'PaintPros',           i:'🪣', u:'https://paintpros.io',           hook:'Painting Business Platform'      },
  { id:'nashpaintpros',  v:'lifestyle',  n:'Nashville Paint Pros',i:'🏚️', u:'https://nashpaintpros.io',       hook:"Nashville's Premier Painters"    },
  { id:'guardian-scanner',  v:'security',n:'Guardian Scanner',   i:'🤖', u:'https://dwtl.io/guardian',       hook:'Verify Any AI Agent'             },
  { id:'guardian-screener', v:'security',n:'Guardian Screener',  i:'🔍', u:'https://dwtl.io/guardian-screener',hook:'DEX Intelligence'              },
  { id:'strikeagent',    v:'security',   n:'StrikeAgent',         i:'⚡', u:'https://strikeagent.io',         hook:'AI Trading Intelligence'         },
  { id:'trustshield',    v:'security',   n:'TrustShield',         i:'🛡️', u:'https://trustshield.tech',       hook:'Enterprise Security'             },
  { id:'pulse',          v:'security',   n:'Pulse',               i:'📈', u:'https://darkwavepulse.com',      hook:'Predictive Market Intelligence'  },
  { id:'trust-layer-id', v:'security',   n:'Trust Layer ID',      i:'🪪', u:'https://dwtl.io/identity',       hook:'Universal Identity Protocol'     },
];

const OVERRIDES: Record<string,string[]> = {
  'trust-layer':    ['trust-hub','tlid','trust-vault','guardian-scanner'],
  'darkwavestudios':['trustgen','signalcast','lume','chronicles'],
  'lume':           ['dw-studio','dw-academy','happyeats-lume','trustgen'],
};

function getSiblings(appId: string, max = 4): AppEntry[] {
  const ids = OVERRIDES[appId];
  if (ids) return ids.map(id => APPS.find(a => a.id === id)).filter(Boolean) as AppEntry[];
  const self = APPS.find(a => a.id === appId);
  if (!self) return APPS.slice(0, max);
  return APPS.filter(a => a.v === self.v && a.id !== appId).slice(0, max);
}

interface Props {
  appId: string;
  label?: string;
  showLegal?: boolean;
}

export function EcosystemFooter({ appId, label, showLegal = true }: Props) {
  const [hov, setHov] = useState<string | null>(null);
  const [hubHov, setHubHov] = useState(false);
  const self    = APPS.find(a => a.id === appId);
  const vert    = self ? VERTICALS[self.v] : null;
  const siblings = getSiblings(appId);

  return (
    <footer style={{
      width:'100%', borderTop:'1px solid rgba(255,255,255,0.04)',
      background:'linear-gradient(180deg,transparent 0%,rgba(3,5,12,0.98) 40%)',
      padding:'20px 0 14px', position:'relative', overflow:'hidden',
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
    }}>
      {/* ambient glow */}
      <div style={{ position:'absolute',top:'-50px',left:'50%',transform:'translateX(-50%)',
        width:'700px',height:'100px',pointerEvents:'none',
        background:'radial-gradient(ellipse,rgba(6,182,212,0.05) 0%,transparent 70%)' }} />

      <div style={{ maxWidth:1240, margin:'0 auto', padding:'0 24px' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.14em',
            textTransform:'uppercase', color:'rgba(255,255,255,0.18)' }}>
            {label ?? 'Also on Trust Layer'}
          </span>
          {vert && (
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em',
              textTransform:'uppercase', color:vert.color,
              background:`${vert.color}12`, border:`1px solid ${vert.color}22`,
              borderRadius:5, padding:'2px 7px' }}>
              {vert.icon} {vert.label}
            </span>
          )}
        </div>

        {/* Chips rail */}
        <div style={{ display:'flex', alignItems:'center', gap:8,
          overflowX:'auto', paddingBottom:2,
          scrollbarWidth:'none', msOverflowStyle:'none' } as React.CSSProperties}>

          {siblings.map(app => {
            const c = VERTICALS[app.v]?.color ?? '#06b6d4';
            const on = hov === app.id;
            return (
              <a key={app.id} href={app.u} target="_blank" rel="noopener noreferrer"
                onMouseEnter={() => setHov(app.id)}
                onMouseLeave={() => setHov(null)}
                style={{
                  display:'flex', alignItems:'center', gap:8, padding:'8px 14px',
                  borderRadius:11, textDecoration:'none', flexShrink:0,
                  background: on ? `${c}0e` : 'rgba(255,255,255,0.02)',
                  border:`1px solid ${on ? `${c}28` : 'rgba(255,255,255,0.05)'}`,
                  transform: on ? 'translateY(-2px)' : 'none',
                  transition:'all 0.18s ease',
                }}>
                <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{app.i}</span>
                <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                  <span style={{ fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                    color: on ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.55)',
                    transition:'color 0.18s' }}>{app.n}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,0.22)',
                    whiteSpace:'nowrap' }}>{app.hook}</span>
                </div>
              </a>
            );
          })}

          {/* divider */}
          <div style={{ width:1, height:34, background:'rgba(255,255,255,0.06)', flexShrink:0 }} />

          {/* Trust Hub anchor — always present */}
          <a href="https://trusthub.tlid.io" target="_blank" rel="noopener noreferrer"
            onMouseEnter={() => setHubHov(true)}
            onMouseLeave={() => setHubHov(false)}
            style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
              borderRadius:11, textDecoration:'none', flexShrink:0,
              background: hubHov ? 'rgba(6,182,212,0.09)' : 'rgba(6,182,212,0.04)',
              border:`1px solid ${hubHov ? 'rgba(6,182,212,0.28)' : 'rgba(6,182,212,0.12)'}`,
              transform: hubHov ? 'translateY(-2px)' : 'none',
              transition:'all 0.18s ease',
            }}>
            <span style={{ fontSize:14 }}>◈</span>
            <span style={{ fontSize:11, fontWeight:800, whiteSpace:'nowrap',
              color: hubHov ? '#67e8f9' : 'rgba(6,182,212,0.55)',
              transition:'color 0.18s', letterSpacing:'0.02em' }}>Trust Hub</span>
          </a>
        </div>

        {/* Legal bar */}
        {showLegal && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
            marginTop:14, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.03)',
            flexWrap:'wrap', gap:6 }}>
            <span style={{ fontSize:9, color:'rgba(255,255,255,0.11)', letterSpacing:'0.03em' }}>
              © {new Date().getFullYear()} DarkWave Studios LLC · 42 apps · 42 papers · Lume-V governed
            </span>
            <a href="https://dwtl.io" target="_blank" rel="noopener noreferrer"
              style={{ fontSize:9, color:'rgba(6,182,212,0.3)', textDecoration:'none',
                fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>
              Trust Layer ◈
            </a>
          </div>
        )}
      </div>
    </footer>
  );
}
