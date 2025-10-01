/**
 * High-Performance Compliance Dashboard
 * Optimized for 10K+ concurrent users with real-time updates and caching
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { DatePickerWithRange } from '@/components/ui/date-range-picker'; // Not available
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  Archive, // Using Archive instead of Lock
  TrendingUp,
  Activity,
  Archive as DatabaseIcon // Using Archive instead of Database
} from 'lucide-react';
import { api } from '@/utils/api';
import { useSession } from 'next-auth/react';
import { DateRange } from 'react-day-picker';
import FERPARecent from './FERPARecent';

interface ComplianceDashboardProps {
  scope: 'system-wide' | 'campus' | 'class';
  campusId?: string;
  classId?: string;
}

const COLORS = {
  low: '#10b981',      // green
  medium: '#f59e0b',   // amber
  high: '#ef4444',     // red
  critical: '#dc2626'  // dark red
};

const RISK_COLORS = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#ef4444',
  CRITICAL: '#dc2626'
};

export function ComplianceDashboard({ scope, campusId, classId }: ComplianceDashboardProps) {
  const { data: session } = useSession();
  // const [dateRange, setDateRange] = useState<DateRange | undefined>(); // Not used
  const [refreshInterval, setRefreshInterval] = useState<number>(30000); // 30 seconds

  // Fetch compliance statistics with caching and real-time updates
  const { 
    data: complianceStats, 
    isLoading, 
    error,
    refetch 
  } = api.messaging.getComplianceStats.useQuery(
    {
      scope,
      campusId,
      classId,
    },
    {
      refetchInterval: refreshInterval,
      staleTime: 30000, // Consider data stale after 30 seconds
      cacheTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Fetch retention statistics
  const { data: retentionStats } = api.messaging.getRetentionStats.useQuery(
    undefined,
    {
      refetchInterval: refreshInterval * 2, // Less frequent updates
      enabled: session?.user?.userType === 'SYSTEM_ADMIN'
    }
  );

  // Memoized chart data for performance
  const complianceChartData = useMemo(() => {
    if (!complianceStats) return [];
    
    return [
      { name: 'Low Risk', value: complianceStats.complianceBreakdown.low, color: COLORS.low },
      { name: 'Medium Risk', value: complianceStats.complianceBreakdown.medium, color: COLORS.medium },
      { name: 'High Risk', value: complianceStats.complianceBreakdown.high, color: COLORS.high },
      { name: 'Critical Risk', value: complianceStats.complianceBreakdown.critical, color: COLORS.critical },
    ];
  }, [complianceStats]);

  const riskLevelChartData = useMemo(() => {
    if (!complianceStats) return [];
    
    return [
      { name: 'Low', value: complianceStats.riskLevelBreakdown.LOW, color: RISK_COLORS.LOW },
      { name: 'Medium', value: complianceStats.riskLevelBreakdown.MEDIUM, color: RISK_COLORS.MEDIUM },
      { name: 'High', value: complianceStats.riskLevelBreakdown.HIGH, color: RISK_COLORS.HIGH },
      { name: 'Critical', value: complianceStats.riskLevelBreakdown.CRITICAL, color: RISK_COLORS.CRITICAL },
    ];
  }, [complianceStats]);

  // Calculate compliance score
  const complianceScore = useMemo(() => {
    if (!complianceStats || complianceStats.totalMessages === 0) return 100;
    
    const { complianceBreakdown, totalMessages } = complianceStats;
    const weightedScore = (
      (complianceBreakdown.low * 1) +
      (complianceBreakdown.medium * 0.7) +
      (complianceBreakdown.high * 0.3) +
      (complianceBreakdown.critical * 0.1)
    ) / totalMessages * 100;
    
    return Math.round(weightedScore);
  }, [complianceStats]);

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load compliance data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor messaging compliance and data protection across {scope?.replace('-', ' ') || 'the system'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(Number(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10000">10s</SelectItem>
              <SelectItem value="30000">30s</SelectItem>
              <SelectItem value="60000">1m</SelectItem>
              <SelectItem value="300000">5m</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : complianceStats?.totalMessages.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all communication channels
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
              {isLoading ? '...' : complianceStats?.educationalRecords.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              FERPA protected content
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encrypted Messages</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : complianceStats?.encryptedMessages.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Enhanced security applied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceScore}%</div>
            <Progress value={complianceScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Overall compliance rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk-analysis">Risk Analysis</TabsTrigger>
          <TabsTrigger value="ferpa">FERPA Compliance</TabsTrigger>
          {session?.user?.userType === 'SYSTEM_ADMIN' && (
            <TabsTrigger value="retention">Data Retention</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Level Distribution</CardTitle>
                <CardDescription>
                  Breakdown of messages by compliance risk level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={complianceChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {complianceChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Level Analysis</CardTitle>
                <CardDescription>
                  Message risk assessment breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskLevelChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8">
                      {riskLevelChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk-analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  High Risk Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {complianceStats?.riskLevelBreakdown.HIGH || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Require immediate attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Archive className="h-5 w-5 text-amber-500" />
                  Moderated Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">
                  {complianceStats?.moderatedMessages || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Under review or blocked
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Audit Compliant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {complianceStats?.auditedMessages || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Full audit trail maintained
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ferpa" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>FERPA Disclosures</CardTitle>
                <CardDescription>
                  Educational record access logging
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {complianceStats?.ferpaDisclosures || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Logged disclosures in selected period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Educational Records</CardTitle>
                <CardDescription>
                  Protected educational content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {complianceStats?.educationalRecords || 0}
                </div>
                <Badge variant="secondary" className="mt-2">
                  FERPA Protected
                </Badge>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Disclosures</CardTitle>
              <CardDescription>Last 20 FERPA disclosures</CardDescription>
            </CardHeader>
            <CardContent>
              <FERPARecent />
            </CardContent>
          </Card>
        </TabsContent>

        {session?.user?.userType === 'SYSTEM_ADMIN' && (
          <TabsContent value="retention" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DatabaseIcon className="h-5 w-5" />
                    Scheduled
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {retentionStats?.totalScheduled || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Messages scheduled for deletion
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Due Today
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {retentionStats?.dueForDeletion || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Require immediate processing
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    Educational
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {retentionStats?.educationalRecords || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    7-year retention period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Processed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {retentionStats?.deletedToday || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Deleted today
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
