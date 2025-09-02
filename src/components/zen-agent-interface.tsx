"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Volume2, VolumeX, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';

interface ZenAgentInterfaceProps {
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

export default function ZenAgentInterface({ agent, apiKeys }: ZenAgentInterfaceProps) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Enhanced voice hook - no parameters needed
  const {
    isConnected,
    isListening,
    mode,
    transcript,
    response,
    error,
    connectionStatus,
    availableVoices,
    currentProvider,
    startListening,
    stopListening,
    connect,
    disconnect,
    sendMessage: sendVoiceMessage,
    interrupt,
    switchProvider,
    setWakeWords
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
          return prev; // Don't duplicate
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
          return prev; // Don't duplicate
        }
        return [...prev, { role: 'assistant', content: response, timestamp: new Date() }];
      });
    }
  }, [response]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user' as const, content: message, timestamp: new Date() };
    setConversation(prev => [...prev, userMessage]);
    
    try {
      await sendVoiceMessage(message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
    
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = async () => {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Floating Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-800 font-medium">{agent.name}</span>
            <Badge variant="secondary" className="rounded-full bg-blue-100 text-blue-700">
              {connectionStatus}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Central Voice Interface */}
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-2xl">
          
          {/* Conversation Display */}
          <motion.div 
            className="mb-8 space-y-4 max-h-96 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <AnimatePresence mode="popLayout">
              {conversation.map((msg, index) => (
                <motion.div
                  key={`message-${index}-${msg.timestamp.getTime()}`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`
                    max-w-xs lg:max-w-md px-4 py-3 rounded-2xl backdrop-blur-xl border border-white/20 shadow-lg
                    ${msg.role === 'user' 
                      ? 'bg-blue-500/90 text-white ml-auto' 
                      : 'bg-white/80 text-slate-800 mr-auto'}
                  `}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Central Voice Button */}
          <motion.div 
            className="flex justify-center mb-8"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <Button
              onClick={toggleListening}
              disabled={!isConnected}
              className={`
                w-24 h-24 rounded-full border-4 transition-all duration-300 shadow-2xl
                ${isListening 
                  ? 'bg-red-500 border-red-300 hover:bg-red-600 animate-pulse' 
                  : 'bg-blue-500 border-blue-300 hover:bg-blue-600'}
                ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <Mic className="w-8 h-8 text-white" />
            </Button>
          </motion.div>

          {/* Live Transcript */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-6"
            >
              <div className="bg-amber-100/80 backdrop-blur-xl rounded-2xl px-4 py-3 border border-amber-200/50">
                <p className="text-amber-800 text-sm font-medium">"{transcript}"</p>
              </div>
            </motion.div>
          )}

          {/* Text Input */}
          <motion.div 
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-white/20"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex space-x-3">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 border-0 bg-transparent focus:ring-0 text-slate-800 placeholder-slate-500"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 bg-red-100/80 backdrop-blur-xl rounded-2xl p-4 border border-red-200/50"
            >
              <p className="text-red-800 text-sm">{error}</p>
            </motion.div>
          )}

        </div>
      </div>

      {/* Floating Controls */}
      <motion.div 
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="flex flex-col space-y-3">
          <Button
            onClick={() => setIsMuted(!isMuted)}
            variant="outline"
            size="sm"
            className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-xl border-white/20 shadow-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          
          <Button
            onClick={() => setShowSettings(!showSettings)}
            variant="outline"
            size="sm"
            className="w-12 h-12 rounded-full bg-white/80 backdrop-blur-xl border-white/20 shadow-lg"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Floating Brand */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="fixed bottom-6 left-6 z-50"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-full px-4 py-2 shadow-lg border border-white/20">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-slate-700 text-sm font-medium">Smarticus</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
