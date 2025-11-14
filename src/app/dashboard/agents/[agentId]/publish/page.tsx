"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, Code, ExternalLink, Copy, CheckCircle, Settings } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard-layout";

export default function PublishAgentPage() {
  const { agentId } = useParams() as { agentId?: string };
  const router = useRouter();
  const [originsText, setOriginsText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  
  const publish = useMutation(api.assistants.updateConfig);
  const setOrigins = useMutation(api.assistants.updateAllowedOrigins);
  const agent = useQuery(api.assistants.get, agentId ? { assistantId: agentId as any } : "skip");
  const published = useQuery(api.assistants.getPublishedAgent, agentId ? { agentId: agentId as any } : "skip");

  const allowedOrigins = useMemo(() => (agent as any)?.allowedOrigins || [], [agent]);

  useEffect(() => {
    if (allowedOrigins?.length && !originsText) {
      setOriginsText(allowedOrigins.join("\n"));
    }
  }, [allowedOrigins]);

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await publish({ assistantId: agentId as any, config: { isActive: true } });
      if (res?.success) {
        // Success notification could be improved with a toast
        setCopied('published');
        setTimeout(() => setCopied(null), 3000);
      } else {
        alert("Failed to publish agent.");
      }
    } catch (error) {
      console.error('Error publishing agent:', error);
      alert("Failed to publish agent.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!agentId) {
    return (
      <DashboardLayout>
        <div className="card-base p-8 text-center">
          <h1 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
            Error
          </h1>
          <p className="text-text-secondary dark:text-text-secondary-dark">
            Missing agent ID
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="btn-ghost p-2">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-h1 font-bold text-text-primary dark:text-text-primary-dark">
              Publish Agent
            </h1>
            <p className="text-text-secondary dark:text-text-secondary-dark">
              {agent?.name ? `Publishing ${agent.name}` : 'Make your agent available to the world'}
            </p>
          </div>
        </div>

        <SignedOut>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-8 text-center"
          >
            <div className="w-16 h-16 bg-accent-light rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-2">
              Authentication Required
            </h2>
            <p className="text-text-secondary dark:text-text-secondary-dark mb-6">
              Please sign in to publish your agent
            </p>
            <SignInButton mode="modal">
              <button className="btn-primary">
                Sign In
              </button>
            </SignInButton>
          </motion.div>
        </SignedOut>

        <SignedIn>
          <div className="grid gap-6">
            {/* Publish Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark">
                      Publish Your Agent
                    </h2>
                    <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                      Make your agent available at a public URL
                    </p>
                  </div>
                </div>
                {published && (
                  <div className="flex items-center space-x-2 text-accent">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-small font-medium">Published</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-body text-text-secondary dark:text-text-secondary-dark">
                  Publishing creates a snapshot of your current agent configuration and makes it available at a hosted URL. 
                  Users can interact with your agent directly through this link.
                </p>
                
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className={`btn-primary flex items-center space-x-2 ${isPublishing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Globe className="w-4 h-4" />
                  <span>{isPublishing ? 'Publishing...' : published ? 'Update Publication' : 'Publish Now'}</span>
                </button>

                {copied === 'published' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center space-x-2 text-accent"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-small font-medium">Agent published successfully!</span>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Hosted URL Section */}
            {published && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="card-base p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                    <ExternalLink className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark">
                      Hosted URL
                    </h2>
                    <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                      Direct link to your published agent
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-panel p-4 rounded-lg border">
                    <code className="text-small font-mono text-text-primary dark:text-text-primary-dark">
                      {window.location.origin}/a/{agentId}
                    </code>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCopy(`${window.location.origin}/a/${agentId}`, 'url')}
                      className="btn-ghost flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copied === 'url' ? 'Copied!' : 'Copy URL'}</span>
                    </button>
                    
                    <a
                      href={`/a/${agentId}`}
                      target="_blank"
                      className="btn-primary flex items-center space-x-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Agent</span>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Embed Code Section */}
            {published && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="card-base p-6"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                    <Code className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark">
                      Embed Code
                    </h2>
                    <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                      Add this script to your website
                    </p>
                  </div>
                </div>

                <EmbedCode agentId={agentId} onCopy={handleCopy} copied={copied} />
              </motion.div>
            )}

            {/* Advanced Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-base p-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-accent-light rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-h3 font-semibold text-text-primary dark:text-text-primary-dark">
                    Advanced Settings
                  </h2>
                  <p className="text-small text-text-secondary dark:text-text-secondary-dark">
                    Configure security and access controls
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-body font-medium text-text-primary dark:text-text-primary-dark mb-2">
                    Allowed Origins
                  </label>
                  <p className="text-small text-text-secondary dark:text-text-secondary-dark mb-3">
                    Only these website origins can embed your agent. One per line (e.g., https://example.com)
                  </p>
                  <textarea
                    className="w-full h-32 p-3 rounded-lg border border-hairline bg-canvas text-text-primary dark:text-text-primary-dark resize-none focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                    value={originsText}
                    onChange={(e) => setOriginsText(e.target.value)}
                    placeholder="https://yourdomain.com&#10;https://anotherdomain.com"
                  />
                  <button
                    onClick={async () => {
                      const origins = originsText
                        .split(/\n|,/)
                        .map(s => s.trim())
                        .filter(Boolean);
                      await setOrigins({ assistantId: agentId as any, origins });
                      setCopied('origins');
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="mt-3 btn-primary"
                  >
                    {copied === 'origins' ? 'Saved!' : 'Save Origins'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </SignedIn>
      </div>
    </DashboardLayout>
  );
}

function EmbedCode({ agentId, onCopy, copied }: { 
  agentId: string; 
  onCopy: (text: string, type: string) => Promise<void>;
  copied: string | null;
}) {
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const src = `${appOrigin}/agent-embed.js`;
  const code = `<script async src="${src}" data-agent-id="${agentId}"></script>`;
  
  return (
    <div className="space-y-4">
      <div className="bg-panel p-4 rounded-lg border">
        <textarea
          readOnly
          className="w-full h-24 p-3 rounded-lg bg-canvas border border-hairline text-small font-mono text-text-primary dark:text-text-primary-dark resize-none focus:outline-none"
          value={code}
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onCopy(code, 'embed')}
          className="btn-ghost flex items-center space-x-2"
        >
          <Copy className="w-4 h-4" />
          <span>{copied === 'embed' ? 'Copied!' : 'Copy Embed Code'}</span>
        </button>
        
        <div className="text-small text-text-secondary dark:text-text-secondary-dark">
          Add this script to your website's HTML before the closing &lt;/body&gt; tag
        </div>
      </div>
    </div>
  );
}
