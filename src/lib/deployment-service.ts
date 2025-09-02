import { VoiceTier } from './types';
import { VOICE_PIPELINE_CONFIGS, getLiveKitAgentsConfig } from './voice-pipeline-config';

export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
  platform: 'openai' | 'livekit';
  tier: VoiceTier;
  deploymentType: 'pwa' | 'web' | 'api';
  metadata?: any;
}

export interface VercelDeploymentConfig {
  agentId: string;
  agentName: string;
  platform: 'openai' | 'livekit';
  tier: VoiceTier;
  deploymentType: 'pwa' | 'web' | 'api';
  pwaConfig: {
    name: string;
    shortName: string;
    description: string;
    themeColor: string;
    backgroundColor: string;
    display: 'standalone' | 'fullscreen' | 'minimal-ui';
    orientation: 'portrait' | 'landscape' | 'any';
    scope: string;
    startUrl: string;
    icons: Array<{
      src: string;
      sizes: string;
      type: string;
      purpose?: string;
    }>;
  };
  voiceConfig: {
    platform: 'openai' | 'livekit';
    tier: VoiceTier;
    features: string[];
    architecture?: string;
    components?: any;
  };
}

export class DeploymentService {
  private vercelToken: string;
  private vercelTeamId: string;
  private vercelProjectId: string;

  constructor() {
    this.vercelToken = process.env.NEXT_PUBLIC_VERCEL_TOKEN || '';
    this.vercelTeamId = process.env.NEXT_PUBLIC_VERCEL_TEAM_ID || '';
    this.vercelProjectId = process.env.NEXT_PUBLIC_VERCEL_PROJECT_ID || '';
  }

  // Deploy agent to Vercel with PWA capabilities
  async deployToVercel(config: VercelDeploymentConfig): Promise<DeploymentResult> {
    try {
      console.log('Starting Vercel deployment for:', config.agentName);
      
      // Validate configuration
      if (!this.vercelToken) {
        throw new Error('Vercel token not configured');
      }

      // Generate deployment files
      const deploymentFiles = this.generateDeploymentFiles(config);
      
      // Create Vercel deployment
      const deploymentResult = await this.createVercelDeployment(config, deploymentFiles);
      
      if (deploymentResult.success && deploymentResult.url) {
        // Update agent with deployment info
        await this.updateAgentDeployment(config.agentId, {
          deploymentId: deploymentResult.deploymentId,
          deploymentUrl: deploymentResult.url,
          platform: config.platform,
          tier: config.tier,
          status: 'deployed'
        });
      }

      return deploymentResult;

    } catch (error) {
      console.error('Vercel deployment failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
        platform: config.platform,
        tier: config.tier,
        deploymentType: config.deploymentType
      };
    }
  }

  // Generate all necessary files for deployment
  private generateDeploymentFiles(config: VercelDeploymentConfig) {
    const deploymentId = `voice-agent-${config.agentId}-${Date.now()}`;
    const baseUrl = `https://${deploymentId}.vercel.app`;
    
    return [
      // Package.json
      {
        file: 'package.json',
        data: JSON.stringify(this.generatePackageJson(config, deploymentId), null, 2)
      },
      
      // Next.js config
      {
        file: 'next.config.js',
        data: this.generateNextConfig(config, baseUrl)
      },
      
      // PWA Manifest
      {
        file: 'public/manifest.json',
        data: JSON.stringify(config.pwaConfig, null, 2)
      },
      
      // Service Worker
      {
        file: 'public/sw.js',
        data: this.generateServiceWorker(config)
      },
      
      // Main page
      {
        file: 'src/app/page.tsx',
        data: this.generateMainPage(config)
      },
      
      // Voice agent component
      {
        file: 'src/components/voice-agent.tsx',
        data: this.generateVoiceAgentComponent(config)
      },
      
      // Environment variables
      {
        file: '.env.local',
        data: this.generateEnvironmentVariables(config)
      },
      
      // Tailwind config
      {
        file: 'tailwind.config.js',
        data: this.generateTailwindConfig()
      }
    ];
  }

