'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useResponsive } from '@/lib/hooks/use-responsive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Calendar,
  Search,
  Bot,
  Plus
} from 'lucide-react';
import { StudentThemeSelector } from './StudentThemeSelector';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { MessageIcon } from '@/features/messaging/components/MessageIcon';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';

interface StudentHeaderProps {
  title?: string;
  className?: string;
  isOffline?: boolean;
  onMenuToggle?: () => void;
  showMenuButton?: boolean;
  notifications?: number;
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchValue?: string;
  showCompanionButton?: boolean;
}

/**
 * StudentHeader component for the student portal
 *
 * Features:
 * - Responsive design for mobile and desktop
 * - Profile menu with logout and settings
 * - Theme selector integration
 * - Notification bell
 * - Mobile menu toggle
 */
export function StudentHeader({
  title = 'Student Portal',
  className,
  isOffline = false,
  onMenuToggle,
  showMenuButton = false,
  notifications = 0,
  showSearch = false,
  searchPlaceholder = 'Search...',
  onSearchChange,
  searchValue = '',
  showCompanionButton = true,
}: StudentHeaderProps) {
  const { data: session } = useSession();
  const { isMobile } = useResponsive();
  const router = useRouter();
  const [showMobileSearch, setShowMobileSearch] = React.useState(false);

  const handleSignOut = () => {
    signOut();
  };

  const handleProfileClick = () => {
    window.location.href = '/student/profile';
  };

  const handleSettingsClick = () => {
    window.location.href = '/student/settings';
  };

  const handleCompanionClick = () => {
    router.push('/student/companion');
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="flex h-16 items-center px-4 gap-4">
        {/* Left side - Menu button (mobile) and title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {showMenuButton && isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuToggle}
              className="md:hidden"
            >
              <Menu size={20} />
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            {isOffline && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Offline
              </span>
            )}
          </div>
        </div>

        {/* Center - Search (desktop only) */}
        {showSearch && !isMobile && (
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                className="pl-9 w-full"
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Right side - Icons, buttons and Profile Menu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme Selector */}
          <StudentThemeSelector />

          {/* Message Icon */}
          <MessageIcon
            role="student"
            size={isMobile ? 'sm' : 'md'}
          />

          {/* Notification Bell */}
          <NotificationBell
            size={isMobile ? 'sm' : 'md'}
          />

          {/* Search Icon (mobile only) */}
          {showSearch && isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
              title="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Calendar Icon */}
          <Button
            variant="ghost"
            size={isMobile ? 'sm' : 'default'}
            className="relative"
            onClick={() => window.location.href = '/student/calendar'}
            title="View Calendar"
          >
            <Calendar className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
          </Button>

          {/* Companion Button */}
          {showCompanionButton && (
            <Button
              variant="ghost"
              size={isMobile ? 'sm' : 'default'}
              className="relative"
              onClick={handleCompanionClick}
              title="Learning Companion"
            >
              <Bot className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
            </Button>
          )}

          {/* Profile Menu */}
          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={""}
                      alt={session.user.name || "Student"}
                    />
                    <AvatarFallback>
                      {session.user.name?.charAt(0)?.toUpperCase() || "S"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name || 'Student'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email || 'No email'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile Search Section */}
      {showSearch && isMobile && showMobileSearch && (
        <div className="border-b bg-background px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              className="pl-9 w-full"
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
