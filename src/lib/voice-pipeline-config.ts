import { VoicePipelineConfig, VoiceTier } from './types';

// Voice pipeline configurations using OpenAI's latest Realtime API architecture
export const VOICE_PIPELINE_CONFIGS: Record<VoiceTier, VoicePipelineConfig> = {
  'starter': {
    tier: 'starter',
    description: 'Basic voice assistant with turn-based interaction',
    features: [
      'STT ↔ LLM ↔ TTS (turn-based)',
      'Manual turn detection',
      'Basic pipeline',
      'OpenAI Audio Transcription API'
    ],
    pipeline: {
      stt: 'gpt-4o-mini-transcribe',
      llm: 'gpt-4o-mini',
      tts: 'gpt-4o-mini-tts',
      turnDetection: false,
      bargeIn: false,
      wakeWord: false,
      streaming: false
    },
    limitations: [
      'Turn-based only (no interruptions)',
      'Basic voice quality',
      'Standard response time',
      'Manual audio capture'
    ],
    pricing: 'Free tier included',
    architecture: 'chained'
  },
  
  'pro': {
    tier: 'pro',
    description: 'Enhanced voice experience with streaming and automatic turn detection',
    features: [
      'Streaming STT with VAD',
      'Interruptible TTS (barge-in)',
      'Automatic turn detection',
      'OpenAI Realtime Transcription API'
    ],
    pipeline: {
      stt: 'gpt-4o-transcribe',
      llm: 'gpt-4o',
      tts: 'gpt-4o-mini-tts',
      turnDetection: true,
      bargeIn: true,
      wakeWord: false,
      streaming: true
    },
    limitations: [
      'No wake-word detection',
      'Standard TTS quality',
      'Requires WebSocket connection'
    ],
    pricing: 'Pro subscription required',
    architecture: 'chained'
  },
  
  'premium': {
    tier: 'premium',
    description: 'Advanced voice features with wake-word detection and real-time processing',
    features: [
      'All Pro features',
      'Wake-word detection',
      'Custom wake phrases',
      'Enhanced turn detection',
      'Porcupine Web or openWakeWord'
    ],
    pipeline: {
      stt: 'gpt-4o-transcribe',
      llm: 'gpt-4o',
      tts: 'gpt-4o-mini-tts',
      turnDetection: true,
      bargeIn: true,
      wakeWord: true,
      streaming: true
    },
    limitations: [
      'Standard TTS quality',
      'Limited voice customization'
    ],
    pricing: 'Pro+ subscription required',
    architecture: 'chained'
  }
};

// LiveKit Agents configuration for each tier
export const LIVEKIT_AGENTS_CONFIGS = {
  'starter': {
    framework: 'LiveKit Agents',
    description: 'Basic voice agent with LiveKit infrastructure',
    features: [
      'AgentSession with basic STT-LLM-TTS pipeline',
      'Manual turn detection',
      'Basic agent workflows',
      'LiveKit Cloud deployment ready'
    ],
    components: {
      stt: 'deepgram.STT()',
      llm: 'openai.LLM()',
      tts: 'cartesia.TTS()',
      vad: 'silero.VAD.load()',
      turnDetection: 'turn_detector.MultilingualModel()'
    },
    deployment: {
      platform: 'LiveKit Cloud',
      scaling: 'Automatic',
      regions: 'us-east (N. Virginia)',
      monitoring: 'Dashboard with realtime metrics'
    },
    pricing: 'Free tier included'
  },
  
  'pro': {
    framework: 'LiveKit Agents',
    description: 'Enhanced voice agent with advanced LiveKit features',
    features: [
      'Streaming STT with VAD',
      'Interruptible TTS (barge-in)',
      'Automatic turn detection',
      'Advanced agent workflows',
      'Tool integration and function calling'
    ],
    components: {
      stt: 'deepgram.STT()',
      llm: 'openai.LLM()',
      tts: 'cartesia.TTS()',
      vad: 'silero.VAD.load()',
      turnDetection: 'turn_detector.MultilingualModel()',
      noiseCancellation: 'noise_cancellation.BVC()'
    },
    deployment: {
      platform: 'LiveKit Cloud',
      scaling: 'Automatic with load balancing',
      regions: 'us-east (N. Virginia)',
      monitoring: 'Advanced analytics and error tracking'
    },
    pricing: 'Pro subscription required'
  },
  
  'premium': {
    framework: 'LiveKit Agents',
    description: 'Advanced voice agent with LiveKit enterprise features',
    features: [
      'All Pro features',
      'Wake-word detection',
      'Custom wake phrases',
      'Multi-agent workflows',
      'Advanced handoffs and delegation',
      'Custom pipeline nodes'
    ],
    components: {
      stt: 'deepgram.STT()',
      llm: 'openai.LLM()',
      tts: 'cartesia.TTS()',
      vad: 'silero.VAD.load()',
      turnDetection: 'turn_detector.MultilingualModel()',
      noiseCancellation: 'noise_cancellation.BVC()',
      wakeWord: 'porcupine.Web() or openWakeWord'
    },
    deployment: {
      platform: 'LiveKit Cloud',
      scaling: 'Enterprise-grade with custom limits',
      regions: 'us-east (N. Virginia)',
      monitoring: 'Full telemetry and custom deployments'
    },
    pricing: 'Pro+ subscription required'
  }
};

