"use client";

import { useState, useEffect, useRef, memo } from 'react';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';
import { motion, AnimatePresence } from 'framer-motion';

// Utility function to convert hex to HSL
function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

interface StreamlinedVoiceInterfaceProps {
  agentName: string;
  agentType: 'Event Venue' | 'Venue Bar' | 'Venue Voice';
  primaryColor?: string;
  secondaryColor?: string;
  customization?: {
    layoutStyle?: string;
    theme?: string;
    components?: string[];
    specialFeatures?: string[];
  };
  voiceProvider?: string;
  selectedVoice?: string;
  wakeWords?: string[];
  onboardingComplete?: boolean;
  user: any; // Add user prop
  agentId?: string; // Wire real agent id for RAG
}

const StreamlinedVoiceInterface = memo(({
  agentName,
  agentType,
  primaryColor = '#10a37f',
  secondaryColor = '#059669',
  customization = {},
  voiceProvider = 'openai',
  selectedVoice = 'alloy',
  wakeWords = ['hey bev', 'hey venue', 'hey bar'],
  onboardingComplete = false,
  user, // Add user prop
  agentId,
}: StreamlinedVoiceInterfaceProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [currentProvider, setCurrentProvider] = useState(voiceProvider || 'openai');
  const [currentVoice, setCurrentVoice] = useState(selectedVoice || 'alloy');

  const {
    isConnected,
    isListening,
    mode,
    transcript,
    response,
    ragUsed,
    ragSources,
    error,
    connectionStatus,
    connect,
    disconnect,
    startListening,
    stopListening,
    switchProvider
  } = useEnhancedVoice();

  // Audio visualization state
  const [audioData, setAudioData] = useState<number[]>(new Array(64).fill(0));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Initialize audio analysis for real-time visualization
  const initializeAudioAnalysis = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Analyze microphone input when listening for wake word or commands
      if (mode === 'wake_word' || mode === 'command') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyzerRef.current = audioContextRef.current.createAnalyser();
        
        analyzerRef.current.fftSize = 256;
        analyzerRef.current.smoothingTimeConstant = 0.3;
        analyzerRef.current.minDecibels = -90;
        analyzerRef.current.maxDecibels = -10;
        source.connect(analyzerRef.current);
      }
      
      setIsAnalyzing(true);
      startVisualization();
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
      // Fallback to animated bars without real audio
      setIsAnalyzing(false);
      startVisualization();
    }
  };

  const startVisualization = () => {
    if (!analyzerRef.current) return;
    
    const updateVisualization = () => {
      if (!analyzerRef.current || !isAnalyzing) return;
      
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      analyzerRef.current.getByteFrequencyData(dataArray);
      
      // Convert to normalized values and create smooth animation
      const normalizedData = Array.from(dataArray, (value, index) => {
        const normalized = value / 255;
        // Apply frequency weighting for better visual representation
        const weight = Math.max(0.1, 1 - (index / dataArray.length) * 0.8);
        return normalized * weight;
      });
      
      setAudioData(normalizedData);
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };
    
    updateVisualization();
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleStartListening = async () => {
    try {
      console.log('Voice button clicked - Current state:', { isConnected, mode });
      
      // Initialize audio analysis for visualization
      if (!isAnalyzing) {
        await initializeAudioAnalysis();
      }
      
      if (!isConnected) {
        console.log('Connecting to voice services...');
        await connect({
          agentName,
          wakeWords: wakeWords,
          provider: voiceProvider as any,
          voice: selectedVoice || 'alloy',
          instructions: `You are ${agentName}, a professional ${agentType} assistant. Be helpful, concise, and friendly. Please respond only in English.`,
          temperature: 0.7,
          enableTools: voiceProvider === 'openai', // Only enable tools for OpenAI provider
          elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
          googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
          playhtApiKey: process.env.NEXT_PUBLIC_PLAYHT_API_KEY,
          playhtUserId: process.env.NEXT_PUBLIC_PLAYHT_USER_ID,
          agentId: agentId || 'demo-agent', // Use real agent id when available for RAG
          userId: user?.id || 'demo-user' // Pass user ID for RAG
        });
        console.log('Voice services connected successfully');
      }

      console.log('Starting wake word listening...');
      await startListening();
    } catch (error) {
      console.error('Error in handleStartListening:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center relative overflow-hidden mobile-optimized safe-top safe-bottom safe-left safe-right">
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-500/20 via-transparent to-transparent animate-pulse" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      
      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 flex flex-col items-center justify-center min-h-screen">
        
        {/* Agent Name - Perfectly Centered */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="text-3xl md:text-4xl font-light text-white/95 tracking-wide leading-tight">
            {agentName}
          </h1>
          <p className="text-purple-300/80 mt-2 font-light text-sm tracking-wider uppercase">
            {agentType}
          </p>
        </motion.div>

        {/* Central Audio Visualization + Voice Button Container */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="relative mb-8"
        >
          {/* Synchronized Audio Visualization */}
          <div className="relative w-80 h-32 flex items-center justify-center mb-6">
            {/* Audio Bars */}
            <div className="flex items-end justify-center space-x-1 h-full">
              {audioData.map((value, i) => {
                const height = isListening && isAnalyzing 
                  ? Math.max(8, value * 120) 
                  : Math.random() * 20 + 8;
                
                // Use customization colors for visualization
                const primaryHue = hexToHsl(primaryColor).h;
                const secondaryHue = hexToHsl(secondaryColor).h;
                const hue = mode === 'command' ? primaryHue : mode === 'wake_word' ? secondaryHue : 220;
                const saturation = isListening ? 70 : 30;
                const lightness = 50 + (value * 30);
                
                return (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{
                      backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                      height: `${height}px`,
                      filter: isListening ? 'drop-shadow(0 0 4px currentColor)' : 'none'
                    }}
                    animate={{
                      height: `${height}px`,
                      opacity: isListening ? [0.7, 1, 0.7] : 0.4
                    }}
                    transition={{
                      duration: isListening ? 0.3 + (i * 0.02) : 1,
                      repeat: isListening ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Perfectly Centered Voice Button */}
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartListening}
              className="relative w-20 h-20 rounded-full transition-all duration-700 backdrop-blur-xl border-2 shadow-2xl"
              style={{
                background: mode === 'command' 
                  ? `linear-gradient(135deg, ${primaryColor}90, ${primaryColor}e6)` 
                  : mode === 'wake_word'
                  ? `linear-gradient(135deg, ${secondaryColor}90, ${secondaryColor}e6)`
                  : 'linear-gradient(135deg, #64748b90, #64748be6)',
                borderColor: mode === 'command' 
                  ? `${primaryColor}80` 
                  : mode === 'wake_word'
                  ? `${secondaryColor}80`
                  : '#64748b50',
                boxShadow: mode === 'command' 
                  ? `0 25px 50px -12px ${primaryColor}30` 
                  : mode === 'wake_word'
                  ? `0 25px 50px -12px ${secondaryColor}30`
                  : '0 25px 50px -12px #64748b20'
              }}
            >
              {/* Pulse Rings */}
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2"
                    style={{
                      borderColor: mode === 'command' ? `${primaryColor}30` : `${secondaryColor}30`
                    }}
                  />
                  <motion.div
                    animate={{ scale: [1, 2], opacity: [0.7, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute inset-0 rounded-full border-2"
                    style={{
                      borderColor: mode === 'command' ? `${primaryColor}50` : `${secondaryColor}50`
                    }}
                  />
                </>
              )}
              
              {/* Microphone Icon */}
              <motion.div
                animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-white/95" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </motion.div>
            </motion.button>
          </div>
        </motion.div>

        {/* Status Text - Perfectly Centered */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mb-8"
        >
          <p className="text-white/70 font-light text-sm tracking-wide">
            {mode === 'command' ? 'Listening...' : 
             mode === 'wake_word' ? `Say "${wakeWords[0]}" to start` : 
             'Tap to begin'}
          </p>
        </motion.div>

        {/* Transcript & Response - Perfectly Aligned */}
        <AnimatePresence>
          {(transcript || response) && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="w-full text-center space-y-4"
            >
              {transcript && (
                <div className="p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl">
                  <p className="text-white/90 font-medium text-sm leading-relaxed">
                    {transcript}
                  </p>
                </div>
              )}
              
              {response && (
                <div className="p-6 bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/95 text-base leading-relaxed">
                      {response}
                    </p>
                  </div>
                  {ragUsed && (
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        Knowledge used
                      </span>
                      {ragSources && ragSources.length > 0 && (
                        <div className="mt-2 text-xs text-white/70">
                          <div className="opacity-80">Sources:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {ragSources.slice(0, 5).map((s, i) => (
                              <li key={i} className="truncate" title={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-8 right-8 safe-top safe-right z-40 w-12 h-12 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all duration-300"
      >
        <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </motion.button>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-black/40 backdrop-blur-2xl border-l border-white/20 z-50 p-6 overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-lg">Voice Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-3">Voice Provider</label>
                <div className="space-y-2">
                  {[
                    { id: 'openai', name: 'OpenAI', description: 'Latest GPT-4o voice' },
                    { id: 'elevenlabs', name: 'Eleven Labs', description: 'Premium quality voices' },
                    { id: 'google', name: 'Google Cloud', description: 'Reliable and fast' },
                    { id: 'playht', name: 'Play.ht', description: 'Natural and expressive' }
                  ].map((provider) => (
                    <div
                      key={provider.id}
                      onClick={async () => {
                        console.log(`Switching to ${provider.id} provider`);
                        setCurrentProvider(provider.id);
                        
                        // If connected, reconnect with new provider
                        if (isConnected) {
                          await disconnect();
                          await connect({
                            agentName,
                            wakeWords: wakeWords,
                            provider: provider.id as any,
                            voice: currentVoice,
                            instructions: `You are ${agentName}, a professional ${agentType} assistant. Be helpful, concise, and friendly.`,
                            temperature: 0.7,
                            enableTools: true,
                            elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
                            googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
                            playhtApiKey: process.env.NEXT_PUBLIC_PLAYHT_API_KEY,
                            playhtUserId: process.env.NEXT_PUBLIC_PLAYHT_USER_ID,
                            agentId: agentId || 'demo-agent',
                            userId: user?.id || 'demo-user'
                          });
                        }
                      }}
                      className={`w-full p-3 rounded-xl border transition-all text-left cursor-pointer ${
                        currentProvider === provider.id
                          ? 'border-emerald-400 bg-emerald-500/20'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-white font-medium text-sm">{provider.name}</div>
                      <div className="text-white/60 text-xs">{provider.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-3">Voice Selection</label>
                <div className="text-white/60 text-xs mb-2">Current: {currentVoice}</div>
                <div className="text-white/60 text-xs">Provider: {currentProvider}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast - Fixed Position */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-8 safe-bottom left-1/2 transform -translate-x-1/2 z-50 bg-red-500/90 text-white px-6 py-3 rounded-full backdrop-blur-xl border border-red-400/50 shadow-2xl"
          >
            <p className="text-sm font-medium">
              {error}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

StreamlinedVoiceInterface.displayName = 'StreamlinedVoiceInterface';

export default StreamlinedVoiceInterface;
