"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, ExternalLink, Settings } from 'lucide-react';
import GmailOAuthSetup from '@/components/gmail-app-password-setup';

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
  const [connectionStatus, setConnectionStatus] = useState<{[key: string]: string}>({});
  const [showMessage, setShowMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [showGmailSetup, setShowGmailSetup] = useState(false);

  // Check URL parameters for OAuth results
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const gmailConnected = urlParams.get('gmail_connected');
    const error = urlParams.get('error');
    const email = urlParams.get('email');

    if (gmailConnected === 'true') {
      setShowMessage({
        type: 'success',
        text: `Gmail connected successfully${email ? ` for ${decodeURIComponent(email)}` : ''}!`
      });
      setConnectionStatus(prev => ({ ...prev, gmail: 'connected' }));

      // Clean up URL parameters
      window.history.replaceState({}, '', '/dashboard/integrations');
    } else if (error) {
      let errorText = 'Failed to connect Gmail';

      // Provide more specific error messages
      switch (error) {
        case 'access_denied':
          errorText = 'Gmail connection was cancelled. Please try again and grant the necessary permissions.';
          break;
        case 'invalid_request':
          errorText = 'Invalid OAuth request. Please check your Google OAuth configuration.';
          break;
        case 'unauthorized_client':
          errorText = 'Unauthorized client. Please verify your Google OAuth app configuration.';
          break;
        case 'unsupported_response_type':
          errorText = 'Unsupported response type. Please contact support.';
          break;
        case 'invalid_scope':
          errorText = 'Invalid scope requested. Please contact support.';
          break;
        default:
          errorText += `: ${decodeURIComponent(error)}`;
      }

      setShowMessage({
        type: 'error',
        text: errorText
      });

      // Clean up URL parameters
      window.history.replaceState({}, '', '/dashboard/integrations');
    }

    // Auto-hide messages after 5 seconds
    if (gmailConnected || error) {
      setTimeout(() => setShowMessage(null), 5000);
    }
  }, []);

  const allIntegrations = [
    ...integrations.communication,
    ...integrations.scheduling,
    ...integrations.knowledge
  ];

  const handleIntegrationAction = async (integration: any) => {
    try {
      if (integration.name === 'Gmail' && integration.status === 'available') {
        // Show simple app password setup instead of OAuth
        setShowGmailSetup(true);
      } else {
        // Handle other integrations or configuration
        console.log('Integration action for:', integration.name);
      }
    } catch (error) {
      console.error('Integration action failed:', error);
      setShowMessage({
        type: 'error',
        text: 'Failed to connect integration'
      });
    }
  };

  const handleGmailConnectionSuccess = (email: string) => {
    setConnectionStatus(prev => ({ ...prev, gmail: 'connected' }));
    setShowMessage({
      type: 'success',
      text: `Gmail connected successfully for ${email}!`
    });
    setShowGmailSetup(false);
    setTimeout(() => setShowMessage(null), 5000);
  };

  const renderIntegrationCard = (integration: any) => {
    const currentStatus = connectionStatus[integration.name.toLowerCase()] || integration.status;
    
    return (
    <div key={integration.name} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl transition-all duration-300 group cursor-pointer">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${integration.color} text-white shadow-lg`}>
            {integration.logo}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {integration.name}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{integration.category}</p>
          </div>
        </div>
        <Badge className={`${getStatusColor(currentStatus)} border font-medium px-3 py-1`}>
          {getStatusText(currentStatus)}
        </Badge>
      </div>
      
      <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
        {integration.description}
      </p>
      
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          size="sm"
          className="bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300"
          onClick={() => handleIntegrationAction(integration)}
        >
          {integration.status === 'connected' ? 'Configure' : 'Connect'}
        </Button>
        {integration.website && (
          <a 
            href={integration.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center space-x-1"
          >
            <span>Learn more</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Clean Header */}
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
                Connect your voice agents to essential services and tools
              </p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {showMessage && (
          <div className={`p-4 rounded-lg border ${showMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
            <div className="flex items-center justify-between">
              <span>{showMessage.text}</span>
              <button 
                onClick={() => setShowMessage(null)}
                className="text-sm underline hover:no-underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Integration Categories */}
        <Tabs defaultValue="all" className="space-y-8">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 px-6 py-3 rounded-lg font-medium transition-all">
              All Integrations
            </TabsTrigger>
            <TabsTrigger value="communication" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 px-6 py-3 rounded-lg font-medium transition-all">
              Communication
            </TabsTrigger>
            <TabsTrigger value="scheduling" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 px-6 py-3 rounded-lg font-medium transition-all">
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 px-6 py-3 rounded-lg font-medium transition-all">
              Knowledge
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="communication" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.communication.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="scheduling" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.scheduling.map(renderIntegrationCard)}
            </div>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {integrations.knowledge.map(renderIntegrationCard)}
            </div>
          </TabsContent>
        </Tabs>

        {/* Gmail App Password Setup Modal */}
        {showGmailSetup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <div className="mb-4 flex justify-end">
                <Button
                  variant="ghost"
                  onClick={() => setShowGmailSetup(false)}
                  className="text-white hover:text-gray-300"
                >
                  ✕ Close
                </Button>
              </div>
              <GmailOAuthSetup onConnectionSuccess={handleGmailConnectionSuccess} />
            </div>
          </div>
        )}

        {/* Benefits Section */}
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60">
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6 flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span>Why Integrate?</span>
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="text-blue-600 dark:text-blue-400 font-semibold">🚀 Streamlined Operations</div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Connect your existing tools to create seamless workflows and eliminate manual data entry.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-purple-600 dark:text-purple-400 font-semibold">⚡ Enhanced Automation</div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Automate repetitive tasks and focus on what matters most - serving your customers.
              </p>
            </div>
            <div className="space-y-3">
              <div className="text-emerald-600 dark:text-emerald-400 font-semibold">📊 Better Insights</div>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Get comprehensive analytics and reporting across all your integrated platforms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}