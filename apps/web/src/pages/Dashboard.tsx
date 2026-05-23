import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { UserButton, useAuth, useUser } from '@clerk/react';
import ChatbotPage from './ChatbotPage';
import RagManager from './RagManager';

type Section = 'overview' | 'chat' | 'kb' | 'history' | 'settings';

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

function OverviewSection() {
  const { user } = useUser();

  const stats = [
    { label: 'Conversations', value: '—', icon: '💬' },
    { label: 'Languages Used', value: '—', icon: '🌐' },
    { label: 'Documents', value: '—', icon: '📄' },
    { label: 'Uptime', value: '—', icon: '⚡' },
  ];

  return (
    <div className="overview-section">
      <h2 className="dash-section-title">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h2>
      <p className="dash-section-sub">Here's what's happening with your voice agent.</p>

      <div className="overview-grid">
        {stats.map((s) => (
          <div key={s.label} className="overview-card">
            <span className="overview-card-icon">{s.icon}</span>
            <div className="overview-card-body">
              <span className="overview-card-value">{s.value}</span>
              <span className="overview-card-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="overview-bottom">
        <div className="overview-recent">
          <h3>Recent Activity</h3>
          <p className="overview-empty">No conversations yet. Start chatting to see your activity here.</p>
        </div>
        <div className="overview-quick">
          <h3>Quick Actions</h3>
          <ul>
            <li>🎤 Start a voice conversation</li>
            <li>📄 Upload a document to the knowledge base</li>
            <li>🌐 Try a different language</li>
          </ul>
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
        return <OverviewSection />;
      case 'chat':
        return <ChatbotPage />;
      case 'kb':
        return <RagManager onNavigate={() => setSection('chat')} />;
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
            <span className="dash-logo-text">Gena</span>
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
