import React from 'react';

interface ControlPanelProps {
  isRecording: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
  permissionError: string | null;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRecording,
  onMouseDown,
  onMouseUp,
  permissionError,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-900 border-t border-gray-800">
      {permissionError && (
        <div className="mb-4 text-red-500 text-sm bg-red-900/20 px-4 py-2 rounded border border-red-500/50">
          ERROR: {permissionError}
        </div>
      )}

      <div className="relative group">
        {/* Glow Effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-200 ${isRecording ? 'opacity-100 duration-500 animate-pulse' : ''}`}></div>
        
        <button
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onTouchStart={(e) => { e.preventDefault(); onMouseDown(); }}
          onTouchEnd={(e) => { e.preventDefault(); onMouseUp(); }}
          className={`
            relative w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl transition-all duration-100
            ${isRecording 
              ? 'bg-emerald-900 border-emerald-500 scale-95 shadow-emerald-900/50' 
              : 'bg-gray-800 border-gray-600 hover:border-gray-500 hover:bg-gray-700'
            }
          `}
        >
          <div className="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mb-1 ${isRecording ? 'text-emerald-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className={`text-xs font-bold tracking-wider ${isRecording ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isRecording ? 'ON AIR' : 'PUSH'}
            </span>
          </div>
        </button>
      </div>

      <p className="mt-4 text-gray-500 text-xs font-mono uppercase tracking-widest">
        {isRecording ? 'Transmitting...' : 'Hold to Speak'}
      </p>
    </div>
  );
};