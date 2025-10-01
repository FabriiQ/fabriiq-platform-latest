/**
 * MessageComposer Component
 * Template support, recipient suggestions, and privacy notices
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  SendHorizontal as Send,
  Users,
  FileText,
  X,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  ShieldCheck as Shield,
  Loader2
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
import { UserRecipientSelector } from './UserRecipientSelector';
import { MessageUserMentionInput } from './MessageUserMentionInput';
import { PrivacyNoticePanel } from '@/features/messaging/components/PrivacyNoticePanel';
import { useMessagingSocket } from '../hooks/useMessagingSocket';

interface UserRecipient {
  id: string;
  name: string;
  email?: string;
  userType: string;
  avatar?: string;
}

interface MessageComposerProps {
  role?: 'student' | 'teacher' | 'admin';
  availableClasses?: Array<{
    id: string;
    name: string;
  }>;
  replyTo?: {
    messageId: string;
    author: string;
    content: string;
  };
  onSent?: () => void;
  onClose?: () => void;
  onSend?: (message: any) => void;
  campusId?: string;
  inline?: boolean; // Add inline prop for embedded usage
}

export function MessageComposer({
  role = 'admin',
  availableClasses = [],
  replyTo,
  onSent,
  onClose,
  onSend,
  campusId
}: MessageComposerProps) {
  const { data: session } = useSession();

  // Auto-determine campusId from session if not provided
  const effectiveCampusId = campusId || session?.user?.primaryCampusId;
  const [recipients, setRecipients] = useState<UserRecipient[]>([]);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [messageType, setMessageType] = useState<'PRIVATE' | 'GROUP' | 'BROADCAST'>('PRIVATE');

  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);

  // Real-time messaging socket
  const messagingSocket = useMessagingSocket({
    classId: selectedClass,
    onNewMessage: (message) => {
      console.log('New message received while composing:', message);
    },
  });

  // Templates removed for simplicity

  // Send message mutation
  const sendMessage = api.messaging.createMessage.useMutation({
    onSuccess: (data) => {
      // Reset form
      setRecipients([]);
      setSubject('');
      setContent('');
      setSelectedClass('');

      setMentionedUsers([]);

      // Provide user feedback
      console.log('Message sent successfully:', data);

      onSent?.();
    },
    onError: (error) => {
      console.error('Failed to send message:', error);
      // Could add toast notification here for better UX
    }
  });



  // Handle typing indicators
  const handleContentChange = (value: string) => {
    setContent(value);

    // Send typing indicator
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      messagingSocket.sendTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      messagingSocket.sendTyping(false);
    }
  };

  // Stop typing indicator after 3 seconds of inactivity
  React.useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        setIsTyping(false);
        messagingSocket.sendTyping(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [content, isTyping, messagingSocket]);

  // Handle send
  const handleSend = async () => {
    // Validation similar to social post creator
    if (!content.trim()) {
      console.warn('Message content is required');
      return;
    }

    if (recipients.length === 0) {
      console.warn('At least one recipient is required');
      return;
    }

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false);
      messagingSocket.sendTyping(false);
    }

    try {
      const messageData = {
        content: content.trim(),
        subject: subject.trim() || undefined,
        recipients: recipients.map(r => r.id), // Extract IDs for API
        messageType,
        classId: selectedClass || undefined,
        taggedUserIds: mentionedUsers, // Include mentioned users
        // Add metadata for compliance tracking
        metadata: {
          recipientCount: recipients.length,
          messageLength: content.trim().length,
          mentionedUsersCount: mentionedUsers.length
        }
      };

      if (onSend) {
        // Use callback if provided (for modal/dialog usage)
        onSend(messageData);
      } else {
        // Try socket first for real-time delivery
        const socketSent = messagingSocket.sendMessage(messageData);

        if (!socketSent) {
          // Fallback to API mutation if socket fails
          await sendMessage.mutateAsync(messageData);
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Could add user-facing error notification here
    }
  };

  // Auto-show privacy notice for sensitive content
  useEffect(() => {
    const sensitiveKeywords = ['grade', 'score', 'performance', 'behavior', 'discipline'];
    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    setShowPrivacyNotice(hasSensitiveContent);
  }, [content]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Message
            </div>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
            {replyTo && (
              <Badge variant="outline">
                Reply to {replyTo.author}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Compliance Status */}
          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-700">
            <Shield className="w-4 h-4" />
            <span>
              Message will be encrypted and audited for compliance
              {recipients.some(r => r.userType === 'CAMPUS_STUDENT') && " • FERPA protection applied"}
            </span>
          </div>



          {/* Recipients */}
          <div>
            <label className="text-sm font-medium mb-2 block">Recipients</label>
            <div className="space-y-2">
              {availableClasses.length > 0 && (
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class for context..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <UserRecipientSelector
                selectedRecipients={recipients}
                onRecipientsChange={setRecipients}
                campusId={effectiveCampusId || undefined}
                classId={selectedClass || undefined}
                placeholder="Search and select recipients..."
                disabled={sendMessage.isLoading}
                className="min-h-[100px]"
              />
            </div>
          </div>

          {/* Message Type */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message Type</label>
            <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private Message</SelectItem>
                <SelectItem value="GROUP">Group Message</SelectItem>
                {role === 'teacher' && (
                  <SelectItem value="BROADCAST">Class Announcement</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject..."
            />
          </div>

          {/* Content */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
            />
            {/* Typing indicator */}
            {isTyping && (
              <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <div className="w-1 h-1 bg-blue-600 rounded-full animate-pulse" />
                <span>Sending typing indicator...</span>
              </div>
            )}
          </div>

          {/* User Mentions */}
          <div>
            <label className="text-sm font-medium mb-2 block">Mention Users</label>
            <MessageUserMentionInput
              classId={selectedClass || undefined}
              campusId={campusId}
              selectedUsers={mentionedUsers}
              onUsersChange={setMentionedUsers}
              placeholder="@ mention users in this message..."
            />
          </div>

          {/* Privacy Notice */}
          {showPrivacyNotice && (
            <div className="border border-amber-200 bg-amber-50 p-3 rounded-md">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">Privacy Notice</p>
                  <p className="text-amber-700">
                    This message contains educational information and will be encrypted and audited for compliance.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Message will be encrypted and compliant</span>
              </div>

              {/* Real-time Connection Status */}
              <div className="flex items-center gap-2 text-xs">
                {messagingSocket.isConnected ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700">Real-time enabled</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-gray-500">Offline mode</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => {
                setContent('');
                setSubject('');
                setRecipients([]);
                setIsTyping(false);
                messagingSocket.sendTyping(false);
              }}>
                Clear
              </Button>
              <Button
                onClick={handleSend}
                disabled={!content.trim() || recipients.length === 0 || sendMessage.isLoading}
              >
                {sendMessage.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice Panel */}
      <PrivacyNoticePanel
        complianceProfile={{
          contentCategory: 'GENERAL',
          riskLevel: 'LOW',
          isEducationalRecord: false,
          encryptionLevel: 'STANDARD',
          auditRequired: false,
          legalBasis: 'CONSENT',
          dataCategories: ['communication'],
          crossBorderTransfer: false,
          consentRequired: false,
          parentalConsentRequired: false,
        }}
        recipientTypes={['STUDENT', 'TEACHER']}
        messageType={messageType === 'PRIVATE' ? 'DIRECT' : messageType}
      />
      </div>
    </div>
  );
}
