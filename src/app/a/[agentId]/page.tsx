"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import StreamlinedVoiceInterface from "@/components/streamlined-voice-interface";

export default function HostedAgentPage() {
  const params = useParams();
  const search = useSearchParams();
  const agentId = params?.agentId as string;
  const embed = search?.get("embed") === "1";

  const published = useQuery(api.agents.getPublishedAgent, agentId ? { agentId: agentId as any } : "skip");

  if (!agentId) {
    return <div className="p-6 text-sm text-gray-600">Missing agentId.</div>;
  }

  if (published === undefined) {
    return <div className="p-6 text-sm text-gray-600">Loading agent…</div>;
  }

  if (published === null) {
    return <div className="p-6 text-sm text-gray-600">This agent is not published or does not exist.</div>;
  }

  const { config } = published as any;
  const agentName: string = config?.name ?? "Agent";
  const agentType: "Event Venue" | "Venue Bar" | "Venue Voice" = config?.type ?? "Event Venue";
  const primaryColor: string = config?.ui?.primaryColor ?? "#10a37f";
  const secondaryColor: string = config?.ui?.customization?.colors?.secondary ?? "#059669";
  const customization = config?.ui?.customization || {};
  
  // Extract voice configuration from published config
  const voiceProvider: string = config?.voiceConfig?.provider ?? "openai";
  const selectedVoice: string = config?.voiceConfig?.voice ?? "alloy";
  // Ensure wakeWords is always an array (defensive against object format)
  const configWakeWords = config?.voiceConfig?.wakeWords;
  const wakeWords: string[] = Array.isArray(configWakeWords) ? configWakeWords : ['hey bev', 'hey venue'];

  return (
    <div className={embed ? "bg-transparent" : ""}>
      <StreamlinedVoiceInterface
        agentName={agentName}
        agentType={agentType}
        primaryColor={primaryColor}
        secondaryColor={secondaryColor}
        customization={customization}
        voiceProvider={voiceProvider}
        selectedVoice={selectedVoice}
        wakeWords={wakeWords}
        user={null} // Public agents don't have authenticated users
      />
    </div>
  );
}
