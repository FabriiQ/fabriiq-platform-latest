'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Skeleton } from '@/components/ui/atoms/skeleton';

export function SimpleAttendanceDashboard() {
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');

  // Fetch campuses
  const { data: campuses, isLoading: isLoadingCampuses } = api.campus.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch classes for selected campus
  const { data: classes, isLoading: isLoadingClasses } = api.class.getByCampusId.useQuery(
    { campusId: selectedCampusId },
    { 
      enabled: !!selectedCampusId,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  const selectedCampus = campuses?.find(campus => campus.id === selectedCampusId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Attendance Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor attendance across your institution
        </p>
      </div>

      {/* Campus Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Campus Selection
          </CardTitle>
          <CardDescription>
            Select a campus to view attendance information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Campus</label>
              <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a campus" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingCampuses ? (
                    <SelectItem value="loading" disabled>
                      Loading campuses...
                    </SelectItem>
                  ) : campuses?.length === 0 ? (
                    <SelectItem value="no-campuses" disabled>
                      No campuses found
                    </SelectItem>
                  ) : (
                    campuses?.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

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
          </div>
        </CardContent>
      </Card>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Campuses</p>
                <p className="text-2xl font-bold">{campuses?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Campuses</p>
                <p className="text-2xl font-bold">
                  {campuses?.filter(c => c.status === 'ACTIVE').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Classes</p>
                <p className="text-2xl font-bold">
                  {selectedCampusId ? (classes?.length || 0) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">N/A</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes Overview */}
      {selectedCampusId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Classes Overview
            </CardTitle>
            <CardDescription>
              Classes in {selectedCampus?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingClasses ? (
              <div className="space-y-4">
                {Array(3).fill(0).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : classes?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No classes found in this campus</p>
              </div>
            ) : (
              <div className="space-y-4">
                {classes?.map((classItem: any) => (
                  <div key={classItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{classItem.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {classItem.students?.length || 0} students
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {classItem.status || 'Active'}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(`/admin/system/attendance/take?classId=${classItem.id}`, '_blank')}
                      >
                        Take Attendance
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common attendance management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => window.open('/admin/system/attendance/take', '_blank')}
            >
              <CheckCircle className="h-6 w-6" />
              Take Attendance
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              disabled
            >
              <Calendar className="h-6 w-6" />
              View Reports
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              disabled
            >
              <TrendingUp className="h-6 w-6" />
              Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• Select a campus to view classes and take attendance</p>
            <p>• Use "Take Attendance" to mark student attendance for specific classes</p>
            <p>• Attendance data will be displayed here once you start taking attendance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
