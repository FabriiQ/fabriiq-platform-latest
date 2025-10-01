'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, GraduationCap, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MemberCardProps } from './types';
import styles from './circle.module.css';

/**
 * MemberCard Component
 * 
 * Displays individual class member information in a card format
 * Features:
 * - Profile avatar with fallback to initials
 * - Name and role display
 * - Current user highlighting
 * - Responsive design
 * - Hover effects
 */
export function MemberCard({
  member,
  showRole = true,
  compact = false,
  className
}: MemberCardProps) {
  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle messaging
  const handleMessage = () => {
    // Navigate to messaging with pre-filled recipient
    window.location.href = `/student/communications?recipient=${member.id}&name=${encodeURIComponent(member.name)}`;
  };

  // Generate simple UX colors for member avatars
  const getMemberColor = () => {
    const colors = [
      'bg-primary',      // Primary blue
      'bg-secondary',    // Secondary color
      'bg-accent',       // Accent color
      'bg-muted',        // Muted color
    ];
    const index = member.id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get role display info using simple UX colors
  const getRoleInfo = () => {
    if (member.role === 'TEACHER') {
      return {
        label: 'Teacher',
        icon: <GraduationCap size={14} />,
        variant: 'default' as const,
        className: 'bg-primary text-primary-foreground'
      };
    }
    return {
      label: 'Student',
      icon: <User size={14} />,
      variant: 'secondary' as const,
      className: 'bg-secondary text-secondary-foreground'
    };
  };

  const roleInfo = getRoleInfo();

  return (
    <Card
      className={cn(
        styles.memberCard,
        "transition-all duration-200 hover:shadow-md",
        "border border-border bg-card",
        member.isCurrentUser && [
          "ring-2 ring-primary/20 bg-primary/5",
          styles.currentUserCard
        ],
        className
      )}
      role="article"
      aria-label={`${member.name}, ${roleInfo.label}${member.isCurrentUser ? ' (You)' : ''}`}
      tabIndex={0}
    >
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-4")}>
        {/* Main Member Info */}
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <Avatar className={cn(compact ? "h-12 w-12" : "h-16 w-16")}>
            <AvatarImage
              src={`/api/avatar/${member.id}`}
              alt={member.name}
            />
            <AvatarFallback className={cn(
              "font-semibold text-white text-lg",
              getMemberColor()
            )}>
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          {/* Member Details */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-semibold text-foreground truncate",
              compact ? "text-sm" : "text-base",
              member.isCurrentUser && "text-primary"
            )}>
              {member.name}
              {member.isCurrentUser && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">(You)</span>
              )}
            </h3>

            {/* Role Badge */}
            {showRole && (
              <div className="flex items-center mt-1">
                <Badge
                  variant={roleInfo.variant}
                  className={cn(
                    "text-xs flex items-center space-x-1",
                    roleInfo.className,
                    compact && "text-[10px] px-1.5 py-0.5"
                  )}
                >
                  {roleInfo.icon}
                  <span>{roleInfo.label}</span>
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Only show for other users, not current user */}
        {!member.isCurrentUser && !compact && (
          <div className="flex items-center justify-center pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMessage}
              className="h-9 px-6 text-sm font-medium"
            >
              <MessageCircle size={16} className="mr-2" />
              Connect
            </Button>
          </div>
        )}

        {/* Compact Action Buttons */}
        {!member.isCurrentUser && compact && (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMessage}
              className="h-8 w-8 p-0"
              title={`Connect with ${member.name}`}
            >
              <MessageCircle size={16} />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * MemberCardSkeleton Component
 * Loading state for MemberCard
 */
export function MemberCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="animate-pulse">
      <CardContent className={cn("space-y-3", compact ? "p-3" : "p-4")}>
        {/* Main Content Skeleton */}
        <div className="flex items-center space-x-3">
          {/* Avatar Skeleton */}
          <div className={cn(
            "rounded-full bg-muted",
            compact ? "h-10 w-10" : "h-14 w-14"
          )} />

          {/* Content Skeleton */}
          <div className="flex-1 space-y-2">
            <div className={cn(
              "h-4 bg-muted rounded",
              compact ? "w-20" : "w-28"
            )} />
            <div className={cn(
              "h-3 bg-muted rounded",
              compact ? "w-12" : "w-16"
            )} />
          </div>
        </div>

        {/* Action Buttons Skeleton */}
        {!compact && (
          <div className="flex items-center justify-center pt-3">
            <div className="h-9 w-24 bg-muted rounded-lg" />
          </div>
        )}

        {/* Compact Action Buttons Skeleton */}
        {compact && (
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 bg-muted rounded-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
