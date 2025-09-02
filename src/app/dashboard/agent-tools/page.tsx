'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Search, 
  Send, 
  Phone, 
  Bot,
  Zap,
  Settings,
  Code,
  Database,
  Globe,
  Shield,
  Mic,
  Volume2,
  Eye,
  Clock,
  Users,
  Star
} from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  capabilities: string[];
  voiceCommands: string[];
  apiEndpoint?: string;
  status: 'active' | 'coming-soon' | 'beta';
}

const agentTools: Tool[] = [
  // Communication Tools
  {
    name: 'Gmail Integration',
    description: 'Send, read, and manage emails through voice commands',
    category: 'communication',
    icon: <Send className="w-5 h-5" />,
    capabilities: [
      'Send emails with voice dictation',
      'Read incoming emails aloud', 
      'Search email history',
      'Manage email folders',
      'Schedule email sending'
    ],
    voiceCommands: [
      '"Send email to john@example.com about the meeting"',
      '"Read my latest emails"',
      '"Search for emails from Sarah last week"',
      '"Mark all emails from boss as important"'
    ],
    apiEndpoint: '/api/integrations/gmail',
    status: 'active'
  },
  {
    name: 'SMS Messaging',
    description: 'Send and receive text messages via Twilio integration',
    category: 'communication',
    icon: <MessageSquare className="w-5 h-5" />,
    capabilities: [
      'Send SMS messages',
      'Receive SMS notifications',
      'Group messaging',
      'Message scheduling',
      'Delivery confirmations'
    ],
    voiceCommands: [
      '"Text mom I\'ll be late"',
      '"Send group message to family about dinner"',
      '"Schedule reminder text for tomorrow"'
    ],
    status: 'coming-soon'
  },
  {
    name: 'Voice Calls',
    description: 'Make and receive voice calls through the agent',
    category: 'communication',
    icon: <Phone className="w-5 h-5" />,
    capabilities: [
      'Initiate voice calls',
      'Answer incoming calls',
      'Call routing and forwarding',
      'Voicemail management',
      'Conference calling'
    ],
    voiceCommands: [
      '"Call John Smith"',
      '"Answer the call"',
      '"Forward calls to my mobile"'
    ],
    status: 'coming-soon'
  },

  // Scheduling Tools
  {
    name: 'Google Calendar',
    description: 'Manage your calendar and schedule events',
    category: 'scheduling',
    icon: <Calendar className="w-5 h-5" />,
    capabilities: [
      'Create calendar events',
      'Check availability',
      'Set reminders',
      'Manage recurring events',
      'Invite attendees'
    ],
    voiceCommands: [
      '"Schedule a team meeting tomorrow at 2 PM"',
      '"What\'s on my calendar today?"',
      '"Cancel my 3 PM appointment"',
      '"Add weekly standup every Monday at 9 AM"'
    ],
    apiEndpoint: '/api/integrations/calendar',
    status: 'active'
  },
  {
    name: 'Meeting Scheduler',
    description: 'Intelligent meeting scheduling with availability checking',
    category: 'scheduling',
    icon: <Users className="w-5 h-5" />,
    capabilities: [
      'Find optimal meeting times',
      'Send meeting invitations',
      'Handle scheduling conflicts',
      'Time zone coordination',
      'Meeting room booking'
    ],
    voiceCommands: [
      '"Schedule a meeting with the marketing team next week"',
      '"Find time for all attendees on Tuesday"',
      '"Book conference room A for the presentation"'
    ],
    status: 'beta'
  },

  // Knowledge & RAG Tools
  {
    name: 'Document RAG',
    description: 'Query uploaded documents using retrieval-augmented generation',
    category: 'knowledge',
    icon: <FileText className="w-5 h-5" />,
    capabilities: [
      'Upload and index documents',
      'Semantic document search',
      'Context-aware answers',
      'Multi-document synthesis',
      'Citation tracking'
    ],
    voiceCommands: [
      '"What does the contract say about termination?"',
      '"Summarize the quarterly report"',
      '"Find information about pricing in our documents"'
    ],
    apiEndpoint: '/api/documents',
    status: 'active'
  },
  {
    name: 'Web Search',
    description: 'Search the web for real-time information',
    category: 'knowledge',
    icon: <Search className="w-5 h-5" />,
    capabilities: [
      'Real-time web search',
      'News and article lookup',
      'Fact checking',
      'Weather and traffic updates',
      'Stock prices and market data'
    ],
    voiceCommands: [
      '"What\'s the weather like tomorrow?"',
      '"Search for latest news about AI"',
      '"What\'s the current stock price of Apple?"'
    ],
    status: 'coming-soon'
  },
  {
    name: 'Knowledge Base',
    description: 'Access company-specific knowledge and procedures',
    category: 'knowledge',
    icon: <Database className="w-5 h-5" />,
    capabilities: [
      'Company policy lookup',
      'Procedure guidance',
      'FAQ responses',
      'Training material access',
      'Compliance information'
    ],
    voiceCommands: [
      '"What\'s the vacation policy?"',
      '"How do I submit an expense report?"',
      '"Show me the onboarding checklist"'
    ],
    status: 'beta'
  },

  // Core Agent Tools
  {
    name: 'Voice Processing',
    description: 'Advanced speech recognition and synthesis',
    category: 'core',
    icon: <Mic className="w-5 h-5" />,
    capabilities: [
      'Real-time speech recognition',
      'Natural voice synthesis',
      'Multi-language support',
      'Noise cancellation',
      'Voice activity detection'
    ],
    voiceCommands: [
      'Always listening when activated',
      'Responds in natural speech',
      'Supports whisper mode for quiet environments'
    ],
    status: 'active'
  },
  {
    name: 'Conversation Memory',
    description: 'Maintains context across conversation sessions',
    category: 'core',
    icon: <Brain className="w-5 h-5" />,
    capabilities: [
      'Session memory retention',
      'Context understanding',
      'User preference learning',
      'Conversation history',
      'Personalized responses'
    ],
    voiceCommands: [
      'Remembers previous conversations',
      'Learns from user interactions',
      'Maintains context throughout sessions'
    ],
    status: 'active'
  },
  {
    name: 'Real-time Processing',
    description: 'Instant response and action execution',
    category: 'core',
    icon: <Zap className="w-5 h-5" />,
    capabilities: [
      'Sub-second response times',
      'Streaming responses',
      'Parallel task execution',
      'Real-time notifications',
      'Live status updates'
    ],
    voiceCommands: [
      'Instant execution of commands',
      'Real-time status feedback',
      'Immediate error reporting'
    ],
    status: 'active'
  },

  // Security & Privacy Tools
  {
    name: 'Privacy Controls',
    description: 'Manage data privacy and access controls',
    category: 'security',
    icon: <Shield className="w-5 h-5" />,
    capabilities: [
      'Data encryption',
      'Access control management',
      'Privacy settings',
      'Audit logging',
      'Secure authentication'
    ],
    voiceCommands: [
      '"Turn on privacy mode"',
      '"Who has access to my data?"',
      '"Delete my conversation history"'
    ],
    status: 'active'
  },

  // Developer Tools
  {
    name: 'Custom Functions',
    description: 'Execute custom code and API integrations',
    category: 'developer',
    icon: <Code className="w-5 h-5" />,
    capabilities: [
      'Custom function execution',
      'API integration management',
      'Webhook handling',
      'Script automation',
      'Third-party service connections'
    ],
    voiceCommands: [
      '"Run the sales report function"',
      '"Execute the backup script"',
      '"Trigger the deployment webhook"'
    ],
    status: 'beta'
  },
  {
    name: 'Analytics & Monitoring',
    description: 'Track agent performance and usage analytics',
    category: 'developer',
    icon: <Eye className="w-5 h-5" />,
    capabilities: [
      'Usage analytics',
      'Performance monitoring',
      'Error tracking',
      'Response time metrics',
      'User interaction insights'
    ],
    voiceCommands: [
      '"Show me usage statistics"',
      '"What\'s the average response time?"',
      '"Report any errors from today"'
    ],
    status: 'active'
  }
];

