'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { InstitutionNavigationLink } from '@/components/ui/navigation/institution-navigation-link';
import { cn } from '@/lib/utils';
import {
  Home,
  BookOpen,
  User,
  ChevronUp,
  ChevronDown,
  Award,
  MessageSquare
} from 'lucide-react';
import { StudentThemeSelector } from './StudentThemeSelector';

interface StudentBottomNavProps {
  classId: string;
}

/**
 * StudentBottomNav component for mobile navigation in the student portal
 *
 * Features:
 * - Limited to 5 options (Hick's Law - reducing choice complexity)
 * - Collapsible functionality with clear visual affordance
 * - Simple and fluent UI without animations
 * - Consistent iconography with text labels (dual-coding principle)
 * - Visual indicators for current section (reducing cognitive load)
 * - Mobile optimization with min 44px touch targets
 * - Accessible with proper contrast ratios
 * - Theme selector for toggling between light and dark modes
 */
export function StudentBottomNav({ classId }: StudentBottomNavProps) {
  const pathname = usePathname() || '';

  // Default to expanded on larger screens, collapsed on mobile
  const [isExpanded, setIsExpanded] = useState(() => {
    // Use window.innerWidth if available (client-side)
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768;
    }
    return true;
  });

  // Store user preference in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('navExpanded');
      if (savedState !== null) {
        setIsExpanded(savedState === 'true');
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('navExpanded', String(isExpanded));
    }
  }, [isExpanded]);

  // Limited to 5 items (Hick's Law - reducing choice complexity)
  const navItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: 'Dashboard',
      href: `/student/class/${classId}/dashboard`,
      ariaLabel: 'Go to class dashboard'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Subjects',
      href: `/student/class/${classId}/subjects`,
      ariaLabel: 'View class subjects'
    },
    {
      icon: <Award className="h-5 w-5" />,
      label: 'Leaderboard',
      href: `/student/class/${classId}/leaderboard`,
      ariaLabel: 'Check class leaderboard'
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      label: 'Social Wall',
      href: `/student/class/${classId}/social-wall`,
      ariaLabel: 'Engage with class social wall'
    },
    {
      icon: <User className="h-5 w-5" />,
      label: 'Profile',
      href: `/student/class/${classId}/profile`,
      ariaLabel: 'Go to your class profile'
    }
  ];

  const toggleNav = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg student-bottom-nav transition-transform duration-200 ease-in-out",
          !isExpanded && "translate-y-[calc(100%-2.5rem)]"
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)', // Handle notched devices
        }}
      >
        <div className="flex justify-between items-center border-b">
          <div className="flex-1 flex justify-start pl-4">
            <StudentThemeSelector />
          </div>

          <div
            className="flex-1 flex justify-center cursor-pointer py-1 hover:bg-muted student-bottom-nav-toggle"
            onClick={toggleNav}
            role="button"
            aria-expanded={isExpanded}
            aria-controls="navigation-menu"
            tabIndex={0}
            aria-label={isExpanded ? "Collapse navigation" : "Expand navigation"}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                toggleNav();
                e.preventDefault();
              }
            }}
          >
            <div className="flex items-center gap-2">
              {isExpanded ?
                <ChevronDown className="h-4 w-4 text-primary animate-pulse" /> :
                <ChevronUp className="h-4 w-4 text-primary animate-pulse" />
              }
              <span className="text-xs font-medium text-muted-foreground">
                {isExpanded ? "Hide menu" : "Show menu"}
              </span>
            </div>
          </div>

          <div className="flex-1"></div> {/* Empty div for balanced layout */}
        </div>
        <nav
          id="navigation-menu"
          className="flex items-center justify-around h-16 px-2"
          aria-label="Main navigation"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <InstitutionNavigationLink
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-full w-full flex-col items-center justify-center space-y-1 px-2 py-1',
                  'min-h-[44px] min-w-[44px]', // Ensure minimum touch target size (accessibility)
                  'relative overflow-hidden rounded-md student-bottom-nav-item',
                  isActive
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                ariaLabel={item.ariaLabel}
                preserveScroll={true}
                activeClassName="text-primary bg-primary/10"
                showLoadingIndicator={false}
              >
                <div className={cn(
                  'h-6 w-6',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.icon}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </InstitutionNavigationLink>
            );
          })}
        </nav>
      </div>
      {/* Dynamic spacer based on nav state */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out",
          isExpanded ? "pb-20" : "pb-12"
        )}
        style={{
          paddingBottom: `calc(${isExpanded ? '5rem' : '3rem'} + env(safe-area-inset-bottom))`,
        }}
      />
    </>
  );
}
