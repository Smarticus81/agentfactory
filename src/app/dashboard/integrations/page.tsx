"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, ExternalLink, Settings, ChevronDown } from 'lucide-react';
import GmailOAuthSetup from '@/components/gmail-app-password-setup';
import PostDeploymentIntegrations from '@/components/post-deployment-integrations';

const integrations = {
  communication: [
    {
      name: 'Gmail',
      description: 'Send emails, check inbox, and manage email communications via voice commands',
      logo: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-.904.732-1.636 1.636-1.636h.727L12 10.91l9.637-7.09h.727c.904 0 1.636.732 1.636 1.636z"/>
        </svg>
      ),
      status: 'available',
      category: 'Email Integration',
      color: 'from-red-500 to-pink-600',
      website: 'https://gmail.com',
      tools: ['email_send', 'email_read', 'email_search', 'email_draft']
    },
    {
      name: 'OpenAI',
      description: 'Advanced AI conversation and voice processing with GPT-4o realtime capabilities',
      logo: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142-.0852 4.783-2.7582a.7712.7712 0 0 0 .7806 0l5.8428 3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142.0852-4.7735 2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="currentColor"/>
        </svg>
      ),
      status: 'connected',
      category: 'AI & Voice Core',
      color: 'from-emerald-500 to-teal-600',
      website: 'https://openai.com',
      tools: ['conversation', 'realtime_voice', 'function_calling', 'reasoning']
    }
  ],
  scheduling: [
    {
      name: 'Google Calendar',
      description: 'Add events, check schedules, and manage appointments with voice commands',
      logo: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
        </svg>
      ),
      status: 'available',
      category: 'Calendar Integration',
      color: 'from-green-500 to-emerald-600',
      website: 'https://calendar.google.com',
      tools: ['calendar_add', 'calendar_check', 'calendar_update', 'calendar_delete']
    }
  ],
  knowledge: [
    {
      name: 'Document RAG',
      description: 'Upload documents to provide your agents with custom knowledge and context',
      logo: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
        </svg>
      ),
      status: 'connected',
      category: 'Knowledge Base',
      color: 'from-blue-500 to-cyan-600',
      website: '/dashboard/documents',
      tools: ['document_search', 'knowledge_retrieval', 'context_enhancement', 'rag_query']
    }
  ]
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'available':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'coming-soon':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected': return 'Connected';
    case 'available': return 'Available';
    case 'coming-soon': return 'Coming Soon';
    default: return 'Unknown';
  }
};

export default function IntegrationsPage() {
  const { user } = useUser();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  
  // Fetch user's agents
  const agents = useQuery(api.assistants.getUserAgents, 
    user?.id ? { userId: user.id, includeArchived: false } : 'skip'
  );

  // Set first agent as default
  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0]._id);
    }
  }, [agents, selectedAgentId]);

  const selectedAgent = agents?.find(a => a._id === selectedAgentId);
  
  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600 dark:text-slate-400">Please sign in to manage integrations</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Agent Integrations
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  No agents found
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Create an agent first before setting up integrations
            </p>
            <Button onClick={() => window.location.href = '/dashboard/agent-designer'}>
              Create Your First Agent
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header with Agent Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  Agent Integrations
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Connect services for {selectedAgent?.name || 'your agent'}
                </p>
              </div>
            </div>
            
            {/* Agent Selector */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setShowAgentSelector(!showAgentSelector)}
                className="flex items-center space-x-2"
              >
                <span>{selectedAgent?.name || 'Select Agent'}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
              
              {showAgentSelector && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50">
                  <div className="p-2 space-y-1">
                    {agents?.map((agent) => (
                      <button
                        key={agent._id}
                        onClick={() => {
                          setSelectedAgentId(agent._id);
                          setShowAgentSelector(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedAgentId === agent._id
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{agent.type}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integration Content */}
        {selectedAgentId && (
          <PostDeploymentIntegrations
            agentId={selectedAgentId}
            agentName={selectedAgent?.name || 'Agent'}
            onIntegrationUpdate={() => {
              console.log('Integration updated');
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}