const categories = [
  { id: 'all', name: 'All Tools', icon: <Star className="w-4 h-4" /> },
  { id: 'communication', name: 'Communication', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'scheduling', name: 'Scheduling', icon: <Calendar className="w-4 h-4" /> },
  { id: 'knowledge', name: 'Knowledge', icon: <Brain className="w-4 h-4" /> },
  { id: 'core', name: 'Core Features', icon: <Bot className="w-4 h-4" /> },
  { id: 'security', name: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'developer', name: 'Developer', icon: <Code className="w-4 h-4" /> }
];

export default function AgentToolsPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredTools = activeCategory === 'all' 
    ? agentTools 
    : agentTools.filter(tool => tool.category === activeCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'beta':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'coming-soon':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'beta': return 'Beta';
      case 'coming-soon': return 'Coming Soon';
      default: return 'Unknown';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                Agent Tools & Capabilities
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Comprehensive overview of all tools and capabilities available to your voice agents
              </p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {agentTools.filter(t => t.status === 'active').length}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Tools</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Settings className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {agentTools.filter(t => t.status === 'beta').length}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Beta Features</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {agentTools.filter(t => t.status === 'coming-soon').length}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Coming Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {categories.length - 1}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tools by Category */}
        <Tabs defaultValue="all" className="space-y-8">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            {categories.map((category) => (
              <TabsTrigger 
                key={category.id}
                value={category.id}
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-600 dark:text-slate-400 px-4 py-2 rounded-lg font-medium transition-all flex items-center space-x-2"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.icon}
                <span>{category.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.id} value={category.id} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(category.id === 'all' ? agentTools : agentTools.filter(tool => tool.category === category.id)).map((tool, index) => (
                  <Card key={index} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl hover:shadow-orange-500/5 hover:border-orange-500/20 transition-all duration-300 group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-lg flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-red-600/30 transition-all">
                            {tool.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              {tool.name}
                            </CardTitle>
                            <CardDescription className="text-slate-600 dark:text-slate-400">
                              {tool.description}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className={`${getStatusColor(tool.status)} border font-medium px-3 py-1`}>
                          {getStatusText(tool.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Capabilities */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Capabilities</h4>
                        <div className="space-y-1">
                          {tool.capabilities.map((capability, idx) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                              <span>{capability}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Voice Commands */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Example Voice Commands</h4>
                        <div className="space-y-2">
                          {tool.voiceCommands.map((command, idx) => (
                            <div key={idx} className="bg-slate-100/50 dark:bg-slate-700/50 rounded-lg p-2 text-sm text-slate-700 dark:text-slate-300 italic">
                              {command}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* API Endpoint */}
                      {tool.apiEndpoint && (
                        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                            <Code className="w-3 h-3" />
                            <span className="font-mono">{tool.apiEndpoint}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
