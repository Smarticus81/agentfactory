"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Users, Calendar, BookOpen, ArrowRight, CheckCircle, 
  Cloud, Database, Mail, FileText, Camera, Upload, Download,
  CloudCog, Server, Globe, Lock, Smartphone
} from 'lucide-react';

interface AssistantConfig {
  name: string;
  type: 'Family Assistant' | 'Personal Admin' | 'Student Helper' | 'Custom';
  description: string;
  instructions: string;
  voiceConfig: {
    provider: string;
    voice: string;
    wakeWords: string[];
    temperature: number;
    enableTools: boolean;
  };
  features: string[];
  capabilities: string[];
  useCase: string;
  integrations?: {
    email?: boolean;
    cloudDatabases?: string[];
    documentUpload?: boolean;
  };
}

interface AgentDesignerFormProps {
  initialData?: any;
  onSave: (config: AssistantConfig) => void;
  isSaving: boolean;
  isEditing?: boolean;
}

const assistantTypes = [
  {
    id: 'Family Assistant',
    name: 'Family Assistant',
    description: 'Busy families managing schedules',
    icon: Users,
    features: ['Family calendar', 'School events', 'Meal planning']
  },
  {
    id: 'Personal Admin',
    name: 'Personal Admin',
    description: 'Individual productivity',
    icon: Calendar,
    features: ['Email management', 'Task organization', 'Calendar optimization']
  },
  {
    id: 'Student Helper',
    name: 'Student Helper',
    description: 'Academic organization',
    icon: BookOpen,
    features: ['Homework tracking', 'Study schedules', 'Research help']
  },
  {
    id: 'Custom',
    name: 'Custom Assistant',
    description: 'Build specialized assistant',
    icon: Plus,
    features: ['Custom capabilities', 'Tailored responses']
  }
];

const voiceProviderOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'elevenlabs', label: 'ElevenLabs' }
];

const getVoiceOptions = (provider: string) => {
  switch (provider) {
    case 'openai':
      return [
        { value: 'alloy', label: 'Alloy (Balanced)' },
        { value: 'echo', label: 'Echo (Male)' },
        { value: 'fable', label: 'Fable (British Male)' },
        { value: 'onyx', label: 'Onyx (Deep Male)' },
        { value: 'nova', label: 'Nova (Young Female)' },
        { value: 'shimmer', label: 'Shimmer (Soft Female)' }
      ];
    case 'elevenlabs':
      return [
        { value: 'Rachel', label: 'Rachel (Natural)' },
        { value: 'Sarah', label: 'Sarah (Friendly)' },
        { value: 'Thomas', label: 'Thomas (Professional)' },
        { value: 'Alice', label: 'Alice (Warm)' },
        { value: 'George', label: 'George (Authoritative)' }
      ];
    default:
      return [
        { value: 'Rachel', label: 'Rachel (Natural)' },
        { value: 'Sarah', label: 'Sarah (Friendly)' },
        { value: 'Thomas', label: 'Thomas (Professional)' },
        { value: 'Alice', label: 'Alice (Warm)' },
        { value: 'George', label: 'George (Authoritative)' }
      ];
  }
};

const descriptionOptions = [
  'Helps families stay organized and connected',
  'Manages personal tasks and productivity',
  'Supports academic success and learning',
  'Provides specialized assistance for unique needs',
  'Coordinates team activities and schedules',
  'Manages business operations efficiently'
];

