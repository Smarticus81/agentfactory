"use client";

import { useState } from 'react';
import { MoreHorizontal, Archive, RotateCcw, Trash2, Settings, Mic, Zap, Edit, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface Agent {
  _id: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  isArchived?: boolean;
  archivedAt?: string;
}

interface AgentActionsMenuProps {
  agent: Agent;
  onArchive: (agentId: string) => void;
  onUnarchive: (agentId: string) => void;
  onDelete: (agentId: string) => void;
}

export default function AgentActionsMenu({ agent, onArchive, onUnarchive, onDelete }: AgentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const router = useRouter();
  
  // Convex mutations
  const updateConfig = useMutation(api.assistants.updateConfig);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  const handleEdit = () => {
    router.push(`/dashboard/agents/${agent._id}/edit`);
    setIsOpen(false);
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      await updateConfig({ 
        assistantId: agent._id as any, 
        config: { isActive: true } 
      });
      // Open deployed agent in new tab
      window.open(`/a/${agent._id}`, '_blank');
    } catch (error) {
      console.error('Failed to deploy agent:', error);
      alert('Failed to deploy agent. Please try again.');
    } finally {
      setIsDeploying(false);
    }
    setIsOpen(false);
  };

  const handleRedeploy = async () => {
    setIsDeploying(true);
    try {
      // Update the configuration to trigger re-deployment
      await updateConfig({ 
        assistantId: agent._id as any, 
        config: { 
          isActive: true
        } 
      });
      alert('Agent re-deployed successfully!');
      // Open deployed agent in new tab
      window.open(`/a/${agent._id}`, '_blank');
    } catch (error) {
      console.error('Failed to re-deploy agent:', error);
      alert('Failed to re-deploy agent. Please try again.');
    } finally {
      setIsDeploying(false);
    }
    setIsOpen(false);
  };

  const handleTestVoice = () => {
    // Open the deployed agent for testing
    window.open(`/a/${agent._id}`, '_blank');
    setIsOpen(false);
  };

  const handleSettings = () => {
    // Navigate to settings or open settings modal
    router.push(`/dashboard/agents/${agent._id}/edit`);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          <div className="py-1">
            {!agent.isArchived ? (
              <>
                <button
                  onClick={handleEdit}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDeploy}
                  disabled={isDeploying}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {isDeploying ? 'Deploying...' : 'Deploy'}
                </button>
                <button
                  onClick={handleRedeploy}
                  disabled={isDeploying}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {isDeploying ? 'Re-deploying...' : 'Re-deploy'}
                </button>
                <button
                  onClick={handleTestVoice}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Test Voice
                </button>
                <button
                  onClick={handleSettings}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </button>
                <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                <button
                  onClick={() => handleAction(() => onArchive(agent._id))}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </button>
              </>
            ) : (
              <button
                onClick={() => handleAction(() => onUnarchive(agent._id))}
                className="flex items-center w-full px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Unarchive
              </button>
            )}
            
            <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
            
            <button
              onClick={() => handleAction(() => onDelete(agent._id))}
              className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
