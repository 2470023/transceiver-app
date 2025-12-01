import { useState, useEffect, useRef, useCallback } from 'react';
import { Transcript, IWindow, UserRole } from '../types';

const CHANNEL_PREFIX = 'web-transceiver-v3-slot-';

export const useTransceiver = (
  userName: string, 
  channelSlot: number | null,
  channelName: string,
  passkey: string,
  role: UserRole
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!channelSlot) return;
    
    // Fixed internal ID based on slot number
    const internalChannelName = `${CHANNEL_PREFIX}${channelSlot}`;
    const channel = new BroadcastChannel(internalChannelName);
    
    channel.onmessage = (event) => {
      const { type, payload, requestId } = event.data;

      // 1. Handle Transcript Messages
      if (type === 'TRANSCRIPT') {
        // Security Check: Only accept messages with matching passkey
        if (payload.passkey !== passkey) return;

        const incomingTranscript: Transcript = {
          ...payload.transcriptData,
          isLocal: false,
        };
        setTranscripts(prev => [...prev, incomingTranscript]);
      }

      // 2. Handle Handshake (HOST ONLY)
      if (role === 'HOST') {
        if (type === 'JOIN_REQUEST') {
          const isPasskeyValid = payload.passkey === passkey;
          channel.postMessage({
            type: 'JOIN_RESPONSE',
            requestId: requestId,
            status: isPasskeyValid ? 'OK' : 'WRONG_PASS'
          });
        }

        // 3. Handle Discovery (For Landing Page Scanners)
        if (type === 'DISCOVERY_PING') {
          channel.postMessage({
            type: 'DISCOVERY_PONG',
            payload: {
              slotId: channelSlot,
              name: channelName, // Respond with current display name
              hostName: userName
            }
          });
        }
      }
    };

    channelRef.current = channel;

    return () => {
      channel.close();
    };
  }, [channelSlot, passkey, role, channelName, userName]);

  // Initialize Web Speech API
  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setPermissionError("This browser does not support Web Speech API.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setPermissionError(null);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setPermissionError("Microphone access denied.");
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
  }, [userName, channelSlot, passkey]); 

  const handleNewTranscript = useCallback((text: string) => {
    if (!text.trim()) return;

    const newTranscript: Transcript = {
      id: crypto.randomUUID(),
      userId: 'local',
      userName: userName || 'Anonymous',
      text: text,
      timestamp: Date.now(),
      isLocal: true,
    };

    // Update local state
    setTranscripts(prev => [...prev, newTranscript]);

    // Broadcast
    if (channelRef.current) {
      channelRef.current.postMessage({
        type: 'TRANSCRIPT',
        payload: {
          passkey: passkey,
          transcriptData: newTranscript
        }
      });
    }
  }, [userName, passkey]);

  const startTransmission = useCallback(() => {
    if (recognitionRef.current && !isRecording) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Recognition already started", e);
      }
    }
  }, [isRecording]);

  const stopTransmission = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  return {
    isRecording,
    transcripts,
    permissionError,
    startTransmission,
    stopTransmission,
    clearTranscripts
  };
};