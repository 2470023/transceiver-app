// webtransceiver-pro (2)/Transceiver.tsx (元 App.tsx)

import React, { useState } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { TranscriptList } from './components/TranscriptList';
import { ExportTools } from './components/ExportTools';
import { useTransceiver } from './hooks/useTransceiver';
import { UserSettings } from './types';
import { checkContentSafety } from './services/geminiService';

// 親(App.tsx)から設定を受け取るための定義
interface TransceiverProps {
    initialSettings: UserSettings;
    onExit: () => void;
}

// 名前を Transceiver にして、propsを受け取る形に変更
export function Transceiver({ initialSettings, onExit }: TransceiverProps) {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  
  // 不要なステートと関数を削除 (isConnected, handleJoinなど)

  const {
    isRecording,
    transcripts,
    permissionError,
    startTransmission,
    stopTransmission,
    clearTranscripts
  } = useTransceiver(
    settings.userName, 
    settings.channelSlot,
    settings.channelName,
    settings.passkey, 
    settings.role
  );

  const handleLogout = () => {
    clearTranscripts();
    onExit(); 
  };

  const handleRenameChannel = async (newName: string) => {
    if (!newName.trim()) return;
    const isSafe = await checkContentSafety(newName);
    if (isSafe) {
      setSettings(prev => ({ ...prev, channelName: newName }));
    } else {
      alert("不適切な名前です。");
    }
  };

  // LandingPage の判定ロジックは削除

  return (
    <div className="h-screen w-full flex flex-col bg-[#111827] text-gray-100 overflow-hidden">
      <Header 
        channelName={settings.channelName} 
        userName={settings.userName} 
        role={settings.role}
        onLogout={handleLogout}
        onRename={settings.role === 'HOST' ? handleRenameChannel : undefined}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
        
        <TranscriptList transcripts={transcripts} />
        
        <ExportTools 
          transcripts={transcripts} 
          onClear={clearTranscripts} 
        />
        
        <ControlPanel 
          isRecording={isRecording}
          onMouseDown={startTransmission}
          onMouseUp={stopTransmission}
          permissionError={permissionError}
        />
      </main>
    </div>
  );
}