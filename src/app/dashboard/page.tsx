"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Mic, Settings, Zap, BarChart3, Users, Calendar, Package, Archive, RotateCcw } from 'lucide-react';
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
  const agents = useQuery(api.agents.getUserAgents, { 
    userId: user?.id || "", 
    includeArchived: showArchived 
  });
  const [selectedView, setSelectedView] = useState<'overview' | 'agents' | 'analytics'>('overview');
  
  // Mutations
  const deleteAgentMutation = useMutation(api.agents.deleteAgent);
  const archiveAgentMutation = useMutation(api.agents.archiveAgent);
  const unarchiveAgentMutation = useMutation(api.agents.unarchiveAgent);
  
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
    totalInteractions: 1247,
    avgResponseTime: 234
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

  return (
    <DashboardLayout>
      {/* Dashboard Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'agents', label: 'Agents', icon: Users },
            { id: 'analytics', label: 'Analytics', icon: Zap }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedView === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Agents', value: stats.totalAgents, icon: Users, color: 'emerald' },
                { label: 'Active Agents', value: stats.activeAgents, icon: Zap, color: 'blue' },
                { label: 'Archived Agents', value: stats.archivedAgents, icon: Archive, color: 'orange' },
                { label: 'Total Interactions', value: stats.totalInteractions.toLocaleString(), icon: BarChart3, color: 'purple' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                    <div className={`w-12 h-12 bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600 rounded-xl flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
                {agents && agents.length > 0 && (
                  <button
                    onClick={() => setSelectedView('agents')}
                    className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                  >
                    View All Agents ({agents.length})
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link href="/dashboard/agent-designer">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200/60 dark:border-emerald-700/60 hover:border-emerald-300/80 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Create Agent</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Build a new voice assistant</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link href="/dashboard/deploy">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200/60 dark:border-blue-700/60 hover:border-blue-300/80 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Deploy</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Launch your agents</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link href="/dashboard/integrations">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="group p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/60 dark:border-purple-700/60 hover:border-purple-300/80 transition-all duration-300 cursor-pointer"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Package className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-white">Integrations</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Connect your tools</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  { action: 'Agent deployed', agent: 'Venue Assistant', time: '2 minutes ago', status: 'success' },
                  { action: 'Voice model updated', agent: 'Bar Manager', time: '1 hour ago', status: 'info' },
                  { action: 'New interaction', agent: 'Event Coordinator', time: '3 hours ago', status: 'success' }
                ].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center space-x-4 p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-xl"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{activity.action}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{activity.agent}</p>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{activity.time}</span>
                  </motion.div>
                ))}
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Voice Agents</h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      showArchived
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {showArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    <span>{showArchived ? 'Show Active' : 'Show Archived'}</span>
                    {showArchived && stats.archivedAgents > 0 && (
                      <span className="bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 px-1.5 py-0.5 rounded text-xs">
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
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300"
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
                  className="group bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      agent.isArchived 
                        ? 'bg-gradient-to-br from-orange-400 to-orange-500'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    }`}>
                      {agent.isArchived ? <Archive className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                    </div>
                    <div className="flex items-center space-x-2">
                      {agent.isArchived && (
                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                          Archived
                        </div>
                      )}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        agent.isActive 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <AgentActionsMenu
                        agent={agent}
                        onArchive={handleArchive}
                        onUnarchive={handleUnarchive}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{agent.name}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{agent.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{agent.type}</span>
                    {agent.isArchived && agent.archivedAt && (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Archived {new Date(agent.archivedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  {showArchived ? <Archive className="w-8 h-8 text-slate-400" /> : <Users className="w-8 h-8 text-slate-400" />}
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
                  {showArchived ? 'No Archived Agents' : 'No Agents Yet'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {showArchived 
                    ? 'You don\'t have any archived agents. Archive agents to hide them from the main view.'
                    : 'Get started by creating your first voice agent.'
                  }
                </p>
                {!showArchived && (
                  <Link href="/dashboard/agent-designer">
                    <button className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-300">
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-200/60 dark:border-slate-700/60">
              <p className="text-slate-600 dark:text-slate-400">Analytics dashboard coming soon...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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