// SOURCE: Glass Navbar — https://ui.shadcn.com
// SOURCE: Dot Pattern — https://magicui.design/docs/components/dot-pattern
// SOURCE: TextRotate — https://reactbits.dev/text-rotate/
// SOURCE: Bento Grid — https://21st.dev (customised for asymmetric visual cards)
// SOURCE: Step Cards — https://21st.dev (customised with vertical offset and watermarks)
// SOURCE: Waveform Visualizer — custom
// CHANGE: Navbar scroll support using Framer Motion. Re-aligned hero typography hierarchy. Offset middle step card with watermark. Bento grid asymmetric layout and rich CSS/SVG interactive visuals. Polish scripts list styling.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScroll, useMotionValueEvent } from 'framer-motion';
import { VoiceAgentChatPreview } from '../components/nova/VoiceAgentChatPreview';
import LandingSectionHeader from '../components/landing/LandingSectionHeader';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import FeaturesGrid from '../components/landing/FeaturesGrid';
import '../styles/landing.css';
import '../styles/landing-sections.css';

const useCasesData = [
  {
    num: "01.0",
    title: "Ask in your language",
    tag: "Voice first",
    desc: "Speak naturally in Hindi or English. No typing needed.",
    renderSvg: (strokeColor: string) => (
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="60" y="40" width="40" height="60" rx="20" />
        <path d="M 68 40 A 12 12 0 0 1 92 40" />
        <path d="M 52 70 V 80 A 28 28 0 0 0 108 80 V 70" />
        <line x1="80" y1="108" x2="80" y2="125" />
        <line x1="60" y1="125" x2="100" y2="125" />
      </svg>
    )
  },
  {
    num: "02.0",
    title: "Query your documents",
    tag: "RAG powered",
    desc: "Upload a file and ask questions about it by voice.",
    renderSvg: (strokeColor: string) => (
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="48" y="38" width="52" height="72" rx="4" />
        <rect x="54" y="44" width="52" height="72" rx="4" />
        <rect x="60" y="50" width="52" height="72" rx="4" />
        <line x1="72" y1="64" x2="100" y2="64" />
        <line x1="72" y1="76" x2="100" y2="76" />
        <line x1="72" y1="88" x2="90" y2="88" />
      </svg>
    )
  },
  {
    num: "03.0",
    title: "Instant spoken answers",
    tag: "Hands free",
    desc: "Get answers read back to you out loud. No screen required.",
    renderSvg: (strokeColor: string) => (
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="40" y="42" width="80" height="56" rx="6" />
        <path d="M 55 98 L 45 112 L 65 98" />
        <line x1="56" y1="56" x2="104" y2="56" />
        <line x1="56" y1="68" x2="104" y2="68" />
        <line x1="56" y1="80" x2="88" y2="80" />
      </svg>
    )
  },
  {
    num: "04.0",
    title: "Realtime voice chat",
    tag: "Low latency",
    desc: "Back-and-forth conversation with sub-1.5s response time.",
    renderSvg: (strokeColor: string) => (
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="30" y="40" width="60" height="42" rx="5" />
        <path d="M 42 82 L 35 90 V 82" />
        <rect x="70" y="65" width="60" height="42" rx="5" />
        <path d="M 118 107 L 125 115 V 107" />
        <path d="M 83 45 L 75 57 H 83 L 77 69 L 85 57 H 77 Z" />
      </svg>
    )
  },
  {
    num: "05.0",
    title: "Works in the browser",
    tag: "No install",
    desc: "Open Lyra in any browser. Works on desktop and mobile.",
    renderSvg: (strokeColor: string) => (
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="40" y="50" width="80" height="60" rx="6" />
        <line x1="40" y1="65" x2="120" y2="65" />
        <circle cx="48" cy="57.5" r="2" />
        <circle cx="56" cy="57.5" r="2" />
        <circle cx="64" cy="57.5" r="2" />
      </svg>
    )
  },
  {
    num: "06.0",
    title: "Private knowledge base",
    tag: "Your data only",
    desc: "Your documents stay private. Answers come only from your data.",
    renderSvg: (strokeColor: string) => (
      <svg viewBox="0 0 160 160" width="100%" height="100%" fill="none" stroke={strokeColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="80" cy="50" rx="32" ry="9" />
        <path d="M 48 50 V 72" />
        <path d="M 112 50 V 72" />
        <ellipse cx="80" cy="72" rx="32" ry="9" />
        <path d="M 48 72 V 94" />
        <path d="M 112 72 V 94" />
        <ellipse cx="80" cy="94" rx="32" ry="9" />
      </svg>
    )
  }
];

export default function Landing({ onNavigate }: { onNavigate?: (v:'landing'|'rag')=>void }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeUseCase, setActiveUseCase] = useState(0);
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    currentTarget.style.setProperty("--mouse-x", `${clientX - left}px`);
    currentTarget.style.setProperty("--mouse-y", `${clientY - top}px`);
  };

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll('.fade-up').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-on-scroll-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    document.querySelectorAll('[data-animation-on-scroll]').forEach((el) => {
      el.classList.add('animate-on-scroll-hidden');
      obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior:'smooth' });

  const SlideCta = ({ label, onClick, variant = 'primary' }: { label: string; onClick?: () => void; variant?: 'primary' | 'nav' }) => (
    <button type="button" className={variant === 'primary' ? 'hero-cta-primary' : 'lp-nav-cta'} onClick={onClick}>
      <span className={variant === 'primary' ? 'hero-cta-text-wrap' : 'lp-nav-cta-text-wrap'}>
        <span className={variant === 'primary' ? 'hero-cta-text-slide' : 'lp-nav-cta-text-slide'}>
          <span className={variant === 'primary' ? 'hero-cta-row' : undefined}>
            {variant === 'primary' ? (
              <>
                <span>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </>
            ) : (
              <span>{label}</span>
            )}
          </span>
          <span className={variant === 'primary' ? 'hero-cta-row hero-cta-row--dup' : undefined}>
            {variant === 'primary' ? (
              <>
                <span>{label}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </>
            ) : (
              <span>{label}</span>
            )}
          </span>
        </span>
      </span>
    </button>
  );

  return (
    <>
      {/* == NAVBAR == */}
      <nav className={`lp-nav lp-nav--hero-dark ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-logo" onClick={() => navigate('/')}>Lyra</div>

          <div className="lp-nav-links">
            <button type="button" onClick={() => scrollTo('how-it-works')}>How it Works</button>
            <button type="button" onClick={() => scrollTo('features')}>Features</button>
            <button type="button" onClick={() => scrollTo('use-cases')}>Use Cases</button>
          </div>

          <div className="lp-nav-right">
            <SlideCta label="Sign In" onClick={() => navigate('/sign-in')} variant="nav" />
          </div>
        </div>
      </nav>

      {/* == HERO == */}
      <section id="hero" ref={heroRef}>
        <div className="hero-grid-bg">
          <div className="hero-grid-bg-v" />
          <div className="hero-grid-bg-h" />
        </div>

        <div className="hero-content">
          <div className="hero-heading" data-animation-on-scroll>
            <h1 className="hero-title">
              Grounded Voice AI for Bharat
            </h1>
            <p className="hero-sub">
              A warm, sub-1.5s latency Indic voice assistant built for scale.<br />
              Speak naturally in Hindi, Tamil, Telugu, Marathi, or English.
            </p>
            <div className="hero-actions">
              <SlideCta label="Get started today" onClick={() => navigate('/dashboard')} variant="primary" />
            </div>
          </div>

          <div className="hero-dashboard-section" data-animation-on-scroll>
            <VoiceAgentChatPreview />
          </div>

        </div>
      </section>

      <div className="lp-landing-body">
      <section id="how" className="section section--dark section--how">
        <div className="section-inner section-inner--wide">
          <LandingSectionHeader
            eyebrow="How it works"
            title="How It Works"
            subtitle="From setup to everyday use, we've made voice automation effortless."
            align="center"
          />
          <HowItWorksSection onStart={() => navigate('/sign-up')} />
        </div>
      </section>

      {/* == USE CASES == */}
      <section id="use-cases" className="section section--dark section--use-cases">
        <div className="usecases-container">
          <div className="usecases-header">
            <span className="usecases-eyebrow">USE CASES</span>
            <h2 className="usecases-title">Built for real conversations</h2>
          </div>
          <div className="usecases-row">
            {useCasesData.map((uc, idx) => {
              const isActive = activeUseCase === idx;
              const strokeColor = isActive ? '#00c3c9' : 'rgba(255,255,255,0.18)';
              return (
                <div
                  key={uc.num}
                  className={`usecase-card ${isActive ? 'usecase-card--active' : ''}`}
                  onMouseEnter={() => setActiveUseCase(idx)}
                >
                  <div className="usecase-card-header">
                    <span className="usecase-card-badge">{uc.num}</span>
                    <span className="usecase-card-tag">{uc.tag}</span>
                  </div>
                  
                  <div className="usecase-card-illustration">
                    {uc.renderSvg(strokeColor)}
                  </div>
                  
                  <div className="usecase-card-footer">
                    <div className="usecase-card-title">
                      <strong>{uc.title}</strong> — {uc.desc}
                    </div>
                    <div className="usecase-card-action">
                      {isActive ? (
                        <span className="usecase-card-learnmore">LEARN MORE →</span>
                      ) : (
                        <span className="usecase-card-plus">+</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="section section--dark">
        <div className="section-inner">
          <LandingSectionHeader
            eyebrow="Features"
            title={<>Built for speed.<br />Grounded in truth.</>}
            subtitle="Every layer optimized for voice: fast inference, accurate retrieval, natural Indic speech."
            align="left"
          />
          <div className="fade-up">
            <FeaturesGrid onMouseMove={handleMouseMove} />
          </div>
        </div>
      </section>

      <section id="cta" className="section section--dark cta-section">
        <div className="section-inner">
          <div className="cta-panel-nova fade-up">
            <p className="lp-section-eyebrow" style={{ marginBottom: 12 }}>Early access</p>
            <h2>Be the first to try Lyra.</h2>
            <p>Join the waitlist — onboarding Indic-language builders and EdTech teams first.</p>
            <div className="email-form">
              <input className="email-input" type="email" placeholder="your@email.com" id="emailInput" />
              <button type="button" className="email-submit" onClick={() => alert('Thanks for joining!')}>
                Join waitlist
              </button>
            </div>
            <p className="cta-note">No spam. Unsubscribe anytime.</p>
          </div>
        </div>
      </section>

      {/* == FOOTER == */}
      <footer className="footer footer--dark">
        <div className="foot-logo">Ly<span>ra</span></div>
        <div className="foot-links">
          <a href="#">GitHub</a><a href="#">Twitter / X</a><a href="#">Docs</a><a href="#">Privacy</a>
        </div>
        <div className="foot-copy">© 2025 Lyra. Built for Bharat.</div>
      </footer>
      </div>
    </>
  );
}
