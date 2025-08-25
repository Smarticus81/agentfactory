"use client";

import { useState, useEffect, Suspense } from 'react';
import { useUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, Settings, Sparkles, Upload, ChevronRight, Check, Eye, X, Trash2, Loader } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard-layout';
import StreamlinedVoiceInterface from '@/components/streamlined-voice-interface';

// Voice testing functions for different providers
const testElevenLabsVoice = async (text: string, voiceId: string) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    console.log('Eleven Labs voice test:', { text, voiceId, apiKey: apiKey ? 'Present' : 'Missing' });
    
    // Call the test API endpoint
    const response = await fetch('/api/test-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'elevenlabs',
        text,
        voiceId,
        apiKey: apiKey || ''
      })
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('audio/')) {
        // We got audio back - play it
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl); // Clean up
        };
        
        audio.play();
        console.log(`Playing ElevenLabs ${voiceId} voice`);
      } else {
        // We got a JSON response (demo mode or error)
        const result = await response.json();
        console.log('Eleven Labs test result:', result);
        
        if (result.success) {
          // Demo mode - use browser TTS
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
          }
        } else {
          throw new Error(result.error || 'ElevenLabs test failed');
        }
      }
    } else {
      throw new Error('Eleven Labs API call failed');
    }
  } catch (error) {
    console.error('Eleven Labs test failed:', error);
    // Fallback to browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }
};

const testGoogleVoice = async (text: string, voiceId: string) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    console.log('Google Cloud voice test:', { text, voiceId, apiKey: apiKey ? 'Present' : 'Missing' });
    
    const response = await fetch('/api/test-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        text,
        voiceId,
        apiKey: apiKey || ''
      })
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('audio/')) {
        // We got audio back - play it
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl); // Clean up
        };
        
        audio.play();
        console.log(`Playing Google ${voiceId} voice`);
      } else {
        // We got a JSON response (demo mode or error)
        const result = await response.json();
        console.log('Google test result:', result);
        
        if (result.success) {
          // Demo mode - use browser TTS
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
          }
        } else {
          throw new Error(result.error || 'Google test failed');
        }
      }
    } else {
      throw new Error('Google API call failed');
    }
  } catch (error) {
    console.error('Google test failed:', error);
    // Fallback to browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }
};

const testPlayHTVoice = async (text: string, voiceId: string) => {
  try {
    const apiKey = process.env.NEXT_PUBLIC_PLAYHT_API_KEY;
    console.log('PlayHT voice test:', { text, voiceId, apiKey: apiKey ? 'Present' : 'Missing' });
    
    const response = await fetch('/api/test-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'playht',
        text,
        voiceId,
        apiKey: apiKey || ''
      })
    });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('audio/')) {
        // We got audio back - play it
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl); // Clean up
        };
        
        audio.play();
        console.log(`Playing PlayHT ${voiceId} voice`);
      } else {
        // We got a JSON response (demo mode or error)
        const result = await response.json();
        console.log('PlayHT test result:', result);
        
        if (result.success) {
          // Demo mode - use browser TTS
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
          }
        } else {
          throw new Error(result.error || 'PlayHT test failed');
        }
      }
    } else {
      throw new Error('PlayHT API call failed');
    }
  } catch (error) {
    console.error('PlayHT test failed:', error);
    // Fallback to browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }
};

const testOpenAIVoice = async (text: string, voiceId: string) => {
  try {
    console.log('OpenAI voice test:', { text, voiceId });
    
    // For OpenAI, we'll use browser TTS as a demo
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
      console.log(`Playing OpenAI ${voiceId} voice (demo mode)`);
    }
  } catch (error) {
    console.error('OpenAI test failed:', error);
    // Fallback to browser TTS
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    }
  }
};

interface AgentConfig {
  name: string;
  type: 'Event Venue' | 'Venue Bar' | 'Venue Voice';
  description: string;
  instructions: string;
  voiceConfig: {
    provider: string;
    voice: string;
    wakeWords: string[];
    temperature: number;
    enableTools: boolean;
  };
  customization: {
    primaryColor: string;
    secondaryColor: string;
    layoutStyle: string;
    theme: string;
    components: string[];
    specialFeatures: string[];
  };
}

