"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Sparkles } from 'lucide-react';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';

interface PremiumVoiceInterfaceProps {
  agent: {
    id: string;
    name: string;
    description: string;
    instructions: string;
    voice?: string;
    provider?: 'elevenlabs' | 'google' | 'playht' | 'openai';
    wakeWords?: string[];
    temperature?: number;
    enableTools?: boolean;
  };
  apiKeys: {
    elevenLabsApiKey?: string;
    googleApiKey?: string;
    playhtApiKey?: string;
    playhtUserId?: string;
  };
}

export default function PremiumVoiceInterface({ agent, apiKeys }: PremiumVoiceInterfaceProps) {
  const [conversation, setConversation] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  
  // Enhanced voice hook
  const {
    isConnected,
    isListening,
    transcript,
    response,
    error,
    connectionStatus,
    startListening,
    stopListening,
    connect,
    disconnect,
  } = useEnhancedVoice();

  // Initialize voice connection
  useEffect(() => {
    const initializeVoice = async () => {
      try {
        await connect({
          agentName: agent.name,
          wakeWords: agent.wakeWords || ['hey assistant', agent.name.toLowerCase()],
          provider: agent.provider || 'openai',
          voice: agent.voice || 'alloy',
          instructions: agent.instructions,
          temperature: agent.temperature || 0.7,
          enableTools: agent.enableTools || false,
          ...apiKeys,
          agentId: agent.id,
        });
      } catch (error) {
        console.error('Failed to initialize voice:', error);
      }
    };

    initializeVoice();
    return () => {
      disconnect();
    };
  }, [agent, apiKeys, connect, disconnect]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript) {
      setConversation(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'user' && lastMessage.content === transcript) {
          return prev;
        }
        return [...prev, { role: 'user', content: transcript, timestamp: new Date() }];
      });
    }
  }, [transcript]);

  // Handle response updates
  useEffect(() => {
    if (response) {
      setConversation(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content === response) {
          return prev;
        }
        return [...prev, { role: 'assistant', content: response, timestamp: new Date() }];
      });
    }
  }, [response]);

  const handleVoiceToggle = async () => {
    try {
      if (isListening) {
        stopListening();
      } else {
        await startListening();
      }
    } catch (error) {
      console.error('Failed to toggle listening:', error);
    }
  };

  return (
    <div className="min-h-screen bg-primary flex-center">
      <div className="container">
        {/* Status Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="heading-lg mb-2">
            {agent.name}
          </h1>
          <p className="body-lg">
            {agent.description}
          </p>
          <div className="mt-4">
            <span 
              className={`badge ${isConnected ? 'badge-accent' : ''}`}
              style={{
                backgroundColor: isConnected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 107, 53, 0.1)',
                borderColor: isConnected ? '#28a745' : 'var(--primary-orange)',
                color: isConnected ? '#28a745' : 'var(--primary-orange)'
              }}
            >
              {isConnected 
                ? isListening 
                  ? 'Listening...' 
                  : 'Ready'
                : 'Connecting...'}
            </span>
          </div>
        </motion.div>

        {/* Voice Interface */}
        <div className="flex-center mb-12">
          <motion.div
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Outer Pulsing Ring */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [1, 1.4, 1], 
                    opacity: [0.3, 0.1, 0.3] 
                  }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'var(--primary-orange)',
                    filter: 'blur(1px)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Main Microphone Button */}
            <motion.button
              onClick={handleVoiceToggle}
              disabled={!isConnected}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-32 h-32 rounded-full flex-center cursor-pointer transition-all duration-300 border-2"
              style={{
                background: isListening 
                  ? 'linear-gradient(135deg, var(--primary-orange) 0%, #e55a2b 100%)'
                  : 'var(--bg-card)',
                borderColor: isListening ? 'var(--primary-orange)' : 'var(--border-medium)',
                boxShadow: isListening 
                  ? 'inset 0 4px 8px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(255, 107, 53, 0.3)'
                  : 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 4px 12px var(--shadow-light)',
              }}
            >
              <motion.div
                animate={{ 
                  scale: isListening ? [1, 1.1, 1] : 1,
                  rotate: isListening ? [0, 5, -5, 0] : 0
                }}
                transition={{ 
                  duration: isListening ? 1.5 : 0.3,
                  repeat: isListening ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <Mic 
                  className="w-12 h-12" 
                  style={{ 
                    color: isListening ? 'white' : 'var(--primary-orange)',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                  }} 
                />
              </motion.div>
            </motion.button>

            {/* Inner Glow Effect */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-2 rounded-full pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle, rgba(255, 107, 53, 0.2) 0%, transparent 70%)',
                  }}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Voice Status */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="body-lg mb-4">
            {isListening 
              ? "Listening..." 
              : isConnected 
                ? "Tap to speak" 
                : "Connecting..."
            }
          </p>
          
          {/* Transcript Display */}
          <AnimatePresence>
            {transcript && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card max-w-2xl mx-auto"
              >
                <p className="body-md">
                  <strong>You:</strong> {transcript}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Response Display */}
          <AnimatePresence>
            {response && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card max-w-2xl mx-auto mt-4"
                style={{ backgroundColor: 'rgba(255, 107, 53, 0.05)' }}
              >
                <p className="body-md">
                  <strong>{agent.name}:</strong> {response}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Conversation History */}
        {conversation.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            <h3 className="heading-md text-center mb-6">
              Conversation History
            </h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: message.role === 'user' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`card ${message.role === 'assistant' ? 'ml-8' : 'mr-8'}`}
                  style={{
                    backgroundColor: message.role === 'assistant' 
                      ? 'rgba(255, 107, 53, 0.05)' 
                      : 'var(--bg-card)'
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div 
                      className="w-8 h-8 rounded-full flex-center"
                      style={{
                        backgroundColor: message.role === 'assistant' 
                          ? 'var(--primary-orange)' 
                          : 'var(--bg-secondary)'
                      }}
                    >
                      {message.role === 'assistant' ? (
                        <Sparkles className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-secondary"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="body-sm mb-1" style={{ color: 'var(--text-light)' }}>
                        {message.role === 'assistant' ? agent.name : 'You'} • {message.timestamp.toLocaleTimeString()}
                      </p>
                      <p className="body-md">
                        {message.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed bottom-8 right-8 card max-w-sm"
              style={{ 
                backgroundColor: '#fee', 
                borderColor: '#fcc'
              }}
            >
              <p className="body-sm" style={{ color: '#c33' }}>
                <strong>Error:</strong> {error}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fello Brand */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="text-light text-sm font-medium">Fello.ai</div>
        </motion.div>
      </div>
    </div>
  );
}
