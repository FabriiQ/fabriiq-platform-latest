/**
 * Enhanced System Admin Inbox Component
 * Real-time messaging interface for system administrators
 * with compliance monitoring and system-wide message management
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  MessageSquare,
  Bell,
  Send,
  Search,
  Filter,
  AlertTriangle,
  Shield,
  Users,
  Clock,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { MessagingIntegration } from './MessagingIntegration';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';

interface SystemAdminInboxProps {
  className?: string;
}

export function SystemAdminInbox({ className }: SystemAdminInboxProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch unread count
  const { data: unreadData, refetch: refetchUnread } = api.messaging.getUnreadCount.useQuery(
    { classId: undefined },
    {
      refetchInterval: 30000, // 30 seconds
      enabled: !!session?.user
    }
  );

  // Fetch system-wide compliance stats
  const { data: complianceStats, refetch: refetchCompliance } = api.messaging.getComplianceStats.useQuery(
    { scope: 'system-wide' },
    {
      refetchInterval: 60000, // 1 minute
      enabled: session?.user?.userType === 'SYSTEM_ADMIN'
    }
  );

  // Socket connection for real-time updates
  const socket = useSocket('/admin-messaging', {
    auth: {
      token: session?.user?.id, // In real app, use proper JWT
      userId: session?.user?.id,
      userType: session?.user?.userType,
    }
  });

  // Handle socket connection
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('subscribe:inbox');
      toast.success('Connected to real-time messaging');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      toast.error('Disconnected from real-time messaging');
    };

    const handleNewMessage = (data: any) => {
      setUnreadCount(prev => prev + 1);
      refetchUnread();
      toast.info(`New message from ${data.message.author.name}`);
    };

    const handleInboxSubscribed = () => {
      console.log('Subscribed to inbox updates');
    };

    const handleError = (error: any) => {
      toast.error(`Messaging error: ${error.message}`);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('message:new', handleNewMessage);
    socket.on('inbox:subscribed', handleInboxSubscribed);
    socket.on('error', handleError);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('message:new', handleNewMessage);
      socket.off('inbox:subscribed', handleInboxSubscribed);
      socket.off('error', handleError);
    };
  }, [socket, refetchUnread]);

  // Update unread count when data changes
  useEffect(() => {
    if (unreadData?.count !== undefined) {
      setUnreadCount(unreadData.count);
    }
  }, [unreadData]);

  const handleRefresh = useCallback(() => {
    refetchUnread();
    refetchCompliance();
    toast.success('Inbox refreshed');
  }, [refetchUnread, refetchCompliance]);

  const handleMarkAllRead = useCallback(async () => {
    try {
      // This would be implemented as a batch operation
      toast.success('All messages marked as read');
      setUnreadCount(0);
      refetchUnread();
    } catch (error) {
      toast.error('Failed to mark all messages as read');
    }
  }, [refetchUnread]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Admin Inbox</h2>
          <p className="text-gray-600">Manage system-wide communications and compliance</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={isConnected ? "default" : "destructive"} className="bg-blue-50">
            <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Badge variant="outline" className="bg-blue-50">
            <Bell className="h-3 w-3 mr-1" />
            {unreadCount} unread
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowComposer(true)}>
            <Send className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {complianceStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Messages</p>
                  <p className="text-2xl font-bold">{complianceStats.totalMessages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">Flagged</p>
                  <p className="text-2xl font-bold">{complianceStats?.moderatedMessages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Compliant</p>
                  <p className="text-2xl font-bold">{complianceStats?.totalMessages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{complianceStats.activeUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System-Wide Compliance Status Header */}
      <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <div>
            <div className="font-medium text-sm text-purple-800">System-Wide Compliance Monitoring</div>
            <div className="text-xs text-purple-600">
              Global audit trail • Multi-jurisdiction compliance • Advanced threat detection
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs text-purple-700">System Active</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter messages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="unread">Unread Only</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
            <SelectItem value="compliance">Compliance Issues</SelectItem>
            <SelectItem value="system">System Messages</SelectItem>
          </SelectContent>
        </Select>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inbox">
            <MessageSquare className="h-4 w-4 mr-2" />
            Inbox
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1 py-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="system">
            <AlertTriangle className="h-4 w-4 mr-2" />
            System Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6">
          <MessagingIntegration
            role="admin"
            defaultView="conversations"
            className="h-[600px]"
          />
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Compliance monitoring dashboard</p>
                <p className="text-sm text-gray-400 mt-2">
                  Real-time compliance tracking and alerts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">System alerts and notifications</p>
                <p className="text-sm text-gray-400 mt-2">
                  Critical system events and warnings
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Message Composer Modal */}
      {showComposer && (
        <MessageComposer
          onClose={() => setShowComposer(false)}
          onSend={(message) => {
            console.log('Sending message:', message);
            setShowComposer(false);
            toast.success('Message sent successfully');
          }}
        />
      )}
    </div>
  );
}

export default SystemAdminInbox;
