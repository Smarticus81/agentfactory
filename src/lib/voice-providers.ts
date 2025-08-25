// Complete Multi-Provider Voice Pipeline with OpenAI, Eleven Labs, Google TTS, and PlayHT
// Ultra-low latency implementation with WebRTC and streaming

import { EventEmitter } from 'events';
import { OpenAIRealtimeClient } from './openai-realtime-client';

export interface VoiceProvider {
  name: string;
  initialize(config: any): Promise<void>;
  synthesize(text: string, voice: string): Promise<ArrayBuffer>;
  transcribe(audio: ArrayBuffer): Promise<string>;
  getVoices(): Promise<Voice[]>;
  cleanup(): void;
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  provider: string;
  preview?: string;
  description?: string;
}

// OpenAI Provider (Primary - WebRTC Realtime)
export class OpenAIProvider extends EventEmitter implements VoiceProvider {
  name = 'openai';
  private client: OpenAIRealtimeClient | null = null;
  private apiKey: string = '';

  async initialize(config: { apiKey: string }) {
    this.apiKey = config.apiKey;
    this.client = new OpenAIRealtimeClient({ apiKey: this.apiKey });
    
    // Set up event listeners
    this.client.on('connection.open', () => {
      console.log('OpenAI voice provider connected');
      this.emit('connected');
    });

    this.client.on('error', (error) => {
      console.error('OpenAI voice provider error:', error);
      this.emit('error', error);
    });

    this.client.on('audio.delta', (data) => {
      this.emit('audio-chunk', data);
    });
  }

  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    if (!this.client?.isConnected) {
      throw new Error('OpenAI client not connected');
    }

    // For OpenAI, we send the text and get audio back via WebRTC
    await this.client.sendMessage(text);
    
    // Return empty buffer as audio comes through WebRTC stream
    return new ArrayBuffer(0);
  }

  async transcribe(audio: ArrayBuffer): Promise<string> {
    // OpenAI handles transcription through WebRTC
    return '';
  }

  async getVoices(): Promise<Voice[]> {
    return [
      { id: 'alloy', name: 'Alloy', gender: 'neutral', language: 'en', provider: 'openai', description: 'Balanced and natural' },
      { id: 'echo', name: 'Echo', gender: 'male', language: 'en', provider: 'openai', description: 'Warm and friendly' },
      { id: 'fable', name: 'Fable', gender: 'female', language: 'en', provider: 'openai', description: 'Clear and professional' },
      { id: 'onyx', name: 'Onyx', gender: 'male', language: 'en', provider: 'openai', description: 'Deep and authoritative' },
      { id: 'nova', name: 'Nova', gender: 'female', language: 'en', provider: 'openai', description: 'Bright and energetic' },
      { id: 'shimmer', name: 'Shimmer', gender: 'female', language: 'en', provider: 'openai', description: 'Smooth and melodic' },
    ];
  }

  async connect(config: { instructions: string; voice: string; temperature?: number }) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    await this.client.connect(config);
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
    }
  }

  cleanup(): void {
    this.disconnect();
    this.client = null;
  }
}

// Eleven Labs Provider
export class ElevenLabsProvider extends EventEmitter implements VoiceProvider {
  name = 'elevenlabs';
  private apiKey: string = '';
  private websocket: WebSocket | null = null;
  private streamingEnabled = true;
  private modelId = 'eleven_turbo_v2'; // Ultra-low latency model
  private context: string = '';
  private instructions: string = '';

  async initialize(config: { apiKey: string; streaming?: boolean; context?: string; instructions?: string }) {
    this.apiKey = config.apiKey;
    this.streamingEnabled = config.streaming ?? true;
    
    // Store context and instructions for later use
    this.context = config.context || '';
    this.instructions = config.instructions || '';

    // Validate API key
    if (!this.apiKey || this.apiKey.length < 10) {
      throw new Error('ElevenLabs API key is required and must be valid. Please check your subscription.');
    }

    if (this.streamingEnabled) {
      await this.initializeWebSocket();
    }
  }

