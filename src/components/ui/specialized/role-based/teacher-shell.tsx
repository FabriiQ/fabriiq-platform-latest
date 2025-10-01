'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/lib/hooks/use-responsive';
import { Button } from '@/components/ui/core/button';
import { MobileNav, MobileNavItem } from '@/components/ui/composite/mobile-nav';
import {
  Menu,
  X,
  Home,
  Users,
  BookOpen,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  MessageSquare,
  Calendar,
  FileText,
  HelpCircle
} from 'lucide-react';
import { designTokens } from '@/styles/design-tokens';

export interface TeacherShellProps {
  children: React.ReactNode;
  className?: string;
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  title?: string;
  logo?: React.ReactNode;
  onNavigate?: (path: string) => void;
  currentPath?: string;
  notifications?: number;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

/**
 * TeacherShell component for teacher portal
 *
 * Features:
 * - Responsive design for mobile and desktop
 * - Collapsible sidebar
 * - Mobile navigation
 * - Role-specific styling
 *
 * @example
 * ```tsx
 * <TeacherShell
 *   user={{ name: 'Teacher Name', email: 'teacher@example.com' }}
 *   title="Teacher Portal"
 *   onNavigate={(path) => router.push(path)}
 *   currentPath={router.pathname}
 * >
 *   <div>Content goes here</div>
 * </TeacherShell>
 * ```
 */
export function TeacherShell({
  children,
  className,
  user,
  title = 'Teacher Portal',
  logo,
  onNavigate,
  currentPath = '/',
  notifications = 0,
  headerContent,
  footerContent,
}: TeacherShellProps) {
  const { isMobile } = useResponsive();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items
  const navItems = [
    { id: '/', label: 'Dashboard', icon: <Home size={20} />, path: '/' },
    { id: '/classes', label: 'My Classes', icon: <Users size={20} />, path: '/classes' },
    { id: '/students', label: 'Students', icon: <GraduationCap size={20} />, path: '/students' },
    { id: '/assignments', label: 'Assignments', icon: <ClipboardList size={20} />, path: '/assignments' },
    { id: '/grades', label: 'Grades', icon: <FileText size={20} />, path: '/grades' },
    { id: '/calendar', label: 'Calendar', icon: <Calendar size={20} />, path: '/calendar' },
    { id: '/messages', label: 'Messages', icon: <MessageSquare size={20} />, path: '/messages' },
    { id: '/resources', label: 'Resources', icon: <BookOpen size={20} />, path: '/resources' },
    { id: '/settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' },
    { id: '/help', label: 'Help', icon: <HelpCircle size={20} />, path: '/help' },
  ];

  // Mobile navigation items (limited to 5 for bottom nav)
  const mobileNavItems: MobileNavItem[] = [
    { id: '/', label: 'Home', icon: <Home size={20} />, onClick: () => handleNavigate('/') },
    { id: '/classes', label: 'Classes', icon: <Users size={20} />, onClick: () => handleNavigate('/classes') },
    { id: '/assignments', label: 'Assignments', icon: <ClipboardList size={20} />, onClick: () => handleNavigate('/assignments') },
    { id: '/messages', label: 'Messages', icon: <MessageSquare size={20} />, onClick: () => handleNavigate('/messages') },
    { id: '/more', label: 'More', icon: <Menu size={20} />, onClick: () => setSidebarOpen(true) },
  ];

  // Add notifications to mobile nav
  if (notifications > 0) {
    const messagesIndex = mobileNavItems.findIndex(item => item.id === '/messages');
    if (messagesIndex !== -1) {
      mobileNavItems[messagesIndex].badge = notifications;
    }
  }

  // Handle navigation
  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }

    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Get the primary color for teacher
  const primaryColor = designTokens.roleThemes.teacher.primary;

