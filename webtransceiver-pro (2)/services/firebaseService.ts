// webtransceiver-pro/src/services/firebaseService.ts

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";

// ↓↓↓ ここはあなたのFirebase設定情報 (transceiver-app/src/firebase.js から持ってきたもの)
const firebaseConfig = {
    apiKey: "AIzaSyCVG6V1XVDgQ5hmK9EBjzlYk-LUwRyVNCU",
    authDomain: "transceiver-429e6.firebaseapp.com",
    projectId: "transceiver-429e6",
    storageBucket: "transceiver-429e6.firebasestorage.app",
    messagingSenderId: "2052680170",
    appId: "1:2052680170:web:8c932934755912d4412a93"
};

const ALLOWED_DOMAIN = 'g.osaka-seikei.ac.jp'; // 大学のドメイン指定

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Googleログイン
export const loginWithGoogle = () => {
    return signInWithPopup(auth, provider);
};

// ログアウト
export const logout = () => {
    return signOut(auth);
};

// 認証状態の監視 (App.tsxで使う便利関数)
export const checkAuthStatus = (setUser: (user: User | null) => void, setLoading: (loading: boolean) => void, setErrorMsg: (msg: string) => void) => {
    return onAuthStateChanged(auth, (currentUser) => {
        setLoading(true);
        if (currentUser) {
            if (currentUser.email && currentUser.email.endsWith(`@${ALLOWED_DOMAIN}`)) {
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
};