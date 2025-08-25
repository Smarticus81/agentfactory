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

    // Initialize only the default provider
    const defaultProviderConfig = config.providers.find(p => p.type === config.defaultProvider);
    if (!defaultProviderConfig) {
      throw new Error(`Default provider '${config.defaultProvider}' not found in configuration`);
    }

    let provider: any;
    try {
      switch (defaultProviderConfig.type) {
        case 'openai':
          provider = new OpenAIProvider();
          break;
        case 'elevenlabs':
          provider = new ElevenLabsProvider();
          break;
        case 'google':
          provider = new GoogleTTSProvider();
          break;
        case 'playht':
          provider = new PlayHTProvider();
          break;
        default:
          throw new Error(`Unknown provider type: ${defaultProviderConfig.type}`);
      }

      await provider.initialize(defaultProviderConfig.config);
      this.providers.set(defaultProviderConfig.type, provider);
      console.log(`${defaultProviderConfig.type} provider initialized successfully`);
      
      // Set up provider event forwarding
      provider.on('connected', () => this.emit('provider-connected', defaultProviderConfig.type));
      provider.on('disconnected', () => this.emit('provider-disconnected', defaultProviderConfig.type));
      provider.on('error', (error: any) => this.emit('provider-error', defaultProviderConfig.type, error));
      provider.on('audio-chunk', (chunk: any) => this.emit('audio-chunk', chunk));
      provider.on('synthesis-complete', (data: any) => this.emit('synthesis-complete', data));
      
    } catch (error) {
      console.error(`Failed to initialize default provider ${defaultProviderConfig.type}:`, error);
      throw new Error(`Failed to initialize your ${defaultProviderConfig.type} voice service. Please check your API key and subscription.`);
    }

    this.currentProvider = config.defaultProvider;
    this.defaultProvider = config.defaultProvider;



    this.currentProvider = config.defaultProvider;
    this.defaultProvider = config.defaultProvider;
    this.isInitialized = true;
    this.emit('initialized');
  }

  async switchProvider(providerType: string): Promise<void> {
    if (!this.providers.has(providerType)) {
      throw new Error(`Provider ${providerType} not available`);
    }
    
    console.log(`Switching voice provider from ${this.currentProvider} to ${providerType}`);
    this.currentProvider = providerType;
    this.emit('provider-switched', providerType);
  }

  async synthesize(text: string, voice: string, provider?: string): Promise<ArrayBuffer> {
    const targetProvider = provider || this.currentProvider;
    const voiceProvider = this.providers.get(targetProvider);
    
    if (!voiceProvider) {
      throw new Error(`Voice provider '${targetProvider}' is not available. Please ensure your API key is configured correctly.`);
    }
    
    try {
      return await voiceProvider.synthesize(text, voice);
    } catch (error) {
      console.error(`Voice synthesis failed with ${targetProvider}:`, error);
      throw new Error(`Voice synthesis failed with ${targetProvider}. Please check your API key and subscription status.`);
    }
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
