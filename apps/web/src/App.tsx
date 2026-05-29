import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
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
import RealtimeVoicePage from './pages/RealtimeVoicePage';
import DemoPage from './pages/DemoPage';
import SmoothScroll from './components/SmoothScroll';
import './App.css';

function AppNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const isAuth = location.pathname.startsWith('/login') || location.pathname.startsWith('/sign-up');
  const isDashboard = 
    location.pathname.startsWith('/dashboard') || 
    location.pathname.startsWith('/chatbot') || 
    location.pathname.startsWith('/realtime') || 
    location.pathname.startsWith('/rag') ||
    location.pathname.startsWith('/demo');

  // Landing has its own navbar; dashboard has sidebar; auth pages have none
  if (isLanding || isAuth || isDashboard) return null;

  return (
    <header className="inner-nav">
      <div className="inner-nav-logo" onClick={() => navigate('/')}>
        <span className="inner-nav-dot" />
        Ly<span>ra</span>
      </div>
      <div className="inner-nav-right">
        <Show when="signed-out">
          <button className="inner-nav-btn inner-nav-ghost" onClick={() => navigate('/login')}>Sign in</button>
          <button className="inner-nav-btn inner-nav-fill" onClick={() => navigate('/sign-up')}>Sign up</button>
        </Show>
        <Show when="signed-in">
          <NavLink to="/dashboard">
            <button className="inner-nav-btn inner-nav-ghost" type="button">Dashboard</button>
          </NavLink>
          <UserButton />
        </Show>
      </div>
    </header>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded } = useAuth();
  const [view, setView] = useState<'landing' | 'rag'>('landing');

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const authPaths = ['/login', '/sign-up', '/sign-in'];
    if (authPaths.some((p) => location.pathname.startsWith(p))) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate, location.pathname]);

  return (
    <div className="app-shell">
      <AppNavBar />
      <SmoothScroll>
        <Routes>
          <Route path="/" element={<Landing onNavigate={setView} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login/*" element={<div className="auth-page"><SignIn routing="path" path="/login" /></div>} />
          <Route path="/sign-up/*" element={<div className="auth-page"><SignUp routing="path" path="/sign-up" /></div>} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/realtime" element={<RealtimeVoicePage />} />
          <Route path="/rag" element={<RagManager onNavigate={setView} />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/sign-in/*" element={<div className="auth-page"><SignIn routing="path" path="/sign-in" /></div>} />
        </Routes>
      </SmoothScroll>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
