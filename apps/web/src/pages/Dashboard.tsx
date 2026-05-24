import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/react';
import ChatbotPage from './ChatbotPage';
import RagManager from './RagManager';
import RealtimeVoicePage from './RealtimeVoicePage';

type Section = 'overview' | 'chat' | 'kb' | 'realtime' | 'history' | 'settings';

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'realtime',
    label: 'Real-time Voice',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" x2="12" y1="19" y2="22" />
      </svg>
    ),
  },
  {
    id: 'kb',
    label: 'Knowledge',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <path d="M10 2v8l3-2 3 2V2" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

/* ─── Tiny helper components ─── */

function OverviewSection({ setSection }: { setSection: (s: Section) => void }) {
  const { user } = useUser();

  const timelineItems = [
    { type: 'Voice Call', lang: 'Hinglish', duration: '1.2 min', time: '10 mins ago' },
    { type: 'Voice Call', lang: 'Tamil', duration: '2.5 min', time: '2 hours ago' },
    { type: 'Document Ingestion', lang: 'RAG', duration: '4 pages', time: 'Yesterday' },
  ];

  return (
    <div className="overview-section">
      <h2 className="dash-section-title">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h2>
      <p className="dash-section-sub">System latency metrics and active Indic configuration.</p>

      <div className="bento-grid">
        {/* Card 1: System Latency Target */}
        <div className="bento-item span-2">
          <div>
            <div className="bento-header">
              <span className="bento-title">System Latency Performance</span>
              <span className="bento-icon">⚡</span>
            </div>
            <div className="bento-value" style={{ fontFamily: 'var(--cb-mono)', fontSize: '28px', letterSpacing: '-0.05em' }}>&lt; 1.5s</div>
            <div className="bento-desc">End-to-end target latency. Optimised pipeline using Sarvam Bulbul streaming and Groq.</div>
            
            {/* Inline Sparkline */}
            <div className="sparkline-container" style={{ margin: '20px 0 10px', height: '35px' }}>
              <svg width="100%" height="100%" viewBox="0 0 300 30" fill="none" preserveAspectRatio="none">
                <path
                  d="M0 25 L30 18 L60 22 L90 12 L120 15 L150 8 L180 14 L210 10 L240 18 L270 5 L300 8"
                  stroke="var(--cb-accent)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M0 25 L30 18 L60 22 L90 12 L120 15 L150 8 L180 14 L210 10 L240 18 L270 5 L300 8 L300 30 L0 30 Z"
                  fill="url(#sparkline-grad)"
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cb-accent)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          
          <div className="metrics-list" style={{ marginTop: '16px' }}>
            <div className="metric-row">
              <span className="metric-label">
                <span className="metric-status-dot"></span>
                STT (Sarvam Saaras)
              </span>
              <span className="metric-value">&lt; 400ms</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">
                <span className="metric-status-dot"></span>
                LLM Inference (Groq)
              </span>
              <span className="metric-value">&lt; 300ms</span>
            </div>
            <div className="metric-row">
              <span className="metric-label">
                <span className="metric-status-dot"></span>
                TTS First-Byte (Sarvam Bulbul)
              </span>
              <span className="metric-value">&lt; 600ms</span>
            </div>
          </div>
        </div>

        {/* Card 2: Knowledge Base Connection */}
        <div className="bento-item">
          <div>
            <div className="bento-header">
              <span className="bento-title">Knowledge Base</span>
              <span className="bento-icon">📂</span>
            </div>
            <div className="bento-value" style={{ fontFamily: 'var(--cb-mono)', fontSize: '28px', letterSpacing: '-0.05em' }}>ChromaDB</div>
            <div className="bento-desc">Local vector collection storing your processed files for grounded retrieval.</div>
          </div>
          <div className="metrics-list" style={{ marginTop: '24px', fontFamily: 'var(--cb-mono)', fontSize: '12px' }}>
            <div className="metric-row">
              <span className="metric-label" style={{ fontFamily: 'Inter, sans-serif' }}>Connection</span>
              <span className="metric-value" style={{ color: 'var(--cb-teal)' }}>ACTIVE</span>
            </div>
            <div className="metric-row">
              <span className="metric-label" style={{ fontFamily: 'Inter, sans-serif' }}>Strategy</span>
              <span className="metric-value">HYBRID_BM25</span>
            </div>
            <div className="metric-row">
              <span className="metric-label" style={{ fontFamily: 'Inter, sans-serif' }}>Vector Count</span>
              <span className="metric-value">1,424</span>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Action Dock */}
        <div className="bento-item">
          <div>
            <div className="bento-header">
              <span className="bento-title">Quick Actions</span>
              <span className="bento-icon">🚀</span>
            </div>
            <div className="bento-desc" style={{ marginBottom: '20px' }}>Jump directly into conversational testing or RAG indexing.</div>
          </div>
          <div className="action-grid">
            <button className="action-pill" onClick={() => setSection('realtime')}>
              <span className="action-pill-icon">🎙️</span>
              <span>Voice</span>
            </button>
            <button className="action-pill" onClick={() => setSection('chat')}>
              <span className="action-pill-icon">💬</span>
              <span>Chat</span>
            </button>
            <button className="action-pill" onClick={() => setSection('kb')}>
              <span className="action-pill-icon">📄</span>
              <span>Docs</span>
            </button>
            <button className="action-pill" onClick={() => setSection('settings')}>
              <span className="action-pill-icon">⚙️</span>
              <span>Config</span>
            </button>
          </div>
        </div>

        {/* Card 4: Recent Logs Timeline */}
        <div className="bento-item span-2">
          <div>
            <div className="bento-header">
              <span className="bento-title">Recent Session Logs</span>
              <span className="bento-icon">📊</span>
            </div>
            <div className="timeline-list">
              {timelineItems.map((item, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-left">
                    <span>{item.type === 'Voice Call' ? '📞' : '⚙️'}</span>
                    <strong style={{ fontWeight: 600 }}>{item.type}</strong>
                    <span className="timeline-lang-badge">{item.lang.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--cb-muted)', fontFamily: 'var(--cb-mono)', fontSize: '11px' }}>{item.duration}</span>
                    <span className="timeline-time" style={{ fontSize: '11px' }}>{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorySection() {
  // Placeholder — would be backed by an API
  const conversations: any[] = [];

  return (
    <div className="history-section">
      <h2 className="dash-section-title">Conversation History</h2>
      <p className="dash-section-sub">Your recent chat sessions</p>

      {conversations.length === 0 ? (
        <div className="history-empty">
          <span className="history-empty-icon">📭</span>
          <p>No past conversations found.</p>
          <p className="history-empty-hint">Once you start chatting, your sessions will appear here.</p>
        </div>
      ) : (
        <div className="history-list">
          {conversations.map((c, i) => (
            <div key={i} className="history-item">{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsSection() {
  return (
    <div className="settings-section">
      <h2 className="dash-section-title">Settings</h2>
      <p className="dash-section-sub">Manage your preferences</p>

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

/* ─── Main Dashboard ─── */

export default function Dashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="dash-loading">
        <div className="dash-loading-ring">✦</div>
        <p>Loading…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  const renderSection = () => {
    switch (section) {
      case 'overview':
        return <OverviewSection setSection={setSection} />;
      case 'chat':
        return <ChatbotPage />;
      case 'kb':
        return <RagManager onNavigate={() => setSection('chat')} showNavbar={false} />;
      case 'realtime':
        return <RealtimeVoicePage />;
      case 'history':
        return <HistorySection />;
      case 'settings':
        return <SettingsSection />;
    }
  };

  return (
    <div className="dash">
      {/* ─── SIDEBAR ─── */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dash-sidebar-header">
          <button className="dash-logo" onClick={() => navigate('/')}>
            <span className="dash-logo-icon">✦</span>
            <span className="dash-logo-text">Lyra</span>
          </button>
        </div>

        <nav className="dash-sidebar-nav">
          {NAV_ITEMS.map((item) => (
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

      {/* overlay for mobile sidebar */}
      {sidebarOpen && <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* ─── MAIN ─── */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <button className="dash-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="dash-topbar-title">
            {NAV_ITEMS.find((n) => n.id === section)?.label || 'Dashboard'}
          </div>

          <div className="dash-topbar-right">
            <UserButton />
          </div>
        </header>

        {/* Content */}
        <main className="dash-content" key={section}>
          {renderSection()}
        </main>
      </div>
    </div>
  );
}
