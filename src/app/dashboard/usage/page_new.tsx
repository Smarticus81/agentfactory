"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Clock, 
  Mail, 
  Search, 
  Calendar, 
  Globe,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  MessageSquare,
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

interface UsageStats {
  voice_minutes: { used: number; limit: number; unit: string };
  email_sends: { used: number; limit: number; unit: string };
  rag_queries: { used: number; limit: number; unit: string };
  web_searches: { used: number; limit: number; unit: string };
  calendar_events: { used: number; limit: number; unit: string };
}

interface VoiceSession {
  _id: string;
  duration: number;
  timestamp: string;
  agent_id: string;
  quality_score?: number;
}

interface UsageAnalytics {
  daily_usage: Array<{
    date: string;
    voice_minutes: number;
    email_sends: number;
    rag_queries: number;
    web_searches: number;
    calendar_events: number;
  }>;
  top_agents: Array<{
    agent_id: string;
    agent_name: string;
    usage_count: number;
  }>;
  trends: {
    voice_trend: number;
    email_trend: number;
    rag_trend: number;
    web_trend: number;
    calendar_trend: number;
  };
}

const CATEGORY_ICONS = {
  voice_minutes: Clock,
  email_sends: Mail,
  rag_queries: Search,
  web_searches: Globe,
  calendar_events: Calendar
};

const CATEGORY_COLORS = {
  voice_minutes: 'text-blue-600',
  email_sends: 'text-green-600',
  rag_queries: 'text-purple-600',
  web_searches: 'text-orange-600',
  calendar_events: 'text-red-600'
};

const CATEGORY_LABELS = {
  voice_minutes: 'Voice Minutes',
  email_sends: 'Email Sends',
  rag_queries: 'RAG Queries',
  web_searches: 'Web Searches',
  calendar_events: 'Calendar Events'
};

