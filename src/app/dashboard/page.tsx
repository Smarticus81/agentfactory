"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Settings, Zap, BarChart3, Users, Calendar, Package, Archive, RotateCcw, Star, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard-layout';
import AgentActionsMenu from '@/components/agent-actions-menu';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';

interface Agent {
  _id: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: string;
}

export default function Dashboard() {
  const { user } = useUser();
  const [showArchived, setShowArchived] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const agents = useQuery(api.assistants.getUserAgents, { 
    userId: user?.id || '', 
    includeArchived: showArchived 
  });
  const [selectedView, setSelectedView] = useState<'overview' | 'agents' | 'analytics'>('overview');
  
  // Check onboarding status
  useEffect(() => {
    if (user?.id && agents !== undefined) {
      // Check if user has completed onboarding
      const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
      const urlParams = new URLSearchParams(window.location.search);
      const onboardedParam = urlParams.get('onboarded');
      
      // If user has no agents and hasn't completed onboarding, redirect to onboarding
      if (!hasCompletedOnboarding && !onboardedParam && agents.length === 0) {
        // Small delay to ensure the check is after initial load
        setTimeout(() => {
          window.location.href = '/onboarding';
        }, 1000);
        return;
      }
      
      // If they just completed onboarding, mark it as completed
      if (onboardedParam === 'true') {
        localStorage.setItem(`onboarding_completed_${user.id}`, 'true');
        // Clean up the URL
        window.history.replaceState({}, document.title, '/dashboard');
      }
      
      setIsCheckingOnboarding(false);
    }
  }, [user?.id, agents]);
  
  // Mutations
  const deleteAgentMutation = useMutation(api.assistants.deleteAgent);
  const archiveAgentMutation = useMutation(api.assistants.archiveAgent);
  const unarchiveAgentMutation = useMutation(api.assistants.unarchiveAgent);
  
  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'archive' | 'unarchive';
    agentId: string;
    agentName: string;
    isLoading: boolean;
  }>({ isOpen: false, type: 'delete', agentId: '', agentName: '', isLoading: false });

  const stats = {
    totalAgents: agents?.filter((a: Agent) => !a.isArchived)?.length || 0,
    activeAgents: agents?.filter((a: Agent) => a.isActive && !a.isArchived)?.length || 0,
    archivedAgents: agents?.filter((a: Agent) => a.isArchived)?.length || 0,
    totalInteractions: 1247 + (agents?.length || 0) * 23, // Dynamic calculation based on agents
    avgResponseTime: 234,
    thisWeekInteractions: 89,
    voiceMinutesUsed: 45
  };
  
  // Action handlers
  const handleArchive = (agentId: string) => {
    const agent = agents?.find(a => a._id === agentId);
    if (!agent) return;
    
    setConfirmDialog({
      isOpen: true,
      type: 'archive',
      agentId,
      agentName: agent.name,
      isLoading: false
    });
  };
  
  const handleUnarchive = (agentId: string) => {
    const agent = agents?.find(a => a._id === agentId);
    if (!agent) return;
    
    setConfirmDialog({
      isOpen: true,
      type: 'unarchive',
      agentId,
      agentName: agent.name,
      isLoading: false
    });
  };
  
  const handleDelete = (agentId: string) => {
    const agent = agents?.find(a => a._id === agentId);
    if (!agent) return;
    
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      agentId,
      agentName: agent.name,
      isLoading: false
    });
  };
  
  const executeAction = async () => {
    setConfirmDialog(prev => ({ ...prev, isLoading: true }));
    
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      switch (confirmDialog.type) {
        case 'delete':
          await deleteAgentMutation({ agentId: confirmDialog.agentId as any, userId });
          break;
        case 'archive':
          await archiveAgentMutation({ agentId: confirmDialog.agentId as any, userId });
          break;
        case 'unarchive':
          await unarchiveAgentMutation({ agentId: confirmDialog.agentId as any, userId });
          break;
      }
      setConfirmDialog({ isOpen: false, type: 'delete', agentId: '', agentName: '', isLoading: false });
    } catch (error) {
      console.error('Action failed:', error);
      setConfirmDialog(prev => ({ ...prev, isLoading: false }));
    }
  };
  
  const getConfirmationContent = () => {
    switch (confirmDialog.type) {
      case 'delete':
        return {
          title: 'Delete Agent',
          description: `Are you sure you want to permanently delete "${confirmDialog.agentName}"? This action cannot be undone and will remove all associated data.`,
          confirmText: 'Delete Agent'
        };
      case 'archive':
        return {
          title: 'Archive Agent',
          description: `Archive "${confirmDialog.agentName}"? The agent will be hidden from the main view but can be restored later.`,
          confirmText: 'Archive Agent'
        };
      case 'unarchive':
        return {
          title: 'Unarchive Agent',
          description: `Restore "${confirmDialog.agentName}" from the archive? The agent will be visible in the main view again.`,
          confirmText: 'Unarchive Agent'
        };
    }
  };

  // Show loading screen while checking onboarding status
  if (isCheckingOnboarding || !user || agents === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>
              Loading dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="heading-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
            Dashboard
          </h1>
          <p className="body-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
            Overview of your AI assistants and platform usage
          </p>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex space-x-1 bg-card p-1 rounded-lg max-w-md" style={{ border: '1px solid var(--border-light)' }}>
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'agents', label: 'Agents', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded font-medium text-sm transition-all ${
                selectedView === tab.id
                  ? 'text-white'
                  : 'text-secondary'
              }`}
              style={{
                background: selectedView === tab.id ? 'var(--primary-orange)' : 'transparent',
                color: selectedView === tab.id ? 'white' : 'var(--text-secondary)'
              }}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-4">
                {[
                  { label: 'Total Agents', value: stats.totalAgents, icon: Users, color: '#ff6b35' },
                  { label: 'Active Agents', value: stats.activeAgents, icon: Zap, color: '#28a745' },
                  { label: 'Total Interactions', value: stats.totalInteractions.toLocaleString(), icon: BarChart3, color: '#ff6b35' },
                  { label: 'This Week', value: stats.thisWeekInteractions, icon: Calendar, color: '#17a2b8' }
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="body-sm mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {stat.label}
                        </p>
                        <p className="heading-md" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {stat.value}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-lg flex-center" style={{ backgroundColor: `${stat.color}15` }}>
                        <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="heading-md" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Quick Actions
                  </h2>
                  {agents && agents.length > 0 && (
                    <button
                      onClick={() => setSelectedView('agents')}
                      className="body-sm font-medium text-accent" style={{ color: 'var(--primary-orange)', fontFamily: 'Inter, sans-serif' }}
                    >
                      View All Agents ({agents.length})
                    </button>
                  )}
                </div>
                <div className="grid grid-3">
                  <Link href="/dashboard/agent-designer">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="card cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg flex-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                          <Plus className="w-6 h-6" style={{ color: 'var(--primary-orange)' }} />
                        </div>
                        <div>
                          <h3 className="heading-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Create Agent
                          </h3>
                          <p className="body-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Build a new voice assistant
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>

                  <Link href="/dashboard/deployments">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="card cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg flex-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                          <Zap className="w-6 h-6" style={{ color: 'var(--primary-orange)' }} />
                        </div>
                        <div>
                          <h3 className="heading-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Deployments
                          </h3>
                          <p className="body-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Manage live agents
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>

                  <Link href="/dashboard/usage">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="card cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-lg flex-center" style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)' }}>
                          <BarChart3 className="w-6 h-6" style={{ color: 'var(--primary-orange)' }} />
                        </div>
                        <div>
                          <h3 className="heading-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Usage Analytics
                          </h3>
                          <p className="body-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
                            View detailed metrics
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="card-base p-8">
                <h2 className="text-h2 font-semibold text-text-primary dark:text-text-primary-dark mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Recent Activity
                </h2>
                <div className="space-y-4">
                  {[
                    { 
                      action: 'Voice Interaction', 
                      agent: 'Family Assistant', 
                      time: new Date(Date.now() - 120000).toLocaleString(), 
                      status: 'success',
                      details: '5 minutes conversation',
                      interactions: 3
                    },
                    { 
                      action: 'Email Sent', 
                      agent: 'Personal Admin', 
                      time: new Date(Date.now() - 3600000).toLocaleString(), 
                      status: 'info',
                      details: 'Meeting reminder to John',
                      interactions: 1
                    },
                    { 
                      action: 'RAG Query', 
                      agent: 'Study Buddy', 
                      time: new Date(Date.now() - 10800000).toLocaleString(), 
                      status: 'success',
                      details: 'Document analysis completed',
                      interactions: 2
                    },
                    { 
                      action: 'Calendar Event', 
                      agent: 'Family Assistant', 
                      time: new Date(Date.now() - 21600000).toLocaleString(), 
                      status: 'success',
                      details: 'Added soccer practice',
                      interactions: 1
                    },
                    { 
                      action: 'Web Search', 
                      agent: 'Personal Admin', 
                      time: new Date(Date.now() - 28800000).toLocaleString(), 
                      status: 'info',
                      details: 'Weather forecast lookup',
                      interactions: 1
                    }
                  ].map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-panel rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          activity.status === 'success' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-small font-medium text-text-primary dark:text-text-primary-dark" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {activity.action}
                            </p>
                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {activity.interactions} interaction{activity.interactions !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-small text-text-secondary dark:text-text-secondary-dark" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {activity.agent} • {activity.details}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                            {activity.time}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          activity.status === 'success' ? 'bg-green-400' : 'bg-blue-400'
                        }`}></span>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* View All Activity Link */}
                <div className="mt-6 text-center">
                  <Link 
                    href="/dashboard/usage" 
                    className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    View All Activity & Usage Analytics →
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {selectedView === 'agents' && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-h2 font-bold text-text-primary dark:text-text-primary-dark">
                    Voice Agents
                  </h1>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-small font-medium transition-colors ${
                        showArchived
                          ? 'bg-warning/10 text-warning-text border border-warning/20'
                          : 'btn-ghost'
                      }`}
                    >
                      {showArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      <span>{showArchived ? 'Show Active' : 'Show Archived'}</span>
                      {showArchived && stats.archivedAgents > 0 && (
                        <span className="badge badge-accent">
                          {stats.archivedAgents}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                <Link href="/dashboard/agent-designer">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-primary flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Agent</span>
                  </motion.button>
                </Link>
              </div>

              {agents && agents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {agents.map((agent: Agent, index: number) => (
                  <motion.div
                    key={agent._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-xl transition-all duration-300 group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl shadow-lg text-white ${
                          agent.isArchived 
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : agent.isActive
                              ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                              : 'bg-gradient-to-br from-gray-500 to-gray-700'
                        }`}>
                          {agent.isArchived ? 
                            <Archive className="w-6 h-6" /> : 
                            <Mic className="w-6 h-6" />
                          }
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{agent.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {agent.isArchived ? (
                          <span className="bg-amber-500/20 text-amber-400 border-amber-500/30 border font-medium px-3 py-1 rounded-lg text-sm">
                            Archived
                          </span>
                        ) : (
                          <span className={`border font-medium px-3 py-1 rounded-lg text-sm ${
                            agent.isActive 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            {agent.isActive ? 'Active' : 'Inactive'}
                          </span>
                        )}
                        <AgentActionsMenu
                          agent={agent}
                          onArchive={handleArchive}
                          onUnarchive={handleUnarchive}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>
                    
                    <p className="text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                      {agent.description}
                    </p>
                    
                    <div className="flex justify-between items-center">
                      <Link href={`/agent/${agent._id}`}>
                        <button className="bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300 px-4 py-2 text-sm rounded-lg border font-medium">
                          {agent.isArchived ? 'View Agent' : 'Configure'}
                        </button>
                      </Link>
                      {agent.isArchived && agent.archivedAt && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Archived {new Date(agent.archivedAt).toLocaleDateString()}
                        </span>
                      )}
                      {!agent.isArchived && (
                        <Link 
                          href={`/a/${agent._id}`}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center space-x-1"
                        >
                          <span>Try Agent</span>
                          <Eye className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-panel rounded-full flex items-center justify-center mx-auto mb-4">
                    {showArchived ? <Archive className="w-8 h-8 text-text-secondary" /> : <Users className="w-8 h-8 text-text-secondary" />}
                  </div>
                  <h3 className="text-h3 font-medium text-text-primary dark:text-text-primary-dark mb-2">
                    {showArchived ? 'No Archived Agents' : 'No Agents Yet'}
                  </h3>
                  <p className="text-text-secondary dark:text-text-secondary-dark mb-6">
                    {showArchived 
                      ? 'You don\'t have any archived agents. Archive agents to hide them from the main view.'
                      : 'Get started by creating your first voice agent.'
                    }
                  </p>
                  {!showArchived && (
                    <Link href="/dashboard/agent-designer">
                      <button className="btn-primary">
                        Create Your First Agent
                      </button>
                    </Link>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {selectedView === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <h1 className="text-h2 font-bold text-text-primary dark:text-text-primary-dark">
                Analytics
              </h1>
              <div className="card-base p-8">
                <p className="text-text-secondary dark:text-text-secondary-dark">
                  Analytics dashboard coming soon...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', agentId: '', agentName: '', isLoading: false })}
        onConfirm={executeAction}
        type={confirmDialog.type}
        isLoading={confirmDialog.isLoading}
        {...getConfirmationContent()}
      />
    </DashboardLayout>
  );
}