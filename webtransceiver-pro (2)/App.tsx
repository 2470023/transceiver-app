import React, { useState } from 'react';
import { Header } from './components/Header';
import { ControlPanel } from './components/ControlPanel';
import { TranscriptList } from './components/TranscriptList';
import { ExportTools } from './components/ExportTools';
import { LandingPage } from './components/LandingPage';
import { useTransceiver } from './hooks/useTransceiver';
import { UserSettings } from './types';
import { checkContentSafety } from './services/geminiService';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    userName: '',
    channelSlot: 0,
    channelName: '',
    passkey: '',
    role: 'HOST', 
  });

  const {
    isRecording,
    transcripts,
    permissionError,
    startTransmission,
    stopTransmission,
    clearTranscripts
  } = useTransceiver(
    settings.userName, 
    isConnected ? settings.channelSlot : null, 
    settings.channelName,
    settings.passkey, 
    settings.role
  );

  const handleJoin = (newSettings: UserSettings) => {
    setSettings(newSettings);
    setIsConnected(true);
  };

  const handleLogout = () => {
    setIsConnected(false);
    setSettings({ userName: '', channelSlot: 0, channelName: '', passkey: '', role: 'HOST' });
    clearTranscripts();
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

  if (!isConnected) {
    return <LandingPage onJoin={handleJoin} />;
  }

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
        {/* Background Pattern */}
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