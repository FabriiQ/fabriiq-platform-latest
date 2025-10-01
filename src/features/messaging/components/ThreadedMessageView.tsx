'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Reply,
  MoreVertical,
  MapPin as Pin,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  Heart,
  ThumbsUp,
  Smile,
  Clock,
  Check,
  CheckCheck,
  Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { ReportMessageDialog } from './ReportMessageDialog';
import { EnhancedMessageBubble } from './EnhancedMessageBubble';

interface ThreadedMessageViewProps {
  conversationId: string;
  className?: string;
}

interface MessageThread {
  id: string;
  content: string;
  messageType: 'text' | 'image' | 'file' | 'system';
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  sentAt: Date;
  editedAt?: Date;
  isEdited: boolean;
  isPinned: boolean;
  threadDepth: number;
  parentMessageId?: string;
  replyCount: number;
  mentions: string[];
  reactions: {
    emoji: string;
    count: number;
    users: { id: string; name: string }[];
    hasReacted: boolean;
  }[];
  readBy: {
    userId: string;
    userName: string;
    readAt: Date;
  }[];
  replies?: MessageThread[];
  isCollapsed?: boolean;
}

interface ConversationInfo {
  id: string;
  subject: string;
  type: 'direct' | 'group' | 'class' | 'broadcast';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  isPinned?: boolean;
  participants: {
    id: string;
    name: string;
    avatar?: string;
    isOnline: boolean;
  }[];
  classInfo?: {
    id: string;
    name: string;
  };
}

export const ThreadedMessageView: React.FC<ThreadedMessageViewProps> = ({
  conversationId,
  className
}) => {
  const { data: session } = useSession();
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation info
  const { data: conversation } = api.messaging.getConversation.useQuery({
    conversationId
  });

  // Fetch messages with threading
  const { data: messages, isLoading } = api.messaging.getThreadedMessages.useQuery({
    conversationId,
    limit: 100
  });



  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleThreadCollapse = (messageId: string) => {
    const newCollapsed = new Set(collapsedThreads);
    if (newCollapsed.has(messageId)) {
      newCollapsed.delete(messageId);
    } else {
      newCollapsed.add(messageId);
    }
    setCollapsedThreads(newCollapsed);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    // TODO: Implement reaction mutation
    console.log('React to message:', messageId, emoji);
  };

  const handleReply = (messageId: string) => {
    setReplyingTo(messageId);
  };



  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    
    // If today, show time only
    if (messageDate.toDateString() === now.toDateString()) {
      return format(messageDate, 'HH:mm');
    }
    
    // If this week, show day and time
    const daysDiff = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return format(messageDate, 'EEE HH:mm');
    }
    
    // Otherwise show date and time
    return format(messageDate, 'MMM d, HH:mm');
  };

  const getReadStatus = (message: MessageThread) => {
    if (!conversation) return null;
    
    const totalParticipants = conversation.participants.length;
    const readCount = message.readBy.length;
    
    if (readCount === 0) return <Clock className="h-3 w-3 text-muted-foreground" />;
    if (readCount < totalParticipants) return <Check className="h-3 w-3 text-muted-foreground" />;
    return <CheckCheck className="h-3 w-3 text-blue-500" />;
  };

  const renderMessage = (message: MessageThread, isReply: boolean = false) => {
    const isCollapsed = collapsedThreads.has(message.id);
    const hasReplies = message.replyCount > 0;

    return (
      <div key={message.id}>
        <EnhancedMessageBubble
          message={{
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            senderName: message.senderName,
            senderAvatar: message.senderAvatar,
            sentAt: message.sentAt,
            isEdited: message.isEdited,
            isPinned: message.isPinned,
            reactions: message.reactions,
            readBy: message.readBy
          }}
          currentUserId={session?.user?.id || ''}
          isReply={isReply}
          conversationType={conversation?.type as 'direct' | 'group' | 'class'}
          onReply={handleReply}
          onReaction={handleReaction}
          onReport={(messageId) => setReportingMessage(messageId)}
        />

        {/* Thread Controls */}
        {hasReplies && (
          <div className="ml-11 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full transition-all"
              onClick={() => toggleThreadCollapse(message.id)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 mr-1" />
              ) : (
                <ChevronDown className="h-3 w-3 mr-1" />
              )}
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </Button>
          </div>
        )}

        {/* Replies */}
        {hasReplies && !isCollapsed && message.replies && (
          <div className="space-y-2 border-l-2 border-accent/30 ml-4 pl-4">
            {message.replies.map((reply) => renderMessage(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-muted-foreground">Loading messages...</div>
      </Card>
    );
  }

  if (!conversation) {
    return (
      <Card className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-muted-foreground">Conversation not found</div>
      </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      {/* Header */}
      <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-card to-card/95">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {conversation.participants.slice(0, 3).map((participant) => (
                <Avatar key={participant.id} className="h-9 w-9 border-2 border-background ring-1 ring-border/20">
                  <AvatarImage src={participant.avatar || undefined} />
                  <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground">
                    {participant.name?.charAt(0)?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
              {conversation.participants.length > 3 && (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-muted to-muted/80 border-2 border-background ring-1 ring-border/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    +{conversation.participants.length - 3}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-base text-foreground">{conversation.subject}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">
                  {conversation.participants.length} participants
                </span>
                {conversation.type && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground capitalize">{conversation.type}</span>
                  </>
                )}
                {conversation.classInfo && (
                  <Badge variant="outline" className="text-xs ml-2">
                    {conversation.classInfo.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {conversation.priority && (
              <Badge
                variant={conversation.priority === 'urgent' ? 'destructive' : 'secondary'}
                className="capitalize"
              >
                {conversation.priority}
              </Badge>
            )}
            {conversation.isPinned && (
              <Pin className="h-4 w-4 text-accent" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 bg-gradient-to-b from-background to-muted/20">
        <ScrollArea className="h-full">
          {!messages || messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-lg text-foreground mb-2">No messages yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Start the conversation! Send a message to begin chatting with the participants.
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-4 pb-6">
              {messages.map((message) => renderMessage(message))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Report Message Dialog */}
      {reportingMessage && (
        <ReportMessageDialog
          messageId={reportingMessage}
          messageContent={messages?.find(m => m.id === reportingMessage)?.content || ''}
          messageAuthor={messages?.find(m => m.id === reportingMessage)?.senderName || 'Unknown'}
          isOpen={!!reportingMessage}
          onClose={() => setReportingMessage(null)}
          onReported={() => {
            setReportingMessage(null);
            // Optionally refresh messages
          }}
        />
      )}
    </Card>
  );
};
