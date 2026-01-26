import { initializeApp } from "firebase/app";
// ★認証機能(Auth)と、データベース機能(Firestore)の両方をインポート
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};
console.log("API KEY CHECK:", firebaseConfig.apiKey);
console.log("Connecting to Firebase Project:", firebaseConfig.projectId);

// アプリの初期化
const app = initializeApp(firebaseConfig);

// --- 1. 認証機能 (Auth) の設定 ---
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ログイン用の便利な関数
export const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
};

// ログアウト用の便利な関数
export const logout = () => {
    return signOut(auth);
};

// --- 2. データベース (Firestore) の設定 ---
// ★通信タイムアウトを防ぐため、ロングポーリングを強制する設定を維持
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});