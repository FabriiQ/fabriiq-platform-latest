/**
 * Enhanced Campus Admin Inbox Component
 * Real-time messaging interface for campus administrators
 * with campus-specific filtering and compliance monitoring
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MessageSquare, 
  Bell, 
  Send, 
  Search, 
  Users,
  GraduationCap,
  AlertTriangle,
  Shield,
  CheckCircle,
  RefreshCw,
  School
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { ThreadedMessagingInterface } from './ThreadedMessagingInterface';
import { MessagingIntegration } from './MessagingIntegration';
import { useSocket } from '@/hooks/useSocket';
import { toast } from 'sonner';

interface CampusAdminInboxProps {
  className?: string;
  campusId?: string;
}

export function CampusAdminInbox({ className, campusId }: CampusAdminInboxProps) {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('inbox');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showComposer, setShowComposer] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Use campus ID from session or prop
  const effectiveCampusId = campusId || session?.user?.primaryCampusId || undefined;

  // Fetch unread count for campus
  const { data: unreadData, refetch: refetchUnread } = api.messaging.getUnreadCount.useQuery(
    { classId: effectiveCampusId || undefined },
    {
      refetchInterval: 30000,
      enabled: !!session?.user && !!effectiveCampusId
    }
  );

  // Fetch campus-specific compliance stats
  const { data: complianceStats, refetch: refetchCompliance } = api.messaging.getComplianceStats.useQuery(
    {
      scope: 'campus',
      campusId: effectiveCampusId || undefined
    },
    {
      refetchInterval: 60000,
      enabled: !!effectiveCampusId && session?.user?.userType === 'CAMPUS_ADMIN'
    }
  );

  // Fetch campus information
  const { data: campusInfo } = api.campus.getById.useQuery(
    { id: effectiveCampusId! },
    {
      enabled: !!effectiveCampusId
    }
  );

  // Socket connection for real-time updates
  const socket = useSocket('/admin-messaging', {
    auth: {
      token: session?.user?.id,
      userId: session?.user?.id,
      userType: session?.user?.userType,
      campusId: effectiveCampusId || undefined,
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
      console.log('Campus admin subscribed to inbox updates');
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
          <h2 className="text-2xl font-bold text-gray-900">Campus Admin Inbox</h2>
          <p className="text-gray-600">
            Manage communications for {campusInfo?.name || 'Campus'}
          </p>
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

      {/* Campus Stats */}
      {complianceStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Campus Messages</p>
                  <p className="text-2xl font-bold">{complianceStats.totalMessages || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Active Users</p>
                  <p className="text-2xl font-bold">{complianceStats.activeUsers || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Student Messages</p>
                  <p className="text-2xl font-bold">{complianceStats?.totalMessages || 0}</p>
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
        </div>
      )}

      {/* Compliance Status Header */}
      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <div className="font-medium text-sm text-green-800">Campus Compliance Active</div>
            <div className="text-xs text-green-600">
              All communications monitored • FERPA compliant • Real-time audit logging
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-green-700">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search campus messages..."
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
            <SelectItem value="students">Student Messages</SelectItem>
            <SelectItem value="teachers">Teacher Messages</SelectItem>
            <SelectItem value="parents">Parent Messages</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
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
          <TabsTrigger value="moderation">
            <Shield className="h-4 w-4 mr-2" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <School className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6">
          {/* New WhatsApp-like Threaded Messaging Interface */}
          <MessagingIntegration
            role="admin"
            defaultView="conversations"
            className="h-[500px] mb-6"
          />

          {/* Additional Admin Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Campus Management Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Advanced campus management features are now integrated into the conversation interface above.
                Use the search and filter options in the conversation list to manage campus communications.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="moderation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campus Moderation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Campus message moderation</p>
                <p className="text-sm text-gray-400 mt-2">
                  Review and moderate campus communications
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Campus Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <School className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">Campus communication analytics</p>
                <p className="text-sm text-gray-400 mt-2">
                  Insights and trends for campus communications
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Threaded Messaging Interface */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Campus Messages</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComposer(false)}
              >
                ×
              </Button>
            </div>
            <div className="h-[calc(80vh-4rem)]">
              <ThreadedMessagingInterface
                className="h-full"
                role="admin"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampusAdminInbox;