export default function AgentDesignerForm({ initialData, onSave, isSaving, isEditing = false }: AgentDesignerFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig>({
    name: initialData?.name || '',
    type: initialData?.type || 'Family Assistant',
    description: initialData?.description || '',
    instructions: initialData?.customInstructions || '',
    features: [],
    capabilities: [],
    useCase: '',
    voiceConfig: {
      provider: initialData?.voiceConfig?.provider || 'elevenlabs',
      voice: initialData?.voiceConfig?.voice || 'Rachel',
      wakeWords: initialData?.wakeWord ? [initialData.wakeWord] : ['hey assistant'],
      temperature: initialData?.voiceConfig?.temperature || 0.7,
      enableTools: initialData?.voiceConfig?.enableTools ?? true
    },
    integrations: {}
  });

  const canProceed = () => {
    switch (currentStep) {
      case 1: return true;
      case 2: return assistantConfig.name.trim() !== '';
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-4">
          {[
            { id: 1, title: 'Type' },
            { id: 2, title: 'Details' },
            { id: 3, title: 'Voice' },
            { id: 4, title: 'Review' }
          ].map((step) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-1 ${
                  step.id <= currentStep 
                    ? 'bg-accent text-white' 
                    : 'bg-panel border border-hairline text-text-secondary'
                }`}>
                  {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <span className="text-xs text-text-secondary">{step.title}</span>
              </div>
              {step.id < 4 && (
                <div className={`w-12 h-px mx-2 ${
                  step.id < currentStep ? 'bg-accent' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Choose Type - Minimalist Cards */}
        {currentStep === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
          <div className="text-center mb-8">
            <h2 className="text-h2 font-bold text-text-primary mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>Choose Assistant Type</h2>
            <p className="text-text-secondary" style={{ fontFamily: 'Inter, sans-serif' }}>Select the type that best fits your needs</p>
          </div>            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {assistantTypes.map((type) => (
                <motion.div
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setAssistantConfig(prev => ({ ...prev, type: type.id as any }))}
                  className={`bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border cursor-pointer transition-all duration-300 group ${
                    assistantConfig.type === type.id 
                      ? 'border-orange-500/60 bg-orange-50/60 dark:bg-orange-900/20 shadow-xl shadow-orange-500/10' 
                      : 'border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl hover:border-orange-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl shadow-lg text-white transition-all duration-300 ${
                      assistantConfig.type === type.id
                        ? 'bg-gradient-to-br from-orange-500 to-orange-600 scale-110'
                        : type.id === 'Family Assistant'
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                          : type.id === 'Personal Admin'
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                            : type.id === 'Student Helper'
                              ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                              : 'bg-gradient-to-br from-slate-500 to-slate-600'
                    }`}>
                      <type.icon className="w-6 h-6" />
                    </div>
                    {assistantConfig.type === type.id && (
                      <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className={`text-lg font-semibold mb-2 transition-colors ${
                    assistantConfig.type === type.id
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400'
                  }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                    {type.name}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {type.description}
                  </p>
                  
                  <div className="space-y-2">
                    {type.features.slice(0, 2).map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          assistantConfig.type === type.id ? 'bg-orange-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-xs text-slate-600 dark:text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>{feature}</span>
                      </div>
                    ))}
                    {type.features.length > 2 && (
                      <div className="flex items-center space-x-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          assistantConfig.type === type.id ? 'bg-orange-500' : 'bg-slate-400'
                        }`} />
                        <span className="text-xs text-slate-500 dark:text-slate-500">
                          +{type.features.length - 2} more features
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Details with Dropdown Options */}
        {currentStep === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-h2 font-bold text-text-primary mb-2">Assistant Details</h2>
              <p className="text-text-secondary">Give your assistant a name and description</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Assistant Name *
                </label>
                <input
                  type="text"
                  value={assistantConfig.name}
                  onChange={(e) => setAssistantConfig(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Family Helper, Study Buddy, Work Assistant"
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Description
                </label>
                <div className="space-y-2">
                  <select
                    value={assistantConfig.description}
                    onChange={(e) => setAssistantConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                  >
                    <option value="">Select a description or write custom</option>
                    {descriptionOptions.map((desc, idx) => (
                      <option key={idx} value={desc}>{desc}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={assistantConfig.description}
                    onChange={(e) => setAssistantConfig(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Or write a custom description..."
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={assistantConfig.instructions}
                  onChange={(e) => setAssistantConfig(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Specific instructions for how your assistant should behave..."
                  rows={4}
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Voice Settings */}
        {currentStep === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-h2 font-bold text-text-primary mb-2">Voice Configuration</h2>
              <p className="text-text-secondary">Choose voice and wake words</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Voice Provider
                </label>
                <div className="flex space-x-4">
                  {voiceProviderOptions.map((provider) => (
                    <div
                      key={provider.value}
                      onClick={() => {
                        const newProvider = provider.value;
                        const defaultVoice = newProvider === 'openai' ? 'nova' : 'Rachel';
                        setAssistantConfig(prev => ({
                          ...prev,
                          voiceConfig: { 
                            ...prev.voiceConfig, 
                            provider: newProvider,
                            voice: defaultVoice
                          }
                        }));
                      }}
                      className={`flex-1 p-4 border rounded-lg cursor-pointer transition-all ${
                        assistantConfig.voiceConfig.provider === provider.value
                          ? 'border-accent bg-accent/5'
                          : 'border-hairline hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Smartphone className="w-5 h-5" />
                        <span className="font-medium">{provider.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Voice
                </label>
                <select
                  value={assistantConfig.voiceConfig.voice}
                  onChange={(e) => setAssistantConfig(prev => ({
                    ...prev,
                    voiceConfig: { ...prev.voiceConfig, voice: e.target.value }
                  }))}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                >
                  {getVoiceOptions(assistantConfig.voiceConfig.provider).map((voice) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Wake Words
                </label>
                <input
                  type="text"
                  value={assistantConfig.voiceConfig.wakeWords.join(', ')}
                  onChange={(e) => setAssistantConfig(prev => ({
                    ...prev,
                    voiceConfig: {
                      ...prev.voiceConfig,
                      wakeWords: e.target.value.split(',').map(w => w.trim()).filter(Boolean)
                    }
                  }))}
                  placeholder="hey assistant, hello helper"
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <p className="text-xs text-text-secondary mt-1">Separate multiple wake words with commas</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Review & Save */}
        {currentStep === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-h2 font-bold text-text-primary mb-2">Review Your Agent</h2>
              <p className="text-text-secondary">Review your configuration before creating your agent</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              <div className="card-base p-6">
                <h3 className="text-lg font-semibold mb-4">Agent Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Name:</span>
                    <span>{assistantConfig.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Type:</span>
                    <span>{assistantConfig.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Voice:</span>
                    <span>{assistantConfig.voiceConfig.voice} ({assistantConfig.voiceConfig.provider})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Wake Words:</span>
                    <span>{assistantConfig.voiceConfig.wakeWords.join(', ')}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-base p-6 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark">
                  After creating your agent, you can connect integrations like Gmail, Calendar, and upload documents from the Integrations page.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex space-x-4">
          {currentStep < 4 ? (
            <button
              onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
              disabled={!canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button
              onClick={() => onSave(assistantConfig)}
              disabled={isSaving || !canProceed()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 mr-2"
                  >
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  </motion.div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Assistant' : 'Create Assistant'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
