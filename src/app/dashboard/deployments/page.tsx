"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause, 
  Square, 
  ExternalLink, 
  Copy, 
  Settings, 
  BarChart3, 
  Globe,
  Smartphone,
  Code,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import DashboardLayout from "@/components/dashboard-layout";

interface DeploymentMetrics {
  totalSessions: number;
  activeUsers: number;
  avgSessionLength: number;
  totalInteractions: number;
  successRate: number;
  lastActivity: string;
}

export default function DeploymentsPage() {
  const { user } = useUser();
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Get user's assistants and their deployment status
  const assistants = useQuery(api.assistants.getByOwner, 
    user?.id ? { ownerId: user.id } : "skip"
  );

  // Get deployments for user
  const deployments = useQuery(api.deployments.getByUser, 
    user?.id ? { userId: user.id } : "skip"
  );

  // Debug logging
  useEffect(() => {
    console.log("DeploymentsPage Debug:", {
      user: user?.id,
      assistants: assistants?.length,
      deployments: deployments?.length,
      assistantsData: assistants,
      deploymentsData: deployments
    });
  }, [user?.id, assistants, deployments]);

  // Mutations
  const createDeployment = useMutation(api.deployments.create);
  const updateDeploymentStatus = useMutation(api.deployments.updateStatus);
  const deleteDeployment = useMutation(api.deployments.remove);

  const handleDeploy = async (assistantId: string) => {
    if (!user?.id) return;
    
    setIsDeploying(assistantId);
    try {
      const assistant = assistants?.find((a: any) => a._id === assistantId);
      if (!assistant) {
        console.error('Assistant not found:', assistantId);
        alert('Assistant not found. Please try again.');
        return;
      }

      console.log('Deploying assistant:', assistant);

      const result = await createDeployment({
        assistantId: assistantId as any,
        userId: user.id,
        name: `${assistant.name} Deployment`,
        description: `Live deployment of ${assistant.name}`,
        status: "active",
        settings: {
          domain: `${assistant.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
          embedEnabled: true,
          apiEnabled: true,
          corsOrigins: ["*"],
          customization: {
            theme: "default",
            branding: true
          }
        }
      });

      console.log('Deployment created:', result);
    } catch (error) {
      console.error('Failed to deploy:', error);
      alert(`Failed to deploy assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeploying(null);
    }
  };

  const handleStatusChange = async (deploymentId: string, status: "active" | "paused" | "stopped") => {
    try {
      await updateDeploymentStatus({ deploymentId: deploymentId as any, status });
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update deployment status.');
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(type);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const getDeploymentUrl = (deployment: any) => {
    const domain = deployment.settings?.domain || 'deployment';
    return `https://${domain}.familyai.app`;
  };

  const getEmbedCode = (deployment: any) => {
    const url = getDeploymentUrl(deployment);
    return `<iframe src="${url}/embed" width="400" height="600" frameborder="0"></iframe>`;
  };

  // Remove mock metrics - these should come from actual usage tracking
  // For now, we'll hide the metrics until we have real data

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="text-center">
            <p className="text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>Please sign in to view deployments</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show loading state while data is being fetched
  if (assistants === undefined || deployments === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500" style={{ fontFamily: 'Inter, sans-serif' }}>Loading deployments...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>Deployments</h1>
          <p className="text-gray-600 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Deploy your assistants and share them with the world
          </p>
        </div>

        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Active Deployments</TabsTrigger>
            <TabsTrigger value="available">Available to Deploy</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {deployments?.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>No Active Deployments</h3>
                  <p className="text-gray-600 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Deploy your assistants to make them available online
                  </p>
                  <Button 
                    variant="outline"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                    onClick={() => {
                      const availableTab = document.querySelector('[role="tab"][value="available"]') as HTMLElement;
                      availableTab?.click();
                    }}
                  >
                    View Available Assistants
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {deployments?.map((deployment: any) => {
                  const assistant = assistants?.find((a: any) => a._id === deployment.assistantId);
                  const deploymentUrl = getDeploymentUrl(deployment);
                  
                  return (
                    <Card key={deployment._id} className="overflow-hidden">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {deployment.name}
                              <Badge variant={
                                deployment.status === 'active' ? 'default' : 
                                deployment.status === 'paused' ? 'secondary' : 'destructive'
                              }>
                                {deployment.status}
                              </Badge>
                            </CardTitle>
                            <CardDescription>{deployment.description}</CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {deployment.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(deployment._id, 'paused')}
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                            )}
                            {deployment.status === 'paused' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(deployment._id, 'active')}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleStatusChange(deployment._id, 'stopped')}
                            >
                              <Square className="h-4 w-4 mr-1" />
                              Stop
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* URLs and Access */}
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span className="font-medium">Web App</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={deploymentUrl}
                                readOnly
                                className="text-sm"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(deploymentUrl, 'web')}
                              >
                                {copiedUrl === 'web' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(deploymentUrl, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Code className="h-4 w-4" />
                              <span className="font-medium">API Endpoint</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={`${deploymentUrl}/api`}
                                readOnly
                                className="text-sm"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(`${deploymentUrl}/api`, 'api')}
                              >
                                {copiedUrl === 'api' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              <span className="font-medium">Embed Code</span>
                            </div>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => copyToClipboard(getEmbedCode(deployment), 'embed')}
                            >
                              {copiedUrl === 'embed' ? 'Copied!' : 'Copy Embed Code'}
                            </Button>
                          </div>
                        </div>

                        {/* Deployment Info */}
                        <div className="pt-4 border-t">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Deployed {new Date(deployment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-4">
            {assistants?.filter((assistant: any) => 
              !deployments?.some((d: any) => d.assistantId === assistant._id && d.status !== 'stopped')
            ).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Assistants Available</h3>
                  <p className="text-gray-600 mb-4">
                    Create an assistant first to deploy it
                  </p>
                  <Button onClick={() => window.location.href = '/dashboard/agents'}>
                    Create Assistant
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {assistants?.filter((assistant: any) => 
                  !deployments?.some((d: any) => d.assistantId === assistant._id && d.status !== 'stopped')
                ).map((assistant: any) => (
                  <Card key={assistant._id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{assistant.name}</CardTitle>
                          <CardDescription>
                            {assistant.description}
                          </CardDescription>
                        </div>
                        <Button
                          onClick={() => handleDeploy(assistant._id)}
                          disabled={isDeploying === assistant._id}
                        >
                          {isDeploying === assistant._id ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Deploying...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-2" />
                              Deploy
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Type: {assistant.type}</span>
                        <span>Voice: {assistant.voiceEnabled ? 'Enabled' : 'Disabled'}</span>
                        <span>Status: {assistant.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Deployment Analytics
                </CardTitle>
                <CardDescription>
                  Detailed usage statistics for your deployed assistants
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deployments?.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Analytics Available</h3>
                    <p className="text-gray-600">
                      Deploy an assistant to start collecting analytics data
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {deployments?.map((deployment: any) => {
                      return (
                        <div key={deployment._id} className="border rounded-lg p-4">
                          <h4 className="font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>{deployment.name}</h4>
                          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Status: <span className="font-medium text-gray-900 dark:text-white">{deployment.status}</span>
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              Deployed: <span className="font-medium">{new Date(deployment.createdAt).toLocaleDateString()}</span>
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">
                              Analytics and usage metrics will be available once your deployment receives traffic
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
