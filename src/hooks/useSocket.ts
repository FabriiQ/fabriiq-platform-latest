/**
 * useSocket Hook
 * Provides real-time Socket.IO connection management
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketOptions {
  auth?: {
    token?: string;
    userId?: string;
    userType?: string;
    campusId?: string;
  };
  autoConnect?: boolean;
}

export function useSocket(namespace: string = '/', options: UseSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Don't create socket if we don't have required auth info
    if (options.auth && !options.auth.userId) {
      return;
    }

    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000';

    // Create socket connection
    const newSocket = io(`${socketUrl}${namespace}`, {
      path: '/api/socket/social-wall',
      auth: options.auth || {},
      autoConnect: options.autoConnect !== false,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log(`Connected to ${namespace}`, newSocket.id);
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`Disconnected from ${namespace}:`, reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error(`Connection error to ${namespace}:`, error);
    });

    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
    };
  }, [namespace, options.auth?.userId, options.auth?.userType]);

  return socket;
}

export function useSocketEvent<T = any>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void
) {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}

export function useSocketConnection(socket: Socket | null) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [socket]);

  return isConnected;
}
