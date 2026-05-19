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
