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
  processTextWithLLM?(text: string, agentConfig?: { agentId?: string; userId?: string; instructions?: string; agentName?: string }): Promise<string>;
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

// OpenAI Provider (Primary - Uses TTS API for synthesis)
export class OpenAIProvider extends EventEmitter implements VoiceProvider {
  name = 'openai';
  private client: OpenAIRealtimeClient | null = null;
  private apiKey: string = '';

  async initialize(config: { apiKey: string }) {
    this.apiKey = config.apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
    
    if (this.apiKey) {
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
    } else {
      console.log('OpenAI provider initialized without API key - will use browser TTS fallback');
    }
  }

  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    // If we have an API key, try to use OpenAI TTS API
    if (this.apiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: voice,
            response_format: 'mp3'
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        console.log('OpenAI TTS synthesis completed');
        
        // Play the audio
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBufferData = await audioContext.decodeAudioData(audioBuffer.slice(0));
        const source = audioContext.createBufferSource();
        source.buffer = audioBufferData;
        source.connect(audioContext.destination);
        source.start(0);
        
        return audioBuffer;
      } catch (error) {
        console.error('OpenAI TTS API failed:', error);
        // Fall back to browser TTS
        return this.browserTextToSpeech(text, voice);
      }
    } else {
      // No API key, use browser TTS
      return this.browserTextToSpeech(text, voice);
    }
  }

  private async browserTextToSpeech(text: string, voice: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Try to find a matching voice
        const voices = speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => 
          v.name.toLowerCase().includes(voice.toLowerCase()) ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('male')
        ) || voices[0];
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
          console.log('Browser TTS synthesis completed');
          resolve(new ArrayBuffer(0));
        };
        
        utterance.onerror = (event) => {
          console.error('Browser TTS error:', event);
          reject(new Error('Browser Text-to-Speech failed'));
        };
        
        console.log(`Using browser TTS with voice: ${selectedVoice?.name || 'default'}`);
        speechSynthesis.speak(utterance);
        
      } catch (error) {
        console.error('Browser TTS setup failed:', error);
        reject(error);
      }
    });
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
  private modelId = 'eleven_turbo_v2_5'; // Latest ultra-low latency model
  private context: string = '';
  private instructions: string = '';
  private currentVoiceId: string = '';
  private audioChunks: ArrayBuffer[] = [];
  private isPlaying = false;

  async initialize(config: { apiKey: string; streaming?: boolean; context?: string; instructions?: string }) {
    this.apiKey = config.apiKey;
    this.streamingEnabled = false; // Disable streaming for now to avoid audio encoding issues
    
    // Store context and instructions for later use
    this.context = config.context || '';
    this.instructions = config.instructions || '';

    // Validate API key
    if (!this.apiKey || this.apiKey.length < 10) {
      throw new Error('ElevenLabs API key is required and must be valid. Please check your subscription.');
    }

    console.log('ElevenLabs provider initialized successfully (using REST API)');
  }

  private async initializeWebSocket(voiceId: string) {
    // Close existing WebSocket if voice changed
    if (this.websocket && this.currentVoiceId !== voiceId) {
      this.websocket.close();
      this.websocket = null;
    }

    // Return if already connected to this voice
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN && this.currentVoiceId === voiceId) {
      return Promise.resolve();
    }

    this.currentVoiceId = voiceId;

    return new Promise<void>((resolve, reject) => {
      // Check if API key is valid
      if (!this.apiKey || this.apiKey.length < 10) {
        reject(new Error('ElevenLabs API key is required and must be valid. Please check your subscription.'));
        return;
      }

      // Use the correct WebSocket URL format with voice ID
      const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=${this.modelId}`;
      console.log('Connecting to ElevenLabs WebSocket:', wsUrl);
      
      this.websocket = new WebSocket(wsUrl);
      
      // Set a timeout for connection
      const connectionTimeout = setTimeout(() => {
        console.error('ElevenLabs WebSocket connection timeout');
        this.websocket?.close();
        reject(new Error('ElevenLabs WebSocket connection failed. Please check your API key and network connection.'));
      }, 10000);
      
      this.websocket.onopen = () => {
        clearTimeout(connectionTimeout);
        
        // Send authentication and initial configuration
        this.websocket?.send(JSON.stringify({
          text: " ", // Initial text to start the stream
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          },
          generation_config: {
            chunk_length_schedule: [120, 160, 250, 290]
          },
          xi_api_key: this.apiKey
        }));
        
        console.log('ElevenLabs WebSocket connected successfully for voice:', voiceId);
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

      this.websocket.onclose = (event) => {
        console.log('ElevenLabs WebSocket closed:', event.code, event.reason);
      };
    });
  }

  private handleWebSocketMessage(data: any) {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        if (message.audio) {
          // Convert base64 audio to ArrayBuffer and buffer it
          const audioData = Uint8Array.from(atob(message.audio), c => c.charCodeAt(0));
          this.audioChunks.push(audioData.buffer);
          
          // For streaming, emit each chunk immediately for real-time playback
          // But also accumulate for complete audio if needed
          this.emit('audio-chunk', audioData.buffer);
        } else if (message.isFinal) {
          // End of stream - combine all chunks if needed
          this.combineAndEmitFinalAudio();
        }
      } else if (data instanceof ArrayBuffer) {
        // Binary audio data (MP3 format)
        this.audioChunks.push(data);
        this.emit('audio-chunk', data);
      }
    } catch (error) {
      console.error('Error handling Eleven Labs message:', error);
    }
  }

  private combineAndEmitFinalAudio() {
    if (this.audioChunks.length > 0) {
      // Combine all audio chunks into a single buffer
      const totalLength = this.audioChunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
      const combinedBuffer = new ArrayBuffer(totalLength);
      const combinedView = new Uint8Array(combinedBuffer);
      
      let offset = 0;
      for (const chunk of this.audioChunks) {
        combinedView.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      // Emit the complete audio
      this.emit('audio-complete', combinedBuffer);
      
      // Clear the buffer for next synthesis
      this.audioChunks = [];
    }
  }

  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    // Map voice names to actual ElevenLabs voice IDs
    const voiceIdMapping: { [key: string]: string } = {
      // Current available voices from API
      'Rachel': '21m00Tcm4TlvDq8ikWAM',
      'Clyde': '2EiwWnXFnvU5JabPnv8n', 
      'Roger': 'CwhRBWXzGAHq8TQ4Fs17',
      'Sarah': 'EXAVITQu4vr4xnSDxMaL',
      'Laura': 'FGY2WhTYpPnrIDTdsKH5',
      'Thomas': 'GBv7mTt0atIp3Br8iCZE',
      'Charlie': 'IKne3meq5aSn9XLyUdCD',
      'George': 'JBFqnCBsd6RMkjVDRZzb',
      'Callum': 'N2lVS1w4EtoT3dr4eOWO',
      'River': 'SAz9YHcvj6GT2YYXdXww',
      'Harry': 'SOYHLrjzK2X1ezoPC6cr',
      'Liam': 'TX3LPaxmHKxFdv7VOQHJ',
      'Alice': 'Xb7hH8MSUJpSbSDYk0k2',
      'Matilda': 'XrExE9yKIg1WjnnlVkGX',
      'Will': 'bIHbv24MWmeRgasZH58o',
      'Jessica': 'cgSgspJ2msm6clMCkdW9',
      'Eric': 'cjVigY5qzO86Huf0OWal',
      'Chris': 'iP95p4xoKVk53GoZ742B',
      'Brian': 'nPczCjzI2devNBz1zQrb',
      'Daniel': 'onwK4e9ZLuTAKqWW03F9',
      'Lily': 'pFZP5JQG7iQjIQuC4Bku',
      'Bill': 'pqHfZKP75CvOlQylNhV4',
      'Zara': 'jqcCZkN6Knx8BJ5TBdYR',
      // Legacy mapping for existing configurations  
      'Bella': '21m00Tcm4TlvDq8ikWAM', // Map to Rachel (female voice)
      'Adam': 'GBv7mTt0atIp3Br8iCZE', // Map to Thomas (male voice)
      'Antoni': 'JBFqnCBsd6RMkjVDRZzb', // Map to George (male voice)
      'Josh': 'SOYHLrjzK2X1ezoPC6cr' // Map to Harry (male voice)
    };

    // Get the actual voice ID
    const voiceId = voiceIdMapping[voice] || voiceIdMapping['Rachel']; // Default to Rachel
    console.log(`ElevenLabs synthesizing "${text}" with voice: ${voice} (ID: ${voiceId})`);

    // Use REST API for reliable audio delivery
    const response = await fetch('/api/test-voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'elevenlabs',
        text,
        voiceId: voiceId, // Use actual voice ID
        apiKey: this.apiKey
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Eleven Labs API error: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    const audioBuffer = await response.arrayBuffer();
    console.log(`ElevenLabs synthesis complete: ${audioBuffer.byteLength} bytes`);
    return audioBuffer;
  }

  async transcribe(audio: ArrayBuffer): Promise<string> {
    // ElevenLabs doesn't provide transcription, so use OpenAI Whisper
    try {
      // Convert ArrayBuffer to File for OpenAI API
      const audioBlob = new Blob([audio], { type: 'audio/webm' });
      const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ElevenLabs transcription (via Whisper):', result.text);
      return result.text || '';
    } catch (error) {
      console.error('ElevenLabs transcription error:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getVoices(): Promise<Voice[]> {
    // Return actual ElevenLabs voices from API - using real voice IDs and names
    return [
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female', language: 'en', provider: 'elevenlabs' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', language: 'en', provider: 'elevenlabs' },
      { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', language: 'en', provider: 'elevenlabs' },
      { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'female', language: 'en', provider: 'elevenlabs' },
      { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'female', language: 'en', provider: 'elevenlabs' },
      { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', gender: 'male', language: 'en', provider: 'elevenlabs' },
      { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'male', language: 'en', provider: 'elevenlabs' },
      { id: 'SOYHLrjzK2X1ezoPC6cr', name: 'Harry', gender: 'male', language: 'en', provider: 'elevenlabs' },
      { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', language: 'en', provider: 'elevenlabs' }
    ];
  }

  // Process text through chat API with tools and RAG support
  async processTextWithLLM(text: string, agentConfig?: { agentId?: string; userId?: string; instructions?: string; agentName?: string }): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          instructions: agentConfig?.instructions || this.instructions || 'You are a helpful voice assistant. Keep responses concise and conversational.',
          agentName: agentConfig?.agentName || 'ElevenLabs Assistant',
          agentId: agentConfig?.agentId,
          userId: agentConfig?.userId,
          enableTools: true // Enable tools for ElevenLabs
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('ElevenLabs LLM response:', { 
        hasContext: result.hasContext, 
        toolsUsed: result.toolsUsed,
        source: result.source 
      });
      
      return result.response || 'I apologize, but I couldn\'t process your request.';
    } catch (error) {
      console.error('ElevenLabs LLM processing error:', error);
      return 'I\'m sorry, I encountered an error processing your request.';
    }
  }

  cleanup(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
    this.audioChunks = [];
    this.currentVoiceId = '';
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
