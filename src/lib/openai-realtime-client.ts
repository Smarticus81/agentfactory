import { RealtimeAgent, RealtimeSession, OpenAIRealtimeWebRTC } from '@openai/agents/realtime';
import { EventEmitter } from 'events';


import { executeVoiceCommand } from './voice-command-tools';

export interface VoiceConfig {
  instructions: string;
  voice: string;
  temperature?: number;
  tools?: any[];
  userId?: string;
  agentId?: string;
}

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export class OpenAIRealtimeClient extends EventEmitter {
  private agent: RealtimeAgent | null = null;
  private session: RealtimeSession | null = null;
  private transport: OpenAIRealtimeWebRTC | null = null;
  private mediaStream: MediaStream | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private connected = false;
  private listening = false;
  private isProcessingMessage = false;
  private usingWebRTC = false;

  private userId?: string;
  private agentId?: string;
  private hasActiveResponse = false;

  constructor(config: { apiKey: string }) {
    super();

    // Agent will be created during connect() with proper tools configuration
    console.log('OpenAIRealtimeClient constructor - agent will be initialized on connect');
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
      // Store identifiers for downstream tool execution
      this.userId = config.userId;
      this.agentId = config.agentId;


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

      // Create the RealtimeAgent with basic configuration (NO tools here)
      console.log('Creating RealtimeAgent with configuration...');
      this.agent = new RealtimeAgent({
        name: 'Voice Assistant',
        instructions: config.instructions,
      });
      console.log('RealtimeAgent created');

      // Create session with the agent
      this.session = new RealtimeSession(this.agent, { transport: this.transport });

      // Store tools for session configuration after connection
      (this as any).pendingTools = config.tools;

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

      // Log tools but don't try to configure them via session.update (not supported)
      const pendingTools = (this as any).pendingTools;
      if (pendingTools && pendingTools.length > 0) {
        console.log(`⚠️ Tools provided but OpenAI Realtime SDK doesn't support tools yet:`, pendingTools.map((t: any) => t.function?.name || t.name));
        console.log('Falling back to manual function detection in voice commands');
      } else {
        console.warn('⚠️ No tools provided to OpenAI agent');
      }

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

    // Use a custom emit interceptor for detailed logging and capturing events
    const originalEmit = this.session.emit.bind(this.session);
    (this.session as any).emit = (...args: any[]) => {
      const eventName = args[0];
      const eventData = args[1];

      // Verbose logging for non-delta events
      if (typeof eventName === 'string' && !eventName.includes('delta')) {
        console.log('🔔 OpenAI Event:', eventName, eventData);
      }

      // Track active response state
      if (eventName === 'response.created') {
        this.hasActiveResponse = true;
      }
      if (eventName === 'response.done' || eventName === 'response.failed' || eventName === 'response.cancelled') {
        this.hasActiveResponse = false;
      }

      // CRITICAL: Intercept transport_event to extract user transcripts
      if (
        eventName === 'transport_event' &&
        eventData?.type === 'conversation.item.input_audio_transcription.completed'
      ) {
        console.log('✅✅✅ INTERCEPTED User transcript completed:', eventData.transcript);
        this.emit('transcript', eventData.transcript, true);
      }

      // Handle speech started/stopped events
      if (
        eventName === 'transport_event' &&
        eventData?.type === 'input_audio_buffer.speech_started'
      ) {
        console.log('👂 User started speaking');
        this.listening = true;
        this.emit('speech.started');
      }

      if (
        eventName === 'transport_event' &&
        eventData?.type === 'input_audio_buffer.speech_stopped'
      ) {
        console.log('🛑 User stopped speaking');
        this.listening = false;
        this.emit('speech.stopped');
      }

      // CRITICAL: Listen for tool calls from the agent
      if (
        eventName === 'transport_event' &&
        eventData?.type === 'response.tool_calls.delta' && // Listen for the delta
        eventData?.tool_calls &&
        eventData.tool_calls.length > 0
      ) {
        const toolCall = eventData.tool_calls[0];
        // The tool call object is built up over multiple delta events.
        // We wait for the `function.arguments` to be complete.
        if (toolCall.type === 'function' && toolCall.function?.arguments) {
          // Check if the arguments are a complete JSON string
          if (this.isJsonComplete(toolCall.function.arguments)) {
            // To avoid processing the same tool call multiple times, we can use the call_id as a key
            if (!this.processedToolCalls.has(toolCall.id)) {
              this.processedToolCalls.add(toolCall.id);
              console.log('🛠️ Complete Tool Call Received:', toolCall);
              this.handleToolCall(toolCall);
            }
          }
        }
      }

      return (originalEmit as any)(...args);
    };

    // Keep some original listeners for robustness, though the interceptor is primary
    this.session.on('error', (error: any) => {
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

    (this.session as any).on('close', () => {
      console.log('OpenAI session closed');
      this.connected = false;
      this.emit('connection.status', 'disconnected');
    });
  }

  private isJsonComplete(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  private processedToolCalls = new Set<string>();

  private async handleToolCall(toolCall: any) {
    if (!toolCall || !toolCall.function) {
      console.error('Invalid tool call received:', toolCall);
      return;
    }

    const toolName = toolCall.function.name;
    let toolArgs = {};

    try {
      if (toolCall.function.arguments) {
        toolArgs = JSON.parse(toolCall.function.arguments);
      }
    } catch (error) {
      console.error(`Failed to parse arguments for tool ${toolName}:`, toolCall.function.arguments);
      // Optionally send an error result back to the agent
      return;
    }

    console.log(`Executing tool: ${toolName}`, toolArgs);

    // Execute with user/agent context so tools (e.g., Gmail) can authorize correctly
    const result = await executeVoiceCommand(toolName, toolArgs, this.userId || '', this.agentId);

    console.log('Tool execution result:', result);

    // Send the result back to OpenAI
    if (this.session && toolCall.id) {
      console.log('Sending tool result back to OpenAI for call_id:', toolCall.id);
      (this.session as any).send({
        type: 'conversation.item.create',
        item: {
          type: 'tool_output',
          call_id: toolCall.id,
          output: JSON.stringify(result.details || { success: result.success, message: result.message }),
        },
      });
    }
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

  async sendMessage(content: string, options?: { force?: boolean; role?: 'user' | 'system' }): Promise<void> {
    if (!this.session || !this.connected) {
      throw new Error('Not connected');
    }

    // When using WebRTC transport, the model already receives audio and
    // will auto-generate a response on speech stop. Avoid sending a text
    // message which can cause a concurrent response error.
    if (this.usingWebRTC && !options?.force) {
      console.log('WebRTC active - skipping explicit text message to avoid concurrent responses. Content:', content);
      return;
    }

    // Handle active response
    if (this.hasActiveResponse) {
      console.log('Active response detected. Interrupting before sending new message:', content);
      await this.interruptResponse();
      // Short delay to allow interruption to propagate
      await new Promise(resolve => setTimeout(resolve, 200));
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
        role: options?.role ?? 'user',
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
      console.log('Interrupting current response and audio playback...');

      // Forcefully stop any playing audio
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.src = '';
      }

      // Interrupt the current response generation
      this.session.interrupt();
      this.hasActiveResponse = false;

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