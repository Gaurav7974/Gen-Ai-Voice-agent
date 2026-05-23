import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  UserButton,
  SignIn,
  SignUp,
  Show,
  useAuth,
} from '@clerk/react';
import Landing from './pages/Landing';
import RagManager from './pages/RagManager';
import ChatbotPage from './pages/ChatbotPage';
import Dashboard from './pages/Dashboard';
import './App.css';

function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname.startsWith('/login') || location.pathname.startsWith('/sign-up');

  // Don't render navbar on auth pages
  if (isAuth) return null;

  return (
    <header className={`auth-bar ${isLanding ? 'landing-nav' : ''}`}>
      <div className="nav-left" onClick={() => navigate('/')}>
        <span className="nav-brand">Gen<span>AI</span></span>
      </div>

      <nav className="nav-center">
        <button className="nav-link-btn" onClick={() => {
          const el = document.getElementById('how') || document.getElementById('features');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}>How it works</button>
        <button className="nav-link-btn" onClick={() => {
          const el = document.getElementById('features');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}>Features</button>
        <button className="nav-link-btn" onClick={() => {
          const el = document.getElementById('usecases');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}>Use cases</button>
      </nav>

      <div className="nav-right">
        <Show when="signed-out">
          <button className="auth-btn auth-btn-outline" onClick={() => navigate('/login')}>Sign in</button>
          <button className="auth-btn auth-btn-solid" onClick={() => navigate('/sign-up')}>Sign up</button>
        </Show>
        <Show when="signed-in">
          <NavLink to="/dashboard">
            <button className="nav-cta-link" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              AI Chatbot
            </button>
          </NavLink>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}

// ─── Inner component — rendered inside <BrowserRouter>, so hooks are safe ───
function AppRoutes() {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const [view, setView] = useState<'landing' | 'rag'>('landing');

  // After Clerk completes sign-in/sign-up, land on the dashboard
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<Landing onNavigate={setView} />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login/*" element={<div className="auth-page"><SignIn routing="path" path="/login" /></div>} />
        <Route path="/sign-up/*" element={<div className="auth-page"><SignUp routing="path" path="/sign-up" /></div>} />
        <Route path="/chatbot" element={<ChatbotPage />} />
        <Route path="/rag" element={<RagManager onNavigate={setView} />} />
        <Route path="/sign-in/*" element={<div className="auth-page"><SignIn routing="path" path="/sign-in" /></div>} />
      </Routes>
    </div>
  );
}

// ─── Shell — no hooks here, just creates the Router context ───
function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
