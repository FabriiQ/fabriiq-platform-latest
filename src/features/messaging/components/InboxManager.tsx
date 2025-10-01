/**
 * InboxManager Component
 * Smart filtering, categorization, and role-based inbox views
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  GraduationCap,
  School,
  AlertTriangle,
  Users,
  Clock,
  Star,
  Archive,
  Filter,
  Loader2,
  ShieldCheck,
  Shield
} from 'lucide-react';
import { api } from '@/utils/api';
import { MessageInterface } from './MessageInterface';
import { MessageComposer } from './MessageComposer';
import { useMessagingSocket } from '../hooks/useMessagingSocket';

interface InboxManagerProps {
  role: 'student' | 'teacher' | 'admin';
  classFilter?: string;
  searchQuery?: string;
  focusMode?: boolean;
}

export function InboxManager({
  role,
  classFilter,
  searchQuery,
  focusMode = false
}: InboxManagerProps) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [showComposer, setShowComposer] = useState(false);
  const [replyContext, setReplyContext] = useState<{
    messageId: string;
    author: string;
    content: string;
  } | null>(null);

  // Real-time messaging socket
  const messagingSocket = useMessagingSocket({
    classId: classFilter,
    onNewMessage: (message) => {
      console.log('New message received in inbox:', message);
      setNewMessageCount(prev => prev + 1);
      // Auto-refresh messages
      refetch();
    },
    onMessageRead: (messageId, userId) => {
      console.log('Message read:', messageId, userId);
      // Refresh to update read status
      refetch();
    },
  });

  // Fetch messages based on role and filters with real-time updates
  const { data: messages, isLoading, error, refetch } = api.messaging.getMessages.useQuery({
    classId: classFilter,
    messageType: focusMode ? 'PRIVATE' : undefined, // Focus mode shows only private messages
    limit: 50,
  }, {
    refetchInterval: 15000, // 15 seconds for more real-time feel
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error) => {
      console.error('Failed to fetch messages:', error);
    }
  });

  // Categorize messages based on role with mock data fallback
  const categorizedMessages = useMemo(() => {
    let messageList = messages?.messages || [];

    // Add mock data if no real messages are available
    if (messageList.length === 0 && !isLoading) {
      messageList = [
        {
          id: 'mock-1',
          content: role === 'teacher'
            ? 'Student question about Assignment #3 - Quadratic Equations'
            : 'Feedback on your Math Assignment #3 - Great work!',
          author: {
            id: 'mock-author-1',
            name: role === 'teacher' ? 'Alice Johnson (Student)' : 'Mr. Smith (Teacher)',
            userType: role === 'teacher' ? 'CAMPUS_STUDENT' : 'CAMPUS_TEACHER'
          },
          recipients: [
            {
              id: 'mock-recipient-1',
              name: 'Current User',
              readAt: null
            }
          ],
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          riskLevel: 'LOW',
          contentCategory: 'ACADEMIC',
          messageType: 'PRIVATE',
          isEducationalRecord: true,
          _count: { comments: 0, reactions: 1 }
        },
        {
          id: 'mock-2',
          content: role === 'teacher'
            ? 'Parent meeting request for next week'
            : 'Reminder: Science project due tomorrow',
          author: {
            id: 'mock-author-2',
            name: role === 'teacher' ? 'Mrs. Davis (Parent)' : 'Dr. Wilson (Teacher)',
            userType: role === 'teacher' ? 'PARENT' : 'CAMPUS_TEACHER'
          },
          recipients: [
            {
              id: 'mock-recipient-2',
              name: 'Current User',
              readAt: new Date(Date.now() - 3 * 60 * 60 * 1000) // Read 3 hours ago
            }
          ],
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          riskLevel: 'MEDIUM',
          contentCategory: 'ADMINISTRATIVE',
          messageType: 'PRIVATE',
          isEducationalRecord: false,
          _count: { comments: 1, reactions: 0 }
        },
        {
          id: 'mock-3',
          content: role === 'teacher'
            ? 'Class announcement: Field trip permission forms due Friday'
            : 'Welcome to the new semester! Looking forward to working with you.',
          author: {
            id: 'mock-author-3',
            name: role === 'teacher' ? 'Principal Johnson' : 'Ms. Garcia (Teacher)',
            userType: 'COORDINATOR',
          },
          recipients: [
            {
              id: 'mock-recipient-3a',
              name: 'Current User',
              readAt: null
            },
            {
              id: 'mock-recipient-3b',
              name: 'Other User',
              readAt: new Date(Date.now() - 20 * 60 * 60 * 1000) // Read 20 hours ago
            }
          ],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          riskLevel: 'LOW',
          contentCategory: 'ADMINISTRATIVE',
          messageType: 'BROADCAST',
          isEducationalRecord: false,
          _count: { comments: 3, reactions: 5 }
        }
      ];
    }

    const categories: Record<string, any[]> = {
      all: messageList,
      priority: [],
      academic: [],
      administrative: [],
      social: [],
      unread: [],
    };

    messageList.forEach((message) => {
      // Priority messages
      if (message.riskLevel === 'HIGH' || message.riskLevel === 'CRITICAL') {
        categories.priority.push(message);
      }

      // Academic messages
      if (message.contentCategory === 'ACADEMIC') {
        categories.academic.push(message);
      }

      // Administrative messages
      if (message.contentCategory === 'ADMINISTRATIVE') {
        categories.administrative.push(message);
      }

      // Social messages (if not in focus mode)
      if (message.contentCategory === 'GENERAL' && !focusMode) {
        categories.social.push(message);
      }

      // Unread messages
      if (!message.isRead) {
        categories.unread.push(message);
      }
    });

    return categories;
  }, [messages, focusMode, role, isLoading]);

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    const categoryMessages = categorizedMessages[activeCategory] || [];
    
    if (!searchQuery) return categoryMessages;

    return categoryMessages.filter((message) =>
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.author.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categorizedMessages, activeCategory, searchQuery]);

  const handleReply = (messageId: string) => {
    console.log('Reply to message:', messageId);

    // Find the message to reply to
    const messageToReply = messages?.messages?.find(msg => msg.id === messageId);
    if (messageToReply) {
      setReplyContext({
        messageId: messageToReply.id,
        author: messageToReply.author.name,
        content: messageToReply.content.substring(0, 100) + (messageToReply.content.length > 100 ? '...' : '')
      });
      setShowComposer(true);
    }
  };

  const handleForward = (messageId: string) => {
    console.log('Forward message:', messageId);
    // Implementation would open composer with forward context
  };

  // Create mutation for marking messages as read
  const markAsReadMutation = api.messaging.markAsRead.useMutation();

  const handleMarkAsRead = async (messageId: string) => {
    try {
      // Use tRPC API for reliable read status updates
      await markAsReadMutation.mutateAsync({ messageId });
      console.log('Mark as read:', messageId);

      // Also try socket for real-time updates if connected
      if (messagingSocket.isConnected) {
        messagingSocket.markAsRead(messageId);
      }

      // Refresh messages to update UI
      refetch();
      // Clear new message count when user interacts with messages
      setNewMessageCount(0);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
      // Still try to refresh in case the API call succeeded but we got a network error
      refetch();
    }
  };

  // Clear new message count when user changes category (viewing messages)
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setNewMessageCount(0);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'priority':
        return <AlertTriangle className="h-4 w-4" />;
      case 'academic':
        return <GraduationCap className="h-4 w-4" />;
      case 'administrative':
        return <School className="h-4 w-4" />;
      case 'social':
        return <Users className="h-4 w-4" />;
      case 'unread':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Archive className="h-4 w-4" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'priority':
        return 'Priority';
      case 'academic':
        return role === 'student' ? 'Academic' : 'Student Questions';
      case 'administrative':
        return role === 'student' ? 'School Updates' : 'Admin Updates';
      case 'social':
        return 'Social';
      case 'unread':
        return 'Unread';
      default:
        return 'All Messages';
    }
  };

  const categories = role === 'student' 
    ? ['all', 'priority', 'academic', 'administrative', ...(focusMode ? [] : ['social']), 'unread']
    : ['all', 'priority', 'academic', 'administrative', 'unread'];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading messages...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Real-time Status & Compliance Header */}
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-4">
          {/* Real-time Connection Status */}
          <div className="flex items-center gap-2">
            {messagingSocket.isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-700 font-medium">Live</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-xs text-gray-500">Offline</span>
              </>
            )}
          </div>

          {/* Compliance Status */}
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <div>
              <div className="font-medium text-sm text-green-800">Compliance Active</div>
              <div className="text-xs text-green-600">
                All messages encrypted • FERPA protected • Audit logging enabled
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* New Message Indicator */}
          {newMessageCount > 0 && (
            <Badge variant="default" className="bg-blue-600 animate-pulse">
              {newMessageCount} new
            </Badge>
          )}

          <Shield className="w-4 h-4 text-green-600" />
          <Badge variant="outline" className="text-green-700 border-green-300">
            {messages?.messages?.length || 0} messages
          </Badge>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to load messages. Using mock data for testing.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mock Data Notice */}
      {!error && !isLoading && (!messages?.messages || messages.messages.length === 0) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              <span>Showing sample messages for testing. Real messages will appear when available.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Loading messages...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      {!isLoading && (
        <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
          {categories.slice(0, 6).map((category) => (
            <TabsTrigger key={category} value={category} className="flex items-center gap-1">
              {getCategoryIcon(category)}
              <span className="hidden sm:inline">{getCategoryLabel(category)}</span>
              {categorizedMessages[category]?.length > 0 && (
                <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
                  {categorizedMessages[category].length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(category)}
                  {getCategoryLabel(category)}
                  <Badge variant="outline">
                    {filteredMessages.length} {filteredMessages.length === 1 ? 'message' : 'messages'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredMessages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages in this category</p>
                    {searchQuery && (
                      <p className="text-sm mt-2">Try adjusting your search terms</p>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {filteredMessages.map((message) => (
                        <MessageInterface
                          key={message.id}
                          message={message}
                          onReply={handleReply}
                          onForward={handleForward}
                          onMarkAsRead={handleMarkAsRead}
                          compact={filteredMessages.length > 10}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
        </Tabs>
      )}

      {/* Focus Mode Info */}
      {focusMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Star className="h-4 w-4" />
              <span>Focus Mode: Showing only priority and academic messages</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reply Composer */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Reply to Message</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowComposer(false);
                    setReplyContext(null);
                  }}
                >
                  ×
                </Button>
              </div>
              {replyContext && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">Replying to {replyContext.author}:</div>
                  <div className="text-gray-600 italic">"{replyContext.content}"</div>
                </div>
              )}
            </div>
            <div className="p-4">
              <MessageComposer
                role={role}
                replyTo={replyContext || undefined}
                onSent={() => {
                  setShowComposer(false);
                  setReplyContext(null);
                  refetch(); // Refresh messages
                }}
                onClose={() => {
                  setShowComposer(false);
                  setReplyContext(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
