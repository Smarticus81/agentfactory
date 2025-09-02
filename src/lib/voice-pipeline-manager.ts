import { EventEmitter } from 'events';
import { OpenAIProvider, ElevenLabsProvider, GoogleTTSProvider, PlayHTProvider, Voice, VoiceProvider } from './voice-providers';

export interface VoicePipelineConfig {
  providers: Array<{
    type: 'openai' | 'elevenlabs' | 'google' | 'playht';
    config: any;
  }>;
  defaultProvider: string;
}

export class VoicePipelineManager extends EventEmitter {
  private providers: Map<string, any> = new Map();
  private currentProvider: string = '';
  private defaultProvider: string = 'openai';
  private isInitialized = false;

  async initialize(config: VoicePipelineConfig): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing voice pipeline with config:', config);

    // Always ensure OpenAI is available as a fallback
    const openaiConfig = {
      type: 'openai' as const,
      config: { 
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
      }
    };
    
    // Try to initialize the requested default provider first
    let primaryProvider: any = null;
    let primaryProviderType = config.defaultProvider;
    
    if (config.defaultProvider !== 'openai') {
      const defaultProviderConfig = config.providers.find(p => p.type === config.defaultProvider);
      if (defaultProviderConfig) {
        try {
          switch (defaultProviderConfig.type) {
            case 'elevenlabs':
              primaryProvider = new ElevenLabsProvider();
              break;
            case 'google':
              primaryProvider = new GoogleTTSProvider();
              break;
            case 'playht':
              primaryProvider = new PlayHTProvider();
              break;
          }

          if (primaryProvider) {
            await primaryProvider.initialize(defaultProviderConfig.config);
            this.providers.set(defaultProviderConfig.type, primaryProvider);
            console.log(`${defaultProviderConfig.type} provider initialized successfully`);
            
            // Set up provider event forwarding
            primaryProvider.on('connected', () => this.emit('provider-connected', defaultProviderConfig.type));
            primaryProvider.on('disconnected', () => this.emit('provider-disconnected', defaultProviderConfig.type));
            primaryProvider.on('error', (error: any) => this.emit('provider-error', defaultProviderConfig.type, error));
            primaryProvider.on('audio-chunk', (chunk: any) => this.emit('audio-chunk', chunk));
            primaryProvider.on('synthesis-complete', (data: any) => this.emit('synthesis-complete', data));
          }
        } catch (error) {
          console.error(`Failed to initialize primary provider ${defaultProviderConfig.type}:`, error);
          console.log('Falling back to OpenAI provider...');
          primaryProvider = null;
          primaryProviderType = 'openai';
        }
      }
    }
    
    // Always initialize OpenAI as fallback
    try {
      const openaiProvider = new OpenAIProvider();
      await openaiProvider.initialize(openaiConfig.config);
      this.providers.set('openai', openaiProvider);
      console.log('OpenAI provider initialized successfully (fallback)');
      
      // Set up OpenAI provider event forwarding
      openaiProvider.on('connected', () => this.emit('provider-connected', 'openai'));
      openaiProvider.on('disconnected', () => this.emit('provider-disconnected', 'openai'));
      openaiProvider.on('error', (error: any) => {
        console.log('OpenAI provider error (non-critical):', error);
        // Don't emit error for OpenAI since it's just a fallback
      });
      openaiProvider.on('audio-chunk', (chunk: any) => this.emit('audio-chunk', chunk));
      openaiProvider.on('synthesis-complete', (data: any) => this.emit('synthesis-complete', data));
      
    } catch (error) {
      console.log('OpenAI fallback provider initialization had issues (will use browser TTS):', error);
      // Don't throw error - we'll use browser TTS as final fallback
    }

