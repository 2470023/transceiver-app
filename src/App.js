// src/App.js

import React, { useState, useEffect } from 'react';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Home from './Home'; // 作成したHomeコンポーネントを読み込む
import './App.css';

const ALLOWED_DOMAIN = 'g.osaka-seikei.ac.jp'; // ※必要に応じて gmail.com 等に変更してテスト

function App() {
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      if (currentUser) {
        if (currentUser.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          setUser(currentUser);
          setErrorMsg("");
        } else {
          logout();
          setUser(null);
          setErrorMsg(`許可されていないアカウントです。@${ALLOWED_DOMAIN} のアドレスでログインしてください。`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div className="App">読み込み中...</div>;

  // --- 変更点: ログインしていたら Home コンポーネントを表示 ---
  if (user) {
    return <Home user={user} onLogout={logout} />;
  }

  // 未ログイン時の画面
  return (
    <div className="App" style={{ textAlign: 'center', marginTop: '100px' }}>
      <h1>大学専用アプリ</h1>
      <p>利用するには大学のGoogleアカウントでログインしてください。</p>

      <button onClick={loginWithGoogle} style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}>
        Googleでログイン
      </button>

      {errorMsg && <p style={{ color: 'red', marginTop: '20px' }}>{errorMsg}</p>}
    </div>
  );
}

export default App;