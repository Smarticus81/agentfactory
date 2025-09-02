"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';

interface UsageData {
  currentMonth: {
    calls: number;
    messages: number;
    aiMinutes: number;
    cost: number;
  };
  lastMonth: {
    calls: number;
    messages: number;
    aiMinutes: number;
    cost: number;
  };
  limits: {
    calls: number;
    messages: number;
    aiMinutes: number;
    cost: number;
  };
}

interface Addon {
  name: string;
  description: string;
  cost: number;
  status: string;
  usage: number;
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

interface UsageHistory {
  month: string;
  calls: number;
  messages: number;
  cost: number;
}

export default function UsagePage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [activeAddons, setActiveAddons] = useState<Addon[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);
        
        // Fetch usage data from your backend
        const response = await fetch('/api/usage');
        if (response.ok) {
          const data = await response.json();
          setUsageData(data.usageData);
          setActiveAddons(data.activeAddons || []);
          setCostBreakdown(data.costBreakdown || []);
          setUsageHistory(data.usageHistory || []);
        } else {
          console.error('Failed to fetch usage data');
          setError('Failed to load usage data');
        }
      } catch (err) {
        console.error('Error fetching usage data:', err);
        setError('Failed to load usage data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, []);

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading usage data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !usageData) {
    return (
      <DashboardLayout>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Usage Data</h1>
          <p className="text-gray-600 mb-4">{error || 'No usage data available'}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usage & Billing</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor your usage, costs, and active add-ons
          </p>
        </div>

        {/* Current Month Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageData.currentMonth.calls.toLocaleString()}</div>
              <Progress 
                value={getUsagePercentage(usageData.currentMonth.calls, usageData.limits.calls)} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {usageData.currentMonth.calls.toLocaleString()} / {usageData.limits.calls.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageData.currentMonth.messages.toLocaleString()}</div>
              <Progress 
                value={getUsagePercentage(usageData.currentMonth.messages, usageData.limits.messages)} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {usageData.currentMonth.messages.toLocaleString()} / {usageData.limits.messages.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">AI Minutes</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usageData.currentMonth.aiMinutes.toFixed(1)}</div>
              <Progress 
                value={getUsagePercentage(usageData.currentMonth.aiMinutes, usageData.limits.aiMinutes)} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {usageData.currentMonth.aiMinutes.toFixed(1)} / {usageData.limits.aiMinutes.toFixed(1)} hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${usageData.currentMonth.cost.toFixed(2)}</div>
              <Progress 
                value={getUsagePercentage(usageData.currentMonth.cost, usageData.limits.cost)} 
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                ${usageData.currentMonth.cost.toFixed(2)} / ${usageData.limits.cost.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="addons">Add-ons</TabsTrigger>
            <TabsTrigger value="history">Usage History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cost Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>Where your money goes this month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {costBreakdown.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-sm font-medium">{item.category}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${item.amount.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">{item.percentage}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Month-over-Month Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Month-over-Month</CardTitle>
                  <CardDescription>Compare with last month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Voice Calls</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usageData.currentMonth.calls > usageData.lastMonth.calls ? '+' : ''}
                          {((usageData.currentMonth.calls - usageData.lastMonth.calls) / usageData.lastMonth.calls * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {usageData.lastMonth.calls.toLocaleString()} → {usageData.currentMonth.calls.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Messages</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usageData.currentMonth.messages > usageData.lastMonth.messages ? '+' : ''}
                          {((usageData.currentMonth.messages - usageData.lastMonth.messages) / usageData.lastMonth.messages * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {usageData.lastMonth.messages.toLocaleString()} → {usageData.currentMonth.messages.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Cost</span>
                      <div className="text-right">
                        <div className="font-semibold">
                          {usageData.currentMonth.cost > usageData.lastMonth.cost ? '+' : ''}
                          {((usageData.currentMonth.cost - usageData.lastMonth.cost) / usageData.lastMonth.cost * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${usageData.lastMonth.cost.toFixed(2)} → ${usageData.currentMonth.cost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="addons" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Add-ons</CardTitle>
                <CardDescription>Your current add-ons and their usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeAddons.map((addon, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{addon.name}</h3>
                        <p className="text-sm text-muted-foreground">{addon.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={addon.status === 'active' ? 'default' : 'secondary'}>
                            {addon.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ${addon.cost.toFixed(2)}/month
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{addon.usage}%</div>
                        <Progress value={addon.usage} className="w-20 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage History</CardTitle>
                <CardDescription>Monthly usage trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {usageHistory.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-semibold">{month.month}</h3>
                        <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Calls:</span>
                            <span className="ml-2 font-medium">{month.calls.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Messages:</span>
                            <span className="ml-2 font-medium">{month.messages.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="ml-2 font-medium">${month.cost.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