  // Generate package.json for deployment
  private generatePackageJson(config: VercelDeploymentConfig, deploymentId: string) {
    return {
      name: deploymentId,
      version: '1.0.0',
      private: true,
      engines: {
        node: '>=18.0.0'
      },
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        lint: 'next lint'
      },
      dependencies: {
        next: '14.2.25',
        react: '18.3.1',
        'react-dom': '18.3.1',
        'convex': '^1.25.4',
        'openai': '^4.20.1',
        'tailwindcss': '3.3.0',
        'framer-motion': '^10.18.0',
        'lucide-react': '^0.294.0',
        'autoprefixer': '10.4.14',
        'postcss': '8.4.27',
        '@livekit/agents': '^0.1.0',
        'deepgram': '^2.4.0',
        'cartesia': '^0.1.0'
      },
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0',
        '@types/react': '^18.0.0',
        '@types/react-dom': '^18.0.0'
      }
    };
  }

  // Generate Next.js configuration
  private generateNextConfig(config: VercelDeploymentConfig, baseUrl: string) {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AGENT_CONFIG: '${JSON.stringify(config).replace(/'/g, "\\'")}',
    AGENT_ID: '${config.agentId}',
    NEXT_PUBLIC_APP_URL: '${baseUrl}',
    NEXT_PUBLIC_PLATFORM: '${config.platform}',
    NEXT_PUBLIC_TIER: '${config.tier}'
  },
  headers: async () => {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;`;
  }

  // Generate PWA manifest
  private generatePWAConfig(config: VercelDeploymentConfig) {
    return {
      name: config.pwaConfig.name,
      short_name: config.pwaConfig.shortName,
      description: config.pwaConfig.description,
      theme_color: config.pwaConfig.themeColor,
      background_color: config.pwaConfig.backgroundColor,
      display: config.pwaConfig.display,
      orientation: config.pwaConfig.orientation,
      scope: config.pwaConfig.scope,
      start_url: config.pwaConfig.startUrl,
      icons: config.pwaConfig.icons,
      categories: ['productivity', 'utilities'],
      lang: 'en',
      dir: 'ltr'
    };
  }

  // Generate service worker for PWA
  private generateServiceWorker(config: VercelDeploymentConfig) {
    return `// Service Worker for ${config.agentName}
const CACHE_NAME = 'voice-agent-${config.agentId}-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/api/voice',
  '/api/chat'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});`;
  }

  // Generate main page component
  private generateMainPage(config: VercelDeploymentConfig) {
    return `import { VoiceAgent } from './components/voice-agent';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            ${config.agentName}
          </h1>
          <p className="text-lg text-slate-600">
            Your AI voice assistant powered by ${config.platform === 'openai' ? 'OpenAI Realtime API' : 'LiveKit Agents'}
          </p>
        </div>
        
        <VoiceAgent 
          agentId="${config.agentId}"
          platform="${config.platform}"
          tier="${config.tier}"
        />
      </div>
    </div>
  );
}`;
  }

  // Generate voice agent component
  private generateVoiceAgentComponent(config: VercelDeploymentConfig) {
    if (config.platform === 'openai') {
      return this.generateOpenAIVoiceAgent(config);
    } else {
      return this.generateLiveKitVoiceAgent(config);
    }
  }

  // Generate OpenAI voice agent component
  private generateOpenAIVoiceAgent(config: VercelDeploymentConfig) {
    return `import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceAgentProps {
  agentId: string;
  platform: string;
  tier: string;
}

