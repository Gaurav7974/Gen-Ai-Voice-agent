import React, { useState } from 'react';
import Landing from './pages/Landing';
import RagManager from './pages/RagManager';
import './App.css';

function App() {
  const [view, setView] = useState<'landing' | 'rag'>('landing');

  return (
    <>
      {view === 'landing' && <Landing onNavigate={setView} />}
      {view === 'rag' && <RagManager onNavigate={setView} />}
    </>
  );
}

export default App;
