"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Mail, Search, Calendar, Globe, TrendingUp, TrendingDown, Activity } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";
import { usageTracker } from "@/lib/usage-tracker";

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    voice_minutes: 30,
    email_sends: 10,
    rag_queries: 50,
    web_searches: 20,
    calendar_events: 25
  },
  pro: {
    voice_minutes: 300,
    email_sends: 100,
    rag_queries: 500,
    web_searches: 200,
    calendar_events: 250
  },
  pro_plus: {
    voice_minutes: 1000,
    email_sends: 500,
    rag_queries: 2000,
    web_searches: 1000,
    calendar_events: 1000
  },
  premium: {
    voice_minutes: -1, // unlimited
    email_sends: -1,
    rag_queries: -1,
    web_searches: -1,
    calendar_events: -1
  }
};

interface UsageData {
  voice_minutes: number;
  email_sends: number;
  rag_queries: number;
  web_searches: number;
  calendar_events: number;
}

interface Activity {
  category: string;
  amount: number;
  unit: string;
  occurredAt: string;
  metadata?: any;
}

export default function UsagePage() {
  const { user } = useUser();
  const [currentPlan] = useState<keyof typeof PLAN_LIMITS>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [aggregatedUsage, setAggregatedUsage] = useState<UsageData>({
    voice_minutes: 0,
    email_sends: 0,
    rag_queries: 0,
    web_searches: 0,
    calendar_events: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [monthlyData, setMonthlyData] = useState({
    currentMonth: {
      calls: 0,
      messages: 0,
      cost: 0
    },
    lastMonth: {
      calls: 0,
      messages: 0,
      cost: 0
    }
  });

  useEffect(() => {
    if (user?.id) {
      // Load real usage data
      const usage = usageTracker.getUserUsage(user.id);
      setAggregatedUsage({
        voice_minutes: usage.voice_minutes || 0,
        email_sends: usage.email_sends || 0,
        rag_queries: usage.rag_queries || 0,
        web_searches: usage.web_searches || 0,
        calendar_events: usage.calendar_events || 0
      });

      // Load recent activities
      const activities = usageTracker.getRecentActivity(user.id, 5);
      const formattedActivities = activities.map(activity => ({
        category: activity.category.replace('_', ' ').toUpperCase(),
        amount: activity.amount,
        unit: getUnitForCategory(activity.category),
        occurredAt: activity.metadata?.timestamp || new Date().toISOString(),
        metadata: activity.metadata
      }));
      setRecentActivities(formattedActivities);

      // Calculate monthly data
      const totalVoiceMinutes = usage.voice_minutes || 0;
      const totalMessages = (usage.email_sends || 0) + (usage.rag_queries || 0);
      const estimatedCost = calculateEstimatedCost(usage);

      setMonthlyData({
        currentMonth: {
          calls: totalVoiceMinutes,
          messages: totalMessages,
          cost: estimatedCost
        },
        lastMonth: {
          calls: Math.floor(totalVoiceMinutes * 0.7), // Mock last month data
          messages: Math.floor(totalMessages * 0.8),
          cost: estimatedCost * 0.75
        }
      });

      setIsLoading(false);
    }
  }, [user?.id]);

  const getUnitForCategory = (category: string): string => {
    switch (category) {
      case "voice_minutes": return "minutes";
      case "email_sends": return "emails";
      case "rag_queries": return "queries";
      case "web_searches": return "searches";
      case "calendar_events": return "events";
      default: return "items";
    }
  };

  const calculateEstimatedCost = (usage: Record<string, number>): number => {
    const costs = {
      voice_minutes: (usage.voice_minutes || 0) * 0.10,
      email_sends: (usage.email_sends || 0) * 0.01,
      rag_queries: (usage.rag_queries || 0) * 0.001,
      web_searches: (usage.web_searches || 0) * 0.005,
      calendar_events: (usage.calendar_events || 0) * 0.02
    };
    
    return Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  };

  const getUsagePercentage = (used: number, category: keyof typeof PLAN_LIMITS.free) => {
    const limit = PLAN_LIMITS[currentPlan][category];
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-orange-600";
    if (percentage >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-orange-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-green-500";
  };

  const usageMetrics = [
    {
      id: "voice_minutes" as keyof UsageData,
      icon: Clock,
      title: "Voice Minutes",
      color: "text-blue-600",
      used: aggregatedUsage.voice_minutes,
      limit: PLAN_LIMITS[currentPlan].voice_minutes,
    },
    {
      id: "email_sends" as keyof UsageData,
      icon: Mail,
      title: "Email Sends",
      color: "text-green-600",
      used: aggregatedUsage.email_sends,
      limit: PLAN_LIMITS[currentPlan].email_sends,
    },
    {
      id: "rag_queries" as keyof UsageData,
      icon: Search,
      title: "RAG Queries",
      color: "text-purple-600",
      used: aggregatedUsage.rag_queries,
      limit: PLAN_LIMITS[currentPlan].rag_queries,
    },
    {
      id: "web_searches" as keyof UsageData,
      icon: Globe,
      title: "Web Searches",
      color: "text-orange-600",
      used: aggregatedUsage.web_searches,
      limit: PLAN_LIMITS[currentPlan].web_searches,
    },
    {
      id: "calendar_events" as keyof UsageData,
      icon: Calendar,
      title: "Calendar Events",
      color: "text-red-600",
      used: aggregatedUsage.calendar_events,
      limit: PLAN_LIMITS[currentPlan].calendar_events,
    },
  ];

  // Function to simulate adding usage (for demo purposes)
  const addSampleUsage = async () => {
    if (!user?.id) return;
    
    // Add a random usage event
    const categories: Array<keyof UsageData> = ['voice_minutes', 'email_sends', 'rag_queries', 'web_searches', 'calendar_events'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.floor(Math.random() * 3) + 1;
    
    await usageTracker.recordUsage({
      userId: user.id,
      category: randomCategory,
      amount,
      metadata: {
        agentName: 'Demo Agent',
        type: 'manual_demo'
      }
    });

    // Refresh the data
    const usage = usageTracker.getUserUsage(user.id);
    setAggregatedUsage({
      voice_minutes: usage.voice_minutes || 0,
      email_sends: usage.email_sends || 0,
      rag_queries: usage.rag_queries || 0,
      web_searches: usage.web_searches || 0,
      calendar_events: usage.calendar_events || 0
    });

    const activities = usageTracker.getRecentActivity(user.id, 5);
    const formattedActivities = activities.map(activity => ({
      category: activity.category.replace('_', ' ').toUpperCase(),
      amount: activity.amount,
      unit: getUnitForCategory(activity.category),
      occurredAt: activity.metadata?.timestamp || new Date().toISOString(),
      metadata: activity.metadata
    }));
    setRecentActivities(formattedActivities);
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
              Loading usage data...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
              Usage & Analytics
            </h1>
            <p className="text-gray-600 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
              Monitor your AI assistant usage and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-sm capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>
              {currentPlan === "free" ? "Free Plan" : currentPlan.replace("_", " ")} Plan
            </Badge>
            <Button variant="outline" size="sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Upgrade Plan
            </Button>
            <Button 
              onClick={addSampleUsage}
              variant="outline" 
              size="sm" 
              className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Demo Usage
            </Button>
          </div>
        </div>

        {/* Usage Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {usageMetrics.map((metric) => {
            const percentage = getUsagePercentage(metric.used, metric.id);
            const isUnlimited = metric.limit === -1;
            
            return (
              <Card key={metric.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <metric.icon className={`w-5 h-5 ${metric.color}`} />
                      <CardTitle className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {metric.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {isLoading ? "..." : metric.used.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {isUnlimited ? "unlimited" : `of ${metric.limit.toLocaleString()}`}
                      </span>
                    </div>
                    
                    {!isUnlimited && !isLoading && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(percentage)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className={`text-xs font-medium ${getUsageColor(percentage)}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                          {percentage.toFixed(1)}% used
                        </div>
                      </>
                    )}
                    
                    {isUnlimited && (
                      <div className="text-xs text-green-600 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                        ∞ Unlimited
                      </div>
                    )}
                    
                    {isLoading && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 bg-gray-300 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Usage Summary and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Usage Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <TrendingUp className="w-5 h-5" />
                <span>Monthly Summary</span>
              </CardTitle>
              <CardDescription style={{ fontFamily: 'Inter, sans-serif' }}>
                Current month vs last month usage comparison
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!isLoading ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {monthlyData.currentMonth.calls}
                        </div>
                        <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>Voice Minutes</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {monthlyData.currentMonth.messages}
                        </div>
                        <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>Total Messages</div>
                      </div>
                    </div>
                    
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                        ${monthlyData.currentMonth.cost.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                        Current month cost
                      </div>
                      {monthlyData.lastMonth.cost > 0 && (
                        <div className={`text-xs mt-1 flex items-center justify-center space-x-1 ${
                          monthlyData.currentMonth.cost > monthlyData.lastMonth.cost 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`} style={{ fontFamily: 'Inter, sans-serif' }}>
                          {monthlyData.currentMonth.cost > monthlyData.lastMonth.cost ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>
                            {Math.abs(((monthlyData.currentMonth.cost - monthlyData.lastMonth.cost) / monthlyData.lastMonth.cost) * 100).toFixed(1)}% vs last month
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <Activity className="w-5 h-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription style={{ fontFamily: 'Inter, sans-serif' }}>
                Latest usage events from your assistants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {!isLoading ? (
                  recentActivities.length > 0 ? (
                    recentActivities.map((activity: Activity, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <div className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {activity.category}
                            </div>
                            <div className="text-xs text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {activity.metadata?.agentName || 'Unknown Agent'} • {new Date(activity.occurredAt).toLocaleDateString()} at{' '}
                              {new Date(activity.occurredAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {activity.amount} {activity.unit}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                        No recent activity. Your assistant interactions will appear here.
                      </p>
                      <button 
                        onClick={addSampleUsage}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Generate Sample Activity
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
