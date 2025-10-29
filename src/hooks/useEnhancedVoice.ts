"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import { WakeWordDetector } from '@/lib/wake-word-detector';
import { VoicePipelineManager } from '@/lib/voice-pipeline-manager';
import { Voice } from '@/lib/voice-providers';
import { OpenAIRealtimeClient } from '@/lib/openai-realtime-client';
import { VOICE_COMMAND_TOOLS, executeVoiceCommand } from '@/lib/voice-command-tools';

// Global singleton to prevent multiple OpenAI instances
let globalOpenAIClient: OpenAIRealtimeClient | null = null;
let globalClientUsers = 0;
let globalConnectionPromise: Promise<void> | null = null;
let isGloballyConnected = false;
const clientsWithListeners = new WeakSet<OpenAIRealtimeClient>();

export interface EnhancedVoiceConfig {
  agentName: string;
  wakeWords: string[];
  provider: 'elevenlabs' | 'google' | 'playht' | 'openai';
  voice: string;
  instructions: string;
  context?: string;
  temperature: number;
  enableTools: boolean;
  elevenLabsApiKey?: string;
  googleApiKey?: string;
  playhtApiKey?: string;
  playhtUserId?: string;
  agentId?: string; // Add agent ID for RAG
  userId?: string; // Add user ID for RAG
}

export interface UseEnhancedVoiceReturn {
  // State
  isConnected: boolean;
  isListening: boolean;
  mode: 'wake_word' | 'command' | 'shutdown';
  transcript: string;
  response: string;
  error: string | null;
  connectionStatus: string;
  availableVoices: Voice[];
  currentProvider: string;
  
  // Actions
  startListening: () => Promise<void>;
  stopListening: () => void;
  connect: (config: EnhancedVoiceConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  interrupt: () => Promise<void>;
  switchProvider: (provider: string) => void;
  setWakeWords: (words: string[]) => void;
}

export function useEnhancedVoice(): UseEnhancedVoiceReturn {
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mode, setMode] = useState<'wake_word' | 'command' | 'shutdown'>('shutdown');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [currentProvider, setCurrentProvider] = useState('openai');

