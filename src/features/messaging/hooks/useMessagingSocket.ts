/**
 * Messaging Socket Hook
 * Provides real-time messaging functionality with compliance-aware event handling
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/useSocket';
import { api } from '@/utils/api';

interface MessageEvent {
  type: 'message:new' | 'message:read' | 'message:delivered' | 'message:typing';
  message?: any;
  userId?: string;
  timestamp: Date;
}

interface MessagingSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  unreadCount: number;
  lastMessageAt: Date | null;
  typingUsers: string[];
}

interface UseMessagingSocketOptions {
  classId?: string;
  autoConnect?: boolean;
  onNewMessage?: (message: any) => void;
  onMessageRead?: (messageId: string, userId: string) => void;
  onTyping?: (userId: string, isTyping: boolean) => void;
}

export function useMessagingSocket(options: UseMessagingSocketOptions = {}) {
  const { data: session } = useSession();
  const [state, setState] = useState<MessagingSocketState>({
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    unreadCount: 0,
    lastMessageAt: null,
    typingUsers: [],
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const utils = api.useContext();

  // Connect to messaging namespace
  const socket = useSocket('/messaging', {
    auth: {
      token: session?.user?.id,
      userId: session?.user?.id,
      userType: session?.user?.userType,
      campusId: session?.user?.primaryCampusId || undefined,
    },
    autoConnect: options.autoConnect !== false && !!session?.user?.id,
  });

  // Handle socket events
  useEffect(() => {
    if (!socket) return;

    // Connection events
    socket.on('connect', () => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        connectionError: null,
      }));
      console.log('Connected to messaging socket');
    });

    socket.on('disconnect', () => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
      }));
      console.log('Disconnected from messaging socket');
    });

    socket.on('connect_error', (error) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionError: error.message,
      }));
      console.error('Messaging socket connection error:', error);
    });

    // Message events
    socket.on('message:new', (event: MessageEvent) => {
      console.log('New message received:', event);
      
      setState(prev => ({
        ...prev,
        unreadCount: prev.unreadCount + 1,
        lastMessageAt: new Date(event.timestamp),
      }));

      // Invalidate queries to refresh inbox
      utils.messaging.getMessages.invalidate();
      utils.messaging.getUnreadCount.invalidate();

      // Call callback if provided
      if (options.onNewMessage && event.message) {
        options.onNewMessage(event.message);
      }
    });

    socket.on('message:read', (event: { messageId: string; userId: string; timestamp: Date }) => {
      console.log('Message read:', event);
      
      // Update unread count if it's our message being read
      if (event.userId === session?.user?.id) {
        setState(prev => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }

      // Invalidate queries
      utils.messaging.getMessages.invalidate();
      utils.messaging.getUnreadCount.invalidate();

      // Call callback if provided
      if (options.onMessageRead) {
        options.onMessageRead(event.messageId, event.userId);
      }
    });

    socket.on('message:delivered', (event: { messageId: string; userId: string; timestamp: Date }) => {
      console.log('Message delivered:', event);
      // Invalidate queries to update delivery status
      utils.messaging.getMessages.invalidate();
    });

    socket.on('user:typing', (event: { userId: string; userName: string; isTyping: boolean }) => {
      console.log('User typing:', event);
      
      setState(prev => {
        const typingUsers = prev.typingUsers.filter(id => id !== event.userId);
        if (event.isTyping) {
          typingUsers.push(event.userId);
        }
        return { ...prev, typingUsers };
      });

      // Call callback if provided
      if (options.onTyping) {
        options.onTyping(event.userId, event.isTyping);
      }

      // Clear typing indicator after 3 seconds
      if (event.isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            typingUsers: prev.typingUsers.filter(id => id !== event.userId),
          }));
        }, 3000);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('message:new');
      socket.off('message:read');
      socket.off('message:delivered');
      socket.off('user:typing');
    };
  }, [socket, session?.user?.id, options.onNewMessage, options.onMessageRead, options.onTyping, utils]);

  // Send message via socket
  const sendMessage = useCallback((messageData: {
    content: string;
    recipients: string[];
    messageType?: string;
    classId?: string;
  }) => {
    if (!socket || !socket.connected) {
      console.warn('Socket not connected, cannot send message');
      return false;
    }

    socket.emit('message:send', messageData);
    return true;
  }, [socket]);

  // Mark message as read
  const markAsRead = useCallback((messageId: string) => {
    if (!socket || !socket.connected) {
      console.warn('Socket not connected, cannot mark message as read');
      return false;
    }

    socket.emit('message:read', { messageId });
    return true;
  }, [socket]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!socket || !socket.connected) {
      return false;
    }

    socket.emit('user:typing', { isTyping });
    return true;
  }, [socket]);

  // Join class room for class-specific messages
  const joinClassRoom = useCallback((classId: string) => {
    if (!socket || !socket.connected) {
      return false;
    }

    socket.emit('join:class', { classId });
    return true;
  }, [socket]);

  // Leave class room
  const leaveClassRoom = useCallback((classId: string) => {
    if (!socket || !socket.connected) {
      return false;
    }

    socket.emit('leave:class', { classId });
    return true;
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    socket,
    sendMessage,
    markAsRead,
    sendTyping,
    joinClassRoom,
    leaveClassRoom,
  };
}
