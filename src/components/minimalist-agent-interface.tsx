"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Upload, FileText, Settings, X, Send, Zap, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import Head from 'next/head';

interface MinimalistAgentInterfaceProps {
  agentName: string;
  agentType: 'Family Assistant' | 'Personal Admin' | 'Student Helper' | 'Custom';
  primaryColor?: string;
  secondaryColor?: string;
  voiceProvider: string;
  selectedVoice: string;
  wakeWords: string[];
  user: any;
}

interface AudioContextState {
  context: AudioContext | null;
  analyser: AnalyserNode | null;
  microphone: MediaStreamAudioSourceNode | null;
  dataArray: Uint8Array | null;
  stream: MediaStream | null;
}

interface WaveConfig {
  timeModifier: number;
  lineWidth: number;
  amplitude: number;
  wavelength: number;
  segmentLength: number;
}

export default function MinimalistAgentInterface({
  agentName,
  agentType,
  primaryColor = '#ff6b35',
  secondaryColor = '#1a1a2e',
  voiceProvider,
  selectedVoice,
  wakeWords,
  user,
}: MinimalistAgentInterfaceProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);
  const [textInput, setTextInput] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  
  // Audio context refs
  const audioContextRef = useRef<AudioContextState>({
    context: null,
    analyser: null,
    microphone: null,
    dataArray: null,
    stream: null
  });
  
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);

  // Wave configuration for modern design - Lowered amplitudes for subtler effect
  const waveConfig: WaveConfig[] = [
    { timeModifier: 1, lineWidth: 4, amplitude: 100, wavelength: 150, segmentLength: 15 }, // Reduced amplitude
    { timeModifier: 1, lineWidth: 3, amplitude: 90, wavelength: 80, segmentLength: 12 }, // Reduced amplitude
    { timeModifier: 1, lineWidth: 2, amplitude: -80, wavelength: 40, segmentLength: 8 }, // Reduced amplitude
    { timeModifier: 1, lineWidth: 5, amplitude: 125, wavelength: 200, segmentLength: 20 }, // Much more subtle
    { timeModifier: 1, lineWidth: 1.5, amplitude: -60, wavelength: 60, segmentLength: 10 } // Reduced amplitude
  ];

  const {
    isConnected,
    isListening,
    transcript,
    response,
    mode,
    error,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage
  } = useEnhancedVoice();

  // Audio processing function
  const processAudio = useCallback(() => {
    const { analyser, dataArray } = audioContextRef.current;
    
    if (!analyser || !dataArray || !isActive || isMuted) {
      setAudioLevel(0);
      animationFrameRef.current = requestAnimationFrame(processAudio);
      return;
    }

    try {
      // @ts-ignore - TypeScript issue with Uint8Array types
      analyser.getByteFrequencyData(dataArray);
    } catch (error) {
      console.warn('Audio analysis error:', error);
      setAudioLevel(0);
      animationFrameRef.current = requestAnimationFrame(processAudio);
      return;
    }
    
    let sum = 0;
    const voiceStart = 4;
    const voiceEnd = Math.min(50, dataArray.length);
    
    for (let i = voiceStart; i < voiceEnd; i++) {
      sum += dataArray[i];
    }
    
    const average = sum / (voiceEnd - voiceStart);
    let level = average / 255;
    
    const noiseGate = 0.015;
    if (level < noiseGate) {
      level = 0;
    } else {
      level = (level - noiseGate) / (1 - noiseGate);
      level = Math.pow(level, 0.8);
    }
    
    setAudioLevel(Math.min(1, level * 1.1));
    
    // Debug: Log audio level occasionally
    if (Math.random() < 0.01) { // Log ~1% of the time to avoid spam
      console.log(`Audio level: ${level.toFixed(3)}, Raw average: ${average.toFixed(1)}`);
    }
    
    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, [isActive, isMuted]);

  // Wave animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create gradients with Smarticus colors
    const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    baseGradient.addColorStop(0, primaryColor);
    baseGradient.addColorStop(0.33, "#ff8c66");
    baseGradient.addColorStop(0.66, "#ff6b35");
    baseGradient.addColorStop(1, "#e55a2b");

    const fadeGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    fadeGradient.addColorStop(0, "rgba(255,255,255,0)");
    fadeGradient.addColorStop(0.15, "rgba(255,255,255,1)");
    fadeGradient.addColorStop(0.85, "rgba(255,255,255,1)");
    fadeGradient.addColorStop(1, "rgba(255,255,255,0)");

    const animate = () => {
      timeRef.current -= 0.012; // Increased from 0.007 for faster animation
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let amplitudeMultiplier: number;
      const baseAmplitude = 20; // Reduced from 40 for subtler effect
      const maxAmplitude = 300; // Reduced from 600 for subtler effect

      // Enhanced wave response - respond to voice session state and audio level
      // Special handling for speech output synchronization
      const isSpeaking = response && response.length > 0 && mode === 'command';
      
      if (isSpeaking) {
        // Synchronized animation during speech output
        const speechLevel = 0.2 + Math.sin(timeRef.current * 2.0) * 0.15; // Dynamic speech animation
        amplitudeMultiplier = baseAmplitude + (speechLevel * maxAmplitude * 0.8);
      } else if ((isActive && !isMuted) || (isListening && mode !== 'shutdown')) {
        // Use audio level for active sessions, or more pronounced animation for listening mode
        const effectiveAudioLevel = audioLevel > 0 ? audioLevel : 0.1; // Reduced minimum level
        amplitudeMultiplier = baseAmplitude + (effectiveAudioLevel * maxAmplitude * 0.8); // Reduced multiplier
      } else if (mode === 'wake_word' || isConnected) {
        // Subtle pulse when waiting for wake word
        const calmLevel = 0.05 + Math.sin(timeRef.current * 0.6) * 0.04; // Reduced amplitude
        amplitudeMultiplier = baseAmplitude + (calmLevel * maxAmplitude * 0.5); // Reduced multiplier
      } else {
        // Very subtle animation when idle
        const calmLevel = 0.02 + Math.sin(timeRef.current * 0.3) * 0.02; // Much more subtle
        amplitudeMultiplier = baseAmplitude + (calmLevel * maxAmplitude * 0.3); // Reduced multiplier
      }

      waveConfig.forEach((wave) => {
        drawWave(ctx, timeRef.current, wave, amplitudeMultiplier, baseGradient, canvas.width, canvas.height);
      });

      // Apply fade mask
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = fadeGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isActive, isMuted, primaryColor, isListening, mode, isConnected]);

  const drawWave = (
    ctx: CanvasRenderingContext2D,
    time: number,
    wave: WaveConfig,
    amplitudeMultiplier: number,
    gradient: CanvasGradient,
    width: number,
    height: number
  ) => {
    const { timeModifier, lineWidth, amplitude, wavelength, segmentLength } = wave;
    const yAxis = height / 2;
    
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.beginPath();
    ctx.moveTo(0, yAxis);

    for (let i = 0; i < width; i += segmentLength) {
      const x = (time * timeModifier * 3) + (-yAxis + i) / wavelength;
      const y = Math.sin(x);
      const progress = i / width;
      const amp = ease(progress, amplitude * (amplitudeMultiplier / 100));
      ctx.lineTo(i, amp * y + yAxis);
    }

    ctx.stroke();
  };

  const ease = (percent: number, amplitude: number): number => {
    const PI2 = Math.PI * 2;
    const HALFPI = Math.PI / 2;
    return amplitude * (Math.sin(percent * PI2 - HALFPI) + 1) * 0.5;
  };

  // Start voice interaction
  const startVoiceCall = async (): Promise<void> => {
    try {
      setContentVisible(false);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(new ArrayBuffer(bufferLength));
      
      audioContextRef.current = {
        context: audioContext,
        analyser,
        microphone,
        dataArray,
        stream
      };
      
      setIsActive(true);
      setIsMuted(false);
      
      // Start audio processing
      processAudio();
      
      // Connect the voice service
      await connect({
        agentName,
        wakeWords,
        provider: voiceProvider as any,
        voice: selectedVoice === 'nova' ? 'alloy' : selectedVoice, // Fix: nova is not supported, use alloy instead
        instructions: `You are ${agentName}, a professional ${agentType} assistant. Be helpful, concise, and friendly.`,
        temperature: 0.7,
        enableTools: true,
        // Add API keys from environment variables
        elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
        googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        playhtApiKey: process.env.NEXT_PUBLIC_PLAYHT_API_KEY,
        playhtUserId: process.env.NEXT_PUBLIC_PLAYHT_USER_ID,
        agentId: user?.id,
        userId: user?.id,
      });
      
      // Start listening after connection
      console.log('Voice connected, now starting listening...');
      setTimeout(async () => {
        try {
          await startListening();
          console.log('Voice listening started successfully');
        } catch (error) {
          console.error('Error starting listening:', error);
        }
      }, 500); // Small delay to ensure connection is ready
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setContentVisible(true);
    }
  };

  // End voice interaction
  const endVoiceCall = useCallback((): void => {
    const { stream, context } = audioContextRef.current;
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    if (context) {
      context.close();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    audioContextRef.current = {
      context: null,
      analyser: null,
      microphone: null,
      dataArray: null,
      stream: null
    };
    
    setIsActive(false);
    setIsMuted(false);
    setAudioLevel(0);
    setContentVisible(true);
    
    disconnect();
  }, [disconnect]);

  // Toggle mute
  const toggleMute = useCallback((): void => {
    setIsMuted(prev => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endVoiceCall();
    };
  }, [endVoiceCall]);

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim() && isConnected) {
      await sendMessage(textInput.trim());
      setTextInput('');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedDocs(prev => [...prev, ...files]);
  };

  const removeDocument = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Head>
        <title>{agentName} | Voice Interface</title>
        <meta name="description" content={`Chat with ${agentName}, your AI ${agentType} assistant`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div 
        className="min-h-screen flex flex-col overflow-hidden"
        style={{
          background: '#ffffff',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}
      >
        {/* Modern Header */}
        <header className="fixed top-0 left-0 right-0 display flex justify-between items-center p-8 z-50 bg-white/95 backdrop-blur-[20px]">
          <div className="h-8">
            <Image src="/nexus-logo.svg" alt="Smarticus" width={120} height={32} />
          </div>
          <div className="text-xs font-normal text-gray-400">
            Built with <a href="https://smarticus.ai/" className="text-orange-500 no-underline font-medium transition-colors duration-200 hover:text-orange-600">Smarticus AI</a>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col justify-center items-center relative px-8 py-20 min-h-screen">
          {/* Wave Canvas Background */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none"
            aria-hidden="true"
          />

          {/* Content Text */}
          <div 
            className={`relative z-100 text-center mb-32 transition-all duration-700 ease-out ${
              !contentVisible ? 'opacity-0 transform -translate-y-5 pointer-events-none' : ''
            }`}
          >
            <h1 className="text-6xl font-extrabold leading-tight text-gray-900 mb-6" style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              lineHeight: '1.1'
            }}>
              {agentName}
            </h1>
            <p className="text-xl font-normal leading-relaxed text-gray-600" style={{
              fontSize: '1.125rem',
              lineHeight: '1.6'
            }}>
              Your AI {agentType.toLowerCase()} listens, understands, and responds — like a real conversation.
            </p>
          </div>

          {/* Voice Interface Button - Modern Style */}
          <button
            className={`relative mt-24 px-8 py-4 bg-orange-500 text-white border-none rounded-xl cursor-pointer font-semibold text-base z-50 flex items-center gap-3 transition-all duration-300 shadow-lg ${
              isActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            onClick={startVoiceCall}
            style={{
              boxShadow: '0 4px 20px rgba(255, 107, 53, 0.3)',
              background: primaryColor
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#e55a2b';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 53, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = primaryColor;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 107, 53, 0.3)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            type="button"
          >
            <span className="w-5 h-5 bg-white mask-image">
              <Mic className="w-5 h-5 text-white" />
            </span>
            Tap to Talk
          </button>

          {/* Modern Toolbar */}
          <div className={`fixed bottom-24 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-[20px] border border-gray-200 rounded-full p-1 shadow-lg z-50 h-14 transition-opacity duration-300 ${
            isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}>
            <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 rounded-full h-12">
              <button
                className="bg-none border-none cursor-pointer p-1.5 rounded-full transition-all duration-200 flex items-center justify-center hover:bg-gray-200"
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                type="button"
              >
                {isMuted ? <MicOff className="w-5 h-5 text-gray-700" /> : <Mic className="w-5 h-5 text-gray-700" />}
              </button>
              
              <div className="w-px h-5 bg-gray-200 mx-1.5" />
              
              <button 
                className="bg-none border-none cursor-pointer p-1.5 rounded-full transition-all duration-200 flex items-center justify-center hover:bg-gray-200" 
                title="Options" 
                type="button"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            
            <button
              className="bg-red-100 border-none cursor-pointer px-5 py-2 rounded-full transition-all duration-200 flex items-center gap-1.5 font-medium text-sm text-red-600 uppercase tracking-wide h-12 hover:bg-red-150"
              onClick={endVoiceCall}
              type="button"
            >
              <span className="w-4 h-4 transform rotate-135">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                </svg>
              </span>
              End Call
            </button>
          </div>

          {/* Chat Messages - Modern Style */}
          <div className="fixed bottom-32 left-8 right-8 max-w-4xl mx-auto z-40 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {transcript && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 ml-auto max-w-[80%] mb-4 border border-gray-200/60 shadow-lg"
                >
                  <p className="text-gray-900 text-sm leading-relaxed">{transcript}</p>
                </motion.div>
              )}
              
              {response && (
                <motion.div
                  key="response"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 mr-auto max-w-[80%] mb-4 border border-gray-200/60 shadow-lg"
                >
                  <p className="text-gray-900 leading-relaxed">{response}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Modern Footer */}
        <footer className="fixed bottom-0 left-0 right-0 p-6 z-50">
          <div className="flex justify-center items-center gap-3 text-xs text-gray-400 font-normal">
            <span>Smarticus Conversational AI</span>
            <span className="text-gray-400">•</span>
            <span>Always learning, just like a human</span>
          </div>
        </footer>
      </div>

      {/* Settings Modal - Modern Style */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md border border-gray-200/60"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Agent Information</label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Name: {agentName}</div>
                      <div className="text-sm text-gray-600">Type: {agentType}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Voice Configuration</label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Provider: {voiceProvider}</div>
                      <div className="text-sm text-gray-600">Voice: {selectedVoice}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Wake Words</label>
                    <div className="text-sm text-gray-600">{wakeWords.join(', ')}</div>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold"
                    style={{ background: primaryColor }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Upload Modal - Modern Style */}
      <AnimatePresence>
        {showDocUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto border border-gray-200/60"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900">Upload Documents</h2>
                  <button
                    onClick={() => setShowDocUpload(false)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <p className="text-gray-700 mb-6 font-medium">Upload documents to enhance AI responses</p>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.md"
                      className="hidden"
                      id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload" 
                      className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 cursor-pointer transition-colors font-semibold"
                      style={{ background: primaryColor }}
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Choose Files
                    </label>
                  </div>

                  {/* Uploaded Documents */}
                  {uploadedDocs.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
                      {uploadedDocs.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span className="text-sm text-gray-700 font-medium">{doc.name}</span>
                          </div>
                          <button
                            onClick={() => removeDocument(idx)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <button
                      onClick={() => setShowDocUpload(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Process uploaded documents
                        setShowDocUpload(false);
                      }}
                      className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-semibold"
                      style={{ background: primaryColor }}
                    >
                      Upload ({uploadedDocs.length})
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Toast - Modern Style */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur-xl text-white px-8 py-4 rounded-xl shadow-lg z-50 border border-red-400/30"
          >
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