export default function UsagePage() {
  const { user } = useUser();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  
  // Fetch real usage data from Convex
  const usage = useQuery(api.usage.getUserUsage, 
    user?.id ? { user_id: user.id } : 'skip'
  );
  
  const voiceSessions = useQuery(api.voice_sessions.getRecentSessions,
    user?.id ? { user_id: user.id, limit: 50 } : 'skip'
  );
  
  const usageAnalytics = useQuery(api.usage.getUsageAnalytics,
    user?.id ? { user_id: user.id, period: selectedPeriod } : 'skip'
  );

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading usage data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!usage) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Usage Data</h3>
            <p className="text-gray-600 mb-4">We couldn't retrieve your usage information.</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const currentPlan = usage.current_plan || 'free';
  const usageStats = usage.usage_stats as UsageStats;

  const renderUsageCard = (category: keyof UsageStats) => {
    const stat = usageStats[category];
    const Icon = CATEGORY_ICONS[category];
    const colorClass = CATEGORY_COLORS[category];
    const label = CATEGORY_LABELS[category];
    const percentage = Math.min((stat.used / stat.limit) * 100, 100);
    const isNearLimit = percentage > 80;
    const isOverLimit = percentage >= 100;

    return (
      <Card key={category} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon className={`w-5 h-5 ${colorClass}`} />
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
            </div>
            {isOverLimit && (
              <Badge variant="destructive" className="text-xs">
                Over Limit
              </Badge>
            )}
            {isNearLimit && !isOverLimit && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                Near Limit
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-bold">
                {stat.used.toLocaleString()}
              </span>
              <span className="text-sm text-gray-500">
                of {stat.limit.toLocaleString()} {stat.unit}
              </span>
            </div>
            <Progress 
              value={percentage} 
              className={`h-2 ${isOverLimit ? 'bg-red-100' : isNearLimit ? 'bg-amber-100' : 'bg-gray-100'}`}
            />
            <div className="text-xs text-gray-600">
              {Math.round(percentage)}% used
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTrendCard = (category: keyof UsageStats, trend: number) => {
    const Icon = CATEGORY_ICONS[category];
    const colorClass = CATEGORY_COLORS[category];
    const label = CATEGORY_LABELS[category];
    const isPositive = trend > 0;
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

    return (
      <Card key={`trend-${category}`} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg bg-gray-50`}>
                <Icon className={`w-4 h-4 ${colorClass}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">vs last period</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <TrendIcon className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usage & Analytics</h1>
            <p className="text-gray-600 mt-1">
              Monitor your AI assistant usage and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-sm capitalize">
              {currentPlan} Plan
            </Badge>
            <Button variant="outline" size="sm">
              Upgrade Plan
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="voice">Voice Sessions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Current Usage Stats */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Current Usage</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Object.keys(usageStats).map((category) => 
                  renderUsageCard(category as keyof UsageStats)
                )}
              </div>
            </div>

            {/* Usage Trends */}
            {usageAnalytics?.trends && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Usage Trends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {Object.entries(usageAnalytics.trends).map(([key, value]) => {
                    const category = key.replace('_trend', '') as keyof UsageStats;
                    return renderTrendCard(category, value);
                  })}
                </div>
              </div>
            )}

            {/* Top Performing Agents */}
            {usageAnalytics?.top_agents && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <span>Top Performing Agents</span>
                  </CardTitle>
                  <CardDescription>
                    Your most active AI assistants this {selectedPeriod === '7d' ? 'week' : selectedPeriod === '30d' ? 'month' : 'quarter'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usageAnalytics.top_agents.slice(0, 5).map((agent, index) => (
                      <div key={agent.agent_id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agent.agent_name}</p>
                            <p className="text-sm text-gray-500">{agent.usage_count} interactions</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{agent.usage_count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="voice" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Voice Sessions</h2>
              <div className="flex space-x-2">
                {['7d', '30d', '90d'].map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period as typeof selectedPeriod)}
                  >
                    {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : '90 Days'}
                  </Button>
                ))}
              </div>
            </div>

            {voiceSessions && voiceSessions.length > 0 ? (
              <div className="grid gap-4">
                {voiceSessions.map((session) => (
                  <Card key={session._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Voice Session
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(session.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(session.duration)}</span>
                          </div>
                          {session.quality_score && (
                            <div className="flex items-center space-x-1">
                              <Activity className="w-4 h-4" />
                              <span>{Math.round(session.quality_score * 100)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Voice Sessions</h3>
                  <p className="text-gray-600">
                    Start a voice conversation with your AI assistant to see session data here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Detailed Analytics</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Usage Chart Placeholder */}
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Usage Trends</CardTitle>
                    <CardDescription>
                      Your AI assistant usage over the past {selectedPeriod === '7d' ? '7 days' : selectedPeriod === '30d' ? '30 days' : '90 days'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Chart visualization coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                    <CardDescription>
                      Key performance indicators for your AI assistants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Average Response Time</span>
                        <span className="text-sm text-gray-600">1.2s</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Success Rate</span>
                        <span className="text-sm text-gray-600">98.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">User Satisfaction</span>
                        <span className="text-sm text-gray-600">4.8/5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Interactions</span>
                        <span className="text-sm text-gray-600">
                          {Object.values(usageStats).reduce((sum, stat) => sum + stat.used, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">Billing & Plan Management</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>
                      Your current subscription and billing information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Plan</span>
                        <Badge variant="secondary" className="capitalize">{currentPlan}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Billing Cycle</span>
                        <span className="text-sm text-gray-600">Monthly</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Next Billing Date</span>
                        <span className="text-sm text-gray-600">
                          {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="pt-4">
                        <Button className="w-full">
                          Manage Billing
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage Warnings</CardTitle>
                    <CardDescription>
                      Notifications about your current usage levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(usageStats).map(([category, stat]) => {
                        const percentage = (stat.used / stat.limit) * 100;
                        const label = CATEGORY_LABELS[category as keyof UsageStats];
                        
                        if (percentage > 80) {
                          return (
                            <div key={category} className="flex items-start space-x-3 p-3 bg-amber-50 rounded-lg">
                              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium text-amber-800">
                                  {label} Usage High
                                </p>
                                <p className="text-xs text-amber-700">
                                  You've used {Math.round(percentage)}% of your {label.toLowerCase()} limit
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }).filter(Boolean)}
                      
                      {Object.values(usageStats).every(stat => (stat.used / stat.limit) * 100 <= 80) && (
                        <div className="text-center py-4">
                          <Zap className="w-8 h-8 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">All usage levels are healthy!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
