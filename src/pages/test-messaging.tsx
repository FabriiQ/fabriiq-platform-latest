/**
 * Test page for the new messaging system
 * Tests predictive search, group messaging, and threaded read functionality
 */

import React from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';
import { ThreadedMessagingInterface } from '@/features/messaging/components/ThreadedMessagingInterface';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, MessageSquare, Search, CheckCircle } from 'lucide-react';

interface TestMessagingPageProps {
  user: {
    id: string;
    name: string;
    userType: string;
    primaryCampusId?: string;
  };
}

export default function TestMessagingPage({ user }: TestMessagingPageProps) {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Messaging System Test</h1>
        <p className="text-muted-foreground">
          Testing the new predictive search, group messaging, and threaded read features
        </p>
        <Badge variant="outline" className="text-sm">
          Logged in as: {user.name} ({user.userType})
        </Badge>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="w-5 h-5" />
              Predictive Search
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-1">
              <li>• Type 2+ characters to search</li>
              <li>• Search by name or ID</li>
              <li>• No more tabs - unified search</li>
              <li>• Quick recipient chips</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Group Messaging
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-1">
              <li>• Select multiple recipients</li>
              <li>• Optional group names</li>
              <li>• Enhanced metadata</li>
              <li>• User mentions support</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5" />
              Threaded Read
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-1">
              <li>• markThreadAsRead endpoint</li>
              <li>• Batch read operations</li>
              <li>• Efficient DB queries</li>
              <li>• Real-time updates</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Threaded Messaging Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Test Threaded Messaging Interface
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px]">
            <ThreadedMessagingInterface
              className="h-full"
              role={user.userType.toLowerCase() as any}
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Test Predictive Search</h4>
            <p className="text-sm text-muted-foreground">
              In the recipient search box above, type at least 2 characters to see suggestions appear.
              Try searching for user names or IDs. Click on suggestions to add them as recipients.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. Test Group Messaging</h4>
            <p className="text-sm text-muted-foreground">
              Add multiple recipients, then check the "Send as group message" option.
              Enter a group name and send the message. Check the server logs for group metadata.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. Test Threaded Read</h4>
            <p className="text-sm text-muted-foreground">
              After sending messages, use the new markThreadAsRead API endpoint to mark entire
              threads as read in one operation instead of individual messages.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold mb-2 text-blue-900">API Endpoints Added</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <code>messaging.createGroupMessage</code> - Create group messages with metadata</li>
              <li>• <code>messaging.markThreadAsRead</code> - Mark all messages in thread as read</li>
              <li>• <code>messaging.searchRecipients</code> - Enhanced with parent filtering</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || 'Unknown User',
        userType: session.user.userType || 'STUDENT',
        primaryCampusId: session.user.primaryCampusId,
      },
    },
  };
};
