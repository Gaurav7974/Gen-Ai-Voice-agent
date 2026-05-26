import React, { useEffect, useState, useRef } from 'react';
import { listRagFiles, uploadRagFile, deleteRagFile, ingestRag, queryRag } from '../api';

export default function RagManager({ onNavigate, showNavbar = true }: { onNavigate: (view: 'landing' | 'rag') => void; showNavbar?: boolean }) {
  const [files, setFiles] = useState<{ name: string; size: number }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<Array<{ source: string; chunk_index: number; distance: number; text: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const data = await listRagFiles();
      setFiles(data.files || []);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (file: File) => {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await uploadRagFile(file);
      setStatus({ type: 'success', text: res.message });
      fetchFiles();
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (filename: string) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await deleteRagFile(filename);
      setStatus({ type: 'success', text: res.message });
      fetchFiles();
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleIngest = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await ingestRag();
      setStatus({ type: 'success', text: `${res.message} (${res.chunks} chunks)` });
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const res = await queryRag(query);
      setQueryResults(res.results || []);
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="rag-shell">
      {showNavbar && (
        <nav id="navbar" className="navbar">
          <div className="nav-logo">
            Ly<span>ra</span> RAG
          </div>
          <ul className="nav-links">
            <li>
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}>&larr; Back to Home</a>
            </li>
          </ul>
        </nav>
      )}

      <main className="rag-main">
        {showNavbar && (
          <header className="rag-header" style={{ marginBottom: '24px' }}>
            <h1 style={{ fontFamily: 'var(--f-display)', fontWeight: 800, fontSize: '28px' }}>Knowledge Base (RAG)</h1>
            <p style={{ color: 'var(--muted)', fontSize: '14.5px' }}>Manage and index documents used by Lyra to retrieve context and formulate grounded responses.</p>
          </header>
        )}

        {status && (
          <div className={`rag-status status-${status.type}`}>
            {status.text}
          </div>
        )}

        <div className="rag-grid">
          
          {/* Left Column: Upload & Test */}
          <div className="flex-col gap-md">
            
            {/* Upload Documents Card */}
            <section className="rag-section">
              <h2>Upload Documents</h2>
              <div 
                className={`rag-upload-zone ${dragOver ? 'drag-over' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".txt,.md,.markdown" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUpload(e.target.files[0]);
                    }
                  }}
                />
                {loading ? (
                  <div className="flex items-center justify-center gap-sm">
                    <span className="glow-dot glow-dot--small" />
                    <span>Processing file...</span>
                  </div>
                ) : (
                  <div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 10px', color: 'var(--muted)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <p>Drag & drop a <strong>.txt</strong> or <strong>.md</strong> file containing curriculum, medical guidelines, or FAQs, or click to browse</p>
                  </div>
                )}
              </div>
            </section>

            {/* Test Query Card */}
            <section className="rag-section">
              <h2>Test Grounded Query</h2>
              <form onSubmit={handleQuery} className="rag-query-form">
                <input 
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)} 
                  placeholder="Ask a question about your files..."
                  className="rag-input"
                />
                <button type="submit" className="rag-btn primary" disabled={loading || !query.trim()}>Search</button>
              </form>

              {queryResults.length > 0 && (
                <div className="rag-results">
                  {queryResults.map((r, i) => (
                    <div key={i} className="card rag-result-card" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                      <div className="rag-result-meta">
                        <span className="badge">{r.source} (Chunk {r.chunk_index})</span>
                        <span className="badge distance">Distance: {r.distance.toFixed(3)}</span>
                      </div>
                      <p className="rag-result-text" style={{ fontSize: '13.5px', color: 'var(--text)', lineHeight: 1.6 }}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>

          {/* Right Column: Ingest & Files List */}
          <div>
            
            <section className="rag-section" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="rag-section-header">
                <h2>Knowledge Base Files</h2>
              </div>
              
              <button 
                type="button" 
                className="rag-btn primary" 
                onClick={handleIngest} 
                disabled={loading || files.length === 0}
                style={{ width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <span className="glow-dot glow-dot--small" />
                {loading ? 'Re-Indexing KB...' : 'Index Knowledge Base'}
              </button>

              <div className="rag-file-list" style={{ overflowY: 'auto', maxHeight: '420px' }}>
                {files.length === 0 ? (
                  <p className="empty-msg" style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--muted)', fontSize: '14px' }}>No documents uploaded yet.</p>
                ) : (
                  files.map(f => (
                    <div className="rag-file-item" key={f.name}>
                      <div className="file-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="file-name" style={{ wordBreak: 'break-all' }}>{f.name}</span>
                        <span className="file-size">{formatSize(f.size)}</span>
                      </div>
                      <button type="button" className="rag-btn danger sm" onClick={() => handleDelete(f.name)} disabled={loading} style={{ padding: '4px 10px', fontSize: '11.5px' }}>
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
