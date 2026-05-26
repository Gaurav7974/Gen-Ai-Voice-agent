import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import ChatbotPage from './ChatbotPage';
import RagManager from './RagManager';
import RealtimeVoicePage from './RealtimeVoicePage';

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  glowColor?: string;
  children: React.ReactNode;
}
// SOURCE: BentoGrid Glow — https://ui.aceternity.com/components/bento-grid
function BentoCard({ className = '', glowColor = 'var(--accent-glow)', children, ...props }: BentoCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 25 };
  const glowX = useSpring(mouseX, springConfig);
  const glowY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const backgroundValue = useTransform(
    [glowX, glowY],
    ([x, y]) => `radial-gradient(320px circle at ${x}px ${y}px, ${glowColor}, transparent 80%)`
  );

  return (
    <div
      className={`card bento-item ${className}`}
      onMouseMove={handleMouseMove}
      style={{ position: 'relative', overflow: 'hidden' }}
      {...props}
    >
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: backgroundValue,
          mixBlendMode: 'normal',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
        {children}
      </div>
    </div>
  );
}

type Section = 'overview' | 'chat' | 'kb' | 'realtime' | 'settings';

interface NavItem { id: Section; label: string; icon: React.ReactNode; badge?: string; }

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview', label: 'Overview',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    id: 'realtime', label: 'Voice',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>,
    badge: 'Live',
  },
  {
    id: 'chat', label: 'Chat',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    id: 'kb', label: 'Knowledge',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M10 2v8l3-2 3 2V2"/></svg>,
  },
  {
    id: 'settings', label: 'Settings',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  },
];