  // Mobile layout
  if (isMobile) {
    return (
      <div className={cn("flex flex-col min-h-screen bg-background", className)}>
        {/* Mobile header */}
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-16 items-center px-4">
            <Button
              variant="ghost"
              size="icon"
              className="mr-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={24} />
              <span className="sr-only">Toggle menu</span>
            </Button>

            <div className="flex items-center flex-1">
              {logo}
              <h1 className="ml-2 text-lg font-semibold">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate('/search')}
              >
                <Search size={20} />
              </Button>

              {notifications > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleNavigate('/notifications')}
                  className="relative"
                >
                  <Bell size={20} />
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                    {notifications}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {headerContent && (
            <div className="px-4 pb-3">{headerContent}</div>
          )}
        </header>

        {/* Mobile sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 z-50 w-3/4 max-w-xs bg-background border-r shadow-lg">
              <div className="flex h-16 items-center px-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X size={24} />
                  <span className="sr-only">Close menu</span>
                </Button>

                <div className="flex items-center flex-1">
                  {logo}
                  <h1 className="ml-2 text-lg font-semibold">{title}</h1>
                </div>
              </div>

              <div className="py-4">
                <nav className="space-y-1 px-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      className={cn(
                        "flex items-center w-full px-3 py-2 text-sm rounded-md",
                        currentPath === item.path
                          ? `bg-[${primaryColor}] text-white`
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      onClick={() => handleNavigate(item.path)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </nav>

                {user && (
                  <div className="mt-auto pt-4 px-3 border-t mx-2 mt-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <span className="text-xs font-medium">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 w-full justify-start"
                      onClick={() => handleNavigate('/logout')}
                    >
                      <LogOut size={16} className="mr-2" />
                      Sign out
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 pb-16">
          {children}
        </main>

        {/* Footer content if any */}
        {footerContent && (
          <footer className="border-t py-4 px-4">
            {footerContent}
          </footer>
        )}

        {/* Mobile navigation */}
        <MobileNav
          items={mobileNavItems}
          activeItemId={currentPath}
          role="teacher"
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={cn("flex h-screen overflow-hidden bg-background", className)}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "border-r transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
        style={{ borderColor: primaryColor }}
      >
        <div className="flex h-16 items-center px-4 border-b">
          {!sidebarCollapsed && (
            <>
              {logo}
              <h1 className="ml-2 text-lg font-semibold truncate">{title}</h1>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn("ml-auto", sidebarCollapsed && "mx-auto")}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </Button>
        </div>

        <div className="py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={cn(
                  "flex items-center w-full px-3 py-2 text-sm rounded-md",
                  currentPath === item.path
                    ? `bg-[${primaryColor}] text-white`
                    : "text-muted-foreground hover:bg-muted",
                  sidebarCollapsed && "justify-center px-0"
                )}
                onClick={() => handleNavigate(item.path)}
              >
                <span className={cn(sidebarCollapsed ? "mr-0" : "mr-3")}>
                  {item.icon}
                </span>
                {!sidebarCollapsed && item.label}
              </button>
            ))}
          </nav>

          {user && !sidebarCollapsed && (
            <div className="mt-auto pt-4 px-3 border-t mx-2 mt-4">
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full justify-start"
                onClick={() => handleNavigate('/logout')}
              >
                <LogOut size={16} className="mr-2" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Desktop header */}
        <header className="h-16 border-b bg-background flex items-center px-6">
          <div className="flex items-center flex-1">
            {headerContent || (
              <h2 className="text-lg font-semibold">
                {navItems.find(item => item.path === currentPath)?.label || 'Dashboard'}
              </h2>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleNavigate('/search')}
            >
              <Search size={20} />
            </Button>

            {notifications > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate('/notifications')}
                className="relative"
              >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center">
                  {notifications}
                </span>
              </Button>
            )}

            {user && (
              <div className="flex items-center">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>

        {/* Footer content if any */}
        {footerContent && (
          <footer className="border-t py-4 px-6">
            {footerContent}
          </footer>
        )}
      </div>
    </div>
  );
}
