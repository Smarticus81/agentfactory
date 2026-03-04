"use client";

import { Mic } from 'lucide-react';

export function FamilyAILogoInline({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
        <Mic className="w-4 h-4 text-white" />
      </div>
      <span className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
        Bevpro Studio
      </span>
    </div>
  );
}

export default FamilyAILogoInline;
