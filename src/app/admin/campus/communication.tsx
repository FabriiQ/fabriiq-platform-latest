/**
 * Campus Admin Communication Management Page
 * High-performance dashboard for managing messaging within a specific campus
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  MessageSquare,
  Users,
  GraduationCap,
  BarChart3,
  AlertTriangle,
  Clock,
  TrendingUp,
  Archive
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ComplianceDashboard } from '@/features/compliance/components/ComplianceDashboard';
import { ModerationPanel } from '@/features/messaging/components/ModerationPanel';
import { MessageModerationPanel } from '@/features/messaging/components/MessageModerationPanel';
import { CampusAdminInbox } from '@/features/messaging/components/CampusAdminInbox';
import { api } from '@/utils/api';

export default function CampusAdminCommunicationPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedCampus, setSelectedCampus] = useState<string>('');

  // Get user's campus (assuming campus admin is associated with specific campus)
  const campusId = session?.user?.primaryCampusId || selectedCampus;

  // Fetch campus-specific compliance stats
  const { data: campusStats } = api.messaging.getComplianceStats.useQuery(
    { 
      scope: 'campus',
      campusId: campusId 
    },
    {
      refetchInterval: 60000, // 1 minute
      enabled: !!campusId
    }
  );

  // Fetch campus information
  const { data: campusInfo } = api.campus.getById.useQuery(
    { id: campusId },
    {
      enabled: !!campusId
    }
  );

  if (session?.user?.userType !== 'CAMPUS_ADMIN') {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. Campus Administrator privileges required.
        </AlertDescription>
      </Alert>
    );
  }

  if (!campusId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select a campus to manage communication settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Campus Communication Hub</h1>
            <p className="text-muted-foreground text-lg">
              {campusInfo?.name || 'Campus'} messaging management and compliance
            </p>
          </div>
          
          {/* Campus Selector (if user manages multiple campuses) */}
          {!session?.user?.primaryCampusId && (
            <Select value={selectedCampus} onValueChange={setSelectedCampus}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select Campus" />
              </SelectTrigger>
              <SelectContent>
                {/* This would be populated with user's accessible campuses */}
                <SelectItem value="campus1">Main Campus</SelectItem>
                <SelectItem value="campus2">North Campus</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Campus Overview Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campusStats?.totalMessages?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Campus-wide communications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campusInfo?._count?.programs || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Classes with messaging enabled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Educational Records</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campusStats?.educationalRecords?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                FERPA protected messages
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {campusStats ? Math.round(
                  ((campusStats.totalMessages - campusStats.riskLevelBreakdown.HIGH - campusStats.riskLevelBreakdown.CRITICAL) / 
                   campusStats.totalMessages) * 100
                ) : 100}%
              </div>
              <p className="text-xs text-muted-foreground">
                Campus compliance rating
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-6">
          <CampusAdminInbox campusId={campusId} />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Campus Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Campus Activity
                </CardTitle>
                <CardDescription>
                  Recent messaging activity across campus
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Messages Today</p>
                    <p className="text-2xl font-bold">
                      {campusStats?.messagesToday?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Users</p>
                    <p className="text-2xl font-bold">
                      {campusStats?.activeUsers || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Pending Moderation</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {campusStats?.moderatedMessages || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">High Priority</p>
                    <p className="text-2xl font-bold text-red-600">
                      {campusStats?.riskLevelBreakdown?.HIGH || '0'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compliance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Compliance Overview
                </CardTitle>
                <CardDescription>
                  Campus compliance status and metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">FERPA Compliance</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {campusStats?.educationalRecords || 0} Records
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Encrypted Messages</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <Archive className="h-3 w-3 mr-1" />
                      {campusStats?.encryptedMessages || 0} Messages
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Trail</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {campusStats?.auditedMessages || 0} Logged
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">FERPA Disclosures</span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <Clock className="h-3 w-3 mr-1" />
                      {campusStats?.ferpaDisclosures || 0} Logged
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campus Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campus Activity</CardTitle>
              <CardDescription>
                Latest messaging events and administrative actions for {campusInfo?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Approved
                  </Badge>
                  <span>Teacher message to Class 10A approved automatically</span>
                  <span className="text-muted-foreground ml-auto">5 minutes ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-amber-50">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                  <span>Student message flagged for review - inappropriate language</span>
                  <span className="text-muted-foreground ml-auto">12 minutes ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-blue-50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    FERPA
                  </Badge>
                  <span>Educational record disclosure logged for Student ID #12345</span>
                  <span className="text-muted-foreground ml-auto">25 minutes ago</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="outline" className="bg-purple-50">
                    <Users className="h-3 w-3 mr-1" />
                    Broadcast
                  </Badge>
                  <span>Campus-wide announcement sent to all classes</span>
                  <span className="text-muted-foreground ml-auto">1 hour ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard scope="campus" campusId={campusId} />
        </TabsContent>

        <TabsContent value="moderation" className="space-y-6">
          <MessageModerationPanel scope="campus" campusId={campusId} />
          <ModerationPanel scope="campus" campusId={campusId} />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Communication Management</CardTitle>
              <CardDescription>
                Manage messaging settings and compliance for individual classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Class-specific communication management will be available in the next update.
                    Currently, you can manage campus-wide settings through the Compliance and Moderation tabs.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <Button variant="outline" className="justify-start">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    View All Classes
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Messaging Settings
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Class Compliance
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
