const API_BASE = '';

export async function transcribeAudio(blob: Blob, languageCode?: string): Promise<{ transcript: string; language_code: string | null }> {
  const form = new FormData();
  form.append('file', blob, 'audio.wav');
  form.append('model', 'saaras:v3');
  form.append('mode', 'transcribe');
  if (languageCode) form.append('language_code', languageCode);

  const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`STT failed: ${res.status}`);
  return res.json();
}

export async function voiceAgentCombined(
  prompt: string,
  llmConfig = 'default',
  ttsConfig = 'default',
  language = 'hi-IN',
): Promise<{ generated_text: string; audio_url: string }> {
  const res = await fetch(`${API_BASE}/api/voice-agent-combined`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, llm_config: llmConfig, tts_config: ttsConfig, language }),
  });
  if (!res.ok) throw new Error(`Voice agent failed: ${res.status}`);
  return res.json();
}

// Streaming voice agent - returns raw audio stream
// Use this for true streaming audio playback like Gemini
export async function voiceAgentStream(
  prompt: string,
  llmConfig = 'default',
  ttsConfig = 'default',
  language = 'hi-IN',
): Promise<{ response: Response; generatedText: string }> {
  const res = await fetch(`${API_BASE}/api/voice-agent-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, llm_config: llmConfig, tts_config: ttsConfig, language }),
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Voice agent stream failed: ${res.status} - ${error}`);
  }
  
  // Extract the generated text from header
  const generatedText = res.headers.get('X-Generated-Text') || '';
  
  return {
    response: res,
    generatedText,
  };
}

export interface VoiceAgentStreamHandlers {
  onStatus?: (status: string) => void;
  onTextDelta?: (text: string) => void;
  onAudioStart?: (meta: { sampleRate: number; codec: string }) => void;
  onAudioChunk?: (chunk: ArrayBuffer) => void;
  onAudioEnd?: () => void;
}

export function streamVoiceAgent(
  prompt: string,
  handlers: VoiceAgentStreamHandlers = {},
  llmConfig = 'default',
  ttsConfig = 'default',
  language = 'hi-IN',
): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/voice-agent-stream/ws`);
    let fullText = '';
    let settled = false;

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(error);
    };

    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      socket.send(JSON.stringify({
        prompt,
        llm_config: llmConfig,
        tts_config: ttsConfig,
        language,
        use_rag: true,
      }));
    };

    socket.onmessage = async (event) => {
      if (event.data instanceof ArrayBuffer) {
        handlers.onAudioChunk?.(event.data);
        return;
      }

      if (event.data instanceof Blob) {
        handlers.onAudioChunk?.(await event.data.arrayBuffer());
        return;
      }

      const message = JSON.parse(event.data);
      if (message.type === 'agent_status') {
        handlers.onStatus?.(message.status);
        return;
      }

      if (message.type === 'agent_text_delta') {
        const delta = message.text || '';
        fullText += delta;
        handlers.onTextDelta?.(delta);
        return;
      }

      if (message.type === 'agent_audio_start') {
        handlers.onAudioStart?.({
          sampleRate: message.sample_rate || 22050,
          codec: message.codec || 'pcm_s16le',
        });
        return;
      }

      if (message.type === 'agent_audio_end') {
        handlers.onAudioEnd?.();
        return;
      }

      if (message.type === 'agent_turn_end') {
        if (settled) return;
        settled = true;
        resolve(message.text || fullText);
        socket.close();
        return;
      }

      if (message.type === 'error') {
        fail(new Error(message.message || 'Voice agent stream failed'));
      }
    };

    socket.onerror = () => fail(new Error('Voice agent WebSocket failed'));
    socket.onclose = () => {
      if (!settled) fail(new Error('Voice agent WebSocket closed before completion'));
    };
  });
}

export async function synthesizeSpeechStream(
  text: string,
  language = 'hi-IN',
): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/synthesize-speech-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, config: 'default' }),
  });
  if (!res.ok) throw new Error(`TTS stream failed: ${res.status}`);
  return res.blob();
}

export async function listRagFiles(): Promise<{ files: { name: string; size: number }[] }> {
  const res = await fetch(`${API_BASE}/api/rag/files`);
  if (!res.ok) throw new Error(`Failed to list files: ${res.status}`);
  return res.json();
}

export async function uploadRagFile(file: File): Promise<{ message: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/rag/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export async function deleteRagFile(filename: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/rag/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  return res.json();
}

export async function ingestRag(): Promise<{ message: string; chunks: number }> {
  const res = await fetch(`${API_BASE}/api/rag/ingest`, { method: 'POST' });
  if (!res.ok) throw new Error(`Ingest failed: ${res.status}`);
  return res.json();
}

export async function queryRag(question: string, nResults: number = 3): Promise<{ results: Array<{ source: string; chunk_index: number; distance: number; text: string }> }> {
  const params = new URLSearchParams({
    question,
    n_results: nResults.toString()
  });
  const res = await fetch(`${API_BASE}/api/rag/query?${params}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  return res.json();
}
