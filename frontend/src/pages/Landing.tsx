import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { transcribeAudio, voiceAgentStream } from '../api';
import { TextRotate } from '../components/TextRotate'
import '../styles/landing.css';
import { BackgroundRippleEffect } from '../components/ui/background-ripple-effect';

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

const LANG_KEYS = Object.keys(LANG_LABELS) as (keyof typeof LANG_LABELS)[];

export default function Landing({ onNavigate }: { onNavigate?: (view: 'landing' | 'rag') => void }) {
  const navigate = useNavigate();
  const [activeLang, setActiveLang] = useState('hi');
  const [rotatingLangIdx, setRotatingLangIdx] = useState(
    LANG_KEYS.indexOf('hi'),
  );
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoPhase, setDemoPhase] = useState<'idle' | 'recording' | 'transcribing' | 'responding'>('idle');
  const [demoTranscript, setDemoTranscript] = useState('');
  const [demoResponse, setDemoResponse] = useState('');
  const [error, setError] = useState('');
  
  // Chat state removed — moved to dedicated ChatbotPage

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false);

  // Keep activeLang aligned with the hero's rotating language display
  useEffect(() => {
    setActiveLang(LANG_KEYS[rotatingLangIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotatingLangIdx]);

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
    cancelRef.current = false;
    setDemoRunning(true);
    setError('');
    setDemoTranscript('');
    setDemoResponse('');

    try {
      // Phase 1: Recording
      setDemoPhase('recording');
      const audioBlobPromise = startRecording();

      // Auto-stop after 8 seconds
      const autoStop = setTimeout(() => stopRecording(), 8000);

      const audioBlob = await audioBlobPromise;
      clearTimeout(autoStop);
      
      if (cancelRef.current) return;

      // Phase 2: Transcribing (STT)
      setDemoPhase('transcribing');
      const languageCode = LANG_MAP[activeLang];
      const sttResult = await transcribeAudio(audioBlob, languageCode);
      if (cancelRef.current) return;
      const transcript = sttResult.transcript;
      setDemoTranscript(transcript);

      if (!transcript.trim()) {
        setError('Could not understand speech. Please try again.');
        setDemoPhase('idle');
        setDemoRunning(false);
        return;
      }

      // Phase 3: Responding (LLM + TTS - STREAMING)
      setDemoPhase('responding');
      
      // Use streaming endpoint for true streaming audio
      const { response, generatedText } = await voiceAgentStream(transcript, 'default', 'default', languageCode);
      if (cancelRef.current) return;
      setDemoResponse(generatedText);

      // Play streaming audio response
      if (audioRef.current && response.body) {
        // Convert streaming response to blob
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        await new Promise<void>((resolve) => {
          if (!audioRef.current) return resolve();
          audioRef.current.onended = () => {
            URL.revokeObjectURL(audioUrl); // Clean up
            resolve();
          };
          audioRef.current.onerror = () => {
            URL.revokeObjectURL(audioUrl); // Clean up
            resolve();
          };
          audioRef.current.play().catch((e) => {
            console.error('Audio play failed', e);
            URL.revokeObjectURL(audioUrl);
            resolve();
          });
        });
      }
    } catch (err: unknown) {
      console.error('Demo error:', err);
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

      {/* HERO */}
      <section id="hero" className="hero">
        <BackgroundRippleEffect />
        <div className="hero-bg"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">
              Ask anything.
            </span>
            <span className="title-line title-line-lang">
              In your{" "}
              <TextRotate
                texts={LANG_KEYS.map((k) => LANG_LABELS[k])}
                rotationInterval={2200}
                staggerDuration={0.04}
                mainClassName="title-lang inline-flex"
                onNext={(idx) => setRotatingLangIdx(idx)}
              />{" "}
              Language
            </span>
            <span className="title-line">Get instant answers.</span>
          </h1>
          <p className="hero-sub">
            Gena is a voice-first AI that understands Hindi, Tamil, Telugu, and 8+ Indic languages — with accurate, grounded answers.
          </p>
          <div className="hero-actions">
            <button
              className="btn-primary"
              onClick={() => {
                navigate('/dashboard');
              }}
              aria-label="Get started with Gena"
            >
              GET STARTED
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => {
                const demoEl = document.getElementById('demo');
                if (demoEl) demoEl.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label="Watch demo video"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Watch Demo
            </button>
          </div>
          <div className="hero-lang-select">
            <span className="hero-lang-label">Speaking:</span>
            {Object.keys(LANG_LABELS).slice(0, 6).map((lang) => (
              <button
                key={lang}
                className={`hero-lang-btn ${activeLang === lang ? 'active' : ''}`}
                              onClick={() => {
                setActiveLang(lang);
                setRotatingLangIdx(LANG_KEYS.indexOf(lang));
              }}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
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
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5622e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
            <h3>You speak</h3>
            <p>Tap and speak in your language. Hindi, Tamil, Marathi — whatever feels natural. Sarvam STT captures every word.</p>
          </div>
          <div className="step">
            <div className="step-num">02</div>
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5622e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
                <path d="M11 8v6" />
                <path d="M8 11h6" />
              </svg>
            </div>
            <h3>AI retrieves</h3>
            <p>Your query hits a hybrid BM25 + semantic search across the knowledge base. Top 5 relevant chunks are pulled — no hallucinations.</p>
          </div>
          <div className="step">
            <div className="step-num">03</div>
            <div className="step-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1ad6a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
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
                                 onClick={() => {
                setActiveLang(lang);
                setRotatingLangIdx(LANG_KEYS.indexOf(lang));
              }}
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
                 onClick={() => {
                   if (demoPhase === 'idle') runDemo();
                   else if (demoPhase === 'recording') stopRecording();
                   else stopDemo();
                 }}
                 aria-label={demoPhase !== 'idle' ? 'Stop recording or cancel demo' : 'Start recording voice input'}
                 aria-pressed={demoPhase === 'recording'}
               >
                 {demoPhase === 'idle' ? '🎙️' : '⏹'}
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
                  <div className="native">{lang.native} Language</div>
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
