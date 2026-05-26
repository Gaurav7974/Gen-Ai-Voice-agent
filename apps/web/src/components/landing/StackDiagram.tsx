/** Architecture stack — connected nodes via SVG paths, no icon fonts */
const ROWS: { label: string; name: string; highlight?: boolean }[][] = [
  [
    { label: 'Client', name: 'React / TypeScript' },
    { label: 'Speech', name: 'Sarvam Saaras', highlight: true },
    { label: 'API', name: 'FastAPI' },
  ],
  [
    { label: 'Vectors', name: 'ChromaDB' },
    { label: 'Retrieval', name: 'BM25 + Semantic' },
    { label: 'Inference', name: 'Groq' },
  ],
  [
    { label: 'Voice', name: 'Sarvam Bulbul', highlight: true },
    { label: 'Delivery', name: 'Streamed audio' },
  ],
];

export default function StackDiagram() {
  return (
    <div className="stack-diagram">
      <svg className="stack-diagram-connectors" viewBox="0 0 900 280" preserveAspectRatio="none" aria-hidden="true">
        <path d="M150 70 H750" stroke="rgba(0,195,201,0.2)" strokeWidth="1" strokeDasharray="6 4" />
        <path d="M150 140 H750" stroke="rgba(0,195,201,0.15)" strokeWidth="1" strokeDasharray="6 4" />
        <path d="M300 210 H600" stroke="rgba(0,195,201,0.2)" strokeWidth="1" strokeDasharray="6 4" />
      </svg>
      <div className="stack-diagram-rows">
        {ROWS.map((row, ri) => (
          <div key={ri} className="stack-diagram-row">
            {row.map((node, ni) => (
              <div key={node.name} className="stack-node-wrap">
                <div className={`stack-node ${node.highlight ? 'stack-node--highlight' : ''}`}>
                  <span className="stack-node-label">{node.label}</span>
                  <span className="stack-node-name">{node.name}</span>
                </div>
                {ni < row.length - 1 && (
                  <svg className="stack-node-connector" viewBox="0 0 24 12" width="32" height="12" aria-hidden="true">
                    <path d="M0 6 H18 M14 2 L18 6 L14 10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="stack-diagram-tags">
        {['768-dim embeddings', 'Clerk auth', 'Hybrid search', 'Sub-1.5s SLA'].map((t) => (
          <span key={t} className="stack-tag">{t}</span>
        ))}
      </div>
    </div>
  );
}
