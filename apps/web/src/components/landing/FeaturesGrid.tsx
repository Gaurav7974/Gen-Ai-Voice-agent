import React from 'react';

type FeaturesGridProps = {
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

export default function FeaturesGrid({ onMouseMove }: FeaturesGridProps) {
  return (
    <div className="features-grid-nova">
      <article className="feat-panel feat-panel--wide" onMouseMove={onMouseMove}>
        <div className="feat-panel-glow" />
        <div className="feat-panel-inner">
          <div className="feat-panel-copy">
            <p className="feat-panel-tag">Performance</p>
            <h3>Sub-1.5s end-to-end</h3>
            <p>Groq inference plus streamed TTS — answers start playing before synthesis finishes.</p>
          </div>
          <div className="feat-latency-bars" aria-hidden="true">
            {[
              { label: 'Speech-to-text', sub: 'Sarvam Saaras v3', ms: '< 400ms', cls: 'stt' },
              { label: 'LLM', sub: 'Groq Llama 3.3', ms: '< 300ms', cls: 'llm' },
              { label: 'Text-to-speech', sub: 'Sarvam Bulbul v3', ms: '< 600ms', cls: 'tts' },
            ].map((row) => (
              <div key={row.label} className="feat-latency-row">
                <div className="feat-latency-meta">
                  <span className="feat-latency-label">{row.label}</span>
                  <span className="feat-latency-sub">{row.sub}</span>
                </div>
                <div className="feat-latency-track">
                  <div className={`feat-latency-fill feat-latency-fill--${row.cls}`} />
                </div>
                <span className="feat-latency-ms">{row.ms}</span>
              </div>
            ))}
          </div>
        </div>
      </article>

      <article className="feat-panel" onMouseMove={onMouseMove}>
        <div className="feat-panel-glow" />
        <div className="feat-panel-inner feat-panel-inner--stack">
          <p className="feat-panel-tag">Languages</p>
          <h3>11 Indic languages</h3>
          <p>Native STT and TTS — not translation. Code-mixed Hinglish and regional dialects included.</p>
          <div className="feat-script-grid" aria-hidden="true">
            {['हिन्दी', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ', 'मराठी', 'বাংলা', 'ਪੰਜਾਬੀ', 'ગુજરાતી'].map((s) => (
              <span key={s} className="feat-script-cell">{s}</span>
            ))}
          </div>
        </div>
      </article>

      <article className="feat-panel" onMouseMove={onMouseMove}>
        <div className="feat-panel-glow" />
        <div className="feat-panel-inner feat-panel-inner--stack">
          <p className="feat-panel-tag">Retrieval</p>
          <h3>RAG-grounded answers</h3>
          <p>Hybrid BM25 + semantic search. Top chunks injected — no hallucinated facts.</p>
          <svg className="feat-rag-svg" viewBox="0 0 280 100" fill="none" aria-hidden="true">
            <rect x="8" y="36" width="48" height="32" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
            <line x1="16" y1="48" x2="48" y2="48" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <line x1="16" y1="56" x2="40" y2="56" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="120" cy="50" r="22" fill="rgba(0,195,201,0.1)" stroke="#00c3c9" strokeWidth="1.5" />
            <circle cx="120" cy="50" r="8" fill="#00c3c9" />
            <rect x="200" y="22" width="52" height="22" rx="5" fill="rgba(255,255,255,0.04)" stroke="rgba(0,195,201,0.4)" strokeWidth="1" />
            <text x="208" y="37" fill="#00c3c9" fontSize="9" fontFamily="JetBrains Mono, monospace">chunk_0</text>
            <rect x="200" y="52" width="52" height="22" rx="5" fill="rgba(255,255,255,0.04)" stroke="rgba(0,195,201,0.4)" strokeWidth="1" />
            <text x="208" y="67" fill="#00c3c9" fontSize="9" fontFamily="JetBrains Mono, monospace">chunk_1</text>
            <path d="M56 50 H98" stroke="rgba(0,195,201,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M142 42 L200 33" stroke="rgba(0,195,201,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M142 58 L200 63" stroke="rgba(0,195,201,0.35)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
        </div>
      </article>

      <article className="feat-panel feat-panel--wide" onMouseMove={onMouseMove}>
        <div className="feat-panel-glow" />
        <div className="feat-panel-inner">
          <div className="feat-panel-copy">
            <p className="feat-panel-tag">Audio</p>
            <h3>Streamed voice responses</h3>
            <p>Chunked TTS playback — sub-second time-to-first-audio, natural conversational pace.</p>
          </div>
          <div className="feat-wave-visual" aria-hidden="true">
            <svg viewBox="0 0 200 80" className="feat-wave-svg">
              {[12, 28, 44, 56, 48, 32, 20, 36, 52, 40, 24, 16].map((h, i) => (
                <rect
                  key={i}
                  x={8 + i * 16}
                  y={40 - h / 2}
                  width="8"
                  height={h}
                  rx="4"
                  fill={i % 3 === 0 ? '#00c3c9' : 'rgba(255,255,255,0.2)'}
                  className="feat-wave-bar"
                  style={{ animationDelay: `${i * 0.08}s` }}
                />
              ))}
            </svg>
          </div>
        </div>
      </article>
    </div>
  );
}
