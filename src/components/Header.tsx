import React, { useState } from 'react';
import { UserRole } from '../types';

interface HeaderProps {
  channelName: string;
  userName: string;
  role: UserRole;
  onLogout: () => void;
  onRename?: (newName: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ channelName, userName, role, onLogout, onRename }) => {
  const isHost = role === 'HOST';
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(channelName);

  const submitRename = () => {
    if (onRename && editName !== channelName) {
      onRename(editName);
    }
    setIsEditing(false);
  };

  return (
    <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center shadow-md z-10">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isHost ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]'}`}></div>
          <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full animate-ping opacity-75 ${isHost ? 'bg-emerald-400' : 'bg-cyan-400'}`}></div>
        </div>
        <div>
          <div className="flex items-center gap-2">
             {isEditing ? (
               <input 
                 autoFocus
                 className="bg-gray-800 text-white text-lg font-bold px-2 py-0 rounded border border-emerald-500 focus:outline-none w-48"
                 value={editName}
                 onChange={(e) => setEditName(e.target.value)}
                 onBlur={submitRename}
                 onKeyDown={(e) => e.key === 'Enter' && submitRename()}
               />
             ) : (
                <h1 
                  className={`text-lg font-bold tracking-tight text-white leading-none ${isHost ? 'cursor-pointer hover:text-emerald-400 hover:underline decoration-dashed decoration-1 underline-offset-4' : ''}`}
                  onClick={() => { if(isHost) { setEditName(channelName); setIsEditing(true); } }}
                  title={isHost ? "Click to rename channel" : ""}
                >
                  {channelName}
                </h1>
             )}
          </div>
          
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] font-mono font-bold tracking-wider px-1 rounded border ${isHost ? 'text-emerald-400 bg-emerald-900/20 border-emerald-900/30' : 'text-cyan-400 bg-cyan-900/20 border-cyan-900/30'}`}>
              {role}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <div className="flex items-center justify-end gap-1">
            <p className="text-[10px] text-gray-400 tracking-wider">OPERATOR</p>
          </div>
          <p className="text-sm font-bold text-white font-mono bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
            {userName}
          </p>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-full transition-colors border border-transparent hover:border-red-900/30 group"
          aria-label="Disconnect"
          title="Disconnect"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:scale-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};