"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, Edit, Eye, Rocket, Archive, Trash2, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface Agent {
  _id: string;
  name: string;
  type: string;
  description: string;
  isActive: boolean;
  isArchived?: boolean;
}

interface AgentActionsMenuProps {
  agent: Agent;
  onArchive: (agentId: string) => void;
  onUnarchive: (agentId: string) => void;
  onDelete: (agentId: string) => void;
}

export default function AgentActionsMenu({ agent, onArchive, onUnarchive, onDelete }: AgentActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200/60 dark:border-slate-700/60 py-2 z-50"
            >
              <Link href={`/agent/${agent._id}`}>
                <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Eye className="w-4 h-4" />
                  <span>View Agent</span>
                </button>
              </Link>

              <Link href={`/dashboard/agent-designer?id=${agent._id}`}>
                <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Edit className="w-4 h-4" />
                  <span>Edit Agent</span>
                </button>
              </Link>

              <Link href={`/dashboard/deploy?agentId=${agent._id}`}>
                <button className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <Rocket className="w-4 h-4" />
                  <span>Deploy</span>
                </button>
              </Link>

              <div className="border-t border-slate-200/60 dark:border-slate-700/60 my-2" />

              {agent.isArchived ? (
                <button
                  onClick={() => handleAction(() => onUnarchive(agent._id))}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Unarchive</span>
                </button>
              ) : (
                <button
                  onClick={() => handleAction(() => onArchive(agent._id))}
                  className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </button>
              )}

              <button
                onClick={() => handleAction(() => onDelete(agent._id))}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
