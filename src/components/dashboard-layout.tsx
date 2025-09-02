"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState, useEffect } from "react";
import { PWAInstallPrompt } from "./pwa-install-prompt";
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
  Mic,
  Menu,
  Bell,
  Search
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
        { name: "Agent Tools", href: "/dashboard/agent-tools", icon: Settings },
        { name: "Deployments", href: "/dashboard/deployments", icon: Zap },
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
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Horizontal Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between h-full px-6">
          {/* Left section */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg transition-colors lg:hidden"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--primary-orange)' }}>
                <img 
                  src="/smarticus-logo.svg" 
                  alt="Smarticus Logo" 
                  className="w-5 h-5 object-contain filter brightness-0 invert"
                />
              </div>
              <span className="text-xl font-bold font-inter" style={{ color: 'var(--text-primary)' }}>
                Smarticus
              </span>
            </Link>
          </div>

          {/* Center section - Navigation for larger screens */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((section) => 
              section.items.slice(0, 5).map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item flex items-center space-x-2 ${
                      isActive ? "nav-item-active" : ""
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })
            )}
          </nav>

          {/* Right section */}
          <div className="flex items-center space-x-3">
            <button 
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Bell className="w-5 h-5" />
            </button>
            <ThemeToggle />
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  rootBox: "flex",
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Vertical Sidebar */}
        <aside className={`fixed left-0 top-16 bottom-0 w-16 transition-all duration-300 ease-in-out overflow-hidden hover:w-64 group z-40`} style={{ background: 'var(--primary-navy)' }}>
          <nav className="flex flex-col h-full py-4">
            {navigation.map((section, sectionIdx) => (
              <div key={section.section} className={sectionIdx > 0 ? "mt-6" : ""}>
                {/* Section header - only visible on hover */}
                <h3 className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-xs font-semibold uppercase tracking-wide mb-2 px-4" style={{ color: 'var(--text-light)' }}>
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
                        className={`group/item flex items-center h-12 mx-2 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? "text-white" 
                            : "hover:text-white"
                        }`}
                        style={{
                          background: isActive ? 'var(--primary-orange)' : 'transparent',
                          color: isActive ? 'white' : 'rgba(255, 255, 255, 0.6)'
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                        title={item.name}
                      >
                        <div className="flex items-center justify-center w-12 h-12 flex-shrink-0">
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        
                        {/* Text appears on hover */}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-2 text-sm font-medium whitespace-nowrap">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                
                {/* Divider */}
                {sectionIdx < navigation.length - 1 && (
                  <div className="h-px mx-4 my-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-16 min-h-screen" style={{ background: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Navigation Overlay */}
      {!isSidebarCollapsed && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden" onClick={() => setIsSidebarCollapsed(true)}>
          <div className="fixed left-0 top-16 bottom-0 w-64 shadow-xl" style={{ background: 'var(--bg-card)' }}>
            <nav className="flex flex-col h-full py-4">
              {navigation.map((section, sectionIdx) => (
                <div key={section.section} className={sectionIdx > 0 ? "mt-6" : ""}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide mb-2 px-4" style={{ color: 'var(--text-light)' }}>
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
                          className={`nav-item flex items-center space-x-3 mx-2 ${
                            isActive ? "nav-item-active" : ""
                          }`}
                          onClick={() => setIsSidebarCollapsed(true)}
                        >
                          <Icon className="w-5 h-5" strokeWidth={1.5} />
                          <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                  
                  {sectionIdx < navigation.length - 1 && (
                    <div className="h-px mx-4 my-4" style={{ background: 'var(--border-light)' }} />
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
      
      {/* PWA Install Prompt */}
      {isClient && <PWAInstallPrompt />}
    </div>
  );
}