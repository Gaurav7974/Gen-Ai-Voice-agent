import React, { useEffect, useRef, useState } from 'react';
import { transcribeAudio, voiceAgentCombined } from '../api';
import '../styles/landing.css';

const LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  en: 'en-IN',
};

const LANG_LABELS: Record<string, string> = {
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  mr: 'मराठी',
  en: 'English',
};

export default function Landing() {
  const [activeLang, setActiveLang] = useState('hi');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoPhase, setDemoPhase] = useState<'idle' | 'recording' | 'transcribing' | 'responding'>('idle');
  const [demoTranscript, setDemoTranscript] = useState('');
  const [demoResponse, setDemoResponse] = useState('');
  const [error, setError] = useState('');
  const navRef = useRef<HTMLElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        navRef.current.classList.toggle('scrolled', window.scrollY > 40);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.fade-up').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const startRecording = async (): Promise<Blob> => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new Promise((resolve, reject) => {
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        resolve(blob);
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((t) => t.stop());
        reject(new Error('Recording failed'));
      };

      recorder.start();
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const runDemo = async () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setError('');
    setDemoTranscript('');
    setDemoResponse('');

    try {
      // Phase 1: Recording
      setDemoPhase('recording');
      const audioBlob = await startRecording();

      // Auto-stop after 8 seconds
      const autoStop = setTimeout(() => stopRecording(), 8000);

      // Wait for user to stop recording (click mic again) or auto-stop
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'inactive') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      clearTimeout(autoStop);

      // Phase 2: Transcribing (STT)
      setDemoPhase('transcribing');
      const languageCode = LANG_MAP[activeLang];
      const sttResult = await transcribeAudio(audioBlob, languageCode);
      const transcript = sttResult.transcript;
      setDemoTranscript(transcript);

      if (!transcript.trim()) {
        setError('Could not understand speech. Please try again.');
        setDemoPhase('idle');
        setDemoRunning(false);
        return;
      }

      // Phase 3: Responding (LLM + TTS)
      setDemoPhase('responding');
      const voiceResult = await voiceAgentCombined(transcript, 'default', 'default', languageCode);
      setDemoResponse(voiceResult.generated_text);

      // Play audio response
      if (voiceResult.audio_url) {
        if (audioRef.current) {
          audioRef.current.src = voiceResult.audio_url;
          audioRef.current.play();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setDemoPhase('idle');
      setDemoRunning(false);
    }
  };

  const stopDemo = () => {
    stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setDemoPhase('idle');
    setDemoRunning(false);
  };

  return (
    <>
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="none" />

      {/* NAV */}
      <nav id="navbar" ref={navRef} className="navbar">
        <div className="nav-logo">
          Ge<span>na</span>
        </div>
        <ul className="nav-links">
          <li>
            <a href="#how">How it works</a>
          </li>
          <li>
            <a href="#demo">Demo</a>
          </li>
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#usecases">Use cases</a>
          </li>
        </ul>
        <button
          className="nav-cta"
          onClick={() => {
            const ctaEl = document.getElementById('cta');
            if (ctaEl) ctaEl.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label="Jump to join waitlist section"
        >
          Join waitlist
        </button>
      </nav>

      {/* HERO */}
      <section id="hero" className="hero">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot"></span>
            Now in beta · 11 Indic languages
          </div>
          <h1>
            Ask anything.<br />
            <span className="line2">In your language.</span>
            <br />
            <span className="line3">Get instant answers.</span>
          </h1>
          <p className="hero-sub">
            Gena is a <strong>voice-first AI</strong> that understands Hindi, Tamil, Telugu and 8 more Indic languages — powered by RAG for grounded, accurate answers.
          </p>
          <div className="orb-wrap">
            <div className="orb-ring"></div>
            <div className="orb-ring"></div>
            <div className="orb-ring"></div>
            <button
              className="orb"
              onClick={() => {
                const demoEl = document.getElementById('demo');
                if (demoEl) demoEl.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label="Scroll to demo section"
            >
              <svg className="orb-icon" viewBox="0 0 24 24">
                <path
                  fill="white"
                  d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4zm-1 17.93A8 8 0 0112 3v-.07A8.001 8.001 0 014.07 11H2a10 10 0 009 9.93V23h2v-2.07A10 10 0 0022 11h-2.07A8.001 8.001 0 0113 18.93V19h-2v-.07z"
                />
              </svg>
            </button>
          </div>
          <div className="waveform">
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
            <div className="bar"></div>
          </div>
          <div className="hero-actions">
             <button
              className="btn-primary"
              onClick={() => {
                const demoEl = document.getElementById('demo');
                if (demoEl) demoEl.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label="Try the demo now"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 1a4 4 0 014 4v6a4 4 0 01-8 0V5a4 4 0 014-4z" />
                <path d="M19.07 11H22a10 10 0 01-9 9.93V23h-2v-2.07A10 10 0 012 11h2.93A8 8 0 0112 19a8 8 0 007.07-8z" />
              </svg>
              Try it now
            </button>
            <button className="btn-secondary" aria-label="Watch demo video">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Watch demo
            </button>
          </div>
          <div className="hero-scroll-hint">scroll to explore ↓</div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section how-section">
        <div className="fade-up">
          <p className="section-label center">How it works</p>
          <h2 className="section-title center">Three steps to your answer</h2>
        </div>
        <div className="steps-wrap fade-up">
          <div className="step">
            <div className="step-num">01</div>
            <div className="step-icon">🎙️</div>
            <h3>You speak</h3>
            <p>Tap and speak in your language. Hindi, Tamil, Marathi — whatever feels natural. Sarvam STT captures every word.</p>
            <div className="step-connector">→</div>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <div className="step-icon">🔍</div>
            <h3>AI retrieves</h3>
            <p>Your query hits a hybrid BM25 + semantic search across the knowledge base. Top 5 relevant chunks are pulled — no hallucinations.</p>
            <div className="step-connector">→</div>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <div className="step-icon">🔊</div>
            <h3>You hear the answer</h3>
            <p>Groq generates a grounded response in under 1.5 seconds. Sarvam TTS streams it back to you — audio, not text.</p>
          </div>
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" className="section demo-section">
        <div className="fade-up center">
          <p className="section-label">Live demo</p>
          <h2 className="section-title">Try it yourself</h2>
          <p className="section-sub">Click the mic, ask a question, hear the answer. No signup required.</p>
        </div>
        <div className="demo-shell fade-up">
          <div className="demo-topbar">
            <div className="demo-dot"></div>
            <div className="demo-dot"></div>
            <div className="demo-dot"></div>
            <span className="demo-title-bar">gena — voice interface</span>
          </div>
          <div className="demo-body">
            <div className="demo-lang-row">
               {Object.keys(LANG_LABELS).map((lang) => (
                 <button
                   key={lang}
                   className={`lang-pill ${activeLang === lang ? 'active' : ''}`}
                   onClick={() => setActiveLang(lang)}
                   aria-label={`Select ${LANG_LABELS[lang]} language`}
                   aria-pressed={activeLang === lang}
                 >
                   {LANG_LABELS[lang]}
                 </button>
               ))}
            </div>
            <div className="demo-transcript" id="transcript">
              <span id="transcriptText" style={{ color: demoTranscript ? 'var(--text)' : 'var(--muted2)' }}>
                {demoTranscript || 'Press the mic and speak…'}
              </span>
            </div>
            <div className={`demo-waveform ${demoPhase === 'recording' ? 'active' : ''}`}>
              <div className="b"></div>
              <div className="b"></div>
              <div className="b"></div>
              <div className="b"></div>
              <div className="b"></div>
              <div className="b"></div>
              <div className="b"></div>
              <div className="b"></div>
            </div>
            <div className={`demo-response ${demoResponse ? 'show' : ''}`}>
              <div className="demo-response-label">Gena responds</div>
              <div id="responseText">{demoResponse}</div>
            </div>
             <div className="demo-controls">
               <button
                 className={`mic-btn ${demoPhase === 'recording' ? 'recording' : ''}`}
                 onClick={demoRunning ? stopDemo : runDemo}
                 aria-label={demoRunning ? 'Stop recording' : 'Start recording voice input'}
                 aria-pressed={demoPhase === 'recording'}
               >
                 {demoRunning ? '⏹️' : '🎙️'}
              </button>
            </div>
            {error && <div className="demo-error">{error}</div>}
            <div className="demo-hint">
              {demoPhase === 'idle' && !demoRunning && 'Tap to start recording'}
              {demoPhase === 'recording' && 'Recording… click mic to stop'}
              {demoPhase === 'transcribing' && 'Transcribing…'}
              {demoPhase === 'responding' && 'Generating response…'}
            </div>
          </div>
        </div>
      </section>

      {/* LANGUAGES */}
      <section id="languages" className="section languages-section">
        <div className="fade-up center">
          <p className="section-label">Language support</p>
          <h2 className="section-title">Speaks your India</h2>
          <p className="section-sub">11 Indic languages with native script support. More coming soon.</p>
        </div>
        <div className="lang-scroll-wrap">
          <div className="lang-track" id="langTrack">
            {[
              { native: 'हिन्दी', english: 'Hindi' },
              { native: 'தமிழ்', english: 'Tamil' },
              { native: 'తెలుగు', english: 'Telugu' },
              { native: 'ಕನ್ನಡ', english: 'Kannada' },
              { native: 'മലയാളം', english: 'Malayalam' },
              { native: 'मराठी', english: 'Marathi' },
              { native: 'বাংলা', english: 'Bengali' },
              { native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
              { native: 'ગુજરાતી', english: 'Gujarati' },
              { native: 'ଓଡ଼ିଆ', english: 'Odia' },
              { native: 'English', english: 'English' },
            ]
              .concat([
                { native: 'हिन्दी', english: 'Hindi' },
                { native: 'தமிழ்', english: 'Tamil' },
                { native: 'తెలుగు', english: 'Telugu' },
                { native: 'ಕನ್ನಡ', english: 'Kannada' },
                { native: 'മലയാളം', english: 'Malayalam' },
                { native: 'मराठी', english: 'Marathi' },
                { native: 'বাংলা', english: 'Bengali' },
                { native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
                { native: 'ગુજરાતી', english: 'Gujarati' },
                { native: 'ଓଡ଼ିଆ', english: 'Odia' },
                { native: 'English', english: 'English' },
              ])
              .map((lang, idx) => (
                <div key={idx} className="lang-card">
                  <div className="native">{lang.native}</div>
                  <div className="english">{lang.english}</div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section features-section">
        <div className="fade-up">
          <p className="section-label">Features</p>
          <h2 className="section-title">
            Built for speed.
            <br />
            Grounded in truth.
          </h2>
        </div>
        <div className="features-grid fade-up">
          <div className="feat-card">
            <div className="feat-icon orange">⚡</div>
            <h3>Sub-1.5s latency</h3>
            <p>Groq's inference engine combined with streamed TTS means you hear the answer before you expect it. Every hop is optimised.</p>
            <div className="feat-stat">&lt;1.5s</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon teal">🧠</div>
            <h3>RAG-grounded answers</h3>
            <p>Every response is anchored in retrieved context. BM25 + semantic hybrid search picks the best chunks before Groq generates a word.</p>
            <div className="feat-stat teal">0 halluc.</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon teal">🌐</div>
            <h3>11 Indic languages</h3>
            <p>Sarvam AI powers both STT and TTS with native Indic language models — not translated or transliterated, truly native.</p>
            <div className="feat-stat teal">11 langs</div>
          </div>
          <div className="feat-card">
            <div className="feat-icon orange">🔊</div>
            <h3>Streamed audio response</h3>
            <p>TTS streams in chunks so playback starts before synthesis is complete. The experience feels like talking to a person, not a chatbot.</p>
            <div className="feat-stat">Streamed</div>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section id="usecases" className="section usecases-section">
        <div className="fade-up center">
          <p className="section-label">Use cases</p>
          <h2 className="section-title">Who is Gena for?</h2>
          <p className="section-sub">Built for the 900 million Indians who deserve AI in their language.</p>
        </div>
        <div className="cases-grid fade-up">
          <div className="case-card">
            <div className="case-emoji">📚</div>
            <h3>EdTech</h3>
            <p>Students ask questions in their mother tongue and get curriculum-accurate answers instantly. No language barrier in learning.</p>
          </div>
          <div className="case-card">
            <div className="case-emoji">🏥</div>
            <h3>Healthcare</h3>
            <p>Patients describe symptoms in Hindi or Tamil. Gena provides grounded, safe health information from verified sources.</p>
          </div>
          <div className="case-card">
            <div className="case-emoji">🎧</div>
            <h3>Customer support</h3>
            <p>Resolve queries in the customer's language. No IVR, no hold music — just fast, accurate voice AI at scale.</p>
          </div>
          <div className="case-card">
            <div className="case-emoji">🏛️</div>
            <h3>Government services</h3>
            <p>Citizens access scheme information, eligibility criteria, and process guidance — spoken back in their language.</p>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" className="section architecture-section">
        <div className="fade-up center">
          <p className="section-label">Under the hood</p>
          <h2 className="section-title">The stack</h2>
          <p className="section-sub">Purpose-built for low-latency, grounded voice AI. Every component is chosen for a reason.</p>
        </div>
        <div className="arch-wrap fade-up">
          <div className="arch-row">
            <div className="arch-node">
              <div className="label">Frontend</div>
              <div className="name">React / TS</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node teal">
              <div className="label">STT</div>
              <div className="name">Sarvam AI</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="label">Backend</div>
              <div className="name">FastAPI</div>
            </div>
          </div>
          <div className="arch-row">
            <div className="arch-node">
              <div className="label">Vector DB</div>
              <div className="name">Chroma / Pinecone</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="label">Retrieval</div>
              <div className="name">BM25 + Semantic</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="label">LLM</div>
              <div className="name">Groq</div>
            </div>
          </div>
          <div className="arch-row">
            <div className="arch-node teal">
              <div className="label">TTS</div>
              <div className="name">Sarvam AI</div>
            </div>
            <div className="arch-arrow">→</div>
            <div className="arch-node">
              <div className="label">Output</div>
              <div className="name">Streamed audio</div>
            </div>
          </div>
          <div className="arch-stack-note">
            <span>FastAPI backend</span>
            <span>React / TypeScript frontend</span>
            <span>768-dim embeddings</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="section cta-section">
        <div className="cta-inner fade-up">
          <p className="section-label center">Early access</p>
          <h2>
            Be the first to
            <br />
            try Gena.
          </h2>
          <p>Join the waitlist. We're onboarding in batches — Indic language developers and EdTech teams first.</p>
          <div className="email-form">
            <input
              className="email-input"
              type="email"
              placeholder="your@email.com"
              id="emailInput"
              aria-label="Email address for waitlist"
              required
            />
            <button
              className="email-submit"
              onClick={() => alert('Thanks for joining!')}
              aria-label="Join the waitlist"
            >
              Join waitlist →
            </button>
          </div>
          <div className="cta-note" id="ctaNote">
            No spam. Unsubscribe anytime.
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="foot-logo">
          Ge<span>na</span>
        </div>
        <div className="foot-links">
          <a href="#">GitHub</a>
          <a href="#">Twitter / X</a>
          <a href="#">Docs</a>
          <a href="#">Privacy</a>
        </div>
        <div className="foot-copy">© 2025 Gena. Built for Bharat.</div>
      </footer>
    </>
  );
}
