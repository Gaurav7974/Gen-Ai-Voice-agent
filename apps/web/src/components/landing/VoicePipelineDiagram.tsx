/** Illustrative voice pipeline — custom SVG, no icon library */
export default function VoicePipelineDiagram() {
  return (
    <div className="pipeline-diagram" aria-hidden="true">
      <svg viewBox="0 0 420 320" fill="none" xmlns="http://www.w3.org/2000/svg" className="pipeline-diagram-svg">
        <defs>
          <linearGradient id="pipe-glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,195,201,0)" />
            <stop offset="50%" stopColor="rgba(0,195,201,0.45)" />
            <stop offset="100%" stopColor="rgba(0,195,201,0)" />
          </linearGradient>
          <filter id="pipe-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="12" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <ellipse cx="210" cy="28" rx="120" ry="24" fill="url(#pipe-glow)" opacity="0.6" filter="url(#pipe-blur)" />

        {/* Connector rails */}
        <path d="M70 160 H350" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 6" />
        <path d="M105 160 H315" stroke="rgba(0,195,201,0.35)" strokeWidth="1.5" className="pipeline-flow-line" />

        {/* Node: Voice in */}
        <g transform="translate(24, 118)">
          <rect width="72" height="84" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M36 32c0-6 5-11 11-11s11 5 11 11v14c0 6-5 11-11 11s-11-5-11-11V32z" stroke="#00c3c9" strokeWidth="1.5" fill="rgba(0,195,201,0.08)" />
          <path d="M28 52h16M32 58h8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
          <text x="36" y="74" textAnchor="middle" fill="#969696" fontSize="9" fontFamily="DM Sans, sans-serif">Voice in</text>
        </g>

        {/* Node: STT */}
        <g transform="translate(108, 118)">
          <rect width="72" height="84" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <rect x="18" y="28" width="36" height="4" rx="2" fill="rgba(0,195,201,0.5)" />
          <rect x="18" y="36" width="28" height="3" rx="1.5" fill="rgba(255,255,255,0.2)" />
          <rect x="18" y="43" width="32" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />
          <text x="36" y="74" textAnchor="middle" fill="#969696" fontSize="9" fontFamily="DM Sans, sans-serif">Saaras STT</text>
        </g>

        {/* Node: RAG (center highlight) */}
        <g transform="translate(174, 100)">
          <rect width="72" height="100" rx="12" fill="rgba(0,195,201,0.06)" stroke="rgba(0,195,201,0.35)" strokeWidth="1.5" />
          <circle cx="36" cy="42" r="14" fill="rgba(0,195,201,0.15)" stroke="#00c3c9" strokeWidth="1.5" />
          <circle cx="36" cy="42" r="5" fill="#00c3c9" />
          <rect x="14" y="58" width="44" height="22" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" />
          <text x="20" y="72" fill="#00c3c9" fontSize="7" fontFamily="JetBrains Mono, monospace">chk×4</text>
          <text x="36" y="92" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="500" fontFamily="DM Sans, sans-serif">RAG</text>
        </g>

        {/* Node: LLM */}
        <g transform="translate(258, 118)">
          <rect width="72" height="84" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M24 38h24M24 46h18M24 54h20" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="32" r="3" fill="#00c3c9" className="pipeline-pulse-dot" />
          <text x="36" y="74" textAnchor="middle" fill="#969696" fontSize="9" fontFamily="DM Sans, sans-serif">Groq LLM</text>
        </g>

        {/* Node: TTS out */}
        <g transform="translate(324, 118)">
          <rect width="72" height="84" rx="10" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <path d="M28 48c0-8 6-14 14-14 2 0 4 .5 6 1.5V34c-2-1-4-1.5-6-1.5-8 0-14 6-14 14v6h-4l6 10 6-10h-4v-6z" fill="rgba(0,195,201,0.12)" stroke="#00c3c9" strokeWidth="1.2" />
          <text x="36" y="74" textAnchor="middle" fill="#969696" fontSize="9" fontFamily="DM Sans, sans-serif">Bulbul TTS</text>
        </g>

        {/* Latency strip */}
        <g transform="translate(48, 228)">
          <rect width="324" height="56" rx="10" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x="16" y="22" fill="rgba(255,255,255,0.45)" fontSize="8" fontFamily="JetBrains Mono, monospace" letterSpacing="0.12em">E2E LATENCY</text>
          <text x="16" y="42" fill="#fff" fontSize="13" fontFamily="DM Sans, sans-serif" fontWeight="500">&lt; 1.5s total</text>
          <text x="200" y="42" fill="#969696" fontSize="11" fontFamily="DM Sans, sans-serif">STT 400 · LLM 300 · TTS 600 ms</text>
        </g>
      </svg>
    </div>
  );
}
