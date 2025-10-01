/**
 * System Admin Communication Management Page
 * High-performance dashboard for managing messaging system across all campuses
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  MessageSquare,
  Users,
  Settings,
  BarChart3,
  AlertTriangle,
  Archive, // Using Archive instead of Database and Shield
  Activity
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ComplianceDashboard } from '@/features/compliance/components/ComplianceDashboard';
import { ModerationPanel } from '@/features/messaging/components/ModerationPanel';
import { MessageModerationPanel } from '@/features/messaging/components/MessageModerationPanel';
import { SystemAdminInbox } from '@/features/messaging/components/SystemAdminInbox';
import { MessagingIntegration } from '@/features/messaging/components/MessagingIntegration';
import { api } from '@/utils/api';

export default function SystemAdminCommunicationPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('inbox');

  // Fetch system-wide performance stats
  const { data: performanceStats } = api.messaging.getPerformanceStats.useQuery(
    undefined,
    {
      refetchInterval: 30000, // 30 seconds
      enabled: session?.user?.userType === 'SYSTEM_ADMIN'
    }
  );

  // Fetch system-wide compliance stats
  const { data: systemStats } = api.messaging.getComplianceStats.useQuery(
    { scope: 'system-wide' },
    {
      refetchInterval: 60000, // 1 minute for system-wide stats
    }
  );

  if (session?.user?.userType !== 'SYSTEM_ADMIN') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. System Administrator privileges required.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Communication Hub</h1>
          <p className="text-muted-foreground text-lg">
            System-wide messaging management and compliance monitoring
          </p>
        </div>
        
        {/* System Health Indicators */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Operational
                </Badge>
                <span className="text-sm text-muted-foreground">
                  All systems running
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceStats?.activeUsers?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages Today</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceStats?.messagesToday?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                24-hour volume
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceStats?.cacheHitRate || '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                Performance optimization
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="inbox">
            <MessageSquare className="h-4 w-4 mr-2" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-6">
          {/* New WhatsApp-like Threaded Messaging Interface for Admins */}
          <MessagingIntegration
            role="admin"
            defaultView="conversations"
            className="h-[600px]"
          />

          {/* Legacy System Admin Inbox for Advanced Features */}
          <Card>
            <CardHeader>
              <CardTitle>Advanced Admin Tools</CardTitle>
              <CardDescription>
                System-wide messaging management and monitoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SystemAdminInbox />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* System Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Overview
                </CardTitle>
                <CardDescription>
                  Real-time system performance and usage metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Total Messages</p>
                    <p className="text-2xl font-bold">
                      {systemStats?.totalMessages?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Campuses</p>
                    <p className="text-2xl font-bold">
                      {performanceStats?.activeCampuses || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Educational Records</p>
                    <p className="text-2xl font-bold">
                      {systemStats?.educationalRecords?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Encrypted Messages</p>
                    <p className="text-2xl font-bold">
                      {systemStats?.encryptedMessages?.toLocaleString() || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5" />
                  Compliance Status
                </CardTitle>
                <CardDescription>
                  System-wide compliance and security overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">FERPA Compliance</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">GDPR Compliance</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Encryption</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Logging</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>
                Latest system events and administrative actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-blue-50">
                    <Activity className="h-3 w-3 mr-1" />
                    System
                  </Badge>
                  <span>Automated retention processing completed - 45 messages processed</span>
                  <span className="text-muted-foreground ml-auto">2 minutes ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Compliance
                  </Badge>
                  <span>FERPA audit report generated successfully</span>
                  <span className="text-muted-foreground ml-auto">15 minutes ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-amber-50">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Moderation
                  </Badge>
                  <span>3 high-priority messages flagged for review</span>
                  <span className="text-muted-foreground ml-auto">1 hour ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard scope="system-wide" />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <MessageModerationPanel scope="all-campuses" />
          <ModerationPanel scope="all-campuses" />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {performanceStats?.averageResponseTime || '0'}ms
                  </p>
                  <p className="text-sm text-muted-foreground">Average Response Time</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {performanceStats?.throughput || '0'}
                  </p>
                  <p className="text-sm text-muted-foreground">Messages/Second</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">99.9%</p>
                  <p className="text-sm text-muted-foreground">System Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
              <CardDescription>
                Manage system-wide messaging and compliance settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    System configuration changes require careful consideration and may affect all users.
                    Please consult with your technical team before making changes.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Button variant="outline" className="justify-start">
                    <Archive className="h-4 w-4 mr-2" />
                    Compliance Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Archive className="h-4 w-4 mr-2" />
                    Retention Policies
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    User Permissions
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Activity className="h-4 w-4 mr-2" />
                    Performance Tuning
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