/* ── Overview Section ── */
function OverviewSection({ setSection }: { setSection: (s: Section) => void }) {
  const { user } = useUser();

  return (
    <div style={{animation:'slide-in .35s ease-out'}}>
      <h2 className="dash-section-title">
        Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
      </h2>
      <p className="dash-section-sub">System status, latency targets, and quick actions.</p>

      <div className="bento-grid">
        {/* ── Latency card ── */}
        <BentoCard className="span-2">
          <div>
            <div className="bento-header">
              <span className="bento-title">System Latency</span>
              <span className="bento-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </span>
            </div>
            <div className="bento-value accent">&lt; 1.5s</div>
            <p className="bento-desc">End-to-end target. Sarvam Bulbul v3 streaming + Groq inference.</p>
          </div>
          <div className="metrics-list">
            {[
              { label:'STT — Sarvam Saaras v3',  value:'< 400ms' },
              { label:'LLM — Groq Inference',  value:'< 300ms' },
              { label:'TTS — Sarvam Bulbul v3',   value:'< 600ms' },
            ].map(({ label, value }) => (
              <div key={label} className="metric-row">
                <span className="metric-label">
                  <span className="glow-dot glow-dot--small glow-dot--teal" />
                  {label}
                </span>
                <span className="metric-value">{value}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* ── Knowledge Base card ── */}
        <BentoCard className="card--teal" glowColor="var(--teal-glow)">
          <div>
            <div className="bento-header">
              <span className="bento-title">Knowledge Base</span>
              <span className="bento-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
              </span>
            </div>
            <div className="bento-value teal">ChromaDB</div>
            <p className="bento-desc">Hybrid BM25 + ChromaDB semantic search. Zero hallucinations.</p>
          </div>
          <div className="metrics-list">
            {[
              { label:'Connection', value:'ACTIVE' },
              { label:'Strategy',   value:'HYBRID_BM25' },
              { label:'Vectors',    value:'1,424' },
            ].map(({ label, value }) => (
              <div key={label} className="metric-row">
                <span className="metric-label">{label}</span>
                <span className="metric-value" style={label==='Connection'?{color:'var(--teal)'}:{}}>{value}</span>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* ── Quick Actions ── */}
        <BentoCard>
          <div>
            <div className="bento-header">
              <span className="bento-title">Quick Actions</span>
              <span className="bento-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.5 16.5c-1.5 1.25-2.5 3.5-2.5 3.5s2.25-1 3.5-2.5M12 2C6.5 2 2 6.5 2 12c0 2.25 1.5 3.5 3.5 3.5S12 10 12 10s4.5 4.5 4.5 6.5 1.25 3.5 3.5 3.5 2-5.5 2-11c0-5.5-4.5-9-10-9Z"/></svg>
              </span>
            </div>
            <p className="bento-desc" style={{marginBottom:'16px'}}>Jump directly into conversational testing or RAG indexing.</p>
          </div>
          <div className="action-grid">
            {[
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>, label:'Voice',    id:'realtime' as Section },
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label:'Chat',     id:'chat'     as Section },
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>, label:'Docs',     id:'kb'       as Section },
              { icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>, label:'Settings', id:'settings' as Section },
            ].map(({ icon, label, id }) => (
              <button key={id} className="action-pill" onClick={() => setSection(id)}>
                <span className="action-pill-icon">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </BentoCard>

        {/* ── Language support card ── */}
        <BentoCard className="card--violet" glowColor="var(--violet-glow)">
          <div>
            <div className="bento-header">
              <span className="bento-title">Active Languages</span>
              <span className="bento-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </span>
            </div>
            <div className="bento-value">11</div>
            <p className="bento-desc">11 Indic languages. Native STT + TTS — not translated.</p>
          </div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {['हिन्दी','தமிழ்','తెలుగు','ಕನ್ನಡ','मराठी','বাংলা'].map((l) => (
              <span key={l} className="pill pill--teal" style={{padding:'4px 10px',fontSize:'11px'}}>{l}</span>
            ))}
          </div>
        </BentoCard>
      </div>
    </div>
  );
}

/* ── Settings Section ── */
function SettingsSection() {
  return (
    <div className="settings-section" style={{animation:'slide-in .35s ease-out'}}>
      <h2 className="dash-section-title">Settings</h2>
      <p className="dash-section-sub">Manage your preferences and account</p>
      <div className="settings-card">
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-title">Language</span>
            <span className="settings-row-desc">Default voice input language</span>
          </div>
          <select className="settings-select" defaultValue="en">
            <option value="en">English</option>
            <option value="hi">Hindi (हिन्दी)</option>
            <option value="ta">Tamil (தமிழ்)</option>
            <option value="te">Telugu (తెలుగు)</option>
            <option value="kn">Kannada (ಕನ್ನಡ)</option>
            <option value="mr">Marathi (मराठी)</option>
          </select>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-title">Voice Output</span>
            <span className="settings-row-desc">Enable text-to-speech responses</span>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" defaultChecked />
            <span className="settings-toggle-track" />
          </label>
        </div>
        <div className="settings-divider" />
        <div className="settings-row">
          <div className="settings-row-label">
            <span className="settings-row-title">Account</span>
            <span className="settings-row-desc">Manage your profile and authentication</span>
          </div>
          <UserButton />
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-ring" style={{ animation: 'spin 1.5s linear infinite' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeDasharray="22"/></svg>
        </div>
        <p>Loading…</p>
      </div>
    );
  }
  if (!isSignedIn) return <Navigate to="/" replace />;

  const renderSection = () => {
    switch (section) {
      case 'overview':  return <OverviewSection setSection={setSection} />;
      case 'chat':      return <ChatbotPage />;
      case 'kb':        return <RagManager onNavigate={() => setSection('chat')} showNavbar={false} />;
      case 'realtime':  return <RealtimeVoicePage />;
      case 'settings':  return <SettingsSection />;
    }
  };

  return (
    <div className="dash">
      {/* ── SIDEBAR ── */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dash-sidebar-header">
          <button className="dash-logo" onClick={() => navigate('/')}>
            <span className="dash-logo-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ display: 'inline-block' }}><polygon points="12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9" /></svg>
            </span>
            <span>Lyra</span>
          </button>
          {/* System status */}
          <div className="dash-status">
            <span className="glow-dot glow-dot--teal glow-dot--small" />
            System online
          </div>
        </div>

        <nav className="dash-sidebar-nav">
          <span className="dash-nav-label">Main</span>
          {NAV_ITEMS.slice(0, 4).map((item) => (
            <button
              key={item.id}
              className={`dash-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => { setSection(item.id); setSidebarOpen(false); }}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge && <span className="dash-nav-badge">{item.badge}</span>}
            </button>
          ))}

          <span className="dash-nav-label" style={{marginTop:'8px'}}>Account</span>
          {NAV_ITEMS.slice(4).map((item) => (
            <button
              key={item.id}
              className={`dash-nav-item ${section === item.id ? 'active' : ''}`}
              onClick={() => { setSection(item.id); setSidebarOpen(false); }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <div className="dash-sidebar-user">
            <div className="dash-sidebar-avatar">
              {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="dash-sidebar-user-info">
              <span className="dash-sidebar-user-name">{user?.firstName || 'User'}</span>
              <span className="dash-sidebar-user-email">{user?.primaryEmailAddress?.toString() || ''}</span>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ── MAIN ── */}
      <div className="dash-main">
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="dash-topbar-title">
            {NAV_ITEMS.find((n) => n.id === section)?.label || 'Dashboard'}
          </div>
          <div className="dash-topbar-right">
            <UserButton />
          </div>
        </header>

        <main className="dash-content" key={section}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
