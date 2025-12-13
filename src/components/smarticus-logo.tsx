import { Heart } from 'lucide-react';
import Image from 'next/image';

export function SmarticusLogoInline() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 relative">
        <Image
          src="/smarticus-logo.svg"
          alt="Smarticus Logo"
          fill
          className="object-contain"
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
      <div className="w-12 h-12 relative">
        <Image
          src="/smarticus-logo.svg"
          alt="Smarticus Logo"
          fill
          className="object-contain"
        />
      </div>
      <span className="text-2xl font-bold text-black font-inter">
        Smarticus
      </span>
    </div>
  );
}
