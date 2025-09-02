"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { PWAInstallPrompt } from "./pwa-install-prompt";
import { FamilyAILogoInline } from "@/components/familyai-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Home, 
  LayoutDashboard, 
  Bot, 
  Users, 
  Calendar, 
  CheckSquare, 
  Settings,
  Package,
  Zap,
  FileText,
  Mic
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const navigation = [
    { 
      section: "Main",
      items: [
        { name: "Home", href: "/", icon: Home },
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ]
    },
    {
      section: "Workspace",
      items: [
        { name: "Agent Designer", href: "/dashboard/agent-designer", icon: Bot },
        { name: "Deployments", href: "/dashboard/deploy", icon: Zap },
        { name: "Integrations", href: "/dashboard/integrations", icon: Package },
        { name: "Documents", href: "/dashboard/documents", icon: FileText },
      ]
    },
    {
      section: "Account",
      items: [
        { name: "Plans", href: "/dashboard/plans", icon: FileText },
        { name: "Usage", href: "/dashboard/usage", icon: Mic },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-primary">
      {/* App Shell Container */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="sidebar-width bg-card flex flex-col" style={{ borderRight: '1px solid var(--border-light)' }}>
          {/* Logo Area */}
          <div className="px-6 py-6" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <Link href="/" className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl flex-center" style={{ background: 'var(--primary-orange)' }}>
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Smarticus
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            {navigation.map((section, sectionIdx) => (
              <div key={section.section} className={sectionIdx > 0 ? "mt-8" : ""}>
                <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 px-3" style={{ color: 'var(--text-light)' }}>
                  {section.section}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item flex items-center gap-3 ${
                          isActive ? "nav-item-active" : ""
                        }`}
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
                {sectionIdx < navigation.length - 1 && (
                  <div className="h-px my-6" style={{ background: 'var(--border-light)' }} />
                )}
              </div>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="p-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div className="flex items-center justify-between px-2">
              <UserButton 
                afterSignOutUrl="/" 
                appearance={{
                  elements: {
                    rootBox: "flex",
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
              <ThemeToggle />
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="container-main content-spacing">
            {children}
          </div>
        </main>
      </div>
      
      {/* PWA Install Prompt */}
      {isClient && <PWAInstallPrompt />}
    </div>
  );
}