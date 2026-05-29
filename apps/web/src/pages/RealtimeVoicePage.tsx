import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { AgentState } from '@livekit/components-react';
import { AgentAudioVisualizerAura } from '@/components/agents-ui/agent-audio-visualizer-aura';
import { streamVoiceAgent } from '../api';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  FileUp,
  ArrowUpIcon,
  Paperclip,
  Code2,
  Palette,
  ImageIcon,
  MonitorIcon,
  CircleUserRound,
  Layers,
  Rocket,
} from "lucide-react";

const LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  en: 'en-IN',
};

/* ─── State label map ────────────────────────────────────────────────────── */
const STATE_LABEL: Partial<Record<AgentState, string>> = {
  idle:        'READY',
  listening:   'LISTENING',
  thinking:    'THINKING',
  speaking:    'SPEAKING',
  connecting:  'CONNECTING',
  initializing:'INITIALIZING',
};

const AURA_COLOR = '#00bfff' as const;
const AURA_SHIFT = 0.46;

/* ─── Mini Chat types ────────────────────────────────────────────────────── */
interface MiniMessage { id: string; role: 'user' | 'assistant'; text: string; }

const SyncText = ({ text, isLatest, agentState }: { text: string, isLatest: boolean, agentState: string }) => {
  const [revealedChars, setRevealedChars] = useState(0);

  useEffect(() => {
    if (!isLatest) {
      setRevealedChars(text.length);
      return;
    }
    if (agentState === 'thinking') {
      return;
    }
    if (agentState === 'idle') {
      setRevealedChars(text.length);
      return;
    }
    
    // agentState === 'speaking'
    const interval = setInterval(() => {
      setRevealedChars(r => (r < text.length ? r + 1 : r));
    }, 45);
    
    return () => clearInterval(interval);
  }, [text, isLatest, agentState]);

  if (!isLatest || agentState === 'idle') {
    return <span>{text}</span>;
  }

  let currentIndex = 0;
  const tokens = text.split(/(\s+)/); // Split by whitespace but keep the whitespace tokens

  return (
    <span className="voice-sync-text">
      {tokens.map((token, i) => {
        const tokenStart = currentIndex;
        currentIndex += token.length;
        // If the reveal cursor has reached the START of this word, we trigger its fade-in animation
        const isRevealed = revealedChars >= tokenStart;
        
        if (token.trim() === '') {
          return <span key={i}>{token}</span>;
        }
        
        return (
          <span 
            key={i} 
            className={`sync-word ${isRevealed ? 'revealed' : 'hidden'}`}
          >
            {token}
          </span>
        );
      })}
    </span>
  );
};
const uid = () => Math.random().toString(36).slice(2, 9);

