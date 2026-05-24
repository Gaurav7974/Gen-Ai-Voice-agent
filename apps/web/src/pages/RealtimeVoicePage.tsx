import React, { useState, useEffect, useRef } from 'react';
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
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
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

      // ScriptProcessorNode downsamples microphone input (default is 44.1k/48k) to 16kHz mono PCM
      const bufferSize = 4096;
      const processor = captureCtx.createScriptProcessor(bufferSize, 1, 1);
      processorNodeRef.current = processor;
      source.connect(processor);
      processor.connect(captureCtx.destination);

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

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const downsampled = downsample(inputData, inputSampleRate, outputSampleRate);
        const pcmBuffer = floatTo16BitPCM(downsampled);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(pcmBuffer);
        }
      };

      // 4. Establish WebSocket connection to backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port ? `${window.location.hostname}:8000` : window.location.hostname;
      const wsUrl = `${protocol}//${host}/api/realtime/ws?language_code=${LANG_MAP[activeLang]}&use_rag=${useRag}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setAgentStatus('idle');
      };

      ws.onmessage = async (event) => {
        // Binary message is raw PCM chunks from agent's TTS stream
        if (event.data instanceof Blob) {
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
    <div className="realtime-page">
      <div className="realtime-container">
        
        {/* Top Controls */}
        <div className="realtime-header-controls">
          <div className="controls-group">
            <label className="control-label">Language</label>
            <select
              className="settings-select"
              value={activeLang}
              onChange={(e) => setActiveLang(e.target.value)}
              disabled={isConnected}
            >
              {Object.entries(LANG_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="controls-group">
            <label className="settings-row-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={useRag}
                onChange={(e) => setUseRag(e.target.checked)}
                disabled={isConnected}
              />
              Enable RAG
            </label>
          </div>
        </div>

        {/* Visualizer Circle */}
        <div className="visualizer-wrapper">
          <div className={`visualizer-ring ${getPulseClassName()}`} style={{ transform: `scale(${1 + (volumeLevel / 160)})` }}>
            <div className="visualizer-ring-inner-1"></div>
            <div className="visualizer-ring-inner-2"></div>
            <div className="visualizer-ring-inner-3"></div>
            <div className="visualizer-ring-inner-4"></div>
            <div className="visualizer-core">
              {isConnected ? (
                <span className="visualizer-mic-icon" onClick={sendInterrupted}>
                  {agentStatus === 'speaking' ? '⏹' : '🎙'}
                </span>
              ) : (
                <button className="connect-btn" onClick={connectSession}>
                  Start
                </button>
              )}
            </div>
          </div>
          <div className="status-label">{getStatusText()}</div>
        </div>

        {/* Terminal/Chat boxes */}
        <div className="realtime-transcript">
          <div className="transcript-box">
            <div className="transcript-box-topbar">
              <span className="box-dot"></span>
              <span className="box-dot"></span>
              <span className="box-dot"></span>
              <span className="box-header" style={{ marginLeft: '6px' }}>USER_TRANSCRIPT</span>
            </div>
            <div className="box-content user-color">{userText || '...'}</div>
          </div>
          <div className="transcript-box">
            <div className="transcript-box-topbar">
              <span className="box-dot"></span>
              <span className="box-dot"></span>
              <span className="box-dot"></span>
              <span className="box-header" style={{ marginLeft: '6px' }}>LYRA_RESPONSE</span>
            </div>
            <div className="box-content agent-color">{agentText || '...'}</div>
          </div>
        </div>

        {error && <div className="realtime-error">{error}</div>}

        {isConnected && (
          <button className="disconnect-btn" onClick={disconnectSession}>
            End Conversation
          </button>
        )}
      </div>
    </div>
  );
}
