export interface Transcript {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: number;
  isLocal: boolean;
}

export type UserRole = 'HOST' | 'GUEST';

export interface UserSettings {
  userName: string;
  channelSlot: number; // 1-5
  channelName: string; // Display Name (e.g. "My Room")
  passkey: string;
  role: UserRole;
}

export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  TRANSMITTING = 'TRANSMITTING',
}

export interface ChannelStatus {
  slotId: number;
  isActive: boolean;
  name: string;
  hostName?: string;
}

// Helper type for Web Speech API which might not be in all TS definitions
export interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}