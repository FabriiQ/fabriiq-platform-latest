/**
 * Enhanced Message Composer
 * Integrates templates, contextual recipients, and privacy notices
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Send, 
  Users, 
  Template, 
  Shield, 
  Settings,
  X,
  Plus,
  Search,
  MessageSquare
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';

// Import Phase 4 components
import { useContextualRecipients, RecipientSuggestion } from '../hooks/useContextualRecipients';
import { MessageTemplates, MessageTemplate } from './MessageTemplates';
import { PrivacyNoticePanel, ComplianceProfile } from './PrivacyNoticePanel';
import { NotificationPreferencesPanel } from './NotificationPreferencesPanel';

interface EnhancedMessageComposerProps {
  classId?: string;
  activityId?: string;
  threadId?: string;
  parentMessageId?: string;
  onSend?: (message: any) => void;
  onCancel?: () => void;
}

export function EnhancedMessageComposer({
  classId,
  activityId,
  threadId,
  parentMessageId,
  onSend,
  onCancel
}: EnhancedMessageComposerProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('');
  const [messageType, setMessageType] = useState<'DIRECT' | 'GROUP' | 'BROADCAST' | 'ANNOUNCEMENT'>('DIRECT');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPrivacyPanel, setShowPrivacyPanel] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Use contextual recipients hook
  const {
    suggestions,
    selectedRecipients,
    searchTerm,
    setSearchTerm,
    addRecipient,
    removeRecipient,
    clearRecipients,
    getRecipientsForRole
  } = useContextualRecipients({
    classId,
    activityId,
    messageType,
    maxSuggestions: 20
  });

  // Send message mutation
  const utils = api.useUtils();
  const sendMessageMutation = api.messaging.createMessage.useMutation({
    onSuccess: async (data) => {
      setContent('');
      setSubject('');
      clearRecipients();

      // Invalidate and refetch conversations
      await utils.messaging.getConversations.invalidate();
      if (conversationId) {
        await utils.messaging.getThreadedMessages.invalidate({ conversationId });
      }

      onSend?.(data);
      toast.success('Message sent successfully!');
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  // Generate compliance profile based on content and recipients
  const complianceProfile: ComplianceProfile = useMemo(() => {
    const recipientTypes = selectedRecipients.map(r => r.userType);
    const hasEducationalContent = /grade|assignment|test|exam|homework|progress|report/i.test(content);
    const hasSensitiveContent = /medical|disability|special needs|confidential|private/i.test(content);
    
    return {
      contentCategory: hasEducationalContent ? 'EDUCATIONAL' : 
                      hasSensitiveContent ? 'SENSITIVE' : 'GENERAL',
      riskLevel: hasSensitiveContent ? 'CRITICAL' :
                hasEducationalContent ? 'HIGH' :
                recipientTypes.includes('PARENT') ? 'MEDIUM' : 'LOW',
      isEducationalRecord: hasEducationalContent && recipientTypes.some(t => ['PARENT', 'STUDENT'].includes(t)),
      encryptionLevel: hasSensitiveContent ? 'MAXIMUM' :
                      hasEducationalContent ? 'ENHANCED' : 'STANDARD',
      auditRequired: hasEducationalContent || hasSensitiveContent || recipientTypes.includes('PARENT'),
      legalBasis: hasEducationalContent ? 'LEGITIMATE_INTEREST' : 'CONSENT',
      dataCategories: hasEducationalContent ? ['educational', 'personal'] : ['general'],
      retentionPeriod: hasEducationalContent ? '7 years' : '2 years',
      crossBorderTransfer: false,
      consentRequired: hasSensitiveContent,
      parentalConsentRequired: hasSensitiveContent && recipientTypes.includes('STUDENT')
    };
  }, [content, selectedRecipients]);

  const handleTemplateSelect = (template: MessageTemplate) => {
    setContent(template.content);
    setShowTemplates(false);
    
    // Auto-populate subject if it's an announcement or administrative message
    if (template.category === 'administrative' || messageType === 'ANNOUNCEMENT') {
      setSubject(template.title);
    }
  };

  const handleSendMessage = async () => {
    if (!content.trim() || selectedRecipients.length === 0) return;

    try {
      await sendMessageMutation.mutateAsync({
        content: content.trim(),
        subject: subject.trim() || undefined,
        recipients: selectedRecipients.map(r => r.id),
        classId,
        threadId,
        parentMessageId,
        messageType,
        metadata: {
          complianceProfile,
          templateUsed: false // Track if template was used
        }
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleRecipientSelect = (recipient: RecipientSuggestion) => {
    addRecipient(recipient);
    setRecipientSearch('');
  };

  const filteredSuggestions = useMemo(() => {
    if (!recipientSearch) return suggestions.slice(0, 5);
    
    return suggestions.filter(s =>
      s.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(recipientSearch.toLowerCase())
    ).slice(0, 10);
  }, [suggestions, recipientSearch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compose Message</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(true)}
          >
            <Template className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrivacyPanel(!showPrivacyPanel)}
          >
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreferences(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Preferences
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Message Type and Subject */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Message Type</label>
              <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">Direct Message</SelectItem>
                  <SelectItem value="GROUP">Group Message</SelectItem>
                  <SelectItem value="BROADCAST">Broadcast</SelectItem>
                  <SelectItem value="ANNOUNCEMENT">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(messageType === 'BROADCAST' || messageType === 'ANNOUNCEMENT') && (
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                />
              </div>
            )}
          </div>

          {/* Recipients */}
          <div>
            <label className="text-sm font-medium mb-2 block">Recipients</label>
            
            {/* Selected Recipients */}
            {selectedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedRecipients.map((recipient) => (
                  <Badge
                    key={recipient.id}
                    variant="outline"
                    className="flex items-center gap-1 pr-1"
                  >
                    <span>{recipient.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => removeRecipient(recipient.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Recipient Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Search for recipients..."
                className="pl-10"
              />
            </div>

            {/* Recipient Suggestions */}
            {recipientSearch && filteredSuggestions.length > 0 && (
              <div className="mt-2 border rounded-md bg-white shadow-sm max-h-48 overflow-y-auto">
                {filteredSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleRecipientSelect(suggestion)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{suggestion.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {suggestion.userType} • {suggestion.context.relationship}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {suggestion.context.relevanceScore}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Recipient Groups */}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  getRecipientsForRole('TEACHER').forEach(addRecipient);
                }}
              >
                <Users className="h-4 w-4 mr-1" />
                All Teachers
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  getRecipientsForRole('STUDENT').forEach(addRecipient);
                }}
              >
                <Users className="h-4 w-4 mr-1" />
                All Students
              </Button>
              {classId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    getRecipientsForClass(classId).forEach(addRecipient);
                  }}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Class Members
                </Button>
              )}
            </div>
          </div>

          {/* Message Content */}
          <div>
            <label className="text-sm font-medium mb-2 block">Message</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {content.length} characters
            </div>
          </div>

          {/* Privacy Notice */}
          {showPrivacyPanel && (
            <PrivacyNoticePanel
              complianceProfile={complianceProfile}
              recipientTypes={selectedRecipients.map(r => r.userType)}
              messageType={messageType}
            />
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSendMessage}
              disabled={!content.trim() || selectedRecipients.length === 0 || sendMessageMutation.isLoading}
            >
              {sendMessageMutation.isLoading ? (
                'Sending...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Templates</DialogTitle>
          </DialogHeader>
          <MessageTemplates
            onSelectTemplate={handleTemplateSelect}
            classId={classId}
            activityId={activityId}
            currentContent={content}
          />
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <NotificationPreferencesPanel onClose={() => setShowPreferences(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