// OpenAI Realtime API configuration for each tier
export const OPENAI_REALTIME_CONFIGS = {
  'starter': {
    apiType: 'rest',
    transcription: 'audio',
    connection: 'http',
    features: ['basic_stt', 'basic_tts']
  },
  'pro': {
    apiType: 'realtime',
    transcription: 'realtime',
    connection: 'websocket',
    features: ['streaming_stt', 'vad', 'basic_tts']
  },
  'premium': {
    apiType: 'realtime',
    transcription: 'realtime',
    connection: 'websocket',
    features: ['streaming_stt', 'vad', 'wake_word', 'basic_tts']
  }
};

// Voice pipeline validation
export function validateVoicePipeline(tier: VoiceTier, config: any): boolean {
  const tierConfig = VOICE_PIPELINE_CONFIGS[tier];
  
  // Check if required features are enabled for the tier
  if (tier === 'pro' || tier === 'premium') {
    if (!config.turnDetection || !config.bargeIn) {
      return false;
    }
  }
  
  if (tier === 'premium') {
    if (!config.wakeWord) {
      return false;
    }
  }
  
  if (tier === 'premium') {
    if (tierConfig.architecture !== 'speech-to-speech') {
      return false;
    }
  }
  
  return true;
}

// Get recommended configuration for a tier
export function getRecommendedConfig(tier: VoiceTier) {
  return VOICE_PIPELINE_CONFIGS[tier];
}

// Check if user can access a specific tier
export function canAccessTier(userPlan: string, requestedTier: VoiceTier): boolean {
  const tierAccess = {
    'Free': ['starter'],
    'Pro': ['starter', 'pro'],
    'Premium': ['starter', 'pro', 'premium']
  };
  
  return tierAccess[userPlan as keyof typeof tierAccess]?.includes(requestedTier) || false;
}

// Get architecture-specific configuration
export function getArchitectureConfig(tier: VoiceTier) {
  const config = VOICE_PIPELINE_CONFIGS[tier];
  
  if (config.architecture === 'speech-to-speech') {
    return {
      model: 'gpt-realtime',
      connection: 'webrtc',
      features: ['native_audio', 'multimodal', 'low_latency']
    };
  } else {
    return {
      model: 'gpt-4o',
      connection: 'websocket',
      features: ['chained_pipeline', 'transcript_control', 'function_calling']
    };
  }
}

// Get LiveKit Agents configuration for a tier
export function getLiveKitAgentsConfig(tier: VoiceTier) {
  return LIVEKIT_AGENTS_CONFIGS[tier];
}

// Compare OpenAI vs LiveKit for a tier
export function comparePlatforms(tier: VoiceTier) {
  const openaiConfig = OPENAI_REALTIME_CONFIGS[tier];
  const livekitConfig = LIVEKIT_AGENTS_CONFIGS[tier];
  
  return {
    openai: {
      pros: [
        'Latest GPT-4o models',
        'Native speech-to-speech (Premium)',
        'Direct OpenAI integration',
        'Low-latency WebRTC'
      ],
      cons: [
        'Requires OpenAI API keys',
        'Limited workflow capabilities',
        'No built-in agent management'
      ]
    },
    livekit: {
      pros: [
        'Production-ready framework',
        'Advanced agent workflows',
        'Built-in deployment and monitoring',
        'Multi-agent orchestration',
        'Custom pipeline nodes',
        'Enterprise features'
      ],
      cons: [
        'Learning curve for complex workflows',
        'Requires LiveKit Cloud account',
        'Framework-specific patterns'
      ]
    }
  };
}
