import React, { useState, useEffect } from 'react';
import { UserSettings, ChannelStatus } from '../types';
import { checkContentSafety } from '../services/geminiService';

interface LandingPageProps {
  onJoin: (settings: UserSettings) => void;
}

const CHANNEL_PREFIX = 'web-transceiver-v3-slot-';

export const LandingPage: React.FC<LandingPageProps> = ({ onJoin }) => {
  const [channels, setChannels] = useState<ChannelStatus[]>(
    Array.from({ length: 5 }, (_, i) => ({
      slotId: i + 1,
      isActive: false,
      name: `トランシーバー ${String(i + 1).padStart(2, '0')}`,
    }))
  );
  
  // Modals state
  const [selectedSlot, setSelectedSlot] = useState<ChannelStatus | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    userName: '',
    passkey: '',
    customChannelName: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Scanning Logic
  useEffect(() => {
    const scanChannels = () => {
      // Create pingers for all 5 slots
      channels.forEach(ch => {
        const channelName = `${CHANNEL_PREFIX}${ch.slotId}`;
        const bc = new BroadcastChannel(channelName);
        
        bc.onmessage = (event) => {
          if (event.data.type === 'DISCOVERY_PONG') {
            const { slotId, name, hostName } = event.data.payload;
            setChannels(prev => prev.map(c => 
              c.slotId === slotId 
                ? { ...c, isActive: true, name, hostName } 
                : c
            ));
          }
        };

        // Send PING
        bc.postMessage({ type: 'DISCOVERY_PING' });
        
        // Cleanup short-lived scanner
        setTimeout(() => bc.close(), 1000);
      });
    };

    scanChannels();
    const interval = setInterval(scanChannels, 3000); // Scan every 3s
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotClick = (channel: ChannelStatus) => {
    setSelectedSlot(channel);
    setFormData({ 
        userName: '', 
        passkey: '', 
        customChannelName: channel.name 
    });
    setError(null);
    
    if (channel.isActive) {
      setIsJoinModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'passkey') {
      value = value.replace(/\D/g, '').slice(0, 6);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateGuestJoin = async (slotId: number) => {
    const channelName = `${CHANNEL_PREFIX}${slotId}`;
    const channel = new BroadcastChannel(channelName);
    const requestId = crypto.randomUUID();
    let timeoutId: any;
    let resolved = false;

    return new Promise<void>((resolve, reject) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'JOIN_RESPONSE' && event.data.requestId === requestId) {
          resolved = true;
          clearTimeout(timeoutId);
          channel.removeEventListener('message', messageHandler);
          channel.close();
          if (event.data.status === 'OK') resolve();
          else reject('パスキーが違います。');
        }
      };

      channel.addEventListener('message', messageHandler);
      channel.postMessage({
        type: 'JOIN_REQUEST',
        requestId: requestId,
        payload: { passkey: formData.passkey }
      });

      timeoutId = setTimeout(() => {
        if (!resolved) {
          channel.removeEventListener('message', messageHandler);
          channel.close();
          reject('ホストからの応答がありません。');
        }
      }, 2000);
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (!formData.userName.trim() || !formData.customChannelName.trim()) {
      setError("名前とチャンネル名を入力してください。");
      return;
    }
    if (formData.passkey.length !== 6) {
      setError("パスキーは6桁の数字で設定してください。");
      return;
    }

    setIsValidating(true);
    setStatusMessage('安全性を確認中...');

    try {
      const isNameSafe = await checkContentSafety(formData.userName);
      const isChannelSafe = await checkContentSafety(formData.customChannelName);

      if (!isNameSafe || !isChannelSafe) {
        throw "不適切な表現が含まれています。";
      }

      onJoin({
        userName: formData.userName,
        channelSlot: selectedSlot.slotId,
        channelName: formData.customChannelName,
        passkey: formData.passkey,
        role: 'HOST'
      });
    } catch (err: any) {
      setError(typeof err === 'string' ? err : "エラーが発生しました");
    } finally {
      setIsValidating(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;

    if (!formData.userName.trim()) {
        setError("名前を入力してください。");
        return;
    }
    if (formData.passkey.length !== 6) {
        setError("パスキーを入力してください。");
        return;
    }

    setIsValidating(true);
    setStatusMessage('認証中...');

    try {
        const isNameSafe = await checkContentSafety(formData.userName);
        if (!isNameSafe) throw "不適切な名前です。";

        await validateGuestJoin(selectedSlot.slotId);

        onJoin({
            userName: formData.userName,
            channelSlot: selectedSlot.slotId,
            channelName: selectedSlot.name, // Use existing name
            passkey: formData.passkey,
            role: 'GUEST'
        });
    } catch (err: any) {
        setError(typeof err === 'string' ? err : "認証エラー");
    } finally {
        setIsValidating(false);
    }
  };

  const closeModal = () => {
    setIsJoinModalOpen(false);
    setIsCreateModalOpen(false);
    setSelectedSlot(null);
  };

  return (
    <div className="min-h-screen bg-[#111827] text-white p-4 font-mono relative overflow-hidden">
        {/* Background */}
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

        <div className="max-w-2xl mx-auto relative z-10">
            <header className="text-center mb-10 mt-8">
                <h1 className="text-4xl font-bold tracking-tighter mb-2">
                    WEB<span className="text-emerald-500">TRX</span> CHANNEL LIST
                </h1>
                <p className="text-gray-500 text-sm">Select a frequency slot to begin</p>
            </header>

            <div className="grid gap-4">
                {channels.map((channel) => (
                    <button
                        key={channel.slotId}
                        onClick={() => handleSlotClick(channel)}
                        className={`
                            relative w-full p-6 rounded-lg border text-left transition-all duration-300 group
                            ${channel.isActive 
                                ? 'bg-gray-800/80 border-emerald-500/50 hover:bg-gray-800 hover:border-emerald-400' 
                                : 'bg-gray-900/50 border-gray-700 hover:bg-gray-800 hover:border-gray-500'
                            }
                        `}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-xs text-gray-500 font-bold">SLOT {channel.slotId}</span>
                                    {channel.isActive && (
                                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20 animate-pulse">
                                            LIVE
                                        </span>
                                    )}
                                </div>
                                <h3 className={`text-lg font-bold ${channel.isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                    {channel.name}
                                </h3>
                                {channel.isActive && (
                                    <p className="text-xs text-gray-500 mt-1">HOST: {channel.hostName}</p>
                                )}
                            </div>
                            <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                                {channel.isActive ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Create Modal */}
        {isCreateModalOpen && selectedSlot && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-emerald-500/30 rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <span className="text-emerald-500">◆</span> CREATE CHANNEL
                    </h2>
                    <form onSubmit={handleCreateSubmit} className="space-y-4">
                        {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900">{error}</div>}
                        
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">CHANNEL NAME</label>
                            <input 
                                type="text" 
                                value={formData.customChannelName}
                                onChange={e => handleInputChange('customChannelName', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-emerald-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">OPERATOR NAME</label>
                            <input 
                                type="text" 
                                value={formData.userName}
                                onChange={e => handleInputChange('userName', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-emerald-500 focus:outline-none"
                                placeholder="Enter your name"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">SET PASSKEY (6 Digits)</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                maxLength={6}
                                value={formData.passkey}
                                onChange={e => handleInputChange('passkey', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-center tracking-[0.5em] focus:border-emerald-500 focus:outline-none"
                                placeholder="000000"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={closeModal} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">CANCEL</button>
                            <button 
                                type="submit" 
                                disabled={isValidating}
                                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm text-white font-bold disabled:opacity-50"
                            >
                                {isValidating ? statusMessage : 'INITIALIZE'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* Join Modal */}
        {isJoinModalOpen && selectedSlot && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-cyan-500/30 rounded-xl w-full max-w-md p-6 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <span className="text-cyan-500">●</span> JOIN CHANNEL
                    </h2>
                    <p className="text-sm text-gray-400 mb-4 font-mono">{selectedSlot.name}</p>
                    
                    <form onSubmit={handleJoinSubmit} className="space-y-4">
                        {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900">{error}</div>}
                        
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">CALLSIGN</label>
                            <input 
                                type="text" 
                                value={formData.userName}
                                onChange={e => handleInputChange('userName', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-cyan-500 focus:outline-none"
                                placeholder="Enter your name"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 block mb-1">ENTER PASSKEY</label>
                            <input 
                                type="text" 
                                inputMode="numeric"
                                maxLength={6}
                                value={formData.passkey}
                                onChange={e => handleInputChange('passkey', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white text-center tracking-[0.5em] focus:border-cyan-500 focus:outline-none"
                                placeholder="000000"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={closeModal} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">CANCEL</button>
                            <button 
                                type="submit" 
                                disabled={isValidating}
                                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm text-white font-bold disabled:opacity-50"
                            >
                                {isValidating ? statusMessage : 'CONNECT'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};