/* ═══════════════════════════════════════════════════════════════════════════
/* ── Tailwind Chat UI Helpers ───────────────────────────────────────────── */
interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}
function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );
  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);
  return { textareaRef, adjustHeight };
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-700/80 bg-black/50 px-3 py-1.5 text-neutral-300 text-xs font-medium hover:text-white hover:bg-neutral-700/60 transition-colors"
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page
═══════════════════════════════════════════════════════════════════════════ */
export default function RealtimeVoicePage() {
  const [mode, setMode] = useState<'voice' | 'chat'>('voice');

  /* ── Voice state ─────────────────────────────────────────────────────── */
  const [activeLang,     setActiveLang]     = useState('hi');
  const [isConnected,    setIsConnected]    = useState(false);
  const [isConnecting,   setIsConnecting]   = useState(false);
  const [error,          setError]          = useState('');
  const [agentState,     setAgentState]     = useState<AgentState>('connecting');
  const [connectingDots, setConnectingDots] = useState('');
  const [connectTimeout, setConnectTimeout] = useState(false);
  const [agentSources,   setAgentSources]   = useState<any[]>([]);

  const wsRef            = useRef<WebSocket | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const playCtxRef       = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const isMicMutedRef    = useRef<boolean>(false);
  const micSourceRef     = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef     = useRef<AudioWorkletNode | null>(null);
  const micStreamRef     = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const connectTimerRef  = useRef<any>(null);

  /* ── Mini Chat state ─────────────────────────────────────────────────── */
  const [miniMessages, setMiniMessages] = useState<MiniMessage[]>([]);

  /* ── Voice Transcript State ────────────────────────────────────────────── */
  const [voiceMessages, setVoiceMessages] = useState<{id: string; role: 'user' | 'assistant'; text: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'transcript' | 'sources'>('transcript');
  const [showThoughtsId, setShowThoughtsId] = useState<string | null>(null);
  const voiceEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = voiceEndRef.current?.parentElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [voiceMessages, showThoughtsId]);
  const [miniInput,    setMiniInput]    = useState('');
  const [miniLoading,  setMiniLoading]  = useState(false);
  const miniEndRef     = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 48, maxHeight: 150 });
  const miniCtxRef     = useRef<AudioContext | null>(null);
  const miniNextRef    = useRef(0);
  const miniSrcsRef    = useRef<AudioBufferSourceNode[]>([]);
  const voiceNextRef   = useRef(0);  // sequential scheduler for voice-mode PCM

  useEffect(() => {
    const container = miniEndRef.current?.parentElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [miniMessages]);

  /* dots animation */
  useEffect(() => {
    if (!isConnecting) { setConnectingDots(''); return; }
    const id = setInterval(() => setConnectingDots(p => p === '...' ? '' : p + '.'), 500);
    return () => clearInterval(id);
  }, [isConnecting]);

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      disconnect();
      if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
      miniSrcsRef.current.forEach(s => { try { s.stop(); } catch {} });
      miniCtxRef.current?.close();
    };
  }, []);

  const stopSpeaking = useCallback(() => {
    activeSourcesRef.current.forEach(s => { try { s.stop(); } catch {} });
    activeSourcesRef.current = [];
    voiceNextRef.current = 0;  // reset sequential scheduler
  }, []);

  /* ── Disconnect ────────────────────────────────────────────────────────── */
  const disconnect = useCallback(() => {
    setIsConnected(false);
    setIsConnecting(false);
    setConnectTimeout(false);
    if (connectTimerRef.current) { clearTimeout(connectTimerRef.current); connectTimerRef.current = null; }
    setAgentState('disconnected');
    setVoiceMessages([]);
    setShowThoughtsId(null);
    processorRef.current?.disconnect();   processorRef.current = null;
    micSourceRef.current?.disconnect();   micSourceRef.current = null;
    micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
    audioCtxRef.current?.close();         audioCtxRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.close();
    wsRef.current = null;
    stopSpeaking();
    playCtxRef.current?.close();          playCtxRef.current = null;
    setTimeout(() => setAgentState('connecting'), 400);
  }, [stopSpeaking]);

  /* ── Connect ───────────────────────────────────────────────────────────── */
  const connect = async () => {
    setError('');
    setIsConnecting(true);
    setConnectTimeout(false);
    setAgentState('listening');
    setVoiceMessages([]);
    setAgentSources([]);

    if (connectTimerRef.current) clearTimeout(connectTimerRef.current);
    connectTimerRef.current = setTimeout(() => {
      setConnectTimeout(true);
      setIsConnecting(false);
      if (wsRef.current) {
        wsRef.current.onclose = null; wsRef.current.onerror = null;
        try { wsRef.current.close(); } catch {}
        wsRef.current = null;
      }
      processorRef.current?.disconnect(); processorRef.current = null;
      micSourceRef.current?.disconnect(); micSourceRef.current = null;
      micStreamRef.current?.getTracks().forEach(t => t.stop()); micStreamRef.current = null;
      audioCtxRef.current?.close();       audioCtxRef.current = null;
      playCtxRef.current?.close();        playCtxRef.current = null;
      stopSpeaking();
    }, 8000);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const captureCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = captureCtx;
      await captureCtx.audioWorklet.addModule('/pcm-processor.js');
      const worklet = new AudioWorkletNode(captureCtx, 'pcm-capture-processor', {
        channelCount: 1, numberOfInputs: 1, numberOfOutputs: 1,
      });
      processorRef.current = worklet;
      const src = captureCtx.createMediaStreamSource(stream);
      micSourceRef.current = src;
      src.connect(worklet);

      const inRate = captureCtx.sampleRate, outRate = 16000, TARGET = 4096;
      let buf: Float32Array[] = [], bufLen = 0;

      worklet.port.onmessage = (e: MessageEvent<Float32Array>) => {
        if (isMicMutedRef.current) return; // Temporarily mute microphone during AI speech (Continuous Mode)
        buf.push(e.data); bufLen += e.data.length;
        while (bufLen >= TARGET) {
          const combined = new Float32Array(TARGET);
          let off = 0, rem = TARGET;
          while (rem > 0 && buf.length) {
            const chunk = buf[0]; const n = Math.min(chunk.length, rem);
            combined.set(chunk.subarray(0, n), off); off += n; rem -= n;
            if (n >= chunk.length) buf.shift(); else buf[0] = chunk.subarray(n);
          }
          bufLen -= TARGET;
          const ratio = inRate / outRate, newLen = Math.round(combined.length / ratio);
          const ds = new Float32Array(newLen);
          let oi = 0, ii = 0;
          while (oi < newLen) {
            const next = Math.round((oi + 1) * ratio);
            let sum = 0, cnt = 0;
            for (let i = ii; i < next && i < combined.length; i++) { sum += combined[i]; cnt++; }
            ds[oi++] = cnt ? sum / cnt : 0; ii = next;
          }
          const pcm = new DataView(new ArrayBuffer(ds.length * 2));
          for (let i = 0; i < ds.length; i++) {
            const s = Math.max(-1, Math.min(1, ds[i]));
            pcm.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          }
          if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(pcm.buffer);
        }
      };

      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${location.host}/api/realtime/ws?language_code=Unknown&use_rag=true`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (connectTimerRef.current) { clearTimeout(connectTimerRef.current); connectTimerRef.current = null; }
        setIsConnected(true); setIsConnecting(false); setConnectTimeout(false);
        setAgentState('listening');
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        playCtxRef.current = ctx;
        
        // Setup analyser for visualization
        const anal = ctx.createAnalyser();
        anal.fftSize = 512;
        anal.smoothingTimeConstant = 0.55;
        analyserRef.current = anal;
        setAnalyser(anal);
      };
      ws.onmessage = async (ev) => {
        if (ev.data instanceof ArrayBuffer || ev.data instanceof Blob) {
          const ab = ev.data instanceof Blob ? await ev.data.arrayBuffer() : ev.data;
          handlePCM(ab);
        } else {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'user_transcript') {
              setAgentState('thinking');
              // Reset voice scheduler when user speaks (agent was interrupted / new turn)
              voiceNextRef.current = 0;
              setVoiceMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: msg.text || '...' }];
                }
                return [...prev, { id: uid(), role: 'user', text: msg.text || '...' }];
              });
            } else if (msg.type === 'agent_audio_start') {
              setAgentState('speaking');
              
              // Recreate AudioContext if it was closed by a previous Cancel
              if (!playCtxRef.current) {
                const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                playCtxRef.current = ctx;
                const anal = ctx.createAnalyser();
                anal.fftSize = 512;
                anal.smoothingTimeConstant = 0.55;
                analyserRef.current = anal;
                setAnalyser(anal);
              }
              
              // Reset scheduler at the start of each new TTS sentence
              if (playCtxRef.current) voiceNextRef.current = playCtxRef.current.currentTime;
            } else if (msg.type === 'agent_status') {
              setAgentState(msg.status);
              if (msg.status === 'thinking' || msg.status === 'searching_kb') {
                // MULTI-TURN LOGIC: Temporarily mute the microphone to avoid echo while agent thinks/speaks
                isMicMutedRef.current = true;
                
                setVoiceMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant' && !last.text) return prev;
                  return [...prev, { id: uid(), role: 'assistant', text: '' }];
                });
              }
            } else if (msg.type === 'agent_sources') {
              setAgentSources(msg.sources || []);
            } else if (msg.type === 'agent_text_delta') {
              // Maintain thinking state while text is generating before TTS
              setAgentState('thinking');
              setVoiceMessages(prev => {
                if (prev.length === 0) return prev;
                const newArr = [...prev];
                const lastIndex = newArr.length - 1;
                const last = newArr[lastIndex];
                if (last && last.role === 'assistant') {
                  newArr[lastIndex] = { ...last, text: last.text + (msg.text || msg.delta || '') };
                }
                return newArr;
              });
            } else if (msg.type === 'agent_turn_end' || msg.type === 'agent_audio_end') {
              // The backend finished sending audio, but the frontend queue might still be playing it.
              const p = playCtxRef.current;
              if (p && voiceNextRef.current > p.currentTime) {
                const timeLeft = voiceNextRef.current - p.currentTime;
                setTimeout(() => {
                  // Wait for user to manually tap to speak again, ONLY if they didn't already
                  setAgentState(prev => {
                    if (prev === 'speaking' || prev === 'thinking') {
                      isMicMutedRef.current = true;
                      return 'idle';
                    }
                    return prev;
                  });
                }, timeLeft * 1000);
              } else {
                setAgentState(prev => {
                  if (prev === 'speaking' || prev === 'thinking') {
                    isMicMutedRef.current = true;
                    return 'idle';
                  }
                  return prev;
                });
              }
            } else if (msg.type === 'error') {
              setError(msg.message);
            }
          } catch {}
        }
      };
      ws.onerror = () => { if (connectTimerRef.current) { clearTimeout(connectTimerRef.current); connectTimerRef.current = null; } setError('Connection error — please try again.'); };
      ws.onclose = () => { if (connectTimerRef.current) { clearTimeout(connectTimerRef.current); connectTimerRef.current = null; } disconnect(); };
    } catch (err: any) {
      if (connectTimerRef.current) { clearTimeout(connectTimerRef.current); connectTimerRef.current = null; }
      setError(err.message || 'Could not connect.'); disconnect();
    }
  };

  const handlePCM = (ab: ArrayBuffer) => {
    const p = playCtxRef.current; if (!p) return;
    const i16 = new Int16Array(ab), f32 = new Float32Array(i16.length);
    for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768;
    const buf = p.createBuffer(1, f32.length, 22050);
    buf.getChannelData(0).set(f32);
    const s = p.createBufferSource();
    s.buffer = buf;
    
    // Connect to analyser for visualization, then to destination for sound
    if (analyserRef.current) {
      s.connect(analyserRef.current);
      analyserRef.current.connect(p.destination);
    } else {
      s.connect(p.destination);
    }
    
    // Schedule sequentially so chunks don't overlap
    const startAt = Math.max(p.currentTime, voiceNextRef.current);
    voiceNextRef.current = startAt + buf.duration;
    activeSourcesRef.current.push(s);
    s.start(startAt);
    s.onended = () => { activeSourcesRef.current = activeSourcesRef.current.filter(x => x !== s); };
  };

  /* ── Mini chat audio ─────────────────────────────────────────────────── */
  const playMiniPcm = async (chunk: ArrayBuffer) => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = miniCtxRef.current || new AudioCtx();
    miniCtxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume();
    const samples = new Int16Array(chunk); if (!samples.length) return;
    const buf = ctx.createBuffer(1, samples.length, 22050);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < samples.length; i++) ch[i] = samples[i] / 32768;
    const src = ctx.createBufferSource(); src.buffer = buf; src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, miniNextRef.current);
    src.start(startAt); miniNextRef.current = startAt + buf.duration;
    miniSrcsRef.current.push(src);
    src.onended = () => { miniSrcsRef.current = miniSrcsRef.current.filter(x => x !== src); };
  };

  /* ── Mini chat submit ────────────────────────────────────────────────── */
  const handleMiniSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = miniInput.trim(); if (!text || miniLoading) return;
    setMiniInput('');
    setMiniLoading(true);

    const userMsg: MiniMessage = { id: uid(), role: 'user', text };
    const asstId = uid();
    const asstMsg: MiniMessage = { id: asstId, role: 'assistant', text: '' };
    setMiniMessages(prev => [...prev, userMsg, asstMsg]);

    miniSrcsRef.current.forEach(s => { try { s.stop(); } catch {} });
    miniSrcsRef.current = [];
    miniNextRef.current = miniCtxRef.current?.currentTime ?? 0;

    let accumulated = '';
    try {
      await streamVoiceAgent(
        text,
        {
          onTextDelta: (delta) => {
            accumulated += delta;
            setMiniMessages(prev =>
              prev.map(m => m.id === asstId ? { ...m, text: accumulated } : m)
            );
          },
          onAudioChunk: (chunk) => { void playMiniPcm(chunk); },
        },
        'default',
        'default',
        LANG_MAP[activeLang] ?? 'hi-IN',
      );
    } catch {
      setMiniMessages(prev =>
        prev.map(m => m.id === asstId ? { ...m, text: 'Error — could not get a response.' } : m)
      );
    } finally {
      setMiniLoading(false);
    }
  };

  /* ═════════════════════════ Render ═══════════════════════════════════════ */
  return (
    <div className="voice-root">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="voice-header">
        <div className="voice-header-brand">
          <div className="voice-logo">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke={AURA_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="voice-brand-name">Lyra</span>
          <span className="voice-brand-sub">Hindi · English · Hinglish</span>
        </div>

        {/* ── Chat / Voice toggle ─────────────────────────────────────── */}
        <div className="voice-mode-toggle" role="group" aria-label="Switch mode">
          <button
            id="btn-mode-chat"
            type="button"
            className={`voice-mode-btn${mode === 'chat' ? ' active' : ''}`}
            onClick={() => setMode('chat')}
            aria-pressed={mode === 'chat'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
          </button>
          <button
            id="btn-mode-voice"
            type="button"
            className={`voice-mode-btn${mode === 'voice' ? ' active' : ''}`}
            onClick={() => setMode('voice')}
            aria-pressed={mode === 'voice'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/>
            </svg>
            Voice
          </button>
        </div>

        {mode === 'voice' && isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={disconnect}
              className="voice-header-end-btn"
              style={{
                background: 'rgba(255, 68, 68, 0.15)',
                color: '#ff4444',
                border: '1px solid rgba(255, 68, 68, 0.3)',
                padding: '6px 14px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
              END SESSION
            </button>
          </div>
        )}
      </header>

      {/* ── Minimal Chat mode ───────────────────────────────────────────── */}
      {mode === 'chat' && (
        <div
          className="relative w-full flex-1 bg-cover bg-center flex flex-col items-center overflow-hidden"
          style={{
            backgroundImage: "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
            backgroundAttachment: "fixed",
          }}
        >
          {/* Messages Area */}
          <div
            className={cn(
              "flex-1 w-full flex flex-col relative z-10 max-w-3xl px-4 py-8 overflow-y-auto",
              miniMessages.length === 0 ? "items-center" : "justify-start"
            )}
            style={{ minHeight: 0 }}
          >
            {miniMessages.length === 0 ? (
              <div className="text-center mt-[12vh]">
                <h1 className="text-4xl font-semibold text-white drop-shadow-sm">
                  Ruixen AI
                </h1>
                <p className="mt-2 text-neutral-200">
                  Build something amazing — just start typing below.
                </p>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-4">
                {miniMessages.map(m => (
                  <div key={m.id} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                      m.role === 'user' 
                        ? 'bg-blue-600/90 text-white rounded-br-sm backdrop-blur-md' 
                        : 'bg-black/60 text-neutral-100 rounded-bl-sm border border-neutral-700/50 backdrop-blur-md'
                    }`}>
                      {m.text || <span className="flex gap-1 items-center h-5"><span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce"/><span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{animationDelay:'300ms'}}/></span>}
                    </div>
                  </div>
                ))}
                <div ref={miniEndRef} />
              </div>
            )}
          </div>

          {/* Input Box — always at bottom */}
          <div className="w-full max-w-2xl mx-auto mb-6 px-4 relative z-10 shrink-0">
            <form
              className="flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-xl border border-neutral-700 px-4 py-3 shadow-lg"
              onSubmit={(e) => {
                handleMiniSubmit(e);
                setTimeout(() => adjustHeight(true), 10);
              }}
            >
              <Textarea
                ref={textareaRef}
                value={miniInput}
                onChange={(e) => {
                  setMiniInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (miniInput.trim() && !miniLoading) {
                      handleMiniSubmit(e as any);
                      setTimeout(() => adjustHeight(true), 10);
                    }
                  }
                }}
                disabled={miniLoading}
                placeholder="Type your request..."
                className={cn(
                  "flex-1 resize-none border-none",
                  "bg-transparent text-white text-[15px] leading-relaxed",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "placeholder:text-neutral-400 min-h-[28px] max-h-[120px] py-0 px-0"
                )}
                style={{ overflow: "hidden" }}
                rows={1}
              />

              <Button
                type="submit"
                disabled={!miniInput.trim() || miniLoading}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0",
                  miniInput.trim() && !miniLoading
                    ? "bg-white text-black hover:bg-neutral-200 cursor-pointer"
                    : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                )}
              >
                <ArrowUpIcon className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>

          {/* Input when messages exist — pinned to bottom */}
          {miniMessages.length > 0 && (
            <div className="w-full max-w-2xl mx-auto mb-4 px-4 relative z-10 shrink-0">
              <form
                className="flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-xl border border-neutral-700 px-4 py-3 shadow-lg"
                onSubmit={(e) => {
                  handleMiniSubmit(e);
                  setTimeout(() => adjustHeight(true), 10);
                }}
              >
                <Textarea
                  ref={textareaRef}
                  value={miniInput}
                  onChange={(e) => {
                    setMiniInput(e.target.value);
                    adjustHeight();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (miniInput.trim() && !miniLoading) {
                        handleMiniSubmit(e as any);
                        setTimeout(() => adjustHeight(true), 10);
                      }
                    }
                  }}
                  disabled={miniLoading}
                  placeholder="Type your request..."
                  className={cn(
                    "flex-1 resize-none border-none",
                    "bg-transparent text-white text-[15px] leading-relaxed",
                    "focus-visible:ring-0 focus-visible:ring-offset-0",
                    "placeholder:text-neutral-400 min-h-[28px] max-h-[120px] py-0 px-0"
                  )}
                  style={{ overflow: "hidden" }}
                  rows={1}
                />

                <Button
                  type="submit"
                  disabled={!miniInput.trim() || miniLoading}
                  className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-full transition-all shrink-0",
                    miniInput.trim() && !miniLoading
                      ? "bg-white text-black hover:bg-neutral-200 cursor-pointer"
                      : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ── Voice mode ──────────────────────────────────────────────────── */}
      {mode === 'voice' && (
        <main className={`voice-main ${(isConnected || isConnecting) ? '' : 'voice-main--single'}`}>
          <section className="voice-aura-col">
            <div className="voice-aura-wrap">
              <AgentAudioVisualizerAura
                size="xl"
                color={AURA_COLOR}
                colorShift={AURA_SHIFT}
                state={agentState === 'disconnected' ? 'connecting' : agentState}
                themeMode="dark"
                analyser={analyser}
                className="aspect-square voice-aura-visualizer"
              />
              <p className="voice-onboarding-hint">Ask anything. Speak naturally.</p>
              <p className="voice-state-label" style={{ color: connectTimeout ? '#ff6b6b' : agentState === 'speaking' ? AURA_COLOR : agentState === 'thinking' ? '#9b5de5' : '#555' }}>
                {connectTimeout ? 'Connection taking longer than expected. Retry?' : isConnecting ? `CONNECTING${connectingDots}` : STATE_LABEL[agentState] ?? 'READY TO CONNECT'}
              </p>
            </div>

            {connectTimeout ? (
              <button id="btn-retry" onClick={connect} className="voice-main-btn retry">Retry</button>
            ) : (
              <button
                id={isConnected ? 'btn-connected-tap' : 'btn-connect'}
                onClick={() => {
                  if (!isConnected) {
                    connect();
                  } else {
                    if (agentState !== 'idle') {
                      // Cancel the AI and go to idle (wait for user to tap to speak again)
                      if (playCtxRef.current) { playCtxRef.current.close(); playCtxRef.current = null; }
                      setAgentState('idle');
                      isMicMutedRef.current = true;
                      
                      // Notify backend to immediately cancel the LLM and TTS tasks!
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
                      }
                    } else if (agentState === 'idle') {
                      // User tapped to speak for the next turn
                      setAgentState('listening');
                      isMicMutedRef.current = false;
                    }
                  }
                }}
                disabled={isConnecting}
                className={`voice-main-btn${(isConnected && agentState !== 'idle') ? ' disconnect' : ''}`}
              >
                {isConnecting ? <><SpinIcon /> Connecting{connectingDots}</> :
                 (isConnected && agentState !== 'idle') ? <><StopIcon /> Cancel</> :
                                <>Tap to speak</>}
              </button>
            )}

            {error && (
              <div className="voice-error">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="#ff6b6b" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}
          </section>

          {/* Transcript / Sources Panel */}
          {(isConnected || isConnecting) && (
            <section className="voice-chat-col">
              <div className="voice-chat-header voice-tabs-header">
                <div className="voice-tabs">
                  <button
                    className={`voice-tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
                    onClick={() => setActiveTab('transcript')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    Transcript
                  </button>
                  <button
                    className={`voice-tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sources')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    Sources {agentSources.length > 0 && <span className="voice-tab-badge">{agentSources.length}</span>}
                  </button>
                </div>
              </div>

              {activeTab === 'transcript' && (
                <div className="voice-chat-scroll">
                  {voiceMessages.length === 0 && (
                    <div className="voice-empty">
                      <p className="voice-empty-text">Listening for you to speak...</p>
                    </div>
                  )}
                  {voiceMessages.map((m) => (
                    <div key={m.id} className="voice-transcript-message">
                      <div className={`voice-transcript-bubble ${m.role === 'user' ? 'user' : 'lyra'}`}>
                        {m.role === 'assistant' && (
                          <div className="voice-response-label">
                            <span className="voice-response-dot">●</span> RESPONSE
                          </div>
                        )}
                        
                        {m.role === 'assistant' && m.text && (
                          <div className="voice-thoughts-dropdown">
                            <button
                              className="voice-thoughts-toggle"
                              onClick={() => setShowThoughtsId(showThoughtsId === m.id ? null : m.id)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
                                <path d="M9 18h6" />
                                <path d="M10 22h4" />
                              </svg>
                              Thoughts
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`chevron ${showThoughtsId === m.id ? 'open' : ''}`}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </button>
                            
                            {showThoughtsId === m.id && (
                              <div className="voice-thoughts-content">
                                <div className="thought-item"><CheckIcon /> <div className="thought-body"><span className="thought-title">Audio transcription</span><span className="thought-time">142ms</span></div></div>
                                <div className="thought-item"><CheckIcon /> <div className="thought-body"><span className="thought-title">Intent recognition</span><span className="thought-time">85ms</span></div></div>
                                <div className="thought-item"><CheckIcon /> <div className="thought-body"><span className="thought-title">Vector retrieval (Q3 Data)</span><span className="thought-time">340ms</span></div></div>
                                <div className="thought-item"><CheckIcon /> <div className="thought-body"><span className="thought-title">Web search (Benchmarks)</span><span className="thought-time">512ms</span></div></div>
                                <div className="thought-item"><CheckIcon /> <div className="thought-body"><span className="thought-title">Response synthesis</span><span className="thought-time">890ms</span></div></div>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="voice-transcript-text" style={{ marginTop: m.role === 'assistant' ? '12px' : '0' }}>
                          {!m.text && m.role === 'assistant' ? (
                            <span className="mini-typing"><span/><span/><span/></span>
                          ) : m.role === 'assistant' ? (
                            <SyncText text={m.text} isLatest={voiceMessages[voiceMessages.length - 1].id === m.id} agentState={agentState} />
                          ) : (
                            m.text
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={voiceEndRef} />
                </div>
              )}

              {activeTab === 'sources' && (
                <div className="voice-chat-scroll">
                  <div className="sources-header">RETRIEVED KNOWLEDGE</div>
                  
                  {agentSources.length === 0 ? (
                    <div className="voice-empty">
                      <p className="voice-empty-text">No sources retrieved for this query.</p>
                    </div>
                  ) : (
                    agentSources.map((src, i) => (
                      <div key={src.id || i} className="source-card">
                        <div className="source-card-header">
                          <div className={`source-icon ${src.type.toLowerCase().includes('web') ? 'web' : 'vector'}`}>
                            {src.type.toLowerCase().includes('web') ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                            )}
                          </div>
                          <span className="source-type">{src.type}</span>
                        </div>
                        <div className="source-title">{src.title}</div>
                        <div className="source-desc">{src.desc}</div>
                        <div className="source-link">{src.link}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          )}
        </main>
      )}
    </div>
  );
}

/* ── Icon components ─────────────────────────────────────────────────────── */
function StopIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>;
}
function SpinIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
