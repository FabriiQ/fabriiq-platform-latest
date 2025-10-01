'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AttendanceAnalyticsDashboard } from './AttendanceAnalyticsDashboard';
import { BarChart, LineChart, PieChart, TrendingUp, Users, Calendar, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/atoms/skeleton';

export function SystemAttendanceAnalytics() {
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch all campuses for system admin
  const { data: campuses, isLoading: isLoadingCampuses } = api.campus.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Filter campuses based on search term
  const filteredCampuses = campuses?.filter(campus =>
    campus.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const selectedCampus = campuses?.find(campus => campus.id === selectedCampusId);

  return (
    <div className="space-y-6">
      {/* Campus Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            Attendance Analytics
          </CardTitle>
          <CardDescription>
            View attendance analytics and insights across campuses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Campus Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Campus</label>
            <Select value={selectedCampusId || ''} onValueChange={setSelectedCampusId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a campus to view analytics" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingCampuses ? (
                  <SelectItem value="loading" disabled>
                    Loading campuses...
                  </SelectItem>
                ) : filteredCampuses.length === 0 ? (
                  <SelectItem value="no-results" disabled>
                    No campuses found
                  </SelectItem>
                ) : (
                  filteredCampuses.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{campus.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {campus.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Campus Info */}
          {selectedCampus && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{selectedCampus.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Campus ID: {selectedCampus.id}
                  </p>
                </div>
                <Badge variant={selectedCampus.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {selectedCampus.status}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Dashboard - Only show when campus is selected */}
      {selectedCampusId ? (
        <AttendanceAnalyticsDashboard campusId={selectedCampusId} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">Select a Campus to View Analytics</h3>
              <p className="text-sm">
                Choose a campus from the dropdown above to view detailed attendance analytics and insights.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System-wide Summary (when no campus selected) */}
      {!selectedCampusId && campuses && campuses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Overview
            </CardTitle>
            <CardDescription>
              Quick overview of attendance across all campuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{campuses.length}</div>
                <div className="text-sm text-muted-foreground">Total Campuses</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {campuses.filter(c => c.status === 'ACTIVE').length}
                </div>
                <div className="text-sm text-muted-foreground">Active Campuses</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">N/A</div>
                <div className="text-sm text-muted-foreground">Overall Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
