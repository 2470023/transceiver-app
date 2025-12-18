import { useState, useEffect, useRef, useCallback } from 'react';
import { Transcript, IWindow, UserRole } from '../types';
// ★Firebase関連をインポート
import { db } from '../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

export const useTransceiver = (
  userName: string,
  channelSlot: number | null, // 使わないが引数の順番維持のため残す
  channelId: string,          // ここにFirestoreのドキュメントIDが入ってくる
  passkey: string,
  role: UserRole
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // --- 1. 受信機能 (Firestore監視) ---
  useEffect(() => {
    if (!channelId) return;

    // ★重要: "channels" ではなく "channels_pro" を見に行くように変更
    // channels_pro/{channelId}/messages コレクションを監視
    const messagesRef = collection(db, "channels_pro", channelId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newTranscripts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || 'unknown',
          userName: data.userName || 'Anonymous',
          text: data.text,
          // FirestoreのTimestampをミリ秒に変換。なければ現在時刻
          timestamp: data.createdAt ? data.createdAt.toMillis() : Date.now(),
          // 自分の発言かどうか判定
          isLocal: data.userName === userName
        } as Transcript;
      });

      setTranscripts(newTranscripts);
    });

    return () => unsubscribe();
  }, [channelId, userName]);

  // --- 2. 音声認識の初期化 (Web Speech API) ---
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPermissionError("このブラウザは音声認識に対応していません。ChromeまたはSafariをご利用ください。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setPermissionError(null);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Error:", event.error);
      if (event.error === 'not-allowed') {
        setPermissionError("マイクの使用が許可されていません。");
      }
      setIsRecording(false);
    };

    recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult.isFinal) {
        const text = lastResult[0].transcript;
        handleNewTranscript(text);
      }
    };

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- 3. 送信機能 (Firestoreへ保存) ---
  const handleNewTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      // ★重要: "channels_pro" の messages に書き込む
      const messagesRef = collection(db, "channels_pro", channelId, "messages");
      await addDoc(messagesRef, {
        text: text,
        userName: userName || 'Anonymous',
        userId: userName, // 簡易IDとして名前を使用
        createdAt: serverTimestamp(), // サーバー時間
      });
    } catch (e) {
      console.error("送信エラー:", e);
    }
  }, [channelId, userName]);

  const startTransmission = useCallback(() => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("録音開始エラー:", e);
      }
    }
  }, [isRecording]);

  const stopTransmission = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  return {
    isRecording,
    transcripts,
    permissionError,
    startTransmission,
    stopTransmission
  };
};