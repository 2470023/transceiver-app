import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { checkContentSafety } from '../services/geminiService';
// Firebase関連
import { db, loginWithGoogle, logout, auth } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

interface LandingPageProps {
  onJoin: (settings: UserSettings) => void;
}

interface ChannelData {
  id: string;
  name: string;
  password?: string;
  createdBy?: string;
  createdAt?: any;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoin }) => {
  // ユーザー状態
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // データ・UI状態
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelData | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // フォーム状態
  const [formData, setFormData] = useState({
    userName: '',
    passkey: '',
    customChannelName: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // --- 1. ログイン状態の監視 ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. チャンネル一覧の取得（ログイン中のみ） ---
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, "channels_pro"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChannels = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChannelData[];
      setChannels(fetchedChannels);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Googleログイン処理
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error("Login failed", e);
      setError("ログインに失敗しました");
    }
  };

  // --- 3. チャンネル作成・参加処理 ---

  // モーダルを開くとき、Google名を「初期値」として入れるが、編集は自由にさせる
  const openCreateModal = () => {
    setFormData({
      userName: currentUser?.displayName || '',
      passkey: '',
      customChannelName: ''
    });
    setError(null);
    setIsCreateModalOpen(true);
  };

  const handleChannelClick = (channel: ChannelData) => {
    setSelectedChannel(channel);
    setFormData({
      userName: currentUser?.displayName || '',
      passkey: '',
      customChannelName: channel.name
    });
    setError(null);
    setIsJoinModalOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // 作成処理
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    // 入力チェック：名前も必須にする
    if (!formData.userName.trim() || !formData.customChannelName.trim()) {
      setError("名前とチャンネル名を入力してください。");
      return;
    }
    if (!formData.passkey) {
      setError("パスワードを設定してください。");
      return;
    }

    setIsValidating(true);
    setStatusMessage('安全性を確認中...');

    try {
      // 安全性チェック（名前もチェックする）
      const isNameSafe = await checkContentSafety(formData.userName);
      const isChannelSafe = await checkContentSafety(formData.customChannelName);

      if (!isNameSafe || !isChannelSafe) {
        throw "不適切な表現が含まれています。";
      }

      setStatusMessage('チャンネルを作成中...');

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("通信タイムアウト")), 5000)
      );

      // ★ここ修正：createdByには「入力された名前」を使う
      const docRef = await Promise.race([
        addDoc(collection(db, "channels_pro"), {
          name: formData.customChannelName,
          password: formData.passkey,
          createdBy: formData.userName, // 入力された自由な名前
          ownerId: currentUser?.uid,    // 所有者IDはGoogle IDで固定（管理用）
          createdAt: serverTimestamp()
        }),
        timeout
      ]) as any;

      setIsCreateModalOpen(false);

      // ★ここ修正：入力された名前で入室する
      onJoin({
        userName: formData.userName,
        channelSlot: 1,
        channelName: docRef.id,
        passkey: formData.passkey,
        role: 'HOST'
      });

    } catch (err: any) {
      setError(err.message || "エラーが発生しました");
    } finally {
      setIsValidating(false);
    }
  };

  // 参加処理
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannel) return;

    if (!formData.userName.trim()) {
      setError("名前を入力してください。");
      return;
    }
    if (!formData.passkey) {
      setError("パスワードを入力してください。");
      return;
    }

    setIsValidating(true);
    setStatusMessage('認証中...');

    try {
      const isNameSafe = await checkContentSafety(formData.userName);
      if (!isNameSafe) throw "不適切な名前です。";

      if (selectedChannel.password !== formData.passkey) {
        throw "パスワードが間違っています。";
      }

      // ★ここ修正：入力された名前で入室する
      onJoin({
        userName: formData.userName,
        channelSlot: 1,
        channelName: selectedChannel.id,
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
    setSelectedChannel(null);
  };

  // --- 描画ロジック ---

  if (isLoadingAuth) {
    return <div className="min-h-screen bg-[#111827] flex items-center justify-center text-emerald-500">Loading...</div>;
  }

  // 未ログイン時の画面（ここだけはGoogleログイン必須）
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#111827] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

        <div className="relative z-10 text-center max-w-md w-full">
          <div className="mb-8">
            <h1 className="text-5xl font-bold tracking-tighter mb-2">
              WEB<span className="text-emerald-500">TRX</span>
            </h1>
            <p className="text-gray-400">Secure Real-time Communication</p>
          </div>

          <div className="bg-gray-900/80 border border-emerald-500/30 p-8 rounded-2xl shadow-2xl backdrop-blur-sm">
            <p className="text-sm text-gray-300 mb-6">利用を開始するにはGoogleアカウントでログインしてください。</p>

            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Googleでログイン
            </button>
            {error && <p className="text-red-400 text-xs mt-4">{error}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ログイン済み画面
  return (
    <div className="min-h-screen bg-[#111827] text-white p-4 font-mono relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

      {/* ヘッダー（ログアウトなど） */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-3 bg-gray-900/80 border border-emerald-500/30 rounded-full pl-4 p-1 pr-1">
        <span className="text-xs text-emerald-400 font-bold">{currentUser.displayName}</span>
        {currentUser.photoURL ? (
          <img src={currentUser.photoURL} alt="" className="w-8 h-8 rounded-full border border-emerald-500" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
            {currentUser.displayName?.charAt(0)}
          </div>
        )}
        <button
          onClick={() => logout()}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <div className="max-w-2xl mx-auto relative z-10">
        <header className="text-center mb-10 mt-16">
          <h1 className="text-4xl font-bold tracking-tighter mb-2">
            WEB<span className="text-emerald-500">TRX</span> CHANNELS
          </h1>
          <p className="text-gray-500 text-sm">Select a channel or create a new one</p>
        </header>

        <div className="grid gap-4">
          <button
            onClick={openCreateModal}
            className="w-full p-6 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-500 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <span className="text-2xl font-bold group-hover:scale-110 transition-transform">+</span>
            <span className="font-bold tracking-wider">CREATE NEW CHANNEL</span>
          </button>

          {channels.length === 0 && (
            <div className="text-center text-gray-600 py-10">
              チャンネルが見つかりません。<br />新しいチャンネルを作成してください。
            </div>
          )}

          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className="relative w-full p-6 rounded-lg border text-left transition-all duration-300 group bg-gray-800/80 border-emerald-500/30 hover:bg-gray-800 hover:border-emerald-400"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">ACTIVE</span>
                    <span className="text-[10px] text-gray-500 font-mono">ID: {channel.id.slice(0, 8)}...</span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {channel.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">OWNER: {channel.createdBy}</p>
                </div>
                <div className="opacity-50 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* モーダル部分 (共通) */}
      {(isCreateModalOpen || (isJoinModalOpen && selectedChannel)) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-gray-900 border rounded-xl w-full max-w-md p-6 shadow-2xl ${isCreateModalOpen ? 'border-emerald-500/30' : 'border-cyan-500/30'}`}>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className={isCreateModalOpen ? "text-emerald-500" : "text-cyan-500"}>
                {isCreateModalOpen ? "◆" : "●"}
              </span>
              {isCreateModalOpen ? "CREATE CHANNEL" : "JOIN CHANNEL"}
            </h2>

            {isJoinModalOpen && selectedChannel && (
              <p className="text-sm text-gray-400 mb-4 font-mono">{selectedChannel.name}</p>
            )}

            <form onSubmit={isCreateModalOpen ? handleCreateSubmit : handleJoinSubmit} className="space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900">{error}</div>}

              {/* チャンネル作成時のみ表示 */}
              {isCreateModalOpen && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">CHANNEL NAME</label>
                  <input
                    type="text"
                    value={formData.customChannelName}
                    onChange={e => handleInputChange('customChannelName', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-emerald-500 focus:outline-none"
                    placeholder="例: 作戦会議室"
                  />
                </div>
              )}

              {/* ★ここがポイント：編集可能なユーザー名入力欄 */}
              <div>
                <label className="text-xs text-gray-400 block mb-1">YOUR NAME</label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={e => handleInputChange('userName', e.target.value)}
                  className={`w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:outline-none ${isCreateModalOpen ? 'focus:border-emerald-500' : 'focus:border-cyan-500'}`}
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">PASSWORD</label>
                <input
                  type="text"
                  value={formData.passkey}
                  onChange={e => handleInputChange('passkey', e.target.value)}
                  className={`w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:outline-none tracking-widest ${isCreateModalOpen ? 'focus:border-emerald-500' : 'focus:border-cyan-500'}`}
                  placeholder={isCreateModalOpen ? "パスワードを設定" : "パスワードを入力"}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">CANCEL</button>
                <button
                  type="submit"
                  disabled={isValidating}
                  className={`flex-1 py-2 rounded text-sm text-white font-bold disabled:opacity-50 ${isCreateModalOpen ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500'}`}
                >
                  {isValidating ? statusMessage : (isCreateModalOpen ? 'CREATE' : 'JOIN')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};