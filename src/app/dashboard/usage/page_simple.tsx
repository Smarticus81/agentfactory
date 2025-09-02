"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Mail, Search, Calendar, Globe } from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

export default function UsagePage() {
  const { user } = useUser();

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-gray-600">Loading usage data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
              Free Plan
            </Badge>
            <Button variant="outline" size="sm">
              Upgrade Plan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm font-medium">Voice Minutes</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-sm text-gray-500">of 1000 minutes</span>
                </div>
                <div className="text-xs text-gray-600">0% used</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-sm font-medium">Email Sends</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-sm text-gray-500">of 100 sends</span>
                </div>
                <div className="text-xs text-gray-600">0% used</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Search className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-sm font-medium">RAG Queries</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-sm text-gray-500">of 500 queries</span>
                </div>
                <div className="text-xs text-gray-600">0% used</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-orange-600" />
                  <CardTitle className="text-sm font-medium">Web Searches</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-sm text-gray-500">of 200 searches</span>
                </div>
                <div className="text-xs text-gray-600">0% used</div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <CardTitle className="text-sm font-medium">Calendar Events</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold">0</span>
                  <span className="text-sm text-gray-500">of 50 events</span>
                </div>
                <div className="text-xs text-gray-600">0% used</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Usage Summary</CardTitle>
              <CardDescription>
                Your current usage across all services for this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No usage data available yet. Start using your AI assistants to see analytics here.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