    this.currentProvider = primaryProviderType;
    this.defaultProvider = primaryProviderType;
    this.isInitialized = true;
    this.emit('initialized');
  }

  async switchProvider(providerType: string): Promise<void> {
    if (!this.providers.has(providerType)) {
      console.warn(`Provider ${providerType} not available, falling back to OpenAI`);
      if (this.providers.has('openai')) {
        this.currentProvider = 'openai';
        this.emit('provider-switched', 'openai');
        return;
      }
      throw new Error(`Provider ${providerType} not available and no fallback available`);
    }
    
    console.log(`Switching voice provider from ${this.currentProvider} to ${providerType}`);
    this.currentProvider = providerType;
    this.emit('provider-switched', providerType);
  }

  async synthesize(text: string, voice: string, provider?: string): Promise<ArrayBuffer> {
    const targetProvider = provider || this.currentProvider;
    let voiceProvider = this.providers.get(targetProvider);
    
    if (!voiceProvider) {
      console.warn(`Primary provider '${targetProvider}' not available, falling back to OpenAI`);
      voiceProvider = this.providers.get('openai');
      if (!voiceProvider) {
        // Last resort: use browser Text-to-Speech
        return this.browserTextToSpeech(text, voice);
      }
      // Update current provider to OpenAI for future calls
      this.currentProvider = 'openai';
      this.emit('provider-switched', 'openai');
    }
    
    try {
      // Map voice names for OpenAI if we're falling back
      let actualVoice = voice;
      if (voiceProvider === this.providers.get('openai') && targetProvider !== 'openai') {
        // Map non-OpenAI voice names to OpenAI equivalents
        const voiceMapping: { [key: string]: string } = {
          'Rachel': 'nova',
          'Domi': 'alloy', 
          'Bella': 'nova',
          'Antoni': 'onyx',
          'Elli': 'shimmer',
          'Josh': 'onyx',
          'en-US-Journey-F': 'nova',
          'en-US-Journey-M': 'onyx',
          'en-US-Studio-O': 'alloy',
          'en-US-News-K': 'echo',
          'en-US-Standard-C': 'nova',
          'en-US-Standard-D': 'onyx'
        };
        actualVoice = voiceMapping[voice] || 'nova';
        console.log(`Mapped voice ${voice} to OpenAI voice ${actualVoice}`);
      }
      
      return await voiceProvider.synthesize(text, actualVoice);
    } catch (error) {
      console.error(`Voice synthesis failed with ${targetProvider}:`, error);
      
      // Try fallback to OpenAI if we haven't already
      if (targetProvider !== 'openai' && this.providers.has('openai')) {
        console.log(`Attempting fallback to OpenAI for synthesis...`);
        try {
          const openaiProvider = this.providers.get('openai');
          // Map voice to OpenAI equivalent
          const voiceMapping: { [key: string]: string } = {
            'Rachel': 'nova',
            'Domi': 'alloy', 
            'Bella': 'nova',
            'Antoni': 'onyx',
            'Elli': 'shimmer',
            'Josh': 'onyx',
            'en-US-Journey-F': 'nova',
            'en-US-Journey-M': 'onyx',
            'en-US-Studio-O': 'alloy',
            'en-US-News-K': 'echo',
            'en-US-Standard-C': 'nova',
            'en-US-Standard-D': 'onyx'
          };
          const fallbackVoice = voiceMapping[voice] || 'nova';
          this.currentProvider = 'openai';
          this.emit('provider-switched', 'openai');
          return await openaiProvider!.synthesize(text, fallbackVoice);
        } catch (fallbackError) {
          console.error('Fallback to OpenAI also failed:', fallbackError);
          // Last resort: browser Text-to-Speech
          return this.browserTextToSpeech(text, voice);
        }
      }
      
      // Final fallback to browser TTS
      console.log('All voice providers failed, using browser Text-to-Speech as final fallback');
      return this.browserTextToSpeech(text, voice);
    }
  }

  private async browserTextToSpeech(text: string, voice: string): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Using browser Text-to-Speech as final fallback');
        this.currentProvider = 'browser-tts';
        this.emit('provider-switched', 'browser-tts');
        
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

  async getVoices(): Promise<Voice[]> {
    const allVoices: Voice[] = [];
    
    for (const [providerType, provider] of this.providers) {
      try {
        const voices = await provider.getVoices();
        allVoices.push(...voices);
      } catch (error) {
        console.error(`Failed to get voices from ${providerType}:`, error);
      }
    }
    
    return allVoices;
  }

  async connectRealtime(config: any): Promise<void> {
    const provider = this.providers.get(this.currentProvider);
    if (!provider || !provider.connect) {
      throw new Error(`Provider ${this.currentProvider} does not support realtime connection`);
    }
    
    return await provider.connect(config);
  }

  async disconnect(): Promise<void> {
    const provider = this.providers.get(this.currentProvider);
    if (provider && provider.disconnect) {
      await provider.disconnect();
    }
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getCurrentProviderInstance(): VoiceProvider | null {
    return this.providers.get(this.currentProvider) || null;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isProviderAvailable(providerType: string): boolean {
    return this.providers.has(providerType);
  }

  cleanup(): void {
    for (const provider of this.providers.values()) {
      if (provider.cleanup) {
        provider.cleanup();
      }
    }
    this.providers.clear();
    this.removeAllListeners();
  }
}
