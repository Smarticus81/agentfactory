export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  error?: string;
  platform: string;
  tier?: string;
  [key: string]: any;
}

export interface VercelDeploymentConfig {
  agentId?: string;
  agentName?: string;
  platform?: string;
  tier?: string;
  deploymentType?: string;
  pwaConfig?: any;
  voiceConfig?: any;
  appConfig?: any;
  region?: string;
}

export class DeploymentService {
  private vercelToken: string;
  private vercelTeamId: string;
  private vercelProjectId: string;

  constructor() {
    this.vercelToken = process.env.VERCEL_TOKEN || '';
    this.vercelTeamId = process.env.VERCEL_TEAM_ID || '';
    this.vercelProjectId = process.env.VERCEL_PROJECT_ID || '';
  }

  async deployToVercel(config: VercelDeploymentConfig): Promise<DeploymentResult> {
    try {
      if (!this.vercelToken) {
        throw new Error('Vercel token not configured. Set VERCEL_TOKEN in environment.');
      }

      const deploymentId = config.agentId
        ? `venue-${config.agentId}-${Date.now()}`
        : `venue-${Date.now()}`;

      const envVars: Record<string, string> = {
        LIVEKIT_URL: process.env.LIVEKIT_URL || '',
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || '',
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY || '',
      };

      if (config.appConfig) {
        envVars.APP_CONFIG = JSON.stringify(config.appConfig);
      }

      const response = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.vercelToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deploymentId,
          project: this.vercelProjectId,
          ...(this.vercelTeamId && { teamId: this.vercelTeamId }),
          target: 'production',
          gitSource: {
            type: 'github',
            repoId: process.env.GITHUB_REPO_ID,
            ref: 'main',
          },
          env: envVars,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Vercel API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        url: `https://${data.url}`,
        deploymentId: data.id,
        platform: 'vercel',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Deployment failed',
        platform: 'vercel',
      };
    }
  }
}

export const deploymentService = new DeploymentService();
