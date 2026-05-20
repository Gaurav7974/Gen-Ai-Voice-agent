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

export default function Landing({ onNavigate }: { onNavigate?: (view: 'landing' | 'rag') => void }) {
  const [activeLang, setActiveLang] = useState('hi');
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoPhase, setDemoPhase] = useState<'idle' | 'recording' | 'transcribing' | 'responding'>('idle');
  const [demoTranscript, setDemoTranscript] = useState('');
const [demoResponse, setDemoResponse] = useState('');
  const [error, setError] = useState('');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string; }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPhase, setChatPhase] = useState<'idle' | 'recording' | 'thinking' | 'speaking'>('idle');
  const [chatAudioUrl, setChatAudioUrl] = useState('');
  
  const navRef = useRef<HTMLElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef(false);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

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

      // Phase 3: Responding (LLM + TTS)
      setDemoPhase('responding');
      const voiceResult = await voiceAgentCombined(transcript, 'default', 'default', languageCode);
      if (cancelRef.current) return;
      setDemoResponse(voiceResult.generated_text);

      // Play audio response
      if (voiceResult.audio_url) {
        if (audioRef.current) {
          audioRef.current.src = voiceResult.audio_url;
          await new Promise<void>((resolve) => {
            if (!audioRef.current) return resolve();
            audioRef.current.onended = () => resolve();
            audioRef.current.onerror = () => resolve();
            audioRef.current.play().catch((e) => {
              console.error('Audio play failed', e);
              resolve();
            });
          });
        }
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

  // ─── CHAT HANDLERS ───
  const startChatRecording = async (): Promise<Blob> => {
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

  const stopChatRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleChatVoiceInput = async () => {
    if (chatPhase === 'recording') {
      stopChatRecording();
      return;
    }
    
    setChatPhase('recording');
    try {
      const audioBlob = await startChatRecording();
      
      // Auto-stop after 8 seconds
      const autoStop = setTimeout(() => stopChatRecording(), 8000);

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'inactive') {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      clearTimeout(autoStop);

      // Transcribe
      setChatPhase('thinking');
      const languageCode = LANG_MAP[activeLang];
      const sttResult = await transcribeAudio(audioBlob, languageCode);
      const transcript = sttResult.transcript;

      if (!transcript.trim()) {
        setError('Could not understand speech. Please try again.');
        setChatPhase('idle');
        return;
      }

      // Add user message to chat
      setChatMessages(prev => [...prev, { role: 'user', content: transcript }]);
      setChatInput('');

      // Get AI response
      setChatPhase('speaking');
      const voiceResult = await voiceAgentCombined(transcript, 'default', 'default', languageCode);
      
      // Add assistant message to chat
      setChatMessages(prev => [...prev, { role: 'assistant', content: voiceResult.generated_text }]);
      setChatAudioUrl(voiceResult.audio_url);
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.src = voiceResult.audio_url;
        audioRef.current.play();
      }
      
      setChatPhase('idle');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setChatPhase('idle');
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = chatInput;
    setChatInput('');
    setChatLoading(true);
    setChatPhase('thinking');

    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const languageCode = LANG_MAP[activeLang];
      const result = await voiceAgentCombined(userMessage, 'default', 'default', languageCode);
      
      // Add assistant message
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.generated_text }]);
      setChatAudioUrl(result.audio_url);
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.src = result.audio_url;
        audioRef.current.play();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get response';
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${message}` }]);
    } finally {
      setChatLoading(false);
      setChatPhase('idle');
    }
  };

  const playChatAudio = () => {
    if (audioRef.current && chatAudioUrl) {
      audioRef.current.play();
    }
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
            <a href="#chatbot">Chat</a>
          </li>
          <li>
            <a href="#demo">Demo</a>
          </li>
          <li>
            <a href="#usecases">Use cases</a>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.('rag'); }}>RAG Data</a>
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
          <h1 className="hero-title">
            <span className="title-line">
              Ask anything.
              <span className="title-shape"></span>
            </span>
            <span className="title-line">
              In your <span className="title-lang">{LANG_LABELS[activeLang]}</span>
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
                // Route to login/signup page - placeholder for now
                window.location.href = '/login';
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
                onClick={() => setActiveLang(lang)}
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

      {/* AI CHATBOT */}
      <section id="chatbot" className="section chatbot-section">
        <div className="chatbot-container">
          <div className="chatbot-header fade-up">
            <p className="section-label">AI Assistant</p>
            <h2 className="section-title">Chat with Gena</h2>
            <p className="section-sub">Type or speak — get instant voice responses in your language</p>
          </div>
          
          <div className="chatbot-shell fade-up">
            <div className="chatbot-topbar">
              <div className="chatbot-dot"></div>
              <div className="chatbot-dot"></div>
              <div className="chatbot-dot"></div>
              <span className="chatbot-title-bar">gena — chat</span>
            </div>
            
            <div className="chatbot-body">
              {/* Language selector */}
              <div className="chatbot-lang-row">
                {Object.keys(LANG_LABELS).slice(0, 6).map((lang) => (
                  <button
                    key={lang}
                    className={`chatbot-lang-pill ${activeLang === lang ? 'active' : ''}`}
                    onClick={() => setActiveLang(lang)}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
              
              {/* Messages */}
              <div className="chatbot-messages" ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                {chatMessages.length === 0 && (
                  <div className="chatbot-empty">
                    <div className="chatbot-empty-icon">💬</div>
                    <div className="chatbot-empty-text">Start a conversation</div>
                    <div className="chatbot-empty-sub">Type a message or tap the mic to speak</div>
                  </div>
                )}
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`chat-message ${msg.role}`}>
                    <div className="chat-message-avatar">
                      {msg.role === 'user' ? '👤' : '✨'}
                    </div>
                    <div className="chat-message-content">
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-message assistant loading">
                    <div className="chat-message-avatar">✨</div>
                    <div className="chat-message-content">
                      <span className="typing-indicator">
                        <span></span><span></span><span></span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Audio indicator */}
              {chatAudioUrl && !chatLoading && (
                <div className="chatbot-audio-bar">
                  <button className="chatbot-audio-play" onClick={playChatAudio}>
                    ▶ Play Voice Response
                  </button>
                </div>
              )}
              
              {/* Input area */}
              <form className="chatbot-input-area" onSubmit={handleChatSubmit}>
                <input
                  ref={chatInputRef}
                  type="text"
                  className="chatbot-input"
                  placeholder="Type your message..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="button"
                  className={`chatbot-mic ${chatPhase === 'recording' ? 'recording' : ''}`}
                  onClick={handleChatVoiceInput}
                  disabled={chatLoading}
                  aria-label={chatPhase === 'recording' ? 'Stop recording' : 'Start voice input'}
                >
                  {chatPhase === 'recording' ? '⏹' : '🎙️'}
                </button>
                <button
                  type="submit"
                  className="chatbot-send"
                  disabled={!chatInput.trim() || chatLoading}
                >
                  ➤
                </button>
              </form>
              
              {/* Status hint */}
              <div className="chatbot-hint">
                {chatPhase === 'recording' && 'Listening...'}
                {chatPhase === 'thinking' && 'Gena is thinking...'}
                {chatPhase === 'speaking' && 'Playing response...'}
                {chatPhase === 'idle' && !chatLoading && 'Tap mic to speak or type to chat'}
              </div>
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
