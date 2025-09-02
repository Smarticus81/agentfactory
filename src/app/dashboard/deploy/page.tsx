'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deploymentService, DeploymentResult } from '@/lib/deployment-service';
import { VoiceTier } from '@/lib/types';
import { VOICE_PIPELINE_CONFIGS, OPENAI_REALTIME_CONFIGS, LIVEKIT_AGENTS_CONFIGS, getArchitectureConfig, getLiveKitAgentsConfig, comparePlatforms } from '@/lib/voice-pipeline-config';

interface Agent {
  _id: string;
  name: string;
  type: string;
  description: string;
  customInstructions?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function DeployPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<'openai' | 'livekit'>('openai');
  const [voicePipeline, setVoicePipeline] = useState<{
    tier: VoiceTier;
    architecture?: string;
    framework?: string;
  }>({ tier: 'starter' });
  const [deploymentConfig, setDeploymentConfig] = useState<any>(null);
  const [deploying, setDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch agents from database
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        
        // Fetch agents from your database/API
        const response = await fetch('/api/agents');
        if (response.ok) {
          const data = await response.json();
          setAgents(data.agents || []);
          
          // Set first agent as default if available
          if (data.agents && data.agents.length > 0) {
            setSelectedAgent(data.agents[0]);
          }
        } else {
          console.error('Failed to fetch agents');
          setError('Failed to load agents');
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
        setError('Failed to load agents');
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  const handlePlatformChange = (newPlatform: 'openai' | 'livekit') => {
    setPlatform(newPlatform);
    // Reset voice pipeline when platform changes
    setVoicePipeline({ tier: 'starter' });
  };

  const handleVoicePipelineChange = (tier: VoiceTier, architecture?: string, framework?: string) => {
    setVoicePipeline({ tier, architecture, framework });
  };

  const handleDeploy = async () => {
    if (!selectedAgent || !voicePipeline.tier) {
      setError('Please select an agent and voice pipeline tier');
      return;
    }

    setDeploying(true);
    setError(null);

    try {
      const config = {
        agentId: selectedAgent._id,
        agentName: selectedAgent.name,
        platform,
        tier: voicePipeline.tier,
        deploymentType: 'pwa' as const,
        pwaConfig: {
          name: selectedAgent.name,
          shortName: selectedAgent.name.split(' ')[0],
          description: selectedAgent.description,
          themeColor: '#6D5EF8',
          backgroundColor: '#F7F6FB',
          display: 'standalone' as const,
          orientation: 'portrait' as const,
          scope: '/',
          startUrl: '/',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        voiceConfig: {
          platform,
          tier: voicePipeline.tier,
          features: platform === 'openai' 
            ? VOICE_PIPELINE_CONFIGS[voicePipeline.tier]?.features || []
            : LIVEKIT_AGENTS_CONFIGS[voicePipeline.tier]?.features || [],
          architecture: voicePipeline.architecture,
          components: platform === 'openai' 
            ? getArchitectureConfig(voicePipeline.tier)
            : getLiveKitAgentsConfig(voicePipeline.tier)
        }
      };

      const result = await deploymentService.deployToVercel(config);
      setDeploymentResult(result);

      if (result.success) {
        setCurrentStep(4); // Success step
      } else {
        setError(result.error || 'Deployment failed');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  const getPlatformConfig = () => {
    if (platform === 'openai') {
      return OPENAI_REALTIME_CONFIGS;
    } else {
      return LIVEKIT_AGENTS_CONFIGS;
    }
  };

  const getCurrentConfig = () => {
    if (platform === 'openai') {
      return VOICE_PIPELINE_CONFIGS[voicePipeline.tier];
    } else {
      return LIVEKIT_AGENTS_CONFIGS[voicePipeline.tier];
    }
  };

  const currentConfig = getCurrentConfig();
  const platformConfigs = getPlatformConfig();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-slate-600">Loading agents...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && agents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Failed to Load Agents</h1>
            <p className="text-slate-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">No Agents Found</h1>
            <p className="text-slate-600 mb-4">You need to create an agent before you can deploy it.</p>
            <Button onClick={() => window.location.href = '/dashboard/agent-designer'}>
              Create Your First Agent
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Deploy Your Voice Agent</h1>
          <p className="text-lg text-slate-600">
            Deploy your AI voice assistant as a PWA optimized for mobile devices
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  currentStep >= step 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {currentStep > step ? <CheckCircle className="w-6 h-6" /> : step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-500' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Agent Selection */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Select Your Agent</CardTitle>
                  <CardDescription>
                    Choose which AI assistant you want to deploy as a voice agent
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agents.map((agent) => (
                    <div
                      key={agent._id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedAgent?._id === agent._id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <h3 className="font-semibold text-slate-900">{agent.name}</h3>
                      <p className="text-slate-600 text-sm">{agent.description}</p>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="secondary">{agent.type}</Badge>
                        <span className="text-xs text-slate-500">
                          Created {new Date(agent.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedAgent}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Next: Configure Voice Pipeline
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Voice Pipeline Configuration */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Platform Selection</CardTitle>
                  <CardDescription>
                    Choose between OpenAI Realtime API and LiveKit Agents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => handlePlatformChange('openai')}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        platform === 'openai'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <h3 className="font-semibold text-slate-900">OpenAI Realtime API</h3>
                      <p className="text-slate-600 text-sm">
                        Advanced audio models with speech-to-speech capabilities
                      </p>
                    </div>
                    <div
                      onClick={() => handlePlatformChange('livekit')}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        platform === 'livekit'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <h3 className="font-semibold text-slate-900">LiveKit Agents</h3>
                      <p className="text-slate-600 text-sm">
                        Voice-first platform with real-time communication
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Voice Pipeline Tier</CardTitle>
                  <CardDescription>
                    Select the tier that matches your needs and budget
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(platformConfigs).map(([tier, config]) => (
                      <div
                        key={tier}
                        onClick={() => handleVoicePipelineChange(tier as VoiceTier)}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          voicePipeline.tier === tier
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <h3 className="font-semibold text-slate-900 capitalize">{tier}</h3>
                        <p className="text-slate-600 text-sm mb-2">{config.description}</p>
                        <div className="space-y-1">
                          {config.features.slice(0, 3).map((feature: string, index: number) => (
                            <div key={index} className="text-xs text-slate-500 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                              {feature}
                            </div>
                          ))}
                        </div>
                        <Badge variant="secondary" className="mt-2">
                          ${config.pricing.monthly}/month
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {platform === 'openai' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Architecture Selection</CardTitle>
                    <CardDescription>
                      Choose between chained and speech-to-speech architectures
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['chained', 'speech-to-speech'].map((arch) => (
                        <div
                          key={arch}
                          onClick={() => handleVoicePipelineChange(voicePipeline.tier, arch)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            voicePipeline.architecture === arch
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <h3 className="font-semibold text-slate-900 capitalize">
                            {arch.replace('-', ' ')}
                          </h3>
                          <p className="text-slate-600 text-sm">
                            {arch === 'chained' 
                              ? 'Audio → Text → LLM → Text → Audio' 
                              : 'Direct audio processing with multimodal models'
                            }
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                >
                  Back
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)}
                  disabled={!voicePipeline.tier}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Next: Deploy
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Deploy */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Deploy Your Voice Agent</CardTitle>
                  <CardDescription>
                    Review your configuration and deploy your PWA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Configuration Summary */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Configuration Summary</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Agent:</span>
                        <span className="ml-2 font-medium">{selectedAgent?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Platform:</span>
                        <span className="ml-2 font-medium capitalize">{platform}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Tier:</span>
                        <span className="ml-2 font-medium capitalize">{voicePipeline.tier}</span>
                      </div>
                      {platform === 'openai' && voicePipeline.architecture && (
                        <div>
                          <span className="text-slate-600">Architecture:</span>
                          <span className="ml-2 font-medium capitalize">
                            {voicePipeline.architecture.replace('-', ' ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Voice Pipeline Details */}
                  {currentConfig && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-900 mb-3">Voice Pipeline Configuration</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Features:</span>
                          <span className="text-slate-900">{currentConfig.features.join(', ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Monthly Cost:</span>
                          <span className="text-slate-900">{currentConfig.pricing}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Voice Minutes:</span>
                          <span className="text-slate-900">Varies by tier</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platform Comparison */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Platform Comparison</h3>
                    <div className="text-sm text-slate-600">
                      {(() => {
                        const comparison = comparePlatforms(voicePipeline.tier);
                        return (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-green-600 mb-2">OpenAI Pros:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {comparison.openai.pros.map((pro: string, i: number) => (
                                  <li key={i} className="text-xs">{pro}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-medium text-blue-600 mb-2">LiveKit Pros:</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {comparison.livekit.pros.map((pro: string, i: number) => (
                                  <li key={i} className="text-xs">{pro}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-red-700">{error}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button 
                      variant="outline"
                      onClick={() => setCurrentStep(2)}
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleDeploy}
                      disabled={deploying || !selectedAgent || !voicePipeline.tier}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {deploying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {platform === 'openai' ? 'Deploying to OpenAI...' : 'Deploying to LiveKit...'}
                        </>
                      ) : (
                        'Deploy Voice Agent'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Success */}
          {currentStep === 4 && deploymentResult && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-green-600">
                    <CheckCircle className="w-6 h-6 mr-2" />
                    Deployment Successful!
                  </CardTitle>
                  <CardDescription>
                    Your voice agent has been deployed and is ready to use
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Deployment Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Platform:</span>
                        <span className="text-green-900 capitalize">{deploymentResult.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Tier:</span>
                        <span className="text-green-900 capitalize">{deploymentResult.tier}</span>
                      </div>
                      {deploymentResult.platform === 'openai' && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Architecture:</span>
                          <span className="text-green-900 capitalize">
                            {deploymentResult.metadata?.architecture || 'chained'}
                          </span>
                        </div>
                      )}
                      {deploymentResult.platform === 'livekit' && (
                        <div className="flex justify-between">
                          <span className="text-green-700">Framework:</span>
                          <span className="text-green-900 capitalize">
                            {deploymentResult.metadata?.framework || 'voice'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Access Your Voice Agent</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700">Voice Agent URL:</span>
                        <a 
                          href={deploymentResult.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {deploymentResult.url}
                        </a>
                      </div>
                      <p className="text-sm text-blue-600">
                        Your PWA is optimized for mobile devices and can be installed on iOS and Android
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-center space-x-4">
                    <Button 
                      onClick={() => window.open(deploymentResult.url, '_blank')}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Open Voice Agent
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCurrentStep(1);
                        setDeploymentResult(null);
                        setError(null);
                      }}
                    >
                      Deploy Another Agent
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}