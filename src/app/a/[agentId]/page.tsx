"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import MinimalistAgentInterface from "@/components/minimalist-agent-interface";

export default function HostedAgentPage() {
  const params = useParams();
  const search = useSearchParams();
  const agentId = params?.agentId as string;
  const embed = search?.get("embed") === "1";
  const { user, isLoaded } = useUser();

  const published = useQuery(api.assistants.getPublishedAgent, agentId ? { agentId: agentId as any } : "skip");

  if (!agentId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Missing agent ID</p>
        </div>
      </div>
    );
  }

  if (published === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (published === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">This agent is not published or does not exist.</p>
        </div>
      </div>
    );
  }

  const { config } = published as any;
  
  const agentName: string = config?.name ?? "Agent";
  const agentType: "Family Assistant" | "Personal Admin" | "Student Helper" | "Custom" = config?.type ?? "Family Assistant";
  const primaryColor: string = config?.ui?.primaryColor ?? "#3b82f6";
  const secondaryColor: string = config?.ui?.customization?.colors?.secondary ?? "#1d4ed8";
  
  // Extract voice configuration from published config
  const voiceProvider: string = config?.voiceConfig?.provider ?? "openai";
  const selectedVoice: string = config?.voiceConfig?.voice ?? "nova";
  
  // Ensure wakeWords is always an array
  const configWakeWords = config?.voiceConfig?.wakeWords;
  const wakeWords: string[] = Array.isArray(configWakeWords) ? configWakeWords : ['hey assistant'];

  // Pass Clerk user object which includes the user.id
  const userObject = isLoaded && user ? { id: user.id } : null;

  return (
    <div className={embed ? "bg-transparent" : ""}>
      <MinimalistAgentInterface
        agentName={agentName}
        agentType={agentType}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        voiceProvider={voiceProvider}
        selectedVoice={selectedVoice}
        wakeWords={wakeWords}
        user={userObject}
      />
    </div>
  );
}
