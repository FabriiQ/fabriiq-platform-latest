'use client';

import { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  BookOpen,
  Target,
  Brain
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
import { Badge } from '@/components/ui/badge';
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
  mode?: string | null;
  messageCount: number;
  lastMessage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const getModeIcon = (mode?: string | null) => {
  switch (mode) {
    case 'homework': return '📝';
    case 'concept': return '💡';
    case 'study': return '📚';
    case 'practice': return '🎯';
    case 'exam': return '🎓';
    case 'research': return '🔍';
    default: return '💬';
  }
};

const getModeColor = (mode?: string | null) => {
  switch (mode) {
    case 'homework': return 'bg-blue-100 text-blue-800';
    case 'concept': return 'bg-yellow-100 text-yellow-800';
    case 'study': return 'bg-green-100 text-green-800';
    case 'practice': return 'bg-purple-100 text-purple-800';
    case 'exam': return 'bg-red-100 text-red-800';
    case 'research': return 'bg-indigo-100 text-indigo-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

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
  } = api.studentAssistant.getConversationHistory.useQuery({
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
        conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.mode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [conversations, searchQuery]);

  const handleConversationClick = (conversationId: string) => {
    onConversationSelect(conversationId);
  };

  if (collapsed) {
    return (
      <div className={cn("w-12 border-r bg-muted/30 flex flex-col items-center py-4", className)}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mb-4"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onNewConversation}
          className="mb-2"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
        >
          <History className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("w-80 border-r bg-muted/30 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Learning History</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNewConversation}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
            {onToggleCollapse && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleCollapse}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading conversations...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-red-500">Failed to load conversations</div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <div className="text-sm text-muted-foreground mb-1">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </div>
              <div className="text-xs text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Start a new conversation to begin'}
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {filteredConversations.map((conversation) => (
                <motion.div
                  key={conversation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={cn(
                    "group relative p-3 rounded-lg cursor-pointer transition-colors mb-2",
                    "hover:bg-background/80",
                    currentConversationId === conversation.id
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-background/50"
                  )}
                  onClick={() => handleConversationClick(conversation.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-sm">{getModeIcon(conversation.mode)}</span>
                      <h3 className="font-medium text-sm truncate">
                        {conversation.title}
                      </h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {conversation.mode && (
                    <Badge 
                      variant="secondary" 
                      className={cn("text-xs mb-2", getModeColor(conversation.mode))}
                    >
                      {conversation.mode}
                    </Badge>
                  )}

                  {conversation.lastMessage && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {conversation.lastMessage}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{conversation.messageCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDistanceToNow(conversation.updatedAt, { addSuffix: true })}</span>
                    </div>
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
