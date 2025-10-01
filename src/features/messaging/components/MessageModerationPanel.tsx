/**
 * Message Moderation Panel
 * Advanced moderation interface for messaging system with risk-aware workflows
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  MessageSquare, 
  Clock,
  Search,
  Filter,
  Archive,
  User,
  Calendar
} from 'lucide-react';
import { api } from '@/utils/api';
import { formatDistanceToNow } from 'date-fns';

interface FlaggedMessage {
  id: string;
  messageId: string;
  reason: string;
  flaggedKeywords: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'APPROVED' | 'BLOCKED' | 'ESCALATED';
  createdAt: Date;
  message: {
    id: string;
    content: string;
    createdAt: Date;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    contentCategory: string;
    isEducationalRecord: boolean;
    flaggedKeywords: string[];
    author: {
      id: string;
      name: string;
      userType: string;
    };
    class: {
      id: string;
      name: string;
    };
  };
}

interface MessageModerationPanelProps {
  scope: 'all-campuses' | 'campus' | 'class';
  campusId?: string;
  classId?: string;
}

export function MessageModerationPanel({ scope, campusId, classId }: MessageModerationPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<FlaggedMessage | null>(null);
  const [moderationAction, setModerationAction] = useState<'APPROVE' | 'BLOCK' | 'ESCALATE'>('APPROVE');
  const [moderationReason, setModerationReason] = useState('');
  const [moderationNotes, setModerationNotes] = useState('');

  // Fetch flagged messages
  const { data: flaggedMessages, refetch } = api.messaging.getFlaggedMessages.useQuery({
    scope,
    campusId,
    classId,
    status: statusFilter === 'all' ? undefined : (statusFilter as any),
    priority: priorityFilter === 'all' ? undefined : (priorityFilter as any),
    // search: searchTerm || undefined, // Temporarily removed until API supports it
    limit: 50
  });

  // Moderate message mutation
  const moderateMessageMutation = api.messaging.moderateMessage.useMutation({
    onSuccess: () => {
      refetch();
      setSelectedMessage(null);
      setModerationReason('');
      setModerationNotes('');
    }
  });

  const handleModerateMessage = useCallback(async () => {
    if (!selectedMessage) return;

    await moderateMessageMutation.mutateAsync({
      messageId: selectedMessage.messageId,
      action: moderationAction,
      reason: moderationReason,
      notes: moderationNotes
    });
  }, [selectedMessage, moderationAction, moderationReason, moderationNotes, moderateMessageMutation]);

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Message Moderation</h2>
          <p className="text-muted-foreground">
            Review and moderate flagged messages across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-50">
            {flaggedMessages?.messages?.length || 0} Pending
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages, keywords, or authors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="BLOCKED">Blocked</SelectItem>
                <SelectItem value="ESCALATED">Escalated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
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
          </div>
        </CardContent>
      </Card>

      {/* Messages List */}
      <div className="space-y-4">
        {flaggedMessages?.messages?.map((flaggedMessage) => (
          <MessageModerationCard
            key={flaggedMessage.id}
            flaggedMessage={flaggedMessage}
            onSelect={setSelectedMessage}
            getRiskBadgeColor={getRiskBadgeColor}
            getPriorityBadgeColor={getPriorityBadgeColor}
          />
        ))}

        {(!flaggedMessages?.messages || flaggedMessages.messages.length === 0) && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Messages to Review</h3>
                <p className="text-muted-foreground">
                  All messages are currently approved or there are no flagged messages.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Moderation Dialog */}
      {selectedMessage && (
        <ModerationDialog
          message={selectedMessage}
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          moderationAction={moderationAction}
          setModerationAction={setModerationAction}
          moderationReason={moderationReason}
          setModerationReason={setModerationReason}
          moderationNotes={moderationNotes}
          setModerationNotes={setModerationNotes}
          onModerate={handleModerateMessage}
          isLoading={moderateMessageMutation.isLoading}
          getRiskBadgeColor={getRiskBadgeColor}
        />
      )}
    </div>
  );
}

