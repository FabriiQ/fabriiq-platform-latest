'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThreadedMessagingInterface } from '@/features/messaging/components/ThreadedMessagingInterface';
import { UserRecipientSelector } from '@/features/messaging/components/UserRecipientSelector';
import { MessagingIntegration } from '@/features/messaging/components/MessagingIntegration';
import { MessageSquare, Users, Send, ShieldCheck } from 'lucide-react';

interface UserRecipient {
  id: string;
  name: string;
  email?: string;
  userType: string;
}

export function MessageComposerTest() {
  const [showComposer, setShowComposer] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showRecipientSelector, setShowRecipientSelector] = useState(false);
  const [testRecipients, setTestRecipients] = useState<UserRecipient[]>([]);
  const [sentMessages, setSentMessages] = useState<any[]>([]);

  const handleMessageSent = (message: any) => {
    console.log('Test message sent:', message);
    setSentMessages(prev => [...prev, { ...message, id: Date.now(), timestamp: new Date() }]);
    setShowComposer(false);
    alert(`Message sent successfully to ${message.recipients?.length || 0} recipients!`);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <ShieldCheck className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold">Messaging System Test Suite</h1>
        <Badge variant="outline" className="text-green-700 border-green-300">
          Compliance Ready
        </Badge>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="w-5 h-5" />
              Message Composer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Test the enhanced message composer with recipient selection and compliance features.
            </p>
            <Button onClick={() => setShowComposer(true)} className="w-full">
              Open Composer
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Recipient Selector
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Test the standalone recipient selector component with compliance logging.
            </p>
            <Button onClick={() => setShowRecipientSelector(true)} className="w-full">
              Test Selector
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="w-5 h-5" />
              Inbox Manager
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Test the inbox with compliance status indicators and message categorization.
            </p>
            <Button onClick={() => setShowInbox(true)} className="w-full">
              Open Inbox
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      {sentMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sentMessages.map((message, index) => (
                <div key={message.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Message #{index + 1}</div>
                      <div className="text-sm text-muted-foreground">
                        Recipients: {message.recipients?.length || 0} •
                        Type: {message.messageType} •
                        Sent: {message.timestamp?.toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-green-700">
                      ✓ Sent
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Recipients Display */}
      {testRecipients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Recipients ({testRecipients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {testRecipients.map((recipient) => (
                <Badge key={recipient.id} variant="secondary" className="flex items-center gap-1">
                  {recipient.name} ({recipient.userType})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Threaded Messaging Modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Test Messaging Interface</h2>
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
              />
            </div>
          </div>
        </div>
      )}

      {/* Recipient Selector Modal */}
      {showRecipientSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Test Recipient Selector</h3>
            <UserRecipientSelector
              selectedRecipients={testRecipients}
              onRecipientsChange={setTestRecipients}
              campusId="test-campus"
              placeholder="Select test recipients..."
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowRecipientSelector(false)}>
                Close
              </Button>
              <Button onClick={() => {
                console.log('Selected recipients:', testRecipients);
                setShowRecipientSelector(false);
              }}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Modal */}
      {showInbox && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Inbox Manager</h3>
              <Button variant="outline" onClick={() => setShowInbox(false)}>
                Close
              </Button>
            </div>
            <MessagingIntegration
              role="admin"
              defaultView="conversations"
              className="h-[500px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
