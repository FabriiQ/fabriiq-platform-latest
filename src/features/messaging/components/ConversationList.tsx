'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Plus,
  MapPin as Pin,
  MessageSquare,
  Users,
  Clock,
  MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  selectedConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  className?: string;
}

interface ConversationPreview {
  id: string;
  subject: string;
  type: 'direct' | 'group' | 'class' | 'broadcast';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isPinned: boolean;
  isArchived: boolean;
  unreadCount: number;
  lastMessage?: {
    content: string;
    senderName: string;
    sentAt: Date;
  };
  participants: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  classInfo?: {
    id: string;
    name: string;
  };
}

export const ConversationList: React.FC<ConversationListProps> = ({
  selectedConversationId,
  onConversationSelect,
  onNewConversation,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch conversations
  const { data: conversations, isLoading } = api.messaging.getConversations.useQuery({
    search: searchQuery,
    limit: 50
  });

  // Filter and sort conversations
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];

    let filtered = conversations.filter((conv: any) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          conv.subject.toLowerCase().includes(query) ||
          conv.lastMessage?.content.toLowerCase().includes(query) ||
          conv.participants.some(p => p.name.toLowerCase().includes(query))
        );
      }
      return true;
    });

    // Sort: pinned first, then by last message time
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      const aTime = a.lastMessage?.sentAt || new Date(0);
      const bTime = b.lastMessage?.sentAt || new Date(0);
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return filtered;
  }, [conversations, searchQuery]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'group': return <Users className="h-4 w-4" />;
      case 'class': return <MessageSquare className="h-4 w-4" />;
      case 'broadcast': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatLastMessageTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  const truncateMessage = (content: string, maxLength: number = 60) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <Card className={cn("h-full flex flex-col bg-gradient-to-b from-card to-card/95", className)}>
      <CardHeader className="pb-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Messages
          </CardTitle>
          <Button
            onClick={onNewConversation}
            size="sm"
            className="h-9 w-9 p-0 rounded-full bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 bg-gradient-to-b from-background to-muted/10">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-3">
                <span className="text-xl">💬</span>
              </div>
              <p className="text-muted-foreground">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => onConversationSelect(conversation.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md border border-transparent",
                    selectedConversationId === conversation.id && "bg-primary/5 border-primary/20 shadow-sm",
                    conversation.unreadCount > 0 && "bg-gradient-to-r from-accent/10 to-accent/5 border-l-4 border-accent hover:from-accent/15 hover:to-accent/10",
                    "hover:bg-muted/30 hover:scale-[1.02]"
                  )}
                >
                  {/* Avatar/Icon */}
                  <div className="relative">
                    {conversation.type === 'direct' && conversation.participants.length === 2 ? (
                      <Avatar className="h-12 w-12 ring-2 ring-border/20 transition-all duration-200 hover:ring-primary/30">
                        <AvatarImage src={conversation.participants.find(p => p.id !== 'current-user')?.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground font-semibold">
                          {conversation.participants.find(p => p.id !== 'current-user')?.name?.charAt(0)?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-muted to-muted/80 flex items-center justify-center ring-2 ring-border/20 transition-all duration-200 hover:ring-primary/30">
                        {getTypeIcon(conversation.type)}
                      </div>
                    )}

                    {conversation.isPinned && (
                      <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent flex items-center justify-center">
                        <Pin className="h-3 w-3 text-accent-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={cn(
                        "text-base truncate transition-colors",
                        conversation.unreadCount > 0 ? "font-bold text-foreground" : "font-semibold text-foreground/90"
                      )}>
                        {conversation.subject}
                      </h3>
                      <div className="flex items-center gap-2">
                        {conversation.priority !== 'normal' && (
                          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", getPriorityColor(conversation.priority))} />
                        )}
                        {conversation.unreadCount > 0 && (
                          <Badge variant="default" className="h-6 min-w-6 text-xs px-2 bg-gradient-to-r from-accent to-accent/90 text-accent-foreground font-semibold shadow-sm">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {conversation.lastMessage && (
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          <span className="font-medium">{conversation.lastMessage.senderName}:</span>{' '}
                          {truncateMessage(conversation.lastMessage.content)}
                        </p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatLastMessageTime(conversation.lastMessage.sentAt)}
                        </span>
                      </div>
                    )}

                    {conversation.classInfo && (
                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {conversation.classInfo.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
