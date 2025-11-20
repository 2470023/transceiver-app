// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ----------------------------------------------------
// ↓↓↓ ここをあなたのFirebaseの設定情報に書き換えてください ↓↓↓
const firebaseConfig = {
    apiKey: "AIzaSyCVG6V1XVDgQ5hmK9EBjzlYk-LUwRyVNCU",
    authDomain: "transceiver-429e6.firebaseapp.com",
    projectId: "transceiver-429e6",
    storageBucket: "transceiver-429e6.firebasestorage.app",
    messagingSenderId: "2052680170",
    appId: "1:2052680170:web:8c932934755912d4412a93"
};
// ----------------------------------------------------

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
// 認証機能を準備
const auth = getAuth(app);
// Googleログイン機能を準備
const provider = new GoogleAuthProvider();
// --- Firestoreの初期化 ---
const db = getFirestore(app);

// ログインするための関数
export const loginWithGoogle = () => {
    // ポップアップ画面でログインを促す
    return signInWithPopup(auth, provider);
};

// ログアウトするための関数
export const logout = () => {
    return signOut(auth);
};

// 他のファイルでも auth を使えるようにする
export { auth, db };