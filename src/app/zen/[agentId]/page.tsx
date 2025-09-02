"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import PremiumVoiceInterface from "@/components/premium-voice-interface";

export default function ZenAgentPage() {
  const params = useParams();
  const search = useSearchParams();
  const agentId = params?.agentId as string;
  const embed = search?.get("embed") === "1";

  const published = useQuery(api.assistants.getPublishedAgent, agentId ? { agentId: agentId as any } : "skip");

  if (!agentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-slate-600">Missing agent ID</p>
        </div>
      </div>
    );
  }

  if (published === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (published === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center">
          <p className="text-slate-600">This agent is not published or does not exist.</p>
        </div>
      </div>
    );
  }

  const { config } = published as any;
  
  // Transform the published config to match our zen interface expectations
  const agent = {
    id: agentId,
    name: config?.name ?? "Agent",
    description: config?.description ?? "AI Assistant",
    instructions: config?.instructions ?? "You are a helpful AI assistant.",
    voice: config?.voiceConfig?.voice ?? "alloy",
    provider: config?.voiceConfig?.provider ?? "openai" as 'elevenlabs' | 'google' | 'playht' | 'openai',
    wakeWords: Array.isArray(config?.voiceConfig?.wakeWords) ? config.voiceConfig.wakeWords : ['hey assistant'],
    temperature: config?.voiceConfig?.temperature ?? 0.7,
    enableTools: config?.voiceConfig?.enableTools ?? false,
  };

  // Extract API keys from config (these would normally come from env vars or user settings)
  const apiKeys = {
    elevenLabsApiKey: config?.apiKeys?.elevenLabsApiKey,
    googleApiKey: config?.apiKeys?.googleApiKey,
    playhtApiKey: config?.apiKeys?.playhtApiKey,
    playhtUserId: config?.apiKeys?.playhtUserId,
  };

  return (
    <div className={embed ? "bg-transparent" : ""}>
      <PremiumVoiceInterface
        agent={agent}
        apiKeys={apiKeys}
      />
    </div>
  );
}
