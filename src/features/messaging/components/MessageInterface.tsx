/**
 * MessageInterface Component
 * Reusable component for displaying messages with compliance indicators and privacy controls
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageSquare,
  MoreHorizontal,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  ArrowLeft,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MessageInterfaceProps {
  message: {
    id: string;
    content: string;
    author: {
      id: string;
      name: string;
      image?: string;
      role: string;
    };
    recipients: Array<{
      id: string;
      name: string;
      readAt?: Date;
    }>;
    createdAt: Date;
    isRead: boolean;
    messageType: 'PUBLIC' | 'PRIVATE' | 'GROUP' | 'BROADCAST' | 'SYSTEM';
    contentCategory: 'GENERAL' | 'ACADEMIC' | 'ADMINISTRATIVE' | 'SUPPORT';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    isEducationalRecord: boolean;
    encryptionLevel: 'STANDARD' | 'ENHANCED' | 'EDUCATIONAL_RECORD';
    complianceProfile?: {
      ferpaProtected: boolean;
      gdprProtected: boolean;
      auditRequired: boolean;
    };
    // Threading support
    parentMessageId?: string;
    threadId?: string;
    replyCount?: number;
    replies?: Array<{
      id: string;
      content: string;
      author: {
        id: string;
        name: string;
        image?: string;
        role: string;
      };
      createdAt: Date;
      isRead: boolean;
    }>;
    // Original message context for replies
    originalMessage?: {
      id: string;
      content: string;
      author: {
        name: string;
      };
      createdAt: Date;
    };
  };
  onReply?: (messageId: string) => void;
  onForward?: (messageId: string) => void;
  onMarkAsRead?: (messageId: string) => void;
  className?: string;
  compact?: boolean;
}

export function MessageInterface({
  message,
  onReply,
  onForward,
  onMarkAsRead,
  className,
  compact = false
}: MessageInterfaceProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const isReply = !!message.parentMessageId;
  const hasReplies = message.replies && message.replies.length > 0;

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'PRIVATE':
        return 'bg-blue-100 text-blue-800';
      case 'GROUP':
        return 'bg-green-100 text-green-800';
      case 'BROADCAST':
        return 'bg-purple-100 text-purple-800';
      case 'SYSTEM':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH':
      case 'CRITICAL':
        return 'text-red-600';
      case 'MEDIUM':
        return 'text-amber-600';
      default:
        return 'text-green-600';
    }
  };

  const getEncryptionIcon = (level: string) => {
    switch (level) {
      case 'EDUCATIONAL_RECORD':
        return <AlertTriangle className="h-3 w-3" />;
      case 'ENHANCED':
        return <Eye className="h-3 w-3" />;
      default:
        return <Eye className="h-3 w-3" />;
    }
  };

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-lg hover:shadow-gray-100/50",
      !message.isRead && "bg-blue-50/30 border-blue-200/50",
      compact ? "p-3" : "p-4",
      className
    )}>
      {/* Unread indicator */}
      {!message.isRead && (
        <div className="absolute left-0 top-4 w-1 h-8 bg-blue-500 rounded-r-full" />
      )}

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className={cn(
          "ring-2 ring-white shadow-sm",
          compact ? "h-8 w-8" : "h-10 w-10"
        )}>
          <AvatarImage src={message.author.image} alt={message.author.name} />
          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
            {message.author.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <p className={cn(
                "font-semibold text-gray-900 truncate",
                compact ? "text-sm" : "text-base"
              )}>
                {message.author.name}
              </p>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 font-medium">
                {message.author.role}
              </Badge>
            </div>

            {/* Time and status */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(message.createdAt, { addSuffix: true })}</span>
            </div>
          </div>

          {/* Message type and compliance badges */}
          <div className="flex items-center gap-2 mb-3">
            <Badge className={cn(
              "text-xs px-2 py-1 font-medium",
              getMessageTypeColor(message.messageType)
            )}>
              {message.messageType}
            </Badge>
            {message.isEducationalRecord && (
              <Badge variant="outline" className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border-amber-200">
                FERPA Protected
              </Badge>
            )}
            {message.riskLevel !== 'LOW' && (
              <Badge variant="outline" className={cn(
                "text-xs px-2 py-1",
                getRiskLevelColor(message.riskLevel)
              )}>
                {message.riskLevel}
              </Badge>
            )}
          </div>

          {/* Original Message Context (for replies) */}
          {isReply && message.originalMessage && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeft className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Replying to</span>
                <span className="text-sm text-gray-600">{message.originalMessage.author.name}</span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(message.originalMessage.createdAt, { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-gray-700 italic line-clamp-2">
                "{message.originalMessage.content}"
              </p>
            </div>
          )}

          {/* Message Content */}
          <div className={cn(
            "text-gray-700 leading-relaxed",
            compact ? "text-sm" : "text-base"
          )}>
            <p className="line-clamp-3">{message.content}</p>
          </div>

          {/* Replies Section */}
          {hasReplies && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mb-3"
              >
                <MessageSquare className="h-4 w-4" />
                <span>{message.replyCount || message.replies?.length} {(message.replyCount || message.replies?.length || 0) === 1 ? 'reply' : 'replies'}</span>
                {showReplies ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showReplies && message.replies && (
                <div className="space-y-3">
                  {message.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={reply.author.image} alt={reply.author.name} />
                        <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white text-xs">
                          {reply.author.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{reply.author.name}</span>
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            {reply.author.role}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(reply.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer with actions and compliance */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            {/* Compliance indicators */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={getRiskLevelColor(message.riskLevel)} title={`Risk Level: ${message.riskLevel}`}>
                  {getEncryptionIcon(message.encryptionLevel)}
                </div>
                {message.complianceProfile?.auditRequired && (
                  <CheckCircle className="h-3 w-3 text-green-600" />
                )}
              </div>

              {/* Recipients count */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                <span>{message.recipients?.length || 0}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onReply(message.id)}
                >
                  Reply
                </Button>
              )}
              {onMarkAsRead && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onMarkAsRead(message.id)}
                >
                  {message.isRead ? 'Unread' : 'Read'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setShowDetails(!showDetails)}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Expandable details */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
              {/* Recipients (for group messages) */}
              {message.messageType === 'GROUP' && message.recipients && message.recipients.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="h-3 w-3" />
                  <span>To: {message.recipients.length} recipients</span>
                  {message.recipients.filter(r => r.readAt).length > 0 && (
                    <span>• {message.recipients.filter(r => r.readAt).length} read</span>
                  )}
                </div>
              )}

              {/* Compliance Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-gray-700">Content Category</p>
                  <p className="text-gray-500">{message.contentCategory}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Encryption Level</p>
                  <p className="text-gray-500">{message.encryptionLevel}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Risk Assessment</p>
                  <p className={getRiskLevelColor(message.riskLevel)}>{message.riskLevel}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Compliance Status</p>
                  <div className="flex items-center gap-1">
                    {message.complianceProfile?.ferpaProtected && (
                      <Badge variant="outline" className="text-xs">FERPA</Badge>
                    )}
                    {message.complianceProfile?.gdprProtected && (
                      <Badge variant="outline" className="text-xs">GDPR</Badge>
                    )}
                    {message.complianceProfile?.auditRequired && (
                      <Badge variant="outline" className="text-xs">Audit Required</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {onReply && (
                  <Button variant="outline" size="sm" onClick={() => onReply(message.id)}>
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
                {onForward && (
                  <Button variant="outline" size="sm" onClick={() => onForward(message.id)}>
                    Forward
                  </Button>
                )}
                {onMarkAsRead && (
                  <Button variant="outline" size="sm" onClick={() => onMarkAsRead(message.id)}>
                    {message.isRead ? 'Mark Unread' : 'Mark Read'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
