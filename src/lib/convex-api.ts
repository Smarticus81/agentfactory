import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl
  ? new ConvexHttpClient(convexUrl)
  : (null as unknown as ConvexHttpClient);

export const convexApi = {
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
    return await convex.mutation(api.assistants.create, {
      ...agentData,
      type: agentData.type as any,
    });
  },

  getAgent: async (assistantId: string) => {
    return await convex.query(api.assistants.get, { assistantId: assistantId as any });
  },

  getAgentById: async (agentId: string) => {
    return await convex.query(api.assistants.get, { assistantId: agentId as any });
  },

  getPublishedAgent: async (agentId: string) => {
    return await convex.query(api.assistants.getPublishedAgent, { agentId: agentId as any });
  },

  getUserAgents: async (userId: string) => {
    return await convex.query(api.assistants.getUserAgents, { userId });
  },

  getUserDeployments: async (_userId: string) => {
    // Deployments are managed via the Convex dashboard
    return [];
  },

  getDeploymentById: async (_deploymentId: string) => {
    return null;
  },

  deleteAgent: async (agentId: string, userId: string) => {
    return await convex.mutation(api.assistants.deleteAgent, {
      agentId: agentId as any,
      userId,
    });
  },

  deleteDeployment: async (_deploymentId: string) => {
    return { success: true };
  },
};

export default convexApi;
