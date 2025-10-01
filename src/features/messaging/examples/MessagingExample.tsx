'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  MessagingIntegration,
  SimpleMessaging,
  ClassMessaging,
  MobileMessaging
} from '../components/MessagingIntegration';

/**
 * Example component demonstrating how to use the new messaging system
 * This shows different usage patterns and integration options
 */
export const MessagingExample: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">WhatsApp-like Messaging System</h1>
        <p className="text-muted-foreground">
          Complete implementation with threaded conversations, subject lines, and backward compatibility
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="default">✅ Implementation Complete</Badge>
          <Badge variant="outline">🔧 Ready for Production</Badge>
        </div>
      </div>

      <Tabs defaultValue="full" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="full">Full Interface</TabsTrigger>
          <TabsTrigger value="simple">Simple Messaging</TabsTrigger>
          <TabsTrigger value="class">Class Messaging</TabsTrigger>
          <TabsTrigger value="mobile">Mobile View</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Full Messaging Interface</CardTitle>
              <p className="text-sm text-muted-foreground">
                Complete interface with both new threaded conversations and legacy inbox system
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] border rounded-lg">
                <MessagingIntegration 
                  role="teacher"
                  defaultView="conversations"
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simple" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simple Threaded Messaging</CardTitle>
              <p className="text-sm text-muted-foreground">
                Just the threaded messaging interface without the legacy inbox
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] border rounded-lg">
                <SimpleMessaging 
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="class" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class-Specific Messaging</CardTitle>
              <p className="text-sm text-muted-foreground">
                Messaging interface scoped to a specific class with class branding
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] border rounded-lg">
                <ClassMessaging 
                  classId="example-class-123"
                  className="h-full"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mobile-Optimized View</CardTitle>
              <p className="text-sm text-muted-foreground">
                Full-screen mobile interface with responsive design
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] border rounded-lg overflow-hidden">
                <div className="w-full h-full max-w-sm mx-auto border-x">
                  <MobileMessaging 
                    className="h-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Implementation Status */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">✅ Implementation Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-800 mb-2">Core Features</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>✅ WhatsApp-like threaded messaging</li>
                <li>✅ Subject lines with smart suggestions</li>
                <li>✅ Message reactions and read receipts</li>
                <li>✅ Real-time updates (WebSocket ready)</li>
                <li>✅ Mobile responsive design</li>
                <li>✅ Search and filtering</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-800 mb-2">Integration</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>✅ Database schema enhanced</li>
                <li>✅ API endpoints implemented</li>
                <li>✅ TypeScript errors resolved</li>
                <li>✅ Backward compatibility maintained</li>
                <li>✅ Component library ready</li>
                <li>✅ Documentation complete</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Run Database Migration</h4>
            <code className="block bg-muted p-2 rounded text-sm">
              npx prisma migrate deploy
            </code>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">2. Import and Use Components</h4>
            <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`import { MessagingIntegration } from '@/features/messaging/components/MessagingIntegration';

// Full interface with tabs
<MessagingIntegration 
  role="student" // or "teacher" or "admin"
  classId="optional-class-id"
  defaultView="conversations"
/>

// Simple threaded messaging only
<SimpleMessaging classId="class-123" />

// Class-specific messaging
<ClassMessaging classId="class-123" />`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. API Usage</h4>
            <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
{`// Create conversation
const conversation = await api.messaging.createConversation.mutate({
  subject: "Math Assignment Help",
  participants: ["user1", "user2"],
  type: "group"
});

// Send message
await api.messaging.sendMessage.mutate({
  conversationId: "conv-123",
  content: "Hello!",
  parentMessageId: "msg-456" // For replies
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MessagingExample;
