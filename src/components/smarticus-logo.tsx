import { Heart } from 'lucide-react';

export function SmarticusLogoInline() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8">
        <img 
          src="/smarticus-logo.svg" 
          alt="Smarticus Logo" 
          className="w-8 h-8 object-contain"
        />
      </div>
      <span className="text-xl font-bold text-black font-inter">
        Smarticus
      </span>
    </div>
  );
}

export function SmarticusLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12">
        <img 
          src="/smarticus-logo.svg" 
          alt="Smarticus Logo" 
          className="w-12 h-12 object-contain"
        />
      </div>
      <span className="text-2xl font-bold text-black font-inter">
        Smarticus
      </span>
    </div>
  );
}