export function VoiceAgent({ agentId, platform, tier }: VoiceAgentProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      // OpenAI Realtime API integration would go here
      console.log('Starting OpenAI voice agent for tier:', tier);
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Voice Assistant
          </h2>
          <p className="text-slate-600">
            ${config.tier} Tier - OpenAI Realtime API
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={isListening ? stopListening : startListening}
            className={\`w-full py-3 px-6 rounded-xl font-medium transition-all \${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }\`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 inline mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 inline mr-2" />
                Start Listening
              </>
            )}
          </button>

          {transcript && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">You said:</h3>
              <p className="text-slate-700">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Assistant:</h3>
              <p className="text-blue-700">{response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;
  }

  // Generate LiveKit voice agent component
  private generateLiveKitVoiceAgent(config: VercelDeploymentConfig) {
    return `import { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceAgentProps {
  agentId: string;
  platform: string;
  tier: string;
}

export function VoiceAgent({ agentId, platform, tier }: VoiceAgentProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsListening(true);
      // LiveKit Agents integration would go here
      console.log('Starting LiveKit voice agent for tier:', tier);
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  };

  const stopListening = () => {
    setIsListening(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Voice Assistant
          </h2>
          <p className="text-slate-600">
            ${config.tier} Tier - LiveKit Agents
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={isListening ? stopListening : startListening}
            className={\`w-full py-3 px-6 rounded-xl font-medium transition-all \${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }\`}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 inline mr-2" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 inline mr-2" />
                Start Listening
              </>
            )}
          </button>

          {transcript && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-medium text-slate-900 mb-2">You said:</h3>
              <p className="text-slate-700">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Assistant:</h3>
              <p className="text-blue-700">{response}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}`;
  }

  // Generate environment variables
  private generateEnvironmentVariables(config: VercelDeploymentConfig) {
    return `# Voice Agent Configuration
AGENT_ID=${config.agentId}
AGENT_NAME=${config.agentName}
PLATFORM=${config.platform}
TIER=${config.tier}

# OpenAI Configuration (if using OpenAI)
OPENAI_API_KEY=your_openai_api_key_here

# LiveKit Configuration (if using LiveKit)
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=your_convex_url_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-deployment-url.vercel.app`;
  }

  // Generate Tailwind configuration
  private generateTailwindConfig() {
    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};`;
  }

  // Create Vercel deployment using real API
  private async createVercelDeployment(config: VercelDeploymentConfig, files: any[]): Promise<DeploymentResult> {
    try {
      const deploymentId = `voice-agent-${config.agentId}-${Date.now()}`;
      
      // Create deployment using Vercel API
      const deploymentResponse = await fetch('https://api.vercel.com/v1/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deploymentId,
          projectId: this.vercelProjectId,
          teamId: this.vercelTeamId,
          files: files.map(file => ({
            file: file.file,
            data: file.data
          })),
          target: 'production',
          framework: 'nextjs'
        })
      });

      if (!deploymentResponse.ok) {
        const errorData = await deploymentResponse.json();
        throw new Error(`Vercel API error: ${errorData.error || deploymentResponse.statusText}`);
      }

      const deploymentData = await deploymentResponse.json();
      
      // Wait for deployment to be ready
      const deploymentUrl = deploymentData.url || `https://${deploymentId}.vercel.app`;
      
      return {
        success: true,
        url: deploymentUrl,
        deploymentId: deploymentData.id || deploymentId,
        platform: config.platform,
        tier: config.tier,
        deploymentType: config.deploymentType,
        metadata: {
          deploymentId: deploymentData.id || deploymentId,
          deploymentUrl,
          files: files.length,
          platform: config.platform,
          tier: config.tier,
          vercelDeploymentId: deploymentData.id
        }
      };
      
    } catch (error) {
      throw new Error(`Vercel deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update agent with deployment information
  private async updateAgentDeployment(agentId: string, deploymentInfo: any) {
    try {
      // Update agent in database via API call
      const updateResponse = await fetch('/api/agents/update-deployment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          deploymentInfo
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update agent deployment info');
      }

      console.log('Agent deployment info updated successfully');
      
    } catch (error) {
      console.error('Failed to update agent deployment info:', error);
      throw error;
    }
  }
}

export const deploymentService = new DeploymentService();
