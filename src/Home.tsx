// src/Home.tsx

import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import {
    collection,
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import './App.css';

// プロップスの型定義（TypeScriptのエラー消し用）
type HomeProps = {
    user: any;
    onLogout: () => void;
    onJoin: (channelId: string) => void; // ★追加: 画面遷移用の関数を受け取る
};

function Home({ user, onLogout, onJoin }: HomeProps) {
    const [channels, setChannels] = useState<any[]>([]);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelPassword, setNewChannelPassword] = useState("");
    const [deleteTime, setDeleteTime] = useState("");

    // --- 1. チャンネル一覧取得 ＆ 期限切れの自動削除 ---
    useEffect(() => {
        const q = query(collection(db, "channels"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const activeChannels: any[] = [];

            snapshot.docs.forEach(async (document) => {
                const data = document.data();
                const channelId = document.id;

                if (data.expiresAt) {
                    const expiresDate = data.expiresAt.toDate();
                    if (now > expiresDate) {
                        console.log(`期限切れのチャンネルを削除: ${data.name}`);
                        await deleteDoc(doc(db, "channels", channelId));
                        return;
                    }
                }

                activeChannels.push({
                    id: channelId,
                    ...data
                });
            });

            setChannels(activeChannels);
        });

        return () => unsubscribe();
    }, []);

    // --- 2. チャンネル新規作成処理 ---
    const createChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newChannelName.trim() || !newChannelPassword.trim()) {
            alert("チャンネル名とパスワードを入力してください");
            return;
        }

        try {
            let expiresAt = null;
            if (deleteTime) {
                expiresAt = Timestamp.fromDate(new Date(deleteTime));
            }

            await addDoc(collection(db, "channels"), {
                name: newChannelName,
                password: newChannelPassword,
                expiresAt: expiresAt,
                createdAt: serverTimestamp(),
                createdBy: user.email
            });

            setNewChannelName("");
            setNewChannelPassword("");
            setDeleteTime("");
            alert("チャンネルを作成しました！");
        } catch (error) {
            console.error("作成エラー:", error);
            alert("作成に失敗しました");
        }
    };

    // --- 3. チャンネル手動削除処理 ---
    const deleteChannel = async (channelId: string) => {
        if (window.confirm("本当にこのチャンネルを削除しますか？")) {
            try {
                await deleteDoc(doc(db, "channels", channelId));
                alert("削除しました");
            } catch (error) {
                console.error("削除エラー:", error);
                alert("削除できませんでした");
            }
        }
    };

    // --- 4. 入室処理（★ここを修正しました） ---
    const joinChannel = (channel: any) => {
        const inputPassword = prompt(`「${channel.name}」のパスワードを入力してください:`);
        if (inputPassword === null) return;

        if (inputPassword === channel.password) {
            // ★変更点: アラートを出さずに、親から貰った画面遷移関数を実行
            onJoin(channel.id);
        } else {
            alert("パスワードが間違っています。");
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return "なし";
        const d = timestamp.toDate();
        return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="App" style={{ padding: '20px', textAlign: 'center' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <span>ログイン中: {user.email}</span>
                <button onClick={onLogout}>ログアウト</button>
            </header>

            <h1>トランシーバー チャンネル選択</h1>

            <div style={{ margin: '30px auto', maxWidth: '500px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', textAlign: 'left' }}>
                <h3 style={{ marginTop: 0 }}>新規チャンネル作成</h3>
                <form onSubmit={createChannel} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>チャンネル名:</label>
                        <input
                            type="text"
                            placeholder="例: ランチ会"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>パスワード:</label>
                        <input
                            type="text"
                            placeholder="パスワード"
                            value={newChannelPassword}
                            onChange={(e) => setNewChannelPassword(e.target.value)}
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>自動削除日時 (任意):</label>
                        <input
                            type="datetime-local"
                            value={deleteTime}
                            onChange={(e) => setDeleteTime(e.target.value)}
                            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                        />
                        <small style={{ color: '#666' }}>※設定しない場合は自動削除されません</small>
                    </div>

                    <button type="submit" style={{ padding: '10px', background: '#007BFF', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        チャンネルを作成
                    </button>
                </form>
            </div>

            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <h3>チャンネル一覧</h3>
                {channels.length === 0 ? (
                    <p>現在有効なチャンネルはありません</p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {channels.map((channel) => (
                            <li key={channel.id} style={{
                                background: '#f9f9f9',
                                margin: '10px 0',
                                padding: '15px',
                                borderRadius: '8px',
                                border: '1px solid #eee',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '10px'
                            }}>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '18px', display: 'block' }}>{channel.name}</span>
                                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                        作成者: {channel.createdBy} <br />
                                        自動削除: {formatDate(channel.expiresAt)}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {channel.createdBy === user.email && (
                                        <button
                                            onClick={() => deleteChannel(channel.id)}
                                            style={{
                                                background: '#dc3545',
                                                color: 'white',
                                                border: 'none',
                                                padding: '8px 15px',
                                                borderRadius: '5px',
                                                cursor: 'pointer',
                                                fontSize: '14px'
                                            }}
                                        >
                                            削除
                                        </button>
                                    )}

                                    <button
                                        onClick={() => joinChannel(channel)}
                                        style={{
                                            background: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            padding: '8px 20px',
                                            borderRadius: '5px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        入室
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Home;