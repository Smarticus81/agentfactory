export type VoiceTier = 'starter' | 'pro' | 'premium';

export interface VoicePipelineConfig {
  tier: VoiceTier;
  description: string;
  features: string[];
  pipeline: {
    stt: string;
    llm: string;
    tts: string;
    turnDetection: boolean;
    bargeIn: boolean;
    wakeWord: boolean;
    streaming: boolean;
  };
  limitations: string[];
  pricing: string;
  architecture: 'chained' | 'speech-to-speech';
}

export interface LiveKitConfig {
  roomType: string;
  maxParticipants: number;
  recording: boolean;
  analytics: boolean;
  wakeWordDetection?: boolean;
  voiceCloning?: boolean;
}

export interface VoiceTestResult {
  sttAccuracy: number;
  ttsQuality: number;
  responseTime: number;
  turnDetection: boolean;
  bargeIn: boolean;
  wakeWordDetection?: boolean;
  overallScore: number;
  audioLevel?: number;
}

export interface DeploymentConfig {
  pwaOptimization: {
    iphone: boolean;
    android: boolean;
    desktop: boolean;
    offline: boolean;
    pushNotifications: boolean;
  };
  voicePipeline: {
    tier: VoiceTier;
    features: string[];
    wakeWord: boolean;
    bargeIn: boolean;
    turnDetection: boolean;
    expressiveTTS: boolean;
  };
  platform: 'openai' | 'livekit';
  branding: {
    name: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
    logo: string | null;
  };
}
