/**
 * High-Performance Message Moderation Panel
 * Optimized for 10K+ concurrent users with real-time updates
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  MessageSquare,
  Archive, // Using Archive instead of Shield
  Eye,
  AlertCircle, // Using AlertCircle instead of Flag
  ArrowUp
} from 'lucide-react';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';

interface ModerationPanelProps {
  scope: 'all-campuses' | 'campus' | 'class';
  campusId?: string;
  classId?: string;
}

interface ModerationAction {
  messageId: string;
  action: 'APPROVE' | 'BLOCK' | 'ESCALATE' | 'RESTORE';
  reason?: string;
  notes?: string;
}

const PRIORITY_COLORS = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800'
};

const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-800',
  IN_REVIEW: 'bg-blue-100 text-blue-800',
  APPROVED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
  ESCALATED: 'bg-purple-100 text-purple-800',
  RESOLVED: 'bg-gray-100 text-gray-800'
};

export function ModerationPanel({ scope, campusId, classId }: ModerationPanelProps) {
  const { data: session } = useSession();
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING');
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [moderationAction, setModerationAction] = useState<ModerationAction | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  // Fetch flagged messages with real-time updates
  const { 
    data: flaggedMessages, 
    isLoading, 
    error,
    refetch 
  } = api.messaging.getFlaggedMessages.useQuery(
    {
      scope,
      campusId,
      classId,
      priority: selectedPriority === 'all' ? undefined : selectedPriority as any,
      status: selectedStatus as any,
      limit: 50
    },
    {
      refetchInterval: 10000, // 10 seconds for moderation queue
      staleTime: 5000, // Consider data stale after 5 seconds
    }
  );

  // Fetch moderation statistics
  const { data: moderationStats } = api.messaging.getModerationStats.useQuery(
    { scope, campusId, classId },
    {
      refetchInterval: 30000, // 30 seconds for stats
    }
  );

  // Moderate message mutation
  const moderateMessageMutation = api.messaging.moderateMessage.useMutation({
    onSuccess: () => {
      refetch();
      setModerationAction(null);
      setSelectedMessage(null);
      setActionNotes('');
    },
    onError: (error) => {
      console.error('Moderation error:', error);
    }
  });

  // Handle moderation action
  const handleModerationAction = async (action: ModerationAction['action']) => {
    if (!selectedMessage) return;

    setModerationAction({
      messageId: selectedMessage.id,
      action,
      reason: `${action.toLowerCase()} by moderator`,
      notes: actionNotes
    });
  };

  // Confirm moderation action
  const confirmModerationAction = async () => {
    if (!moderationAction) return;

    try {
      await moderateMessageMutation.mutateAsync(moderationAction);
    } catch (error) {
      console.error('Failed to moderate message:', error);
    }
  };

  // Memoized filtered messages for performance
  const filteredMessages = useMemo(() => {
    if (!flaggedMessages?.messages) return [];
    
    return flaggedMessages.messages.sort((a, b) => {
      // Sort by priority (CRITICAL first) then by creation date
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [flaggedMessages]);

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load moderation queue. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Message Moderation</h1>
          <p className="text-muted-foreground">
            Review and moderate flagged messages across {scope.replace('-', ' ')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="BLOCKED">Blocked</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moderationStats?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting moderation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {moderationStats?.highPriority || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {moderationStats?.approvedToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Messages approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {moderationStats?.blockedToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Messages blocked
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>
            Messages flagged for review - sorted by priority and date
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages in moderation queue</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedMessage(message)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={PRIORITY_COLORS[message.priority as keyof typeof PRIORITY_COLORS]}>
                          {message.priority}
                        </Badge>
                        <Badge className={STATUS_COLORS[message.status as keyof typeof STATUS_COLORS]}>
                          {message.status}
                        </Badge>
                        {message.flaggedKeywords?.length > 0 && (
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {message.flaggedKeywords.length} keywords
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <p className="font-medium line-clamp-2">
                          {message.message?.content || 'Content not available'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {message.message?.author?.name || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMessage(message);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {message.priority === 'CRITICAL' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessage(message);
                            handleModerationAction('ESCALATE');
                          }}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message Review</DialogTitle>
            <DialogDescription>
              Review message content and take appropriate moderation action
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={PRIORITY_COLORS[selectedMessage.priority as keyof typeof PRIORITY_COLORS]}>
                  {selectedMessage.priority} Priority
                </Badge>
                <Badge className={STATUS_COLORS[selectedMessage.status as keyof typeof STATUS_COLORS]}>
                  {selectedMessage.status}
                </Badge>
              </div>
              
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm font-medium mb-2">Message Content:</p>
                <p className="text-sm">{selectedMessage.message?.content}</p>
              </div>
              
              {selectedMessage.flaggedKeywords?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Flagged Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedMessage.flaggedKeywords.map((keyword: string, index: number) => (
                      <Badge key={index} variant="destructive" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Author:</p>
                  <p>{selectedMessage.message?.author?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Created:</p>
                  <p>{formatDistanceToNow(new Date(selectedMessage.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Moderation Notes:</p>
                <Textarea
                  placeholder="Add notes about your moderation decision..."
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleModerationAction('APPROVE')}
              className="text-green-600 border-green-200"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              variant="outline"
              onClick={() => handleModerationAction('BLOCK')}
              className="text-red-600 border-red-200"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Block
            </Button>
            <Button
              variant="outline"
              onClick={() => handleModerationAction('ESCALATE')}
              className="text-purple-600 border-purple-200"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              Escalate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={!!moderationAction} onOpenChange={() => setModerationAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Moderation Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {moderationAction?.action.toLowerCase()} this message?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setModerationAction(null)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmModerationAction}
              disabled={moderateMessageMutation.isLoading}
            >
              {moderateMessageMutation.isLoading ? 'Processing...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
