import React, { useEffect, useRef, useState } from 'react';
import { transcribeAudio, voiceAgentStream } from '../api';
import '../styles/chatbot.css';

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

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

const genId = () => Math.random().toString(36).slice(2, 9);

interface Session {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

export default function ChatbotPage() {
  const [activeLang, setActiveLang] = useState<keyof typeof LANG_LABELS>('hi');

  // Load persisted sessions from localStorage on first render
  const loadSessions = (): Session[] => {
    try {
      const raw = localStorage.getItem('gena_sessions');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore corrupt data */ }
    return [];
  };

  const [sessions, setSessions] = useState<Session[]>(loadSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    const saved = localStorage.getItem('gena_active_session_id');
    return saved || null;
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatPhase, setChatPhase] = useState<'idle' | 'recording' | 'thinking' | 'speaking'>('idle');
  const [chatAudioUrl, setChatAudioUrl] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeSession = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId) ?? null
    : null;

  useEffect(() => {
    if (activeSession) {
      setChatMessages(activeSession.messages);
    } else {
      setChatMessages([]);
    }
    setChatAudioUrl('');
    setError('');
    setChatPhase('idle');
  }, [activeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      if (chatAudioUrl) URL.revokeObjectURL(chatAudioUrl);
    };
  }, [chatAudioUrl]);

  // Persist sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('gena_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Persist the active session ID to localStorage whenever it changes
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('gena_active_session_id', activeSessionId);
    } else {
      localStorage.removeItem('gena_active_session_id');
    }
  }, [activeSessionId]);

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
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  };

  const saveMessagesToSession = (msgs: ChatMessage[]) => {
    if (!activeSession) return;
    const firstUserMsg = msgs.find((m) => m.role === 'user');
    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSessionId
          ? { ...s, messages: msgs, title: firstUserMsg ? firstUserMsg.content.slice(0, 40) : s.title }
          : s,
      ),
    );
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setChatMessages([]);
    setChatAudioUrl('');
    setError('');
    setChatPhase('idle');
    setChatInput('');
  };

  const switchSession = (session: Session) => {
    setActiveSessionId(session.id);
    setChatInput('');
    setChatAudioUrl('');
    setError('');
    setChatPhase('idle');
  };

  const deleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) startNewChat();
  };

  const handleVoiceInput = async () => {
    if (chatPhase === 'recording') {
      stopRecording();
      return;
    }

    setChatPhase('recording');
    setError('');
    try {
      const audioBlob = await startRecording();

      const autoStop = setTimeout(() => stopRecording(), 8000);
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'inactive') {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
      clearTimeout(autoStop);

      setChatPhase('thinking');
      const languageCode = LANG_MAP[activeLang];
      const sttResult = await transcribeAudio(audioBlob, languageCode);
      const transcript = sttResult.transcript;
      if (!transcript.trim()) {
        setError('Could not understand speech. Please try again.');
        setChatPhase('idle');
        return;
      }

      const newMsg: ChatMessage = { role: 'user', content: transcript, id: genId() };
      const updated = [...chatMessages, newMsg];
      setChatMessages(updated);
      saveMessagesToSession(updated);
      setChatInput('');

      setChatPhase('speaking');
      const { response, generatedText } = await voiceAgentStream(transcript, 'default', 'default', languageCode);

      const replyMsg: ChatMessage = { role: 'assistant', content: generatedText, id: genId() };
      const updated2 = [...updated, replyMsg];
      setChatMessages(updated2);
      saveMessagesToSession(updated2);

      if (audioRef.current && response.body) {
        if (chatAudioUrl) URL.revokeObjectURL(chatAudioUrl);
        const audioBlob2 = await response.blob();
        const url = URL.createObjectURL(audioBlob2);
        setChatAudioUrl(url);
        audioRef.current.src = url;
        audioRef.current.play();
      }
      setChatPhase('idle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      setChatPhase('idle');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const text = chatInput.trim();
    setChatInput('');
    setChatLoading(true);
    setChatPhase('thinking');
    setError('');

    const newMsg: ChatMessage = { role: 'user', content: text, id: genId() };
    const updated = [...chatMessages, newMsg];
    setChatMessages(updated);
    saveMessagesToSession(updated);

    try {
      const languageCode = LANG_MAP[activeLang];
      const { response, generatedText } = await voiceAgentStream(text, 'default', 'default', languageCode);

      const replyMsg: ChatMessage = { role: 'assistant', content: generatedText, id: genId() };
      const updated2 = [...updated, replyMsg];
      setChatMessages(updated2);
      saveMessagesToSession(updated2);

      if (audioRef.current && response.body) {
        if (chatAudioUrl) URL.revokeObjectURL(chatAudioUrl);
        const audioBlob = await response.blob();
        const url = URL.createObjectURL(audioBlob);
        setChatAudioUrl(url);
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to get response';
      const errMsg: ChatMessage = { role: 'assistant', content: `Error: ${msg}`, id: genId() };
      const updated2 = [...updated, errMsg];
      setChatMessages(updated2);
      saveMessagesToSession(updated2);
    } finally {
      setChatLoading(false);
      setChatPhase('idle');
    }
  };

  const playAudio = () => {
    if (audioRef.current && chatAudioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    }
  };

  const now = Date.now();
  const grouped: { label: string; items: Session[] }[] = [
    { label: 'Today', items: sessions.filter((s) => now - s.createdAt < 864e5) },
    { label: 'Previous 7 Days', items: sessions.filter((s) => now - s.createdAt < 7 * 864e5 && now - s.createdAt >= 864e5) },
    { label: 'Older', items: sessions.filter((s) => now - s.createdAt >= 7 * 864e5) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="chat-page">
      <audio ref={audioRef} preload="none" />

      {/* SIDEBAR */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-top">
          <button className="sidebar-logo-btn" onClick={startNewChat} title="Gena Voice AI">
            <span className="sidebar-logo-icon">✦</span>
            {sidebarOpen && <span className="sidebar-logo-text">Gena</span>}
          </button>
          {sidebarOpen && (
            <button className="sidebar-new-chat" onClick={startNewChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New chat
            </button>
          )}
        </div>

        <div className="sidebar-sessions">
          {grouped.map(({ label, items }) => (
            <div key={label} className="session-group">
              {sidebarOpen && <div className="session-group-label">{label}</div>}
              {items.map((s) => (
                <button
                  key={s.id}
                  className={`session-item ${activeSessionId === s.id ? 'active' : ''}`}
                  onClick={() => switchSession(s)}
                  title={s.title}
                >
                  <svg className="session-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  {sidebarOpen && (
                    <>
                      <span className="session-title">{s.title || 'New chat'}</span>
                      <button
                        className="session-delete"
                        onClick={(e) => deleteSession(e, s.id)}
                        title="Delete session"
                      >
                        ×
                      </button>
                    </>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-lang">
            <div className="sidebar-lang-label">Language</div>
            <div className="sidebar-lang-pills">
              {LANG_KEYS.map((lang) => (
                <button
                  key={lang}
                  className={`lang-pill ${activeLang === lang ? 'active' : ''}`}
                  onClick={() => setActiveLang(lang)}
                  title={LANG_LABELS[lang]}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="chat-main">
        <div className="chat-main-topbar">
          <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen
                ? <>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </>
                : <>
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
              }
            </svg>
          </button>
          <div className="chat-header-info">
            <div className="chat-header-dots">
              <span className="chat-dot" />
              <span className="chat-dot" />
              <span className="chat-dot" />
            </div>
            <span className="chat-header-title">Gena AI Voice Agent</span>
          </div>
          <div className="chat-phase-badge">
            {chatPhase === 'recording' && '● Listening'}
            {chatPhase === 'thinking' && '⏳ Thinking'}
            {chatPhase === 'speaking' && '│ Playing'}
            {chatPhase === 'idle' && !chatLoading && 'Ready'}
            {chatLoading && chatPhase !== 'recording' && '⏳ Thinking'}
          </div>
        </div>

        {error && <div className="chat-banner error">{error}</div>}

        <div className="chat-messages-area">
          {/* Empty state */}
          {chatMessages.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-ring">
                <div className="welcome-ring-inner">✦</div>
              </div>
              <h2 className="welcome-title">Start a conversation</h2>
              <p className="welcome-sub">
                {chatPhase === 'recording'
                  ? 'Listening… speak now.'
                  : 'Voice or text — ask anything in your language.'}
              </p>
              <div className="welcome-langs fade-up">
                {LANG_KEYS.map((lang) => (
                  <button
                    key={lang}
                    className={`welcome-lang-pill ${activeLang === lang ? 'active' : ''}`}
                    onClick={() => setActiveLang(lang)}
                  >
                    <span className="welcome-lang-native">{LANG_LABELS[lang]}</span>
                    <span className="welcome-lang-code">{lang.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {chatMessages.map((msg, idx) => (
            <div key={msg.id} className={`chat-message msg-${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                    <path d="M12 2a10 10 0 0 1 10 10H12V2z" opacity=".6" />
                  </svg>
                )}
              </div>
              <div className={`msg-bubble ${msg.role}`}>
                <div className="msg-body">{msg.content}</div>
                {msg.role === 'assistant' && idx > 0 && chatAudioUrl && chatPhase === 'idle' && (
                  <button className="msg-play-btn" onClick={playAudio}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Play voice
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {(chatLoading || chatPhase === 'thinking') && (
            <div className="chat-message msg-assistant">
              <div className="msg-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M12 2a10 10 0 0 1 10 10H12V2z" opacity=".6" />
                </svg>
              </div>
              <div className="msg-bubble assistant">
                <div className="typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {/* Audio available banner */}
          {chatAudioUrl && chatPhase === 'idle' && !chatLoading && chatMessages.some((m) => m.role === 'assistant') && (
            <div className="chat-audio-banner">
              <button className="play-voice-banner" onClick={playAudio}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Play voice response
              </button>
            </div>
          )}

          {/* Waveform while recording */}
          {chatPhase === 'recording' && (
            <div className="chat-recording-banner">
              <div className="recording-wave">
                {[...Array(8)].map((_, i) => (
                  <span key={i} className="rec-bar" style={{ animationDelay: `${i * 0.06}s` }} />
                ))}
              </div>
              <span className="recording-label">Recording… click mic to stop</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* LANGUAGE PILLS */}
        <div className="chat-lang-bar">
          <span className="chat-lang-bar-label">Language</span>
          <div className="chat-lang-pills">
            {LANG_KEYS.map((lang) => (
              <button
                key={lang}
                className={`chat-lang-pill ${activeLang === lang ? 'active' : ''}`}
                onClick={() => setActiveLang(lang)}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT BAR */}
        <form className="chat-input-bar" onSubmit={handleSubmit}>
          <div className="chat-input-shell">
            <input
              ref={chatInputRef}
              type="text"
              className="chat-text-input"
              placeholder="Ask Gena anything…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading || chatPhase === 'recording'}
            />
            <button
              type="button"
              className={`chat-mic-btn ${chatPhase === 'recording' ? 'recording' : ''}`}
              onClick={handleVoiceInput}
              disabled={chatLoading}
              aria-label={chatPhase === 'recording' ? 'Stop voice input' : 'Start voice input'}
            >
              {chatPhase === 'recording' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <button
              type="submit"
              className="chat-send-btn"
              disabled={!chatInput.trim() || chatLoading || chatPhase === 'recording'}
              aria-label="Send message"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <p className="chat-input-hint">
            {chatPhase === 'recording' && 'Recording – press mic to stop'}
            {chatPhase === 'thinking' && 'Gena is thinking…'}
            {chatPhase === 'speaking' && 'Generating response…'}
            {chatPhase === 'idle' && !chatLoading && 'Enter a message or press the mic to speak'}
            {chatLoading && chatPhase !== 'recording' && 'Generating response…'}
          </p>
        </form>
      </main>
    </div>
  );
}
