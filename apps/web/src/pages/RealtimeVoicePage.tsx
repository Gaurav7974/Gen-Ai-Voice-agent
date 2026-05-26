import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import StreamingText from '../components/StreamingText';
import '../styles/chatbot.css'; // Leverage existing styles and extend them

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

type AgentStatus = 'idle' | 'searching_kb' | 'thinking' | 'speaking';

export default function RealtimeVoicePage() {
  const [activeLang, setActiveLang] = useState<string>('hi');
  const [useRag, setUseRag] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [userText, setUserText] = useState<string>('');
  const [agentText, setAgentText] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [volumeLevel, setVolumeLevel] = useState<number>(0);

  // References for WebSockets & Web Audio
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playAudioCtxRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<AudioWorkletNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);

  // Volume animation loop
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSession();
    };
  }, []);

  const connectSession = async () => {
    setError('');
    setUserText('');
    setAgentText('');

    try {
      // 1. Establish microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      // 2. Set up Audio Context for capture
      const captureCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = captureCtx;

      // Analyser for soundwave ripple animation
      const analyser = captureCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = captureCtx.createMediaStreamSource(stream);
      micSourceRef.current = source;
      source.connect(analyser);

      // AudioWorkletNode captures microphone input → downsamples to 16kHz mono PCM
      // Replaces the deprecated ScriptProcessorNode API
      await captureCtx.audioWorklet.addModule(
        new URL('../audio/pcm-processor.ts', import.meta.url),
      );
      const workletNode = new AudioWorkletNode(captureCtx, 'pcm-capture-processor', {
        channelCount: 1,
        channelCountMode: 'explicit',
        numberOfInputs: 1,
        numberOfOutputs: 1,
      });
      processorNodeRef.current = workletNode;
      source.connect(workletNode);

      const inputSampleRate = captureCtx.sampleRate;
      const outputSampleRate = 16000;

      // Soundwave animation
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setVolumeLevel(average);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      animFrameRef.current = requestAnimationFrame(updateVolume);

      // 3. Set up Audio Context for playback
      const playCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      playAudioCtxRef.current = playCtx;
      nextPlayTimeRef.current = 0;

      // Downsampling logic
      const downsample = (buffer: Float32Array, inputRate: number, outputRate: number) => {
        if (inputRate === outputRate) return buffer;
        const ratio = inputRate / outputRate;
        const newLength = Math.round(buffer.length / ratio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
          const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
          let accum = 0;
          let count = 0;
          for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
          }
          result[offsetResult] = count > 0 ? accum / count : 0;
          offsetResult++;
          offsetBuffer = nextOffsetBuffer;
        }
        return result;
      };

      // Float32 to 16-bit signed PCM
      const floatTo16BitPCM = (float32Array: Float32Array) => {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
          let s = Math.max(-1, Math.min(1, float32Array[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
      };

      // Buffer 128-sample AudioWorklet quantums into 4096-sample chunks
      // (matching the old ScriptProcessorNode bufferSize) before processing
      const TARGET_BUFFER_SIZE = 4096;
      let audioInputBuffer: Float32Array[] = [];
      let audioInputLength = 0;

      workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
        const chunk = e.data;
        audioInputBuffer.push(chunk);
        audioInputLength += chunk.length;

        while (audioInputLength >= TARGET_BUFFER_SIZE) {
          const combined = new Float32Array(TARGET_BUFFER_SIZE);
          let offset = 0;
          let remaining = TARGET_BUFFER_SIZE;

          while (remaining > 0 && audioInputBuffer.length > 0) {
            const buf = audioInputBuffer[0];
            const toCopy = Math.min(buf.length, remaining);
            combined.set(buf.subarray(0, toCopy), offset);
            offset += toCopy;
            remaining -= toCopy;

            if (toCopy >= buf.length) {
              audioInputBuffer.shift();
            } else {
              audioInputBuffer[0] = buf.subarray(toCopy);
            }
          }

          audioInputLength -= TARGET_BUFFER_SIZE;

          const downsampled = downsample(combined, inputSampleRate, outputSampleRate);
          const pcmBuffer = floatTo16BitPCM(downsampled);

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(pcmBuffer);
          }
        }
      };

      // 4. Establish WebSocket connection to backend (via Vite proxy in dev)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/realtime/ws?language_code=${LANG_MAP[activeLang]}&use_rag=${useRag}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setAgentStatus('idle');
      };

      ws.onmessage = async (event) => {
        // Binary message is raw PCM chunks from agent's TTS stream
        if (event.data instanceof ArrayBuffer) {
          handleIncomingPCM(event.data);
        } else if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          handleIncomingPCM(arrayBuffer);
        } else {
          // JSON control/text message
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'user_transcript') {
              setUserText(msg.text);
            } else if (msg.type === 'agent_text_delta') {
              setAgentText((prev) => prev + msg.text);
            } else if (msg.type === 'agent_status') {
              setAgentStatus(msg.status);
              if (msg.status === 'searching_kb' || msg.status === 'thinking') {
                setAgentText('');
              }
            } else if (msg.type === 'agent_audio_start') {
              // Agent is about to speak
            } else if (msg.type === 'agent_audio_end') {
              // End of sentence audio chunk
            } else if (msg.type === 'interrupted') {
              stopSpeakingQueue();
              setAgentStatus('idle');
              setAgentText((prev) => prev + ' [Interrupted]');
            } else if (msg.type === 'error') {
              setError(msg.message);
            }
          } catch (e) {
            console.error('Failed to parse WebSocket text frame', e);
          }
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket Error:', e);
        setError('WebSocket connection error.');
      };

      ws.onclose = () => {
        disconnectSession();
      };

    } catch (err: any) {
      setError(err.message || 'Microphone access denied or connection failed.');
      disconnectSession();
    }
  };

  const disconnectSession = () => {
    setIsConnected(false);
    setAgentStatus('idle');
    setVolumeLevel(0);

    // Stop audio capture
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
      micSourceRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    // Stop audio animation loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    analyserRef.current = null;

    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Stop speaking audio queue
    stopSpeakingQueue();
    if (playAudioCtxRef.current) {
      playAudioCtxRef.current.close();
      playAudioCtxRef.current = null;
    }
  };

  const handleIncomingPCM = (arrayBuffer: ArrayBuffer) => {
    const playCtx = playAudioCtxRef.current;
    if (!playCtx) return;

    // Convert 16-bit PCM (LINEAR16) returned by Sarvam TTS at 22050Hz to Float32
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    // Create AudioBuffer
    const sampleRate = 22050; // Sarvam PCM sample rate
    const audioBuffer = playCtx.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.copyToChannel(float32Array, 0);

    // Schedule playback node
    const source = playCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(playCtx.destination);

    activeSourcesRef.current.push(source);

    const now = playCtx.currentTime;
    if (nextPlayTimeRef.current < now) {
      nextPlayTimeRef.current = now;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;

    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
    };
  };

  const stopSpeakingQueue = () => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch (e) { /* ignore already stopped */ }
    });
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;
  };

  const sendInterrupted = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'interrupt' }));
    }
    stopSpeakingQueue();
  };

  const getPulseClassName = () => {
    if (!isConnected) return 'pulse-idle';
    if (agentStatus === 'speaking') return 'pulse-speaking';
    if (agentStatus === 'thinking' || agentStatus === 'searching_kb') return 'pulse-thinking';
    return volumeLevel > 15 ? 'pulse-listening-active' : 'pulse-listening-idle';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (agentStatus === 'speaking') return 'Speaking...';
    if (agentStatus === 'thinking') return 'Thinking...';
    if (agentStatus === 'searching_kb') return 'Searching Knowledge Base...';
    return 'Listening...';
  };

  return (
    <div className="realtime-page" style={{ animation: 'slide-in .35s ease-out' }}>
      <div className="realtime-container">
        
        <header className="realtime-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '28px', color: 'var(--text)' }}>Talk to Lyra</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>Start a real-time voice session. Speak naturally. Lyra responds with grounded, low-latency audio.</p>
        </header>

        {/* Top Controls */}
        <div className="realtime-header-controls">
          <div className="controls-group">
            <label className="control-label">Voice Language</label>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {Object.entries(LANG_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  className={`pill ${activeLang === k ? 'active' : ''}`}
                  onClick={() => setActiveLang(k)}
                  disabled={isConnected}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <div className="controls-group" style={{ flex: '0 0 auto' }}>
            <label className="control-label">Retrieval Mode</label>
            <div style={{ marginTop: '4px' }}>
              <button
                type="button"
                className={`pill ${useRag ? 'pill--teal active' : ''}`}
                onClick={() => setUseRag(!useRag)}
                disabled={isConnected}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '12px' }}
              >
                <span className={`glow-dot glow-dot--small ${useRag ? 'glow-dot--teal' : ''}`} />
                {useRag ? 'Knowledge Grounded (RAG)' : 'General Model'}
              </button>
            </div>
          </div>
        </div>

        {/* Visualizer & Browser Shell Wrapper */}
        <div className="demo-shell" style={{ width: '100%', margin: '0 auto', boxShadow: 'var(--shadow-warm)' }}>
          <div className="demo-topbar">
            <div className="demo-dot" />
            <div className="demo-dot" />
            <div className="demo-dot" />
            <span className="demo-title-bar">
              lyra — real-time voice interface · {LANG_LABELS[activeLang]}
            </span>
            <div className="chat-phase-badge">
              {isConnected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span className={`glow-dot glow-dot--small ${agentStatus === 'speaking' ? 'glow-dot--teal' : ''}`} />
                  {agentStatus === 'speaking' ? 'Speaking' : agentStatus === 'thinking' ? 'Thinking' : agentStatus === 'searching_kb' ? 'Searching KB' : 'Listening'}
                </span>
              ) : 'Ready'}
            </div>
          </div>

          <div className="demo-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '32px 24px' }}>
            
            {/* Visualizer & Mic Button */}
            <div className="visualizer-wrapper" style={{ margin: '0' }}>
              <motion.div
                className={`visualizer-ring ${getPulseClassName()}`}
                animate={{ scale: 1 + (volumeLevel / 160) }}
                transition={{ type: 'spring', bounce: 0.25, duration: 0.1 }}
                style={{ width: '150px', height: '150px' }}
              >
                <div className="visualizer-ring-inner-1"></div>
                <div className="visualizer-ring-inner-2"></div>
                <div className="visualizer-ring-inner-3"></div>
                <div className="visualizer-ring-inner-4"></div>
                
                <div className="visualizer-core" style={{ width: '100px', height: '100px' }}>
                  {isConnected ? (
                    <button 
                      type="button"
                      className="mic-btn recording" 
                      onClick={sendInterrupted} 
                      style={{ width: '74px', height: '74px', border: 'none', color: '#fff', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {agentStatus === 'speaking' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                      )}
                    </button>
                  ) : (
                    <button 
                      type="button"
                      className="mic-btn" 
                      onClick={connectSession}
                      style={{ width: '74px', height: '74px', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#fff' }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                    </button>
                  )}
                </div>
              </motion.div>
            </div>

            <div className="status-label" style={{ fontFamily: 'var(--f-mono)', fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px' }}>
              {getStatusText()}
            </div>

            {/* Interactive Waveform Animation */}
            <div className={`demo-waveform ${isConnected && agentStatus !== 'idle' ? 'active' : ''}`} style={{ marginBottom: '0', height: '32px' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="b" />
              ))}
            </div>

            {/* Transcript Boxes */}
            <div className="realtime-transcript" style={{ width: '100%', gap: '16px' }}>
              <div className="transcript-box" style={{ minHeight: '130px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="transcript-box-topbar" style={{ borderBottomColor: 'var(--border)' }}>
                  <span className="box-dot" style={{ backgroundColor: 'var(--accent)' }}></span>
                  <span className="box-dot" style={{ backgroundColor: 'var(--border3)' }}></span>
                  <span className="box-dot" style={{ backgroundColor: 'var(--teal)' }}></span>
                  <span className="box-header" style={{ color: 'var(--muted)', fontSize: '10px' }}>USER_TRANSCRIPT</span>
                </div>
                <div className="box-content user-color" style={{ color: 'var(--accent2)', fontSize: '13.5px', fontFamily: 'var(--f-body)', fontWeight: 500 }}>
                  {userText || 'Listening for your voice...'}
                </div>
              </div>

              <div className="transcript-box" style={{ minHeight: '130px', padding: '16px', background: 'var(--teal-dim)', border: '1px solid hsla(174,90%,48%,.20)' }}>
                <div className="transcript-box-topbar" style={{ borderBottomColor: 'hsla(174,90%,48%,.20)' }}>
                  <span className="box-dot" style={{ backgroundColor: 'var(--teal)' }}></span>
                  <span className="box-dot" style={{ backgroundColor: 'hsla(174,90%,48%,.30)' }}></span>
                  <span className="box-dot" style={{ backgroundColor: 'var(--border3)' }}></span>
                  <span className="box-header" style={{ color: 'var(--teal)', fontSize: '10px' }}>LYRA_RESPONSE</span>
                </div>
                <div className="box-content agent-color" style={{ color: 'var(--text)', fontSize: '13.5px', fontFamily: 'var(--f-body)' }}>
                  {agentText ? (
                    <StreamingText text={agentText} />
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>Waiting for query...</span>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="realtime-error" style={{ width: '100%', margin: '0' }}>{error}</div>}

            {isConnected && (
              <button 
                type="button"
                className="disconnect-btn" 
                onClick={disconnectSession}
                style={{ padding: '10px 24px', fontSize: '13px', border: '1px solid #ff7069', background: 'rgba(255, 95, 87, 0.05)' }}
              >
                End Conversation
              </button>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
