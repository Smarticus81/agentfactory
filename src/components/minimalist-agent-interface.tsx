"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Upload, FileText, Settings, X, Plug, StopCircle } from 'lucide-react';
import Image from 'next/image';
import Head from 'next/head';
import PostDeploymentIntegrations from './post-deployment-integrations';

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

export default function MinimalistAgentInterface({
  agentName,
  agentType,
  primaryColor = '#3b82f6',
  secondaryColor = '#1d4ed8',
  voiceProvider,
  selectedVoice,
  wakeWords,
  user,
}: MinimalistAgentInterfaceProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<File[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Audio context refs
  const audioContextRef = useRef<AudioContextState>({
    context: null,
    analyser: null,
    microphone: null,
    dataArray: null,
    stream: null
  });

  const animationFrameRef = useRef<number>();

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

    // Noise gate and scaling
    const noiseGate = 0.02;
    if (level < noiseGate) {
      level = 0;
    } else {
      level = (level - noiseGate) / (1 - noiseGate);
      level = Math.pow(level, 0.8);
    }

    setAudioLevel(Math.min(1, level * 1.2));
    animationFrameRef.current = requestAnimationFrame(processAudio);
  }, [isActive, isMuted]);

  // Start voice interaction
  const startVoiceCall = async (): Promise<void> => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;

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
      processAudio();

      await connect({
        agentName,
        wakeWords,
        provider: voiceProvider as any,
        voice: selectedVoice === 'nova' ? 'alloy' : selectedVoice,
        instructions: `You are ${agentName}, a professional ${agentType} assistant. Be helpful, concise, and friendly.`,
        temperature: 0.7,
        enableTools: true,
        elevenLabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY,
        googleApiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
        playhtApiKey: process.env.NEXT_PUBLIC_PLAYHT_API_KEY,
        playhtUserId: process.env.NEXT_PUBLIC_PLAYHT_USER_ID,
        agentId: user?.id,
        userId: user?.id,
      });

      setTimeout(async () => {
        try {
          await startListening();
        } catch (error) {
          console.error('Error starting listening:', error);
        }
      }, 500);

    } catch (error) {
      console.error('Error accessing microphone:', error);
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
    disconnect();
  }, [disconnect]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      endVoiceCall();
    };
  }, [endVoiceCall]);

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
        <title>{agentName} | Smarticus</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white font-sans overflow-hidden flex flex-col relative transition-colors duration-500">

        {/* Ambient Background Glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20 blur-[120px] pointer-events-none transition-all duration-1000"
          style={{ background: isActive ? primaryColor : 'transparent' }}
        />

        {/* Header */}
        <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-2">
            <Image src="/smarticus-logo.svg" alt="Smarticus" width={32} height={32} className="opacity-80" />
            <span className="font-semibold text-lg tracking-tight opacity-80">{agentName}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowIntegrations(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Integrations"
            >
              <Plug className="w-5 h-5 opacity-60" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5 opacity-60" />
            </button>
          </div>
        </header>

        {/* Main Interface */}
        <main className="flex-1 flex flex-col items-center justify-center relative z-10 w-full max-w-4xl mx-auto px-4">

          {/* Status / Transcript Area */}
          <div className="absolute top-24 left-0 right-0 text-center space-y-4 pointer-events-none">
            <AnimatePresence mode="wait">
              {!isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-2"
                >
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                    Hi, I&apos;m {agentName}
                  </h1>
                  <p className="text-lg text-gray-500 dark:text-gray-400">
                    Your {agentType.toLowerCase()}. Ready to help.
                  </p>
                </motion.div>
              )}

              {isActive && transcript && (
                <motion.div
                  key="transcript"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-2xl mx-auto px-6"
                >
                  <p className="text-2xl md:text-3xl font-medium text-gray-800 dark:text-gray-200 leading-relaxed">
                    &quot;{transcript}&quot;
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Central Orb / Interaction Point */}
          <div className="relative flex items-center justify-center h-[400px] w-[400px]">
            <AnimatePresence mode="wait">
              {!isActive ? (
                <motion.button
                  key="start-btn"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startVoiceCall}
                  className="group relative w-32 h-32 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-2xl transition-all duration-300"
                  style={{ boxShadow: `0 20px 60px -10px ${primaryColor}40` }}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-700 opacity-100 group-hover:opacity-90 transition-opacity" />
                  <Mic className="w-8 h-8 text-gray-900 dark:text-white relative z-10" />

                  {/* Pulse Ring */}
                  <div className="absolute inset-0 rounded-full border border-gray-200 dark:border-gray-700 animate-ping opacity-20" style={{ animationDuration: '3s' }} />
                </motion.button>
              ) : (
                <motion.div
                  key="active-orb"
                  className="relative flex items-center justify-center"
                >
                  {/* Core Orb */}
                  <motion.div
                    animate={{
                      scale: 1 + audioLevel * 0.5,
                      boxShadow: `0 0 ${30 + audioLevel * 50}px ${primaryColor}60`
                    }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-white to-gray-200 dark:from-white dark:to-gray-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] z-20 relative"
                  />

                  {/* Outer Ripples */}
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.5 + audioLevel],
                        opacity: [0.3, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: "easeOut"
                      }}
                      className="absolute inset-0 rounded-full border border-white/20 dark:border-white/10 z-10"
                      style={{ background: `${primaryColor}10` }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Active Controls */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-12 flex items-center gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-2 rounded-full border border-gray-200 dark:border-gray-800 shadow-xl z-50"
              >
                <button
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition-all ${isMuted
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>

                <button
                  onClick={endVoiceCall}
                  className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium transition-colors flex items-center gap-2"
                >
                  <StopCircle className="w-5 h-5" />
                  <span>End Session</span>
                </button>

                <button
                  onClick={() => setShowDocUpload(true)}
                  className="p-4 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all"
                >
                  <Upload className="w-6 h-6" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Modals (Settings, Integrations, Upload) */}
        {/* Reusing the logic but with cleaner styling */}
        <AnimatePresence>
          {(showSettings || showIntegrations || showDocUpload) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4"
              onClick={() => {
                setShowSettings(false);
                setShowIntegrations(false);
                setShowDocUpload(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {showSettings ? 'Settings' : showIntegrations ? 'Integrations' : 'Upload Documents'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowIntegrations(false);
                      setShowDocUpload(false);
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto">
                  {showSettings && (
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Agent Name</label>
                          <div className="mt-1 text-lg font-medium">{agentName}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</label>
                          <div className="mt-1 text-lg font-medium">{agentType}</div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voice</label>
                          <div className="mt-1 text-lg font-medium capitalize">{selectedVoice} ({voiceProvider})</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {showIntegrations && (
                    <PostDeploymentIntegrations
                      agentId={user?.id || 'default-agent'}
                      agentName={agentName}
                    />
                  )}

                  {showDocUpload && (
                    <div className="space-y-6">
                      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-10 text-center hover:border-blue-500 transition-colors group cursor-pointer relative">
                        <input
                          type="file"
                          multiple
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">Drop files here or click to upload</p>
                        <p className="text-sm text-gray-500 mt-2">Support for PDF, DOCX, TXT</p>
                      </div>

                      {uploadedDocs.length > 0 && (
                        <div className="space-y-2">
                          {uploadedDocs.map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-gray-400" />
                                <span className="text-sm font-medium">{doc.name}</span>
                              </div>
                              <button onClick={() => removeDocument(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-[110] font-medium text-sm"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
