import React, { useEffect, useRef } from 'react';
import { Transcript } from '../types';

interface TranscriptListProps {
  transcripts: Transcript[];
}

export const TranscriptList: React.FC<TranscriptListProps> = ({ transcripts }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  if (transcripts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-600 p-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <p className="text-sm font-mono">CHANNEL OPEN. WAITING FOR TRANSMISSION.</p>
        <p className="text-xs mt-2 text-gray-700">Open this URL in another tab to test multi-user comms.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
      {transcripts.map((t) => (
        <div 
          key={t.id} 
          className={`flex flex-col ${t.isLocal ? 'items-end' : 'items-start'}`}
        >
          <div className={`max-w-[85%] ${t.isLocal ? 'bg-emerald-900/30 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700'} border rounded-lg p-3 shadow-sm`}>
            <div className="flex justify-between items-baseline mb-1 gap-4 border-b border-white/5 pb-1">
              <span className={`font-mono text-xs font-bold ${t.isLocal ? 'text-emerald-400' : 'text-blue-400'}`}>
                {t.userName}
              </span>
              <span className="font-mono text-[10px] text-gray-500">
                {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
              {t.text}
            </p>
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};