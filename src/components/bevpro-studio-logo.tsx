import Image from 'next/image';

export function BevproStudioLogoInline() {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/bevpro-logo.svg"
        alt="BevPro Studio"
        width={32}
        height={32}
        className="w-8 h-8"
      />
      <span className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
        BevPro Studio
      </span>
    </div>
  );
}

export function BevproStudioLogo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/bevpro-logo.svg"
        alt="BevPro Studio"
        width={48}
        height={48}
        className="w-12 h-12"
      />
      <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
        BevPro Studio
      </span>
    </div>
  );
}
