import React, { useState } from 'react';
import { Transcript } from '../types';
import { summarizeTranscripts } from '../services/geminiService';

interface ExportToolsProps {
  transcripts: Transcript[];
  onClear: () => void;
}

export const ExportTools: React.FC<ExportToolsProps> = ({ transcripts, onClear }) => {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleDownload = () => {
    const text = transcripts
      .map(t => `[${new Date(t.timestamp).toLocaleTimeString()}] ${t.userName}: ${t.text}`)
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transceiver-log-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSummarize = async () => {
    if (transcripts.length === 0) return;
    setIsSummarizing(true);
    setSummary(null);
    const result = await summarizeTranscripts(transcripts);
    setSummary(result);
    setIsSummarizing(false);
  };

  return (
    <div className="p-4 bg-gray-900 border-t border-gray-800">
      <div className="flex gap-2 justify-end">
        <button 
          onClick={onClear}
          className="px-3 py-1.5 text-xs font-mono text-red-400 border border-red-900 hover:bg-red-900/30 rounded transition-colors"
        >
          CLEAR LOG
        </button>
        <button 
          onClick={handleSummarize}
          disabled={isSummarizing || transcripts.length === 0}
          className="px-3 py-1.5 text-xs font-mono text-indigo-400 border border-indigo-900 hover:bg-indigo-900/30 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isSummarizing ? (
            <span className="animate-pulse">ANALYZING...</span>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              AI SUMMARY
            </>
          )}
        </button>
        <button 
          onClick={handleDownload}
          disabled={transcripts.length === 0}
          className="px-3 py-1.5 text-xs font-mono text-emerald-400 border border-emerald-900 hover:bg-emerald-900/30 rounded transition-colors disabled:opacity-50"
        >
          EXPORT TXT
        </button>
      </div>

      {summary && (
        <div className="mt-4 p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold text-indigo-400 font-mono uppercase">Mission Report (Gemini)</h3>
            <button onClick={() => setSummary(null)} className="text-gray-500 hover:text-white">&times;</button>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {summary}
          </p>
        </div>
      )}
    </div>
  );
};