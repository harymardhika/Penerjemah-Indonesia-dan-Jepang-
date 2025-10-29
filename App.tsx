
import React, { useState } from 'react';
import { useGeminiLive } from './hooks/useGeminiLive';
import { ControlPanel } from './components/ControlPanel';
import { TranscriptionLog } from './components/TranscriptionLog';
import { StatusIndicator } from './components/StatusIndicator';
import { Status, Direction } from './types';

function App() {
  const { status, transcriptionLog, error, startSession, stopSession } = useGeminiLive();
  const [direction, setDirection] = useState<Direction>('id_to_jp');

  const handleSwapDirection = () => {
    setDirection(prev => prev === 'id_to_jp' ? 'jp_to_id' : 'id_to_jp');
  };

  const isSessionActive = status === Status.CONNECTING || status === Status.LISTENING;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 font-sans">
      <header className="p-4 border-b border-gray-700 text-center bg-gray-900/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white">Penerjemah Suara Langsung</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <p className="text-sm text-gray-400 w-20 text-right">
              {direction === 'id_to_jp' ? 'Indonesia' : 'Jepang'}
          </p>
          <button 
              onClick={handleSwapDirection} 
              disabled={isSessionActive}
              className="p-1 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Tukar arah terjemahan"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7 2a1 1 0 00-1 1v1.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L8 4.586V3a1 1 0 00-1-1zM13 18a1 1 0 001-1v-1.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L12 15.414V17a1 1 0 001 1z" />
              </svg>
          </button>
          <p className="text-sm text-gray-400 w-20 text-left">
              {direction === 'id_to_jp' ? 'Jepang' : 'Indonesia'}
          </p>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <StatusIndicator status={status} error={error} />
        <div className="border-t border-b border-gray-800 flex-1 overflow-hidden">
          <TranscriptionLog log={transcriptionLog} direction={direction} />
        </div>
      </main>

      <footer className="sticky bottom-0">
        <ControlPanel
          status={status}
          onStart={() => startSession(direction)}
          onStop={stopSession}
        />
      </footer>
    </div>
  );
}

export default App;
