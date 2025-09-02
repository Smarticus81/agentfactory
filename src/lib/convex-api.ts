import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";

// Create a client that can handle authentication
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Function to get auth token from Clerk
const getAuthToken = async () => {
  if (typeof window !== 'undefined') {
    // Try to get token from Clerk
    const clerk = (window as any).Clerk;
    if (clerk && clerk.session) {
      return await clerk.session.getToken();
    }
  }
  return null;
};

export const convexApi = {
  // Create a new agent
  createAgent: async (agentData: {
    userId: string;
    name: string;
    type: string;
    description: string;
    customInstructions?: string;
    voiceEnabled?: boolean;
    wakeWord?: string;
    voiceConfig?: any;
  }) => {
    try {
      return await convex.mutation(api.assistants.create, {
        ...agentData,
        type: agentData.type as "Family Assistant" | "Personal Admin" | "Student Helper"
      });
    } catch (error) {
      console.error('Convex createAgent failed:', error);
      throw new Error('Failed to create agent. Please try again.');
    }
  },

  // Deployment operations
  createDeployment: async (deploymentData: {
    agentId: string;
    userId: string;
    name: string;
    deploymentType: "pwa" | "web" | "api";
    url?: string;
    settings?: any;
  }) => {
    try {
      return await convex.mutation(api.deployments.create, {
        assistantId: deploymentData.agentId as any,
        userId: deploymentData.userId,
        name: deploymentData.name,
        description: deploymentData.deploymentType,
        status: "active",
        settings: deploymentData.settings || {}
      });
    } catch (error) {
      console.error('Convex createDeployment failed:', error);
      throw new Error('Failed to create deployment. Please try again.');
    }
  },

  // Vercel deployment using Convex action
  createVercelDeployment: async (deploymentData: {
    agentId: string;
    userId: string;
    agentConfig: any;
    deploymentType: "pwa" | "web" | "api";
  }) => {
    try {
      // For now, return a mock deployment until actual Vercel integration is implemented
      const mockDeployment = {
        deploymentId: `mock-${Date.now()}`,
        url: `https://${deploymentData.agentConfig.name.toLowerCase().replace(/\s+/g, '-')}-${deploymentData.agentId.slice(-6)}.vercel.app`,
        status: 'ready',
        type: deploymentData.deploymentType,
        createdAt: new Date().toISOString(),
        agent: deploymentData.agentConfig
      };
      
      // Store the mock deployment in deployments table
      await convex.mutation(api.deployments.create, {
        assistantId: deploymentData.agentId as any,
        userId: deploymentData.userId,
        name: `${deploymentData.agentConfig.name} - ${deploymentData.deploymentType.toUpperCase()}`,
        description: `${deploymentData.deploymentType} deployment for ${deploymentData.agentConfig.name}`,
        status: 'active',
        settings: { 
          type: deploymentData.deploymentType,
          url: mockDeployment.url,
          vercelDeploymentId: mockDeployment.deploymentId 
        }
      });
      
      return mockDeployment;
    } catch (error) {
      console.error('Deployment creation failed:', error);
      throw new Error('Failed to create deployment. Please try again.');
    }
  },

  // Get user agents
  getUserAgents: async (userId: string) => {
    try {
      return await convex.query(api.assistants.getUserAssistants, { userId });
    } catch (error) {
      console.error('Convex getUserAgents failed:', error);
      throw new Error('Failed to fetch agents. Please try again.');
    }
  },

  // Get agent by ID
  getAgentById: async (agentId: string) => {
    try {
      return await convex.query(api.assistants.getById, { assistantId: agentId as any });
    } catch (error) {
      console.error('Convex getAgentById failed:', error);
      throw new Error('Failed to fetch agent. Please try again.');
    }
  },

  // Get user deployments
  getUserDeployments: async (userId: string) => {
    try {
      return await convex.query(api.deployments.getUserDeployments, { userId });
    } catch (error) {
      console.error('Convex getUserDeployments failed:', error);
      throw new Error('Failed to fetch deployments. Please try again.');
    }
  },

  // Get deployment by ID
  getDeploymentById: async (deploymentId: string) => {
    try {
      return await convex.query(api.deployments.getById, { deploymentId: deploymentId as any });
    } catch (error) {
      console.error('Convex getDeploymentById failed:', error);
      throw new Error('Failed to fetch deployment. Please try again.');
    }
  },

  // Save generated UI
  saveGeneratedUI: async (data: {
    agentId: string;
    generatedUI: string;
    uiCustomization?: any;
    pwaManifest?: any;
  }) => {
    try {
      return await convex.mutation(api.assistants.updateConfig, {
        assistantId: data.agentId as any,
        config: { customInstructions: data.generatedUI }
      });
    } catch (error) {
      console.error('Convex saveGeneratedUI failed:', error);
      return { success: false, error: (error as any).message || 'Unknown error' };
    }
  },

  // Delete agent
  deleteAgent: async (agentId: string, userId: string) => {
    try {
      return await convex.mutation(api.assistants.deleteAgent, { agentId: agentId as any, userId });
    } catch (error) {
      console.error('Convex deleteAgent failed:', error);
      return { success: false, error: (error as any).message || 'Unknown error' };
    }
  },

  // Delete deployment
  deleteDeployment: async (deploymentId: string) => {
    try {
      return await convex.mutation(api.deployments.remove, { deploymentId: deploymentId as any });
    } catch (error) {
      console.error('Convex deleteDeployment failed:', error);
      return { success: false, error: (error as any).message || 'Unknown error' };
    }
  },
};

export default convexApi;
