'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Clock,
  Search,
  Trash2,
  MoreVertical,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface ConversationHistoryProps {
  currentConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ConversationItem {
  id: string;
  title: string;
  summary?: string | null;
  messageCount: number;
  lastMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function ConversationHistory({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  className,
  collapsed = false,
  onToggleCollapse,
}: ConversationHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState<ConversationItem[]>([]);

  // Fetch conversation history with proper error handling
  const {
    data: historyData,
    isLoading,
    refetch,
    error
  } = api.teacherAssistantV2.getConversationHistory.useQuery({
    limit: 50,
  }, {
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const conversations = useMemo(() => historyData?.conversations || [], [historyData]);

  // Filter conversations based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conv =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);
  // Ensure history reflects newly created or switched conversations
  // Only refetch when conversation ID changes, not on every render
  const [lastRefetchedConversationId, setLastRefetchedConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (currentConversationId && currentConversationId !== lastRefetchedConversationId) {
      console.log('Refetching conversation history for new conversation:', currentConversationId);
      refetch();
      setLastRefetchedConversationId(currentConversationId);
    }
  }, [currentConversationId, refetch, lastRefetchedConversationId]);


  const handleNewConversation = useCallback(() => {
    onNewConversation();
    toast.success('Started new conversation');
  }, [onNewConversation]);

  const handleConversationClick = useCallback((conversationId: string) => {
    onConversationSelect(conversationId);
  }, [onConversationSelect]);

  if (collapsed) {
    return (
      <div className={cn("w-16 min-w-[64px] border-r bg-muted/30 flex flex-col overflow-hidden", className)}>
        <div className="p-3 border-b flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-full h-10 p-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewConversation}
            className="w-10 h-10 p-0"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0"
            title="History"
          >
            <History className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-80 max-w-[320px] min-w-[280px] border-r bg-background flex flex-col overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Conversations
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="h-8 w-8 p-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 animate-pulse">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations found</p>
                  <p className="text-sm">Try a different search term</p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new conversation to get started</p>
                </>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "group p-3 rounded-lg cursor-pointer transition-colors mb-2",
                    "hover:bg-muted/50",
                    currentConversationId === conversation.id
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-background"
                  )}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate mb-1">
                        {conversation.title}
                      </h3>
                      {conversation.lastMessage && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {conversation.lastMessage}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                        </span>
                        <span>•</span>
                        <span>{conversation.messageCount} messages</span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement delete conversation
                            toast.success('Conversation deleted');
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
