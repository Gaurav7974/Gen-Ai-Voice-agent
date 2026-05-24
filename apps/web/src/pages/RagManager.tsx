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
          <header className="rag-header">
            <h1>RAG Data Sources</h1>
            <p>Manage documents used by the voice agent.</p>
          </header>
        )}

        {status && (
          <div className={`rag-status status-${status.type}`}>
            {status.text}
          </div>
        )}

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
            {loading ? <p>Processing...</p> : <p>Drag & drop a .txt or .md file here, or click to browse</p>}
          </div>
        </section>

        <section className="rag-section">
          <div className="rag-section-header">
            <h2>Data Files</h2>
            <button className="rag-btn primary" onClick={handleIngest} disabled={loading}>
              {loading ? 'Ingesting...' : 'Ingest to Vector DB'}
            </button>
          </div>
          
          <div className="rag-file-list">
            {files.length === 0 ? (
              <p className="empty-msg">No files found.</p>
            ) : (
              files.map(f => (
                <div className="rag-file-item" key={f.name}>
                  <div className="file-info">
                    <span className="file-name">{f.name}</span>
                    <span className="file-size">{formatSize(f.size)}</span>
                  </div>
                  <button className="rag-btn danger" onClick={() => handleDelete(f.name)} disabled={loading}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rag-section rag-query-section">
          <h2>Test Query</h2>
          <form onSubmit={handleQuery} className="rag-query-form">
            <input 
              type="text" 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              placeholder="Ask a question..."
              className="rag-input"
            />
            <button type="submit" className="rag-btn" disabled={loading || !query.trim()}>Search</button>
          </form>

          {queryResults.length > 0 && (
            <div className="rag-results">
              {queryResults.map((r, i) => (
                <div key={i} className="rag-result-card">
                  <div className="rag-result-meta">
                    <span className="badge">{r.source} (Chunk {r.chunk_index})</span>
                    <span className="badge distance">Dist: {r.distance.toFixed(3)}</span>
                  </div>
                  <p className="rag-result-text">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