function AgentDesignerPage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id') as Id<"agents"> | null;

  const agentData = useQuery(api.agents.getAgent, agentId ? { agentId } : 'skip');
  const createAgent = useMutation(api.agents.createAgent);
  const updateAgent = useMutation(api.agents.updateAgent);
  const deleteAgent = useMutation(api.agents.deleteAgent);
  const publishAgent = useMutation(api.agents.publishAgent);

  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: '',
    type: 'Event Venue',
    description: '',
    instructions: '',
    voiceConfig: {
      provider: 'openai',
      voice: 'alloy',
      wakeWords: ['hey bev', 'hey venue'],
      temperature: 0.7,
      enableTools: true
    },
    customization: {
      primaryColor: '#10a37f',
      secondaryColor: '#059669',
      layoutStyle: 'modern',
      theme: 'professional',
      components: ['voice-interface', 'data-display'],
      specialFeatures: ['wake-word', 'multi-turn']
    }
  });

  useEffect(() => {
    if (agentData) {
      setAgentConfig({
        name: agentData.name,
        type: agentData.type as any,
        description: agentData.description || '',
        instructions: agentData.customInstructions || '',
        voiceConfig: {
          provider: agentData.voiceConfig?.provider || 'openai',
          voice: agentData.voiceConfig?.voice || 'alloy',
          wakeWords: Array.isArray(agentData.voiceConfig?.wakeWords?.inquiry) ? agentData.voiceConfig.wakeWords.inquiry : ['hey bev'],
          temperature: agentData.voiceConfig?.temperature || 0.7,
          enableTools: agentData.context === 'tools',
        },
        customization: {
          primaryColor: agentData.uiCustomization?.colors?.primary || '#10a37f',
          secondaryColor: agentData.uiCustomization?.colors?.secondary || '#059669',
          layoutStyle: agentData.uiCustomization?.layout || 'modern',
          theme: agentData.uiCustomization?.theme || 'professional',
          components: agentData.uiCustomization?.components || ['voice-interface', 'data-display'],
          specialFeatures: agentData.uiCustomization?.features || ['wake-word', 'multi-turn'],
        },
      });
    }
  }, [agentData]);

  const steps = [
    { id: 1, title: 'Basic Info', description: 'Agent name and type' },
    { id: 2, title: 'Voice Setup', description: 'Voice provider and settings' },
    { id: 3, title: 'Customization', description: 'UI and branding' },
    { id: 4, title: 'Deploy', description: 'Review and launch' }
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveAgent = async () => {
    if (!user?.id) return;
    setIsSaving(true);

    try {
      const agentData = {
        name: agentConfig.name,
        type: agentConfig.type as any,
        description: agentConfig.description,
        customInstructions: agentConfig.instructions,
        context: agentConfig.voiceConfig.enableTools ? 'tools' : 'no-tools',
        voiceConfig: {
          provider: agentConfig.voiceConfig.provider,
          agentName: agentConfig.name,
          voice: agentConfig.voiceConfig.voice,
          temperature: agentConfig.voiceConfig.temperature,
          responseStyle: "professional" as const,
          confidenceThreshold: 0.8,
          wakeWords: {
            order: Array.isArray(agentConfig.voiceConfig.wakeWords) ? agentConfig.voiceConfig.wakeWords : [],
            inquiry: Array.isArray(agentConfig.voiceConfig.wakeWords) ? agentConfig.voiceConfig.wakeWords : [],
          },
        },
        uiCustomization: {
          colors: {
            primary: agentConfig.customization.primaryColor,
            secondary: agentConfig.customization.secondaryColor,
          },
          layout: agentConfig.customization.layoutStyle,
          theme: agentConfig.customization.theme,
          components: agentConfig.customization.components,
          features: agentConfig.customization.specialFeatures,
        },
        tags: [agentConfig.type.toLowerCase().replace(' ', '-')],
      };

      if (agentId) {
        await updateAgent({ agentId, updates: agentData });
        console.log('Agent updated successfully');
      } else {
        const createPayload = { userId: user.id, ...agentData };
        const newAgentId = await createAgent(createPayload);
        console.log('Agent created successfully with ID:', newAgentId);
        router.push(`/dashboard/agent-designer?id=${newAgentId}`)
      }
    } catch (error) {
      console.error("Failed to save agent:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentId) return;
    setIsDeleting(true);
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      await deleteAgent({ agentId, userId });
      console.log('Agent deleted successfully');
      router.push('/dashboard');
    } catch (error) {
      console.error("Failed to delete agent:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handlePublishAgent = async () => {
    if (!agentId) {
      console.error('Cannot publish: No agent ID');
      return;
    }
    
    setIsPublishing(true);
    try {
      // First save the current agent config
      await handleSaveAgent();
      
      // Then publish it
      await publishAgent({ agentId });
      console.log('Agent published successfully');
      
      // Close preview and redirect to deploy page
      setShowPreview(false);
      router.push(`/dashboard/deploy?agentId=${agentId}`);
    } catch (error) {
      console.error("Failed to publish agent:", error);
      alert('Failed to publish agent. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const voiceProviders = [
    { id: 'openai', name: 'OpenAI', voices: [{ id: 'alloy', name: 'Alloy' }, { id: 'echo', name: 'Echo' }, { id: 'fable', name: 'Fable' }, { id: 'onyx', name: 'Onyx' }, { id: 'nova', name: 'Nova' }, { id: 'shimmer', name: 'Shimmer' }] },
    { id: 'elevenlabs', name: 'ElevenLabs', voices: [{ id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' }, { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew' }, { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde' }] },
    { id: 'google', name: 'Google', voices: [{ id: 'en-US-Wavenet-D', name: 'Wavenet-D (Male)' }, { id: 'en-US-Wavenet-E', name: 'Wavenet-E (Female)' }] },
            { id: 'playht', name: 'PlayHT', voices: [{ id: 'en-US-JennyNeural', name: 'Jenny' }, { id: 'en-US-GuyNeural', name: 'Guy' }, { id: 'en-US-AriaNeural', name: 'Aria' }, { id: 'en-US-DavisNeural', name: 'Davis' }] },
  ];

  const selectedProvider = voiceProviders.find(p => p.id === agentConfig.voiceConfig.provider);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <h2 className="text-2xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Agent Name</label>
                <input type="text" value={agentConfig.name} onChange={e => setAgentConfig({ ...agentConfig, name: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Agent Type</label>
                <select value={agentConfig.type} onChange={e => setAgentConfig({ ...agentConfig, type: e.target.value as any })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1">
                  <option>Event Venue</option>
                  <option>Venue Bar</option>
                  <option>Venue Voice</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Description</label>
                <textarea value={agentConfig.description} onChange={e => setAgentConfig({ ...agentConfig, description: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" rows={3}></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">System Instructions</label>
                <textarea value={agentConfig.instructions} onChange={e => setAgentConfig({ ...agentConfig, instructions: e.target.value })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" rows={5}></textarea>
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <h2 className="text-2xl font-semibold mb-4">Voice Setup</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Voice Provider</label>
                <div className="flex space-x-2 mt-1">
                  {voiceProviders.map(provider => (
                    <button key={provider.id} onClick={() => setAgentConfig({ ...agentConfig, voiceConfig: { ...agentConfig.voiceConfig, provider: provider.id, voice: provider.voices[0].id } })} className={`px-4 py-2 rounded-md text-sm ${agentConfig.voiceConfig.provider === provider.id ? 'bg-green-600' : 'bg-gray-700'}`}>
                      {provider.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Voice Selection</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  {selectedProvider?.voices.map(voice => (
                    <div
                      key={voice.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setAgentConfig({ ...agentConfig, voiceConfig: { ...agentConfig.voiceConfig, voice: voice.id } })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setAgentConfig({ ...agentConfig, voiceConfig: { ...agentConfig.voiceConfig, voice: voice.id } });
                        }
                      }}
                      className={`relative p-4 rounded-lg cursor-pointer transition-all duration-200 ${agentConfig.voiceConfig.voice === voice.id ? 'bg-green-800 ring-2 ring-green-500' : 'bg-gray-700 hover:bg-gray-600'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{voice.name}</span>
                        {agentConfig.voiceConfig.voice === voice.id && <Check className="w-5 h-5 text-green-400" />}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const testText = "Hello, this is a test of my voice.";
                          if (selectedProvider.id === 'openai') testOpenAIVoice(testText, voice.id);
                          if (selectedProvider.id === 'elevenlabs') testElevenLabsVoice(testText, voice.id);
                          if (selectedProvider.id === 'google') testGoogleVoice(testText, voice.id);
                          if (selectedProvider.id === 'playht') testPlayHTVoice(testText, voice.id);
                        }}
                        className="mt-2 text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded-full w-full text-center">
                        Test Voice
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Wake Words (comma-separated)</label>
                <input type="text" value={agentConfig.voiceConfig.wakeWords.join(', ')} onChange={e => setAgentConfig({ ...agentConfig, voiceConfig: { ...agentConfig.voiceConfig, wakeWords: e.target.value.split(',').map(w => w.trim()) } })} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 mt-1" />
              </div>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <h2 className="text-2xl font-semibold mb-4">Customization</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Primary Color</label>
                <input type="color" value={agentConfig.customization.primaryColor} onChange={e => setAgentConfig({ ...agentConfig, customization: { ...agentConfig.customization, primaryColor: e.target.value } })} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Secondary Color</label>
                <input type="color" value={agentConfig.customization.secondaryColor} onChange={e => setAgentConfig({ ...agentConfig, customization: { ...agentConfig.customization, secondaryColor: e.target.value } })} className="w-full h-10 p-1 bg-gray-700 border border-gray-600 rounded-md" />
              </div>
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <h2 className="text-2xl font-semibold mb-4">Review and Deploy</h2>
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <p><strong>Name:</strong> {agentConfig.name}</p>
              <p><strong>Type:</strong> {agentConfig.type}</p>
              <p><strong>Voice:</strong> {agentConfig.voiceConfig.provider} - {agentConfig.voiceConfig.voice}</p>
              <p><strong>Primary Color:</strong> <span style={{ color: agentConfig.customization.primaryColor }}>{agentConfig.customization.primaryColor}</span></p>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={handleSaveAgent} disabled={isSaving} className="flex-grow w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center">
                {isSaving ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                {agentId ? 'Save Changes' : 'Create Agent'}
              </button>
              <button onClick={() => setShowPreview(true)} className="flex-grow w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 mr-2" />
                Preview
              </button>
              {agentId && (
                <Link
                  href={`/dashboard/documents?agentId=${agentId}`}
                  className="flex-grow w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Manage Knowledge (RAG)
                </Link>
              )}
              {agentId && (
                <button onClick={() => setShowDeleteConfirm(true)} disabled={isDeleting} className="flex-grow w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center">
                  {isDeleting ? <Loader className="animate-spin w-5 h-5 mr-2" /> : <Trash2 className="w-5 h-5 mr-2" />}
                  Delete Agent
                </button>
              )}
            </div>
          </motion.div>
        );
    }
  };

  if (agentId && !agentData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader className="w-12 h-12 animate-spin text-green-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <Link href="/dashboard" className="flex items-center text-sm text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-2">{agentId ? 'Edit Agent' : 'Create New Agent'}</h1>
          <p className="text-gray-400">{agentId ? `Editing agent: ${agentConfig.name}` : 'Design and configure your voice agent.'}</p>
        </div>

        <div className="flex flex-col md:flex-row space-y-6 md:space-y-0 md:space-x-8">
          <div className="w-full md:w-1/3">
            <nav className="space-y-1">
              {steps.map(step => (
                <div key={step.id} onClick={() => setCurrentStep(step.id)} className={`p-3 rounded-lg cursor-pointer ${currentStep === step.id ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${currentStep >= step.id ? 'bg-green-600' : 'bg-gray-600'}`}>
                      {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                    </div>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-gray-400">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <div className="w-full md:w-2/3 bg-gray-900 p-6 rounded-lg">
            <AnimatePresence mode="wait">
              {renderStep()}
            </AnimatePresence>
            <div className="flex justify-between mt-6">
              <button onClick={handleBack} disabled={currentStep === 1} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                Back
              </button>
              {currentStep < 4 ? (
                <button onClick={handleNext} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                  Next
                </button>
              ) : (
                <div />
              )}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-2xl w-full max-w-md h-full max-h-[700px] flex flex-col overflow-hidden border border-gray-700"
            >
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-bold">Agent Preview</h2>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handlePublishAgent}
                    disabled={isPublishing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold py-2 px-4 rounded-lg flex items-center"
                  >
                    {isPublishing && <Loader className="animate-spin w-4 h-4 mr-2" />}
                    {isPublishing ? 'Publishing...' : 'Publish'}
                  </button>
                  <button onClick={() => setShowPreview(false)} className="p-1 rounded-full hover:bg-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto">
                <StreamlinedVoiceInterface 
                  agentName={agentConfig.name || 'Your Agent'}
                  agentType={agentConfig.type as any}
                  primaryColor={agentConfig.customization.primaryColor}
                  secondaryColor={agentConfig.customization.secondaryColor}
                  customization={agentConfig.customization}
                  voiceProvider={agentConfig.voiceConfig.provider}
                  selectedVoice={agentConfig.voiceConfig.voice}
                  wakeWords={agentConfig.voiceConfig.wakeWords}
                  onboardingComplete={true}
                  user={user}
                  agentId={agentId || undefined}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-700"
            >
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
              <p className="text-gray-400 mt-2">Are you sure you want to delete the agent "{agentConfig.name}"? This action cannot be undone.</p>
              <div className="mt-6 flex justify-end space-x-4">
                <button onClick={() => setShowDeleteConfirm(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                  Cancel
                </button>
                <button onClick={handleDeleteAgent} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center">
                  {isDeleting && <Loader className="animate-spin w-5 h-5 mr-2" />}
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default function AgentDesigner() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader className="w-12 h-12 animate-spin text-green-500" />
        </div>
      </DashboardLayout>
    }>
      <AgentDesignerPage />
    </Suspense>
  )
}