"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Upload, X, Send, Settings, FileText, Camera, User } from 'lucide-react';
import { useEnhancedVoice } from '@/hooks/useEnhancedVoice';

interface MinimalistAgentInterfaceProps {
  agentName: string;
  agentType: "Family Assistant" | "Personal Admin" | "Student Helper" | "Custom";
  primaryColor: string;
  secondaryColor: string;
  voiceProvider: string;
  selectedVoice: string;
  wakeWords: string[];
  user: any;
}

export default function MinimalistAgentInterface({
  agentName,
  agentType,
  primaryColor,
  secondaryColor,
  voiceProvider,
  selectedVoice,
  wakeWords,
  user
}: MinimalistAgentInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState<Array<{id: string, type: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isConnected,
    isListening: isVoiceListening,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendMessage: sendVoiceMessage
  } = useEnhancedVoice();

  useEffect(() => {
    const initializeVoice = async () => {
      try {
        await connect({
          agentName,
          wakeWords,
          provider: voiceProvider as 'elevenlabs' | 'google' | 'playht' | 'openai',
          voice: selectedVoice,
          instructions: `You are ${agentName}, a ${agentType.toLowerCase()} assistant.`,
          temperature: 0.7,
          enableTools: true
        });
      } catch (error) {
        console.error('Failed to initialize voice:', error);
      }
    };

    initializeVoice();

    return () => {
      disconnect();
    };
  }, [agentName, agentType, voiceProvider, selectedVoice, wakeWords, connect, disconnect]);

  const toggleListening = () => {
    if (isVoiceListening || isListening) {
      stopListening();
      setIsListening(false);
    } else {
      startListening();
      setIsListening(true);
    }
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    
    setConversation(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    }]);
    
    setMessage('');
    
    // Simulate assistant response for now
    setTimeout(() => {
      setConversation(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `I understand you said: "${text}". How can I help you with that?`,
        timestamp: new Date()
      }]);
    }, 1000);
  };

  const handleVoiceToggle = () => {
    if (isVoiceListening || isListening) {
      stopListening();
      setIsListening(false);
    } else {
      startListening();
      setIsListening(true);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setUploadedFiles(prev => [...prev, ...newFiles]);
      setShowDocUpload(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center">
      {/* Floating Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-white/20">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            <span className="font-medium text-slate-700">{agentName}</span>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 rounded-full hover:bg-slate-100/50 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Central Voice Control */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center space-y-8">
          {/* Main Voice Button */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <button
              onClick={handleVoiceToggle}
              className={`w-32 h-32 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
                isListening 
                  ? 'bg-gradient-to-br from-red-400 to-red-600 animate-pulse' 
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:shadow-3xl'
              }`}
            >
              {isListening ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>
            
            {/* Listening Animation */}
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-red-400"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.div>

          {/* Status Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <p className="text-2xl font-light text-slate-700">
              {isListening ? 'Listening...' : 'Tap to speak'}
            </p>
            <p className="text-sm text-slate-500">
              or try: "{wakeWords[0]}"
            </p>
          </motion.div>

          {/* Quick Actions */}
          <div className="flex justify-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDocUpload(true)}
              className="p-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all border border-white/40"
            >
              <Upload className="w-6 h-6 text-slate-600" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMessage('')}
              className="p-4 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all border border-white/40"
            >
              <FileText className="w-6 h-6 text-slate-600" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Floating Chat Input */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-md px-6 z-40"
      >
        <div className="bg-white/90 backdrop-blur-xl rounded-full shadow-lg border border-white/20 overflow-hidden">
          <div className="flex items-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(message)}
              placeholder="Type your message..."
              className="flex-1 px-6 py-4 bg-transparent focus:outline-none text-slate-700 placeholder-slate-400"
            />
            <button
              onClick={() => handleSendMessage(message)}
              disabled={!message.trim()}
              className="p-4 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Conversation History (Minimal) */}
      {conversation.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed right-6 top-1/2 transform -translate-y-1/2 w-80 max-h-96 overflow-y-auto space-y-3 z-30"
        >
          {conversation.slice(-3).map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-4 rounded-2xl backdrop-blur-sm border ${
                msg.type === 'user' 
                  ? 'bg-blue-500/90 text-white border-blue-400/30 ml-8' 
                  : 'bg-white/90 text-slate-700 border-white/30 mr-8'
              }`}
            >
              <p className="text-sm">{msg.content}</p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Document Upload Modal */}
      <AnimatePresence>
        {showDocUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setShowDocUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-6">
                <h3 className="text-2xl font-semibold text-slate-800">Add Documents</h3>
                <p className="text-slate-600">Upload files to enhance your assistant's knowledge</p>
                
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-2xl p-8 transition-colors hover:border-blue-400 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">Drop files here or click to browse</p>
                </div>

                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Browse Files</span>
                  </button>
                  
                  <button className="flex items-center space-x-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors">
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-700">Uploaded:</h4>
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                        <span className="text-sm text-slate-700">{file.name}</span>
                        <button onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-slate-800 text-center">Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Assistant Type</label>
                    <p className="text-slate-600">{agentType}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Voice Provider</label>
                    <p className="text-slate-600 capitalize">{voiceProvider}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Voice</label>
                    <p className="text-slate-600">{selectedVoice}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Wake Words</label>
                    <p className="text-slate-600">{wakeWords.join(', ')}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
