'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Reply,
  Heart,
  ThumbsUp,
  Pin,
  Clock,
  Check,
  CheckCheck,
  MoreVertical,
  Flag
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    sentAt: Date;
    isEdited?: boolean;
    isPinned?: boolean;
    reactions?: Array<{
      emoji: string;
      count: number;
      hasReacted: boolean;
    }>;
    readBy?: Array<{
      userId: string;
      readAt: Date;
    }>;
  };
  currentUserId: string;
  isReply?: boolean;
  conversationType?: 'direct' | 'group' | 'class';
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onReport?: (messageId: string) => void;
  className?: string;
}

export const EnhancedMessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  isReply = false,
  conversationType = 'direct',
  onReply,
  onReaction,
  onReport,
  className
}) => {
  const isCurrentUser = currentUserId === message.senderId;
  const showSenderInfo = !isCurrentUser || conversationType === 'group' || conversationType === 'class';

  const getReadStatus = () => {
    if (!isCurrentUser || !message.readBy) return null;
    
    const readCount = message.readBy.length;
    if (readCount === 0) return <Clock className="h-3 w-3 text-primary-foreground/60" />;
    if (readCount === 1) return <Check className="h-3 w-3 text-primary-foreground/80" />;
    return <CheckCheck className="h-3 w-3 text-primary-foreground/90" />;
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "group mb-4 transition-all duration-200",
      isReply && "ml-8 border-l-2 border-accent/30 pl-4",
      className
    )}>
      <div className={cn(
        "flex items-start gap-3 max-w-[85%] transition-all duration-300",
        isCurrentUser ? "ml-auto flex-row-reverse" : "mr-auto"
      )}>
        {/* Avatar */}
        <Avatar className={cn(
          "h-8 w-8 mt-1 ring-2 transition-all duration-200 hover:scale-105",
          isCurrentUser 
            ? "ring-primary/30 bg-gradient-to-br from-primary/20 to-primary/10" 
            : "ring-secondary/30 bg-gradient-to-br from-secondary/20 to-secondary/10"
        )}>
          <AvatarImage src={message.senderAvatar || undefined} />
          <AvatarFallback className={cn(
            "text-xs font-semibold transition-colors",
            isCurrentUser 
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground" 
              : "bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground"
          )}>
            {message.senderName?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        {/* Message Bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm border transition-all duration-300 hover:shadow-lg relative",
          "before:absolute before:w-0 before:h-0 before:border-8 before:border-transparent",
          isCurrentUser 
            ? cn(
                "bg-gradient-to-br from-primary via-primary to-primary/95 text-primary-foreground",
                "border-primary/20 rounded-br-md shadow-primary/20",
                "before:right-[-8px] before:top-4 before:border-l-primary before:border-r-0"
              )
            : cn(
                "bg-gradient-to-br from-card to-card/95 text-card-foreground",
                "border-border/50 rounded-bl-md hover:bg-muted/30",
                "before:left-[-8px] before:top-4 before:border-r-card before:border-l-0"
              )
        )}>
          {/* Header - show for received messages or group conversations */}
          {showSenderInfo && (
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "font-semibold text-xs",
                isCurrentUser ? "text-primary-foreground/90" : "text-foreground/90"
              )}>
                {isCurrentUser ? "You" : message.senderName}
              </span>
              <span className={cn(
                "text-xs",
                isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                {formatMessageTime(message.sentAt)}
              </span>
              {message.isEdited && (
                <Badge variant="outline" className={cn(
                  "text-xs px-1.5 py-0 border-0 rounded-full",
                  isCurrentUser 
                    ? "bg-primary-foreground/20 text-primary-foreground/80" 
                    : "bg-muted/80 text-muted-foreground"
                )}>
                  edited
                </Badge>
              )}
              {message.isPinned && (
                <Pin className={cn(
                  "h-3 w-3",
                  isCurrentUser ? "text-primary-foreground/80" : "text-accent"
                )} />
              )}
            </div>
          )}

          {/* Message Content */}
          <div className={cn(
            "text-sm leading-relaxed whitespace-pre-wrap break-words",
            isCurrentUser ? "text-primary-foreground" : "text-foreground"
          )}>
            {message.content}
          </div>

          {/* Timestamp for sent messages */}
          {isCurrentUser && !showSenderInfo && (
            <div className="flex items-center justify-end gap-1 mt-2">
              <span className="text-xs text-primary-foreground/70">
                {formatMessageTime(message.sentAt)}
              </span>
              {getReadStatus()}
            </div>
          )}
        </div>
      </div>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={cn(
          "flex items-center gap-1 mt-2 flex-wrap",
          isCurrentUser ? "justify-end mr-11" : "justify-start ml-11"
        )}>
          {message.reactions.map((reaction, index) => (
            <Button
              key={index}
              variant={reaction.hasReacted ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-6 px-2 text-xs rounded-full transition-all duration-200 hover:scale-110",
                reaction.hasReacted 
                  ? "bg-accent text-accent-foreground shadow-md border-accent/50" 
                  : "bg-background/90 hover:bg-accent/30 border-border/30"
              )}
              onClick={() => onReaction?.(message.id, reaction.emoji)}
            >
              <span className="mr-1">{reaction.emoji}</span>
              <span className="font-medium">{reaction.count}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className={cn(
        "flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300",
        isCurrentUser ? "justify-end mr-11" : "justify-start ml-11"
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-3 text-xs rounded-full hover:bg-accent/30 transition-all duration-200 hover:scale-105"
          onClick={() => onReply?.(message.id)}
        >
          <Reply className="h-3 w-3 mr-1" />
          Reply
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs rounded-full hover:bg-accent/30 transition-all duration-200 hover:scale-105"
          onClick={() => onReaction?.(message.id, '👍')}
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs rounded-full hover:bg-accent/30 transition-all duration-200 hover:scale-105"
          onClick={() => onReaction?.(message.id, '❤️')}
        >
          <Heart className="h-3 w-3" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 hover:scale-105"
          onClick={() => onReport?.(message.id)}
          title="Report message"
        >
          <Flag className="h-3 w-3" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0 rounded-full hover:bg-accent/30 transition-all duration-200 hover:scale-105"
        >
          <MoreVertical className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