  // Refs
  const wakeWordDetectorRef = useRef<WakeWordDetector | null>(null);
  const voicePipelineRef = useRef<VoicePipelineManager | null>(null);
  const openAIClientRef = useRef<OpenAIRealtimeClient | null>(null);
  const configRef = useRef<EnhancedVoiceConfig | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play audio buffer for voice synthesis
  const playAudioBuffer = useCallback(async (audioBuffer: ArrayBuffer) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioData = await audioContextRef.current.decodeAudioData(audioBuffer.slice(0));
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioData;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      console.log('Playing audio buffer from voice provider');
    } catch (error) {
      console.error('Error playing audio buffer:', error);
    }
  }, []);

  // Initialize voice pipeline
  const initializeVoicePipeline = useCallback(async (config: EnhancedVoiceConfig) => {
    try {
      // Only add the default provider
      let providerConfig = null;
      
      if (config.provider === 'elevenlabs' && config.elevenLabsApiKey) {
        providerConfig = {
          type: 'elevenlabs' as const,
          config: { 
            apiKey: config.elevenLabsApiKey,
            streaming: true, // Enable ultra-low latency streaming
            context: config.context,
            instructions: config.instructions
          }
        };
      } else if (config.provider === 'google' && config.googleApiKey) {
        providerConfig = {
          type: 'google' as const,
          config: { 
            apiKey: config.googleApiKey,
            context: config.context,
            instructions: config.instructions
          }
        };
      } else if (config.provider === 'playht' && config.playhtApiKey && config.playhtUserId) {
        providerConfig = {
          type: 'playht' as const,
          config: { 
            apiKey: config.playhtApiKey,
            userId: config.playhtUserId,
            context: config.context,
            instructions: config.instructions
          }
        };
      }

      if (providerConfig) {
        console.log(`Initializing voice pipeline with ${config.provider} provider...`);
        voicePipelineRef.current = new VoicePipelineManager();
        await voicePipelineRef.current.initialize({
          providers: [providerConfig],
          defaultProvider: config.provider
        });

        // Get available voices
        const voices = await voicePipelineRef.current.getVoices();
        setAvailableVoices(voices);

        // Set up event listeners
        voicePipelineRef.current.on('synthesis-complete', (data) => {
          console.log(`TTS completed in ${data.latency}ms`);
        });
        
        voicePipelineRef.current.on('audio-chunk', (audioBuffer) => {
          // Play audio chunk immediately for streaming
          playAudioBuffer(audioBuffer);
        });
        
        voicePipelineRef.current.on('synthesis-error', (error) => {
          console.error('Voice synthesis error:', error);
          setError(`Voice synthesis failed: ${error.message}`);
        });
        
        voicePipelineRef.current.on('provider-switched', (newProvider: string) => {
          console.log(`Voice provider switched to: ${newProvider}`);
          setCurrentProvider(newProvider);
        });

        console.log(`Voice pipeline successfully initialized with ${config.provider} provider`);
      } else {
        const missingKeys = [];
        if (config.provider === 'elevenlabs' && !config.elevenLabsApiKey) missingKeys.push('ElevenLabs API key');
        if (config.provider === 'google' && !config.googleApiKey) missingKeys.push('Google API key');
        if (config.provider === 'playht' && (!config.playhtApiKey || !config.playhtUserId)) missingKeys.push('PlayHT API key/User ID');
        
        const errorMessage = `${config.provider} voice provider is not properly configured. Missing: ${missingKeys.join(', ')}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to initialize voice pipeline:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // If no providers could be initialized, provide a helpful message
      if (errorMessage.includes('No voice providers could be initialized')) {
        setError('No voice providers are available. Please check your API keys in the environment variables.');
      } else {
        setError(`Failed to initialize voice service: ${errorMessage}`);
      }
    }
  }, []);

  // Initialize wake word detector
  const initializeWakeWordDetector = useCallback((config: EnhancedVoiceConfig) => {
    wakeWordDetectorRef.current = new WakeWordDetector({
      wakeWords: config.wakeWords,
      threshold: 0.5, // Lowered significantly from 0.8 to 0.5 for better wake word detection
      timeout: 30000, // 30 seconds command timeout
      onWakeWordDetected: async (word, confidence) => {
        console.log(`Wake word detected: "${word}" (confidence: ${confidence})`);
        setTranscript(`Wake word: "${word}"`);
        
        // Determine which voice system to use based on provider
        if (config.provider === 'openai') {
          // Use OpenAI Realtime for OpenAI provider only
          if (openAIClientRef.current && !isGloballyConnected) {
            console.log('Wake word detected - establishing OpenAI connection now');
            try {
              globalConnectionPromise = openAIClientRef.current.connect({
                instructions: config.instructions,
                voice: config.voice as any,
                temperature: config.temperature,
                tools: config.enableTools ? VOICE_COMMAND_TOOLS : undefined
              }).then(() => {
                isGloballyConnected = true;
                console.log('OpenAI connection established after wake word');
              });
              await globalConnectionPromise;
            } catch (error) {
              console.error('Failed to connect to OpenAI after wake word:', error);
              setError('Failed to connect to voice assistant');
            }
          }
          
          // Send OpenAI Realtime greeting
          if (openAIClientRef.current?.isConnected) {
            const shortGreeting = `The user just invoked you with the wake word. Greet them briefly as ${config.agentName} and ask how you can help, in English.`;
            try {
              await openAIClientRef.current.sendInitialGreeting(shortGreeting);
            } catch (e) {
              console.error('Failed to send realtime greeting:', e);
            }
          }
        } else {
          // Use voice pipeline for ElevenLabs, Google, PlayHT, etc.
          console.log(`Wake word detected - using ${config.provider} voice pipeline`);
          
          // Generate greeting using voice pipeline
          const greetingText = `Hello! I'm ${config.agentName}. How can I help you today?`;
          setResponse(greetingText);
          
          if (voicePipelineRef.current) {
            try {
              console.log(`Synthesizing greeting with ${config.provider}: "${greetingText}"`);
              const audioBuffer = await voicePipelineRef.current.synthesize(greetingText, config.voice);
              
              // Play the synthesized greeting audio
              if (audioBuffer && audioBuffer.byteLength > 0) {
                await playAudioBuffer(audioBuffer);
              } else {
                console.warn('No audio buffer returned from greeting synthesis, using browser TTS fallback');
                await speakResponse(greetingText);
              }
            } catch (error) {
              console.error(`Failed to synthesize greeting with ${config.provider}:`, error);
              setError(`Voice synthesis failed. Please check your ${config.provider} API key and subscription.`);
            }
          }
        }
        
        setResponse('');
      },
      onCommandReceived: async (command, confidence) => {
        console.log(`Command received: "${command}" (confidence: ${confidence})`);
        setTranscript(command);
        
        // Process command
        await processCommand(command);
      },
      onModeChange: (newMode) => {
        console.log(`Mode changed to: ${newMode}`);
        setMode(newMode);
        
        if (newMode === 'shutdown') {
          setIsListening(false);
          setConnectionStatus('Shutdown - Press button to restart');
          setTranscript('');
          setResponse('Voice assistant has been shut down. Click the voice button to restart.');
        } else if (newMode === 'wake_word') {
          setConnectionStatus('Listening for wake word...');
          setTranscript('');
          const wakeWordsText = config.wakeWords.join('" or "');
          setResponse(`I'm listening for wake words. Say "${wakeWordsText}" to start a conversation.`);
        } else if (newMode === 'command') {
          setConnectionStatus('Listening for commands...');
        }
      }
    });
  }, []);

  // Process voice command
  const processCommand = useCallback(async (command: string) => {
    if (isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    setResponse('');
    
    try {
      // Handle special termination command
      if (command === 'TERMINATION_DETECTED') {
        const goodbyeMessage = "Thanks for chatting! I'll be listening for your wake word.";
        setResponse(goodbyeMessage);
        await speakResponse(goodbyeMessage);
        isProcessingRef.current = false;
        return;
      }
      
      // Use appropriate provider for command processing
      if (configRef.current?.provider === 'openai') {
        // Use OpenAI Realtime for OpenAI provider
        if (openAIClientRef.current?.isConnected) {
          // OpenAI Realtime handles audio automatically - no additional TTS needed
          await openAIClientRef.current.sendMessage(command);
        } else {
          console.error('OpenAI Realtime not connected when trying to send command');
          setError('Voice assistant not ready. Please try again.');
        }
      } else {
        // Use voice pipeline with text completion for other providers (ElevenLabs, Google, PlayHT, etc.)
        console.log(`Processing command with ${configRef.current?.provider} provider: "${command}"`);
        
        try {
          let responseText = '';
          
          // Use provider-specific LLM processing if available (ElevenLabs)
          if (configRef.current?.provider === 'elevenlabs' && voicePipelineRef.current) {
            const currentProvider = voicePipelineRef.current.getCurrentProviderInstance();
            if (currentProvider && 'processTextWithLLM' in currentProvider) {
              console.log('Using ElevenLabs integrated LLM processing with tools');
              responseText = await (currentProvider as any).processTextWithLLM(command, {
                agentId: configRef.current?.agentId,
                userId: configRef.current?.userId,
                instructions: configRef.current?.instructions,
                agentName: configRef.current?.agentName
              });
            }
          }
          
          // Fallback to standard chat API for other providers
          if (!responseText) {
            console.log('Using standard chat API');
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: command,
                instructions: configRef.current?.instructions,
                agentName: configRef.current?.agentName,
                agentId: configRef.current?.agentId,
                userId: configRef.current?.userId,
                enableTools: configRef.current?.provider === 'elevenlabs' // Enable tools for ElevenLabs
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              responseText = data.response || 'I understand, but I\'m not sure how to respond to that.';
              
              // Log if RAG context was used
              if (data.hasContext) {
                console.log('Response enhanced with RAG context from uploaded documents');
              }
              if (data.toolsUsed && data.toolsUsed.length > 0) {
                console.log('Tools used:', data.toolsUsed);
              }
            } else {
              throw new Error('Failed to get text response');
            }
          }
          
          setResponse(responseText);
          
          // Synthesize response using voice pipeline
          if (voicePipelineRef.current) {
            console.log('Synthesizing with voice:', configRef.current?.voice);
            const audioBuffer = await voicePipelineRef.current.synthesize(responseText, configRef.current?.voice!);
            
            // Play the synthesized audio
            if (audioBuffer && audioBuffer.byteLength > 0) {
              await playAudioBuffer(audioBuffer);
            } else {
              console.warn('No audio buffer returned from voice provider, using browser TTS fallback');
              await speakResponse(responseText);
            }
          } else {
            // Fallback to browser TTS
            await speakResponse(responseText);
          }
        } catch (error) {
          console.error('Error getting text response:', error);
          const errorMessage = 'I\'m having trouble processing that request. Could you try again?';
          setResponse(errorMessage);
          await speakResponse(errorMessage);
        }
      }
    } catch (err) {
      console.error('Error processing command:', err);
      setError('Failed to process command');
      // Only use manual TTS for errors if OpenAI Realtime is not connected
      if (!openAIClientRef.current?.isConnected) {
        await speakResponse("Sorry, I encountered an error. Please try again.");
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, []);

  // Speak response using selected provider (only for non-OpenAI providers)
  const speakResponse = useCallback(async (text: string) => {
    if (!text) return;
    
    // Don't speak if OpenAI Realtime is connected (it handles audio automatically)
    if (openAIClientRef.current?.isConnected) {
      console.log('Skipping manual TTS - OpenAI Realtime handles audio');
      return;
    }
    
    try {
      console.log('Speaking response:', { text, provider: configRef.current?.provider, voice: configRef.current?.voice });
      
      if (voicePipelineRef.current && configRef.current?.provider !== 'openai') {
        console.log(`Using ${configRef.current?.provider} voice provider for synthesis`);
        
        // Switch to the correct provider if needed
        if (configRef.current?.provider) {
          await voicePipelineRef.current.switchProvider(configRef.current.provider);
        }
        
        console.log('Using external TTS provider with voice:', configRef.current?.voice);
        const audioBuffer = await voicePipelineRef.current.synthesize(text, configRef.current?.voice!);
      
        // If we get audio buffer directly (non-streaming), play it
        if (audioBuffer && audioBuffer.byteLength > 0) {
          await playAudioBuffer(audioBuffer);
        }
        // For streaming providers like ElevenLabs, audio is handled via events
        
      } else {
        const errorMessage = `Voice synthesis not available. ${configRef.current?.provider} provider is not properly initialized.`;
        console.error(errorMessage);
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error speaking response:', err);
      throw err;
    }
  }, []);

  // Connect to voice services
  const connect = useCallback(async (config: EnhancedVoiceConfig) => {
    try {
      setError(null);
      setConnectionStatus('Connecting...');
      configRef.current = config;

      // Initialize voice pipeline if using external providers
      if (config.provider !== 'openai') {
        await initializeVoicePipeline(config);
      }

      // Initialize OpenAI client only if using OpenAI provider
      if (config.provider === 'openai') {
        // Use global singleton to prevent multiple instances
        if (!globalOpenAIClient) {
          console.log('Creating new OpenAI Realtime client instance (not connecting yet)');
          globalOpenAIClient = new OpenAIRealtimeClient({
            apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || ''
          });
        } else {
          console.log('Reusing existing OpenAI Realtime client instance');
        }
        
        openAIClientRef.current = globalOpenAIClient;
        globalClientUsers++;

        // Set up OpenAI event listeners (only if not already set)
        if (!clientsWithListeners.has(openAIClientRef.current)) {
          openAIClientRef.current.on('transcript', (text: string, isFinal: boolean) => {
            if (isFinal) {
              setTranscript(text);
            }
          });

          openAIClientRef.current.on('text.delta', (delta: string) => {
            setResponse(prev => prev + delta);
          });

          openAIClientRef.current.on('tool.call', async (toolCall: any) => {
            console.log('OpenAI tool call received:', toolCall);

            try {
              const toolName = toolCall.function?.name || toolCall.name;
              const toolArgs = typeof toolCall.function?.arguments === 'string'
                ? JSON.parse(toolCall.function.arguments)
                : toolCall.function?.arguments || toolCall.arguments || {};
              const toolCallId = toolCall.id || toolCall.tool_call_id;

              console.log(`Executing tool: ${toolName}`, toolArgs);

              // Execute the tool with user and agent IDs
              const result = await executeVoiceCommand(
                toolName,
                toolArgs,
                config.userId || 'unknown',
                config.agentId
              );

              console.log(`Tool ${toolName} result:`, result);

              // If Gmail setup is required, provide helpful message
              if (result.setupRequired) {
                const setupMessage = `To use Gmail features, please connect your Gmail account in the integrations settings. You can find this in your agent's configuration page.`;
                await openAIClientRef.current?.submitToolResult(toolCallId, {
                  success: false,
                  error: setupMessage,
                  action: 'prompt_user_for_setup'
                });
              } else {
                // Send the result back to OpenAI
                await openAIClientRef.current?.submitToolResult(toolCallId, result);
              }

            } catch (error) {
              console.error('Error executing tool:', error);
              const errorResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Tool execution failed'
              };

              try {
                const toolCallId = toolCall.id || toolCall.tool_call_id;
                await openAIClientRef.current?.submitToolResult(toolCallId, errorResult);
              } catch (submitError) {
                console.error('Failed to submit error result:', submitError);
              }
            }
          });

          openAIClientRef.current.on('error', (error: any) => {
            console.error('OpenAI error:', error);
            setError(error.message || 'OpenAI connection error');
          });

          clientsWithListeners.add(openAIClientRef.current);
        }

        // NOTE: We don't connect to OpenAI here anymore!
        // Connection will be established when wake word is detected
        console.log('OpenAI client prepared - will connect after wake word detection');
      }

      // Initialize wake word detector
      initializeWakeWordDetector(config);

      console.log('Setting isConnected to true...');
      setIsConnected(true);
      setConnectionStatus('Connected - Press button to start');
      setCurrentProvider(config.provider);
      console.log('Connect function completed - isConnected should now be true');
      
    } catch (err) {
      console.error('Failed to connect:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setConnectionStatus('Connection Failed');
      throw err;
    }
  }, [initializeVoicePipeline, initializeWakeWordDetector]);

  // Start listening
  const startListening = useCallback(async () => {
    console.log('startListening called - checking conditions:', { 
      isConnected, 
      wakeWordDetectorExists: !!wakeWordDetectorRef.current 
    });
    
    // Only check if wake word detector exists (don't rely on React state timing)
    if (!wakeWordDetectorRef.current) {
      console.error('startListening failed - wake word detector not initialized');
      setError('Wake word detector not initialized. Please try again.');
      return;
    }

    try {
      console.log('Calling wakeWordDetectorRef.current.start()...');
      wakeWordDetectorRef.current.start();
      setIsListening(true);
      setMode('wake_word');
      setConnectionStatus('Listening for wake word...');
      console.log('startListening completed successfully');
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('Failed to start listening. Check microphone permissions.');
    }
  }, [isConnected]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current.stop();
    }
    setIsListening(false);
    setMode('shutdown');
    setConnectionStatus('Stopped - Press button to restart');
  }, []);

  // Disconnect all services
  const disconnect = useCallback(async () => {
    try {
      // Stop wake word detector
      if (wakeWordDetectorRef.current) {
        wakeWordDetectorRef.current.stop();
        wakeWordDetectorRef.current = null;
      }

      // Cleanup voice pipeline
      if (voicePipelineRef.current) {
        voicePipelineRef.current.cleanup();
        voicePipelineRef.current = null;
      }

      // Disconnect OpenAI (manage singleton)
      if (openAIClientRef.current) {
        globalClientUsers--;
        console.log(`OpenAI client users: ${globalClientUsers}`);
        
        // Only disconnect if this is the last user
        if (globalClientUsers <= 0) {
          console.log('Last user disconnecting - closing OpenAI client');
          await openAIClientRef.current.disconnect();
          globalOpenAIClient = null;
          globalClientUsers = 0;
          globalConnectionPromise = null;
          isGloballyConnected = false;
        }
        
        openAIClientRef.current = null;
      }

      setIsConnected(false);
      setIsListening(false);
      setMode('shutdown');
      setTranscript('');
      setResponse('');
      setError(null);
      setConnectionStatus('Disconnected');
      setAvailableVoices([]);
      
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }, []);

  // Send manual message
  const sendMessage = useCallback(async (message: string) => {
    if (!isConnected) {
      throw new Error('Not connected');
    }

    setTranscript(message);
    await processCommand(message);
  }, [isConnected, processCommand]);

  // Interrupt current response
  const interrupt = useCallback(async () => {
    if (openAIClientRef.current?.isConnected) {
      await openAIClientRef.current.interruptResponse();
    }
    
    // Stop any ongoing TTS
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, []);

  // Switch voice provider
  const switchProvider = useCallback(async (provider: string) => {
    if (voicePipelineRef.current) {
      await voicePipelineRef.current.switchProvider(provider);
      setCurrentProvider(provider);
    }
  }, []);

  // Set wake words
  const setWakeWords = useCallback((words: string[]) => {
    if (wakeWordDetectorRef.current) {
      wakeWordDetectorRef.current.setWakeWords(words);
    }
    
    if (configRef.current) {
      configRef.current.wakeWords = words;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    // State
    isConnected,
    isListening,
    mode,
    transcript,
    response,
    error,
    connectionStatus,
    availableVoices,
    currentProvider,
    
    // Actions
    startListening,
    stopListening,
    connect,
    disconnect,
    sendMessage,
    interrupt,
    switchProvider,
    setWakeWords
  };
}