// Message Moderation Card Component
interface MessageModerationCardProps {
  flaggedMessage: FlaggedMessage;
  onSelect: (message: FlaggedMessage) => void;
  getRiskBadgeColor: (riskLevel: string) => string;
  getPriorityBadgeColor: (priority: string) => string;
}

function MessageModerationCard({ 
  flaggedMessage, 
  onSelect, 
  getRiskBadgeColor, 
  getPriorityBadgeColor 
}: MessageModerationCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Badge className={getPriorityBadgeColor(flaggedMessage.priority)}>
                {flaggedMessage.priority}
              </Badge>
              <Badge className={getRiskBadgeColor(flaggedMessage.message.riskLevel)}>
                Risk: {flaggedMessage.message.riskLevel}
              </Badge>
              {flaggedMessage.message.isEducationalRecord && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  <Archive className="h-3 w-3 mr-1" />
                  FERPA
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatDistanceToNow(new Date(flaggedMessage.createdAt), { addSuffix: true })}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{flaggedMessage.message.author.name}</span>
              <span>•</span>
              <span>{flaggedMessage.message.class.name}</span>
            </div>
            <p className="text-sm bg-gray-50 p-3 rounded-md">
              {flaggedMessage.message.content}
            </p>
          </div>

          {/* Flagged Keywords */}
          {flaggedMessage.flaggedKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Flagged Keywords:</p>
              <div className="flex flex-wrap gap-1">
                {flaggedMessage.flaggedKeywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <p className="text-sm font-medium">Flagged Reason:</p>
            <p className="text-sm text-muted-foreground">{flaggedMessage.reason}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelect(flaggedMessage)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Review
              </Button>
            </div>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
              {flaggedMessage.status}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Moderation Dialog Component (will be continued in next file due to length limit)
interface ModerationDialogProps {
  message: FlaggedMessage;
  isOpen: boolean;
  onClose: () => void;
  moderationAction: 'APPROVE' | 'BLOCK' | 'ESCALATE';
  setModerationAction: (action: 'APPROVE' | 'BLOCK' | 'ESCALATE') => void;
  moderationReason: string;
  setModerationReason: (reason: string) => void;
  moderationNotes: string;
  setModerationNotes: (notes: string) => void;
  onModerate: () => void;
  isLoading: boolean;
  getRiskBadgeColor: (riskLevel: string) => string;
}

function ModerationDialog({
  message,
  isOpen,
  onClose,
  moderationAction,
  setModerationAction,
  moderationReason,
  setModerationReason,
  moderationNotes,
  setModerationNotes,
  onModerate,
  isLoading,
  getRiskBadgeColor
}: ModerationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Moderate Message</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Message Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={getRiskBadgeColor(message.message.riskLevel)}>
                Risk: {message.message.riskLevel}
              </Badge>
              {message.message.isEducationalRecord && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Archive className="h-3 w-3 mr-1" />
                  FERPA Protected
                </Badge>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm font-medium mb-2">Message Content:</p>
              <p>{message.message.content}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Author:</p>
                <p className="text-muted-foreground">{message.message.author.name}</p>
              </div>
              <div>
                <p className="font-medium">Class:</p>
                <p className="text-muted-foreground">{message.message.class.name}</p>
              </div>
            </div>
          </div>

          {/* Moderation Action */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Action</label>
              <Select value={moderationAction} onValueChange={(value: any) => setModerationAction(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVE">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Approve
                    </div>
                  </SelectItem>
                  <SelectItem value="BLOCK">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Block
                    </div>
                  </SelectItem>
                  <SelectItem value="ESCALATE">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Escalate
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Reason</label>
              <Input
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                placeholder="Enter moderation reason..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Textarea
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Critical Warning */}
          {message.message.riskLevel === 'CRITICAL' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This message has been flagged as CRITICAL risk. Your moderation action will be logged and campus administrators will be notified.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={onModerate} 
              disabled={!moderationReason.trim() || isLoading}
            >
              {isLoading ? 'Processing...' : `${moderationAction.toLowerCase().charAt(0).toUpperCase() + moderationAction.toLowerCase().slice(1)} Message`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