  private async initializeWebSocket() {
    return new Promise<void>((resolve, reject) => {
      // Check if API key is valid
      if (!this.apiKey || this.apiKey.length < 10) {
        reject(new Error('ElevenLabs API key is required and must be valid. Please check your subscription.'));
        return;
      }

      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/stream-input?model_id=${this.modelId}`;
      
      this.websocket = new WebSocket(wsUrl);
      
      // Set a timeout for connection
      const connectionTimeout = setTimeout(() => {
        console.error('ElevenLabs WebSocket connection timeout');
        this.websocket?.close();
        reject(new Error('ElevenLabs WebSocket connection failed. Please check your API key and network connection.'));
      }, 10000);
      
      this.websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        
        // Send authentication
        this.websocket?.send(JSON.stringify({
          xi_api_key: this.apiKey,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          }
        }));
        
        console.log('Eleven Labs WebSocket connected');
        resolve();
      };

      this.websocket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error('ElevenLabs WebSocket error:', error);
        reject(new Error('ElevenLabs WebSocket connection failed. Please verify your API key and subscription status.'));
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };
    });
  }

  private handleWebSocketMessage(data: any) {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        if (message.audio) {
          // Convert base64 audio to ArrayBuffer
          const audioData = Uint8Array.from(atob(message.audio), c => c.charCodeAt(0));
          this.emit('audio-chunk', audioData.buffer);
        }
      } else {
        // Binary audio data
        this.emit('audio-chunk', data);
      }
    } catch (error) {
      console.error('Error handling Eleven Labs message:', error);
    }
  }

  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    if (this.streamingEnabled && this.websocket?.readyState === WebSocket.OPEN) {
      // Send text for streaming synthesis
      this.websocket.send(JSON.stringify({
        text: text,
        voice_id: voice,
        try_trigger_generation: true
      }));
      return new ArrayBuffer(0); // Audio comes via WebSocket
    } else {
      // Use the backend API endpoint instead of direct ElevenLabs API
      const response = await fetch('/api/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'elevenlabs',
          text,
          voiceId: voice,
          apiKey: this.apiKey
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      return await response.arrayBuffer();
    }
  }

  async transcribe(audio: ArrayBuffer): Promise<string> {
    // Eleven Labs doesn't provide transcription
    throw new Error('Transcription not supported by Eleven Labs');
  }

  async getVoices(): Promise<Voice[]> {
    // Return standard ElevenLabs voices - no fallback, direct operation
    return [
      { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male', language: 'en', provider: 'elevenlabs' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', gender: 'female', language: 'en', provider: 'elevenlabs' },
      { id: 'VR6AewLTigWG4xSOukaG', name: 'Antoni', gender: 'male', language: 'en', provider: 'elevenlabs' },
      { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', gender: 'male', language: 'en', provider: 'elevenlabs' }
    ];
  }

  cleanup(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

// Google TTS Provider
export class GoogleTTSProvider extends EventEmitter implements VoiceProvider {
  name = 'google';
  private apiKey: string = '';
  private context: string = '';
  private instructions: string = '';

  async initialize(config: { apiKey: string; context?: string; instructions?: string }) {
    this.apiKey = config.apiKey;
    this.context = config.context || '';
    this.instructions = config.instructions || '';
    
    // Validate API key
    if (!this.apiKey || this.apiKey.length < 10) {
      throw new Error('Google Cloud API key is required and must be valid.');
    }
    
    console.log('Google TTS provider initialized');
  }

  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    try {
      console.log(`Google TTS synthesizing: "${text}" with voice: ${voice}`);
      
      // Use the backend API endpoint instead of direct Google API
      const response = await fetch('/api/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'google',
          text,
          voiceId: voice,
          apiKey: this.apiKey
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Google TTS API error: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      console.log(`Google TTS synthesis complete: ${audioBuffer.byteLength} bytes`);
      return audioBuffer;
    } catch (error) {
      console.error('Google TTS synthesis failed:', error);
      this.emit('synthesis-error', error);
      throw error;
    }
  }

  async transcribe(audio: ArrayBuffer): Promise<string> {
    // Google Speech-to-Text would go here
    throw new Error('Transcription not implemented for Google TTS');
  }

  async getVoices(): Promise<Voice[]> {
    // Return standard Google voices - no fallback, direct operation
    return [
      { id: 'en-US-Neural2-A', name: 'Neural2-A', gender: 'female', language: 'en', provider: 'google' },
      { id: 'en-US-Neural2-C', name: 'Neural2-C', gender: 'female', language: 'en', provider: 'google' },
      { id: 'en-US-Neural2-D', name: 'Neural2-D', gender: 'male', language: 'en', provider: 'google' },
      { id: 'en-US-Neural2-F', name: 'Neural2-F', gender: 'female', language: 'en', provider: 'google' }
    ];
  }

  cleanup(): void {
    // No cleanup needed for Google TTS
  }
}

// PlayHT Provider
export class PlayHTProvider extends EventEmitter implements VoiceProvider {
  name = 'playht';
  private apiKey: string = '';
  private userId: string = '';
  private context: string = '';
  private instructions: string = '';

  async initialize(config: { apiKey: string; userId: string; context?: string; instructions?: string }) {
    this.apiKey = config.apiKey;
    this.userId = config.userId;
    this.context = config.context || '';
    this.instructions = config.instructions || '';
    
    // Validate API key and userId
    if (!this.apiKey || this.apiKey.length < 10) {
      throw new Error('PlayHT API key is required and must be valid.');
    }
    
    if (!this.userId || this.userId.length < 5) {
      throw new Error('PlayHT User ID is required and must be valid.');
    }
    
    console.log('PlayHT provider initialized');
  }

  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    try {
      console.log(`PlayHT synthesizing: "${text}" with voice: ${voice}`);
      console.log(`PlayHT API key present: ${this.apiKey ? 'Yes' : 'No'}, length: ${this.apiKey?.length || 0}`);
      console.log(`PlayHT User ID present: ${this.userId ? 'Yes' : 'No'}, length: ${this.userId?.length || 0}`);
      
      // Use the backend API endpoint instead of direct PlayHT API
      const response = await fetch('/api/test-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'playht',
          text,
          voiceId: voice,
          apiKey: this.apiKey,
          userId: this.userId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`PlayHT API error: ${response.status} ${response.statusText} - ${errorData}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      console.log(`PlayHT synthesis complete: ${audioBuffer.byteLength} bytes`);
      return audioBuffer;
    } catch (error) {
      console.error('PlayHT synthesis failed:', error);
      this.emit('synthesis-error', error);
      throw error;
    }
  }

  async transcribe(audio: ArrayBuffer): Promise<string> {
    throw new Error('Transcription not supported by PlayHT');
  }

  async getVoices(): Promise<Voice[]> {
    // Return standard PlayHT voices - no fallback, direct operation
    return [
      { id: 'en-US-JennyNeural', name: 'Jenny', gender: 'female', language: 'en', provider: 'playht' },
      { id: 'en-US-GuyNeural', name: 'Guy', gender: 'male', language: 'en', provider: 'playht' },
      { id: 'en-US-AriaNeural', name: 'Aria', gender: 'female', language: 'en', provider: 'playht' },
      { id: 'en-US-DavisNeural', name: 'Davis', gender: 'male', language: 'en', provider: 'playht' }
    ];
  }

  cleanup(): void {
    // No cleanup needed for PlayHT
  }
}
