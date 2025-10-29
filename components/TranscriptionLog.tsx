
import React, { useRef, useEffect } from 'react';
import { Transcription, Direction } from '../types';

interface TranscriptionLogProps {
  log: Transcription[];
  direction: Direction;
}

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
);

const ModelIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.5 10c-3.37 0-6.14 2.65-6.45 6H11v- dokumen2h2V12c0-2.21 1.79-4 4-4s4 1.79 4 4v2h-1.5v-2c0-1.38-1.12-2.5-2.5-2.5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    </svg>
);


export const TranscriptionLog: React.FC<TranscriptionLogProps> = ({ log, direction }) => {
  const endOfLogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endOfLogRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const userLang = direction === 'id_to_jp' ? 'ID' : 'JP';
  const modelLang = direction === 'id_to_jp' ? 'JP' : 'ID';

  if (log.length === 0) {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          <h2 className="text-xl font-semibold">Selamat Datang!</h2>
          <p>Transkripsi percakapan Anda akan muncul di sini.</p>
        </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
      {log.map((entry, index) => (
        <div key={index} className={`flex items-start gap-4 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
          {entry.speaker === 'model' && <ModelIcon />}
          <div className={`max-w-xs md:max-w-md lg:max-w-lg px-5 py-3 rounded-2xl ${entry.speaker === 'user' ? 'bg-indigo-600 rounded-br-none' : 'bg-gray-800 rounded-bl-none'} ${entry.isPartial ? 'opacity-70' : ''}`}>
            <p className="text-white leading-relaxed">
              {entry.speaker === 'user' && <span className="text-xs font-bold text-indigo-300 block mb-1">Anda ({userLang})</span>}
              {entry.speaker === 'model' && <span className="text-xs font-bold text-teal-300 block mb-1">Terjemahan ({modelLang})</span>}
              {entry.text}
            </p>
          </div>
          {entry.speaker === 'user' && <UserIcon />}
        </div>
      ))}
      <div ref={endOfLogRef} />
    </div>
  );
};
