"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Archive, RotateCcw, X } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  type: 'delete' | 'archive' | 'unarchive';
  isLoading?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  type,
  isLoading = false
}: ConfirmationDialogProps) {
  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <Trash2 className="w-6 h-6 text-red-500" />;
      case 'archive':
        return <Archive className="w-6 h-6 text-orange-500" />;
      case 'unarchive':
        return <RotateCcw className="w-6 h-6 text-blue-500" />;
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'delete':
        return 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700';
      case 'archive':
        return 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700';
      case 'unarchive':
        return 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl border border-slate-200/60 dark:border-slate-700/60"
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getIcon()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                  {description}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-2 bg-gradient-to-r ${getButtonColor()} text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      confirmText
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
