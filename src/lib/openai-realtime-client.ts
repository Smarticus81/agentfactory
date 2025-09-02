import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC } from '@openai/agents/realtime';
import { EventEmitter } from 'events';

export interface VoiceConfig {
  instructions: string;
  voice: string;
  temperature?: number;
  tools?: any[];
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export class OpenAIRealtimeClient extends EventEmitter {
  private agent: RealtimeAgent;
  private session: RealtimeSession | null = null;
  private transport: OpenAIRealtimeWebRTC | null = null;
  private mediaStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private connected = false;
  private listening = false;
  private isProcessingMessage = false;
  private usingWebRTC = false;

  constructor(config: { apiKey: string }) {
    super();
    
    // Create the RealtimeAgent with default configuration
    this.agent = new RealtimeAgent({
      name: 'Voice Assistant',
      instructions: 'You are a helpful voice assistant.',
    });
  }

  // Send a short greeting immediately after connection, even with WebRTC active,
  // to minimize TTFT after the wake word.
  async sendInitialGreeting(content: string): Promise<void> {
    if (!this.session || !this.connected) return;

    // Prevent overlapping responses
    if (this.isProcessingMessage) {
      console.log('Skipping greeting - a response is already in progress');
      return;
    }

    try {
      this.isProcessingMessage = true;
      console.log('Sending initial greeting:', content);

      // We intentionally allow a text message here even with WebRTC to trigger TTS immediately
      this.session.sendMessage({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: content }]
      } as any);

      // Reset processing state after a brief window to allow next command
      setTimeout(() => {
        this.isProcessingMessage = false;
      }, 800);
    } catch (error) {
      this.isProcessingMessage = false;
      console.error('Failed to send initial greeting:', error);
    }
  }

  async connect(config: VoiceConfig): Promise<void> {
    try {
      console.log('Initializing WebRTC connection with OpenAI Realtime API...');
      
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log('Microphone access granted');

      // Create audio element for playback
      this.audioElement = document.createElement('audio');
      this.audioElement.autoplay = true;
      this.audioElement.controls = false;
      document.body.appendChild(this.audioElement);

      // Create WebRTC transport
      this.transport = new OpenAIRealtimeWebRTC({
        mediaStream: this.mediaStream,
        audioElement: this.audioElement,
        useInsecureApiKey: true, // Required for browser environments
      });
      this.usingWebRTC = true;

      // Create session with the agent
      this.session = new RealtimeSession(this.agent, { transport: this.transport });

      // Update agent instructions and voice configuration
      this.agent.instructions = config.instructions;
      // Configure voice on the agent itself
      (this.agent as any).voice = config.voice;
      
      // Configure voice settings
      console.log(`Configuring OpenAI voice: ${config.voice}`);
      
      // Map old voice names to new supported ones
      const voiceMapping: { [key: string]: string } = {
        'Alice': 'alloy',
        'alloy': 'alloy',
        'ash': 'ash', 
        'ballad': 'ballad',
        'coral': 'coral',
        'echo': 'echo',
        'sage': 'sage',
        'shimmer': 'shimmer',
        'verse': 'verse',
        'marin': 'marin',
        'cedar': 'cedar'
      };
      
      const mappedVoice = voiceMapping[config.voice] || 'alloy';
      console.log(`Voice mapping: ${config.voice} → ${mappedVoice}`);
      (this.agent as any).voice = mappedVoice;

      // Validate API key
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      console.log('OpenAI API Key status:', {
        exists: !!apiKey,
        length: apiKey?.length || 0,
        prefix: apiKey?.substring(0, 7) || 'none'
      });
      
      if (!apiKey) {
        throw new Error('NEXT_PUBLIC_OPENAI_API_KEY environment variable is not set');
      }
      
      // Connect to OpenAI with voice configuration
      console.log('Connecting to OpenAI with model: gpt-4o-realtime-preview-2025-06-03');
      await this.session.connect({ 
        apiKey: apiKey,
        model: 'gpt-4o-realtime-preview-2025-06-03'
      } as any);
      
      // Configure session after connection
      if (this.session) {
        // Store voice preference for later use
        console.log(`Voice preference stored: ${config.voice}`);
        
        // The voice and session configuration are now handled during connection
        // No need to send session.update as it's not supported in this API version
        console.log(`Session configured with voice: ${config.voice}`);
      }
      
      // Session configuration: agent instructions already set above.
      // Voice and modalities are determined by the model/session defaults.
      // Avoid sending unsupported session.update messages.

      console.log('WebRTC connection established successfully');
      this.connected = true;

      // Log voice configuration
      console.log(`OpenAI voice configured: ${config.voice}`);

      // Set up event listeners
      this.setupEventListeners();

      this.emit('connection.open', {});
    } catch (error) {
      console.error('Failed to establish WebRTC connection:', error);
      this.emit('error', error);
      throw error;
    }
  }

  private setupEventListeners() {
    if (!this.session) return;

    // Listen for speech started/stopped events
    this.session.on('input_audio_buffer.speech_started' as any, () => {
      console.log('User started speaking');
      this.listening = true;
      this.emit('speech.started');
    });

    this.session.on('input_audio_buffer.speech_stopped' as any, () => {
      console.log('User stopped speaking');
      this.listening = false;
      this.emit('speech.stopped');
    });

    // Listen for transcript events
    this.session.on('input_audio_buffer.transcript' as any, (event: any) => {
      console.log('Transcript received:', event.text, event.is_final);
      this.emit('transcript', event.text, event.is_final);
    });

    // Listen for response events
    this.session.on('response.output_audio.delta' as any, (event: any) => {
      console.log('Audio response delta received');
      this.emit('audio.delta', event);
    });

    this.session.on('response.output_text.delta' as any, (event: any) => {
      console.log('Text response delta received:', event.delta);
      this.emit('text.delta', event.delta);
    });

    this.session.on('response.completed' as any, () => {
      console.log('Response completed');
      this.isProcessingMessage = false; // Allow new messages
      this.emit('response.completed');
    });

    // Listen for tool call events
    this.session.on('response.function_call' as any, (event: any) => {
      console.log('Function call received:', event);
      this.emit('tool.call', event);
    });

    // Listen for errors
    this.session.on('error' as any, (error: any) => {
      console.error('=== OpenAI Session Error Details ===');
      console.error('Type:', error?.type);
      console.error('Message:', error?.message);
      console.error('Error Code:', error?.error?.code);
      console.error('Error Type:', error?.error?.type);
      console.error('Error Message:', error?.error?.message);
      console.error('Full Error Object:', JSON.stringify(error, null, 2));
      console.error('==========================================');
      
      // Reset processing state on error to prevent blocking
      this.isProcessingMessage = false;
      
      this.emit('error', error);
    });
  }

  async disconnect(): Promise<void> {
    try {
      if (this.session) {
        // Close the session properly
        this.session.close();
        this.session = null;
      }

      if (this.transport) {
        this.transport = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }

      if (this.audioElement) {
        this.audioElement.remove();
        this.audioElement = null;
      }

      this.connected = false;
      this.listening = false;

      console.log('WebRTC connection closed');
      this.emit('connection.close', {});
    } catch (error) {
      console.error('Error disconnecting:', error);
      throw error;
    }
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.session || !this.connected) {
      throw new Error('Not connected');
    }

    // When using WebRTC transport, the model already receives audio and
    // will auto-generate a response on speech stop. Avoid sending a text
    // message which can cause a concurrent response error.
    if (this.usingWebRTC) {
      console.log('WebRTC active - skipping explicit text message to avoid concurrent responses. Content:', content);
      return;
    }

    // Prevent concurrent messages
    if (this.isProcessingMessage) {
      console.log('Skipping message - already processing:', content);
      return;
    }

    try {
      this.isProcessingMessage = true;
      console.log('Sending message:', content);
      
      // Send message with supported format for OpenAI Realtime API
      this.session.sendMessage({
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: content
        }]
      } as any);

      console.log('Message sent successfully');
      
      // Allow next message after a short delay
      setTimeout(() => {
        this.isProcessingMessage = false;
      }, 500);
      
    } catch (error) {
      this.isProcessingMessage = false;
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  async sendVoiceMessage(): Promise<void> {
    if (!this.session || !this.connected) {
      throw new Error('Not connected');
    }

    try {
      console.log('Sending voice message');
      // With WebRTC, audio is already streamed; no explicit message needed.
      if (this.usingWebRTC) {
        console.log('WebRTC active - not sending placeholder message. The session will respond automatically.');
        return;
      }

      // Fallback (non-WebRTC) path: send a minimal message
      this.session.sendMessage({
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: 'Listening' }]
      } as any);

      console.log('Voice message sent successfully');
    } catch (error) {
      console.error('Failed to send voice message:', error);
      throw error;
    }
  }

  async interruptResponse(): Promise<void> {
    if (!this.session || !this.connected) return;

    try {
      console.log('Interrupting current response');
      
      // Interrupt the current response
      this.session.interrupt();
      
      console.log('Response interrupted successfully');
    } catch (error) {
      console.error('Failed to interrupt response:', error);
    }
  }

  // Getters for state
  get isConnected(): boolean {
    return this.connected;
  }

  get isListening(): boolean {
    return this.listening;
  }

  get connectionStatus(): string {
    return this.connected ? 'Connected' : 'Disconnected';
  }
}