import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { checkContentSafety } from '../services/geminiService';
// Firebase関連のインポート
import { db } from '../firebase';
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

// チャンネルの型定義
interface ChannelData {
  id: string;
  name: string;
  password?: string;
  createdBy?: string;
  createdAt?: any;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onJoin }) => {
  const [channels, setChannels] = useState<ChannelData[]>([]);

  // Modals state
  const [selectedChannel, setSelectedChannel] = useState<ChannelData | null>(null);
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

  // --- 1. Firestoreからチャンネル一覧をリアルタイム取得 ---
  useEffect(() => {
    // 作成日時の新しい順に取得
    const q = query(collection(db, "channels_pro"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChannels = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChannelData[];

      setChannels(fetchedChannels);
    });

    return () => unsubscribe();
  }, []);

  // 新規作成ボタンが押されたとき
  const openCreateModal = () => {
    setFormData({ userName: '', passkey: '', customChannelName: '' });
    setError(null);
    setIsCreateModalOpen(true);
  };

  // 既存チャンネルがクリックされたとき（入室）
  const handleChannelClick = (channel: ChannelData) => {
    setSelectedChannel(channel);
    setFormData({
      userName: '',
      passkey: '',
      customChannelName: channel.name
    });
    setError(null);
    setIsJoinModalOpen(true);
  };

  const handleInputChange = (field: string, value: string) => {
    // パスキー入力欄だけ数字制限などをかけたい場合はここで制御
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // --- 2. チャンネル新規作成処理 (Firestoreへ保存) ---
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Checking Firestore instance:", db);
    if (!db) {
      console.error("Firestore (db) が初期化されていません！");
      return;
    }

    console.log("1. 作成処理開始"); // ログ追加

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
      console.log("2. 安全性チェック開始");
      const isNameSafe = await checkContentSafety(formData.userName);
      const isChannelSafe = await checkContentSafety(formData.customChannelName);

      if (!isNameSafe || !isChannelSafe) {
        throw "不適切な表現が含まれています。";
      }

      console.log("3. Firestoreへの書き込み開始");
      setStatusMessage('チャンネルを作成中...');

      // 5秒で強制終了させるタイマー
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("通信タイムアウト：サーバーからの応答がありません")), 5000)
      );

      try {
        // 書き込み処理とタイマーの早いもの勝ち
        const docRef = await Promise.race([
          addDoc(collection(db, "channels_pro"), {
            name: formData.customChannelName,
            password: formData.passkey,
            createdBy: formData.userName,
            createdAt: serverTimestamp()
          }),
          timeout
        ]) as any;

        console.log("4. 書き込み成功！ ID:", docRef.id);
        setIsCreateModalOpen(false);
        // ...以下、onJoinなどの既存処理
        onJoin({
          userName: formData.userName,
          channelSlot: 1,
          channelName: docRef.id,
          passkey: formData.passkey,
          role: 'HOST'
        });

      } catch (err: any) {
        console.error("★決定的なエラー:", err.message);
        setError(err.message);
      }

      // // ★ここで止まっている可能性が高いです
      // const docRef = await addDoc(collection(db, "channels_pro"), {
      //   name: formData.customChannelName,
      //   password: formData.passkey,
      //   createdBy: formData.userName,
      //   createdAt: serverTimestamp()
      // });

      // console.log("4. 書き込み成功！ ID:", docRef.id);

      // // 明示的にモーダルを閉じる処理を追加
      // setIsCreateModalOpen(false);



    } catch (err: any) {
      console.error("作成エラー発生:", err); // エラーの内容を表示
      setError(typeof err === 'string' ? err : "エラーが発生しました");
    } finally {
      setIsValidating(false);
    }
  };

  // const handleCreateSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   if (!formData.userName.trim() || !formData.customChannelName.trim()) {
  //     setError("名前とチャンネル名を入力してください。");
  //     return;
  //   }
  //   if (!formData.passkey) {
  //     setError("パスワードを設定してください。");
  //     return;
  //   }

  //   setIsValidating(true);
  //   setStatusMessage('安全性を確認中...');

  //   try {
  //     const isNameSafe = await checkContentSafety(formData.userName);
  //     const isChannelSafe = await checkContentSafety(formData.customChannelName);

  //     if (!isNameSafe || !isChannelSafe) {
  //       throw "不適切な表現が含まれています。";
  //     }

  //     setStatusMessage('チャンネルを作成中...');

  //     // Firestoreに保存
  //     const docRef = await addDoc(collection(db, "channels_pro"), {
  //       name: formData.customChannelName,
  //       password: formData.passkey,
  //       createdBy: formData.userName,
  //       createdAt: serverTimestamp()
  //     });

  //     // 作成完了後、即座に入室処理へ
  //     onJoin({
  //       userName: formData.userName,
  //       // channelSlotは廃止しましたが、型定義の互換性のためにダミー(1)またはハッシュ等を渡します
  //       channelSlot: 1,
  //       // 重要なのはここ：ドキュメントIDをチャンネル識別子として渡す
  //       channelName: docRef.id,
  //       passkey: formData.passkey,
  //       role: 'HOST'
  //     });

  //   } catch (err: any) {
  //     setError(typeof err === 'string' ? err : "エラーが発生しました");
  //   } finally {
  //     setIsValidating(false);
  //   }
  // };

  // --- 3. 入室処理 (パスワード照合) ---
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

      // パスワードチェック (Firestoreのデータと比較)
      if (selectedChannel.password !== formData.passkey) {
        throw "パスワードが間違っています。";
      }

      onJoin({
        userName: formData.userName,
        channelSlot: 1, // ダミー
        channelName: selectedChannel.id, // IDで入室
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

  return (
    <div className="min-h-screen bg-[#111827] text-white p-4 font-mono relative overflow-hidden">
      {/* Background */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

      <div className="max-w-2xl mx-auto relative z-10">
        <header className="text-center mb-10 mt-8">
          <h1 className="text-4xl font-bold tracking-tighter mb-2">
            WEB<span className="text-emerald-500">TRX</span> CHANNELS
          </h1>
          <p className="text-gray-500 text-sm">Select a channel or create a new one</p>
        </header>

        <div className="grid gap-4">
          {/* 新規作成ボタン */}
          <button
            onClick={openCreateModal}
            className="w-full p-6 rounded-lg border border-dashed border-emerald-500/50 bg-emerald-900/10 hover:bg-emerald-900/20 text-emerald-500 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            <span className="text-2xl font-bold group-hover:scale-110 transition-transform">+</span>
            <span className="font-bold tracking-wider">CREATE NEW CHANNEL</span>
          </button>

          {/* チャンネル一覧 */}
          {channels.length === 0 && (
            <div className="text-center text-gray-600 py-10">
              現在チャンネルはありません。<br />上のボタンから作成してください。
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
                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">
                      ACTIVE
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">ID: {channel.id.slice(0, 8)}...</span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {channel.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">OWNER: {channel.createdBy || 'Anonymous'}</p>
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

      {/* Create Modal */}
      {isCreateModalOpen && (
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
                  placeholder="例: 作戦会議室"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">YOUR NAME</label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={e => handleInputChange('userName', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-emerald-500 focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">PASSWORD</label>
                <input
                  type="text"
                  value={formData.passkey}
                  onChange={e => handleInputChange('passkey', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-emerald-500 focus:outline-none tracking-widest"
                  placeholder="パスワードを設定"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">CANCEL</button>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm text-white font-bold disabled:opacity-50"
                >
                  {isValidating ? statusMessage : 'CREATE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {isJoinModalOpen && selectedChannel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-cyan-500/30 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <span className="text-cyan-500">●</span> JOIN CHANNEL
            </h2>
            <p className="text-sm text-gray-400 mb-4 font-mono">{selectedChannel.name}</p>

            <form onSubmit={handleJoinSubmit} className="space-y-4">
              {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded border border-red-900">{error}</div>}

              <div>
                <label className="text-xs text-gray-400 block mb-1">YOUR NAME</label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={e => handleInputChange('userName', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">CHANNEL PASSWORD</label>
                <input
                  type="text"
                  value={formData.passkey}
                  onChange={e => handleInputChange('passkey', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded p-2 text-white focus:border-cyan-500 focus:outline-none tracking-widest"
                  placeholder="パスワードを入力"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-gray-300">CANCEL</button>
                <button
                  type="submit"
                  disabled={isValidating}
                  className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm text-white font-bold disabled:opacity-50"
                >
                  {isValidating ? statusMessage : 'JOIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};