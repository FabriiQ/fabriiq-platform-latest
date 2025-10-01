/**
 * Message Icon Component with Unread Badge
 * Similar to NotificationBell but for messaging system
 */

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useUnreadMessagesCount } from '../hooks/useUnreadMessagesCount';
import { motion } from 'framer-motion';

interface MessageIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  role: 'student' | 'teacher';
}

export function MessageIcon({ size = 'md', className, role }: MessageIconProps) {
  const router = useRouter();
  const { unreadCount, isEnabled } = useUnreadMessagesCount();

  // Don't render if messaging is not enabled
  if (!isEnabled) {
    return null;
  }

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-6 w-6';
      default:
        return 'h-5 w-5';
    }
  };

  const getBadgeSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4 text-xs';
      case 'lg':
        return 'h-6 w-6 text-sm';
      default:
        return 'h-5 w-5 text-xs';
    }
  };

  const handleClick = () => {
    const path = role === 'student' ? '/student/communications' : '/teacher/communications';
    router.push(path);
  };

  const hasUnreadMessages = (unreadCount.count || 0) > 0;

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : undefined}
      className={cn(
        "relative hover:bg-accent",
        className
      )}
      onClick={handleClick}
      title={`Messages (${unreadCount.count || 0} unread)`}
    >
      <motion.div
        animate={hasUnreadMessages ? { scale: [1, 1.1, 1] } : {}}
        transition={{ 
          duration: 0.3, 
          repeat: hasUnreadMessages ? Infinity : 0, 
          repeatDelay: 3 
        }}
      >
        <MessageSquare 
          className={cn(
            getIconSize(),
            hasUnreadMessages ? "text-primary" : "text-muted-foreground"
          )} 
        />
      </motion.div>
      
      {(unreadCount.count || 0) > 0 && (
        <Badge
          variant="destructive"
          className={cn(
            "absolute -top-1 -right-1 flex items-center justify-center",
            getBadgeSize(),
            "min-w-0 p-0"
          )}
        >
          {(unreadCount.count || 0) > 99 ? '99+' : (unreadCount.count || 0)}
        </Badge>
      )}
    </Button>
  );
}
