'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Clock, BarChart3 } from 'lucide-react';
import { SystemClassAttendanceSelector } from './SystemClassAttendanceSelector';
import { SystemStudentAttendanceSelector } from './SystemStudentAttendanceSelector';

export function SystemAttendanceSelector() {

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            System Attendance Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mt-2">
            {/* Simplified: Class-based workflow only */}
            <SystemClassAttendanceSelector />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
