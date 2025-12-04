// webtransceiver-pro (2)/App.tsx

import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { loginWithGoogle, checkAuthStatus, logout } from './services/firebaseService';
import { UserSettings } from './types';
import { Transceiver } from './Transceiver';
import { LandingPage } from './components/LandingPage'; // ★追加: 部屋選択画面をインポート

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  // ★追加: チャンネル設定の状態（nullなら部屋選択前）
  const [transceiverSettings, setTransceiverSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    const unsubscribe = checkAuthStatus(setUser, setLoading, setErrorMsg);
    return () => unsubscribe();
  }, []);

  const handleExitTransceiver = async () => {
    // ログアウト処理
    setTransceiverSettings(null); 
    await logout();
  };
  
  // ★追加: LandingPageで部屋に入室したときの処理
  const handleJoinChannel = (settings: UserSettings) => {
    setTransceiverSettings(settings);
  };

  if (loading) return <div className="text-white text-center mt-10">読み込み中...</div>;

  // 1. 未ログイン: ログイン画面を表示
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col justify-center items-center bg-[#111827] text-gray-100 p-5">
        <div className="text-center p-8 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
          <h1 className="text-3xl font-bold mb-4 text-emerald-400">WebTransceiver Pro</h1>
          <p className="mb-8 text-gray-400">大阪成蹊大学専用セキュア回線</p>

          <button 
            onClick={loginWithGoogle}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full transition duration-300 shadow-lg flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
            Googleアカウントでログイン
          </button>

          {errorMsg && (
            <div className="mt-6 text-red-400 text-sm bg-red-900/30 p-3 rounded border border-red-900/50">
              {errorMsg}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. ログイン済み だが 部屋未選択: 部屋選択画面 (LandingPage) を表示
  if (!transceiverSettings) {
    return <LandingPage onJoin={handleJoinChannel} />;
  }

  // 3. 部屋選択済み: トランシーバー画面 (Transceiver) を表示
  return (
    <Transceiver 
      initialSettings={transceiverSettings} 
      onExit={handleExitTransceiver}
    />
  );
}