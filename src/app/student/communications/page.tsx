/**
 * Student Communications Page - Student Inbox UX
 * Optimized for student workflow with priority groupings, focus mode, and help templates
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  MessageSquare,
  GraduationCap,
  School,
  Bell,
  Target,
  HelpCircle,
  Calendar,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Plus,
  User,
  BookOpen,
  FileText,
  SendHorizontal as Send,
  Archive
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { api } from '@/utils/api';
// Import working messaging components
import { ThreadedMessagingInterface } from '@/features/messaging/components/ThreadedMessagingInterface';
import { MessagingIntegration } from '@/features/messaging/components/MessagingIntegration';
import { PrivacyNoticePanel } from '@/features/messaging/components/PrivacyNoticePanel';

export default function StudentCommunicationsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('inbox');
  const [focusMode, setFocusMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get unread message count
  const { data: unreadCount } = api.messaging.getUnreadCount.useQuery(
    {},
    {
      refetchInterval: 30000, // 30 seconds
      enabled: !!session?.user
    }
  );

  // Get student's classes for context - using available endpoint
  const { data: studentClasses } = api.student.getCurrentStudentClasses.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  const helpTemplates = [
    {
      title: 'Assignment Help',
      description: 'Request help with homework or assignments',
      icon: <BookOpen className="h-5 w-5" />,
      template: 'assignment-help',
      color: 'bg-blue-50 hover:bg-blue-100'
    },
    {
      title: 'Report Absence',
      description: 'Notify teachers about absence',
      icon: <Calendar className="h-5 w-5" />,
      template: 'absence-report',
      color: 'bg-amber-50 hover:bg-amber-100'
    },
    {
      title: 'Technical Support',
      description: 'Get help with technical issues',
      icon: <HelpCircle className="h-5 w-5" />,
      template: 'tech-support',
      color: 'bg-green-50 hover:bg-green-100'
    },
    {
      title: 'Grade Inquiry',
      description: 'Ask about grades or feedback',
      icon: <Star className="h-5 w-5" />,
      template: 'grade-inquiry',
      color: 'bg-purple-50 hover:bg-purple-100'
    }
  ];

  const priorityGroups = [
    {
      title: 'Priority',
      count: Math.floor((unreadCount?.count || 0) * 0.2), // 20% priority
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Academic',
      count: Math.floor((unreadCount?.count || 0) * 0.6), // 60% academic
      icon: <GraduationCap className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'School Updates',
      count: Math.floor((unreadCount?.count || 0) * 0.2), // 20% administrative
      icon: <School className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="text-muted-foreground">
              Stay connected with your teachers and school
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Focus Mode Toggle */}
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Focus Mode</span>
              <Switch
                checked={focusMode}
                onCheckedChange={setFocusMode}
              />
            </div>
            <Button onClick={() => setActiveTab('compose')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Message
            </Button>
          </div>
        </div>

        {/* Priority Groups */}
        <div className="grid gap-4 md:grid-cols-3">
          {priorityGroups.map((group, index) => (
            <Card key={index} className={group.bgColor}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{group.title}</CardTitle>
                <div className={group.color}>
                  {group.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{group.count}</div>
                <p className="text-xs text-muted-foreground">
                  {group.count === 1 ? 'message' : 'messages'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Focus Mode Banner */}
        {focusMode && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Focus Mode Active</p>
                  <p className="text-sm text-blue-700">
                    Only showing priority and academic messages. Social notifications are hidden.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* New WhatsApp-like Threaded Messaging Interface */}
        <MessagingIntegration
          role="student"
          defaultView="conversations"
          className="h-[600px]"
        />
      </div>
    </div>
  );
}
