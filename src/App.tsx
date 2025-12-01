import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import Home from './Home';
import { TransceiverInterface } from './components/TransceiverInterface'; // 作ったものをインポート
import './App.css';

const ALLOWED_DOMAIN = 'university.ac.jp'; // 適宜変更

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      if (currentUser) {
        // ドメインチェックが必要ならここで行う
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // チャンネル入室時の処理（Homeから呼ばれる）
  const handleJoinChannel = (channelId: string) => {
    setCurrentChannelId(channelId);
  };

  // チャンネル退出時の処理
  const handleLeaveChannel = () => {
    setCurrentChannelId(null);
  };

  if (loading) return <div>読み込み中...</div>;

  // 1. 未ログイン
  if (!user) {
    return (
      <div className="App" style={{ textAlign: 'center', marginTop: '100px' }}>
        <h1>トランシーバーアプリ</h1>
        <button onClick={loginWithGoogle}>Googleでログイン</button>
        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      </div>
    );
  }

  // 2. ログイン済み & チャンネル選択中 (トランシーバー画面)
  if (currentChannelId) {
    return (
      <TransceiverInterface
        channelId={currentChannelId}
        user={user}
        onLeave={handleLeaveChannel}
      />
    );
  }

  // 3. ログイン済み & ホーム画面
  return (
    <Home
      user={user}
      onLogout={logout}
      // Homeコンポーネントに onJoin プロップスを追加して渡す必要があります
      // @ts-ignore (Home.jsをtsにして型定義するまではエラー無視)
      onJoin={handleJoinChannel}
    />
  );
}

export default App;