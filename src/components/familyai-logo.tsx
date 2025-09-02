import { Heart } from 'lucide-react';

export function FamilyAILogoInline() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
        <Heart className="w-4 h-4 text-white" />
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
        FamilyAI
      </span>
    </div>
  );
}

export function FamilyAILogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
        <Heart className="w-6 h-6 text-white" />
      </div>
      <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
        FamilyAI
      </span>
    </div>
  );
}
