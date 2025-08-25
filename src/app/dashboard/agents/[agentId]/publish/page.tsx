"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function PublishAgentPage() {
  const { agentId } = useParams() as { agentId?: string };
  const [originsText, setOriginsText] = useState("");
  const publish = useMutation(api.agents.publishAgent);
  const setOrigins = useMutation(api.agents.setAllowedOrigins);
  const agent = useQuery(api.agents.getAgent, agentId ? { agentId: agentId as any } : "skip");
  const published = useQuery(api.agents.getPublishedAgent, agentId ? { agentId: agentId as any } : "skip");

  const allowedOrigins = useMemo(() => (agent as any)?.allowedOrigins || [], [agent]);

  useEffect(() => {
    if (allowedOrigins?.length && !originsText) {
      setOriginsText(allowedOrigins.join("\n"));
    }
  }, [allowedOrigins]);

  if (!agentId) return <div className="p-6">Missing agentId</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Publish Agent</h1>
      <p className="text-sm text-gray-500 mb-6">Make your agent available at a hosted URL and as an embeddable widget.</p>

      <SignedOut>
        <div className="p-4 rounded-md bg-yellow-50 text-yellow-800 flex items-center justify-between">
          <span>Please sign in to publish.</span>
          <SignInButton mode="modal" />
        </div>
      </SignedOut>

      <SignedIn>
        <section className="space-y-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <h2 className="font-medium mb-2">Allowed Origins</h2>
            <p className="text-sm text-gray-500 mb-2">Only these website origins can embed your agent. One per line, e.g. https://example.com</p>
            <textarea
              className="w-full h-28 p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-transparent"
              value={originsText}
              onChange={(e) => setOriginsText(e.target.value)}
              placeholder="https://yourdomain.com\nhttps://anotherdomain.com"
            />
            <button
              onClick={async () => {
                const origins = originsText
                  .split(/\n|,/) // allow commas or newlines
                  .map(s => s.trim())
                  .filter(Boolean);
                await setOrigins({ agentId: agentId as any, origins });
                alert("Saved allowed origins");
              }}
              className="mt-3 inline-flex items-center px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm"
            >
              Save Origins
            </button>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <h2 className="font-medium mb-2">Publish</h2>
            <p className="text-sm text-gray-500 mb-2">Snapshot the current configuration and expose a hosted page plus an embeddable script.</p>
            <button
              onClick={async () => {
                const res = await publish({ agentId: agentId as any });
                if (res?.hostedPath) {
                  (window as any).__publishResult = res;
                }
                alert("Published! Scroll down for links and embed code.");
              }}
              className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm"
            >
              Publish Now
            </button>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <h2 className="font-medium mb-2">Hosted URL</h2>
            {published ? (
              <div className="text-sm">
                <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">/a/{agentId}</code>
                <div className="mt-2">
                  <a href={`/a/${agentId}`} target="_blank" className="text-blue-600 underline">Open</a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Not published yet.</p>
            )}
          </div>

          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <h2 className="font-medium mb-2">Embed Code</h2>
            {published ? (
              <EmbedCode agentId={agentId} />
            ) : (
              <p className="text-sm text-gray-500">Publish first to enable embed code.</p>
            )}
          </div>
        </section>
      </SignedIn>
    </div>
  );
}

function EmbedCode({ agentId }: { agentId: string }) {
  const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN || "";
  const src = `${appOrigin}/agent-embed.js`;
  const code = `<script async src="${src}" data-agent-id="${agentId}"></script>`;
  return (
    <div>
      <textarea
        readOnly
        className="w-full h-24 p-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs"
        value={code}
      />
      <button
        onClick={() => navigator.clipboard.writeText(code)}
        className="mt-2 inline-flex items-center px-3 py-1.5 rounded-md bg-gray-900 text-white text-sm"
      >
        Copy to Clipboard
      </button>
    </div>
  );
}
