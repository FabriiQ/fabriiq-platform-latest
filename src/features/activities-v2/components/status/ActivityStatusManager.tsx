'use client';

/**
 * Activity Status Manager Component for Activities V2
 * 
 * Provides status management controls for Draft, Published, Active, Inactive states
 * Integrates with activity creation and editing interfaces
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ActivityV2Status } from '../../types';
import { 
  FileText, 
  Eye, 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Users 
} from 'lucide-react';

interface ActivityStatusManagerProps {
  currentStatus: ActivityV2Status;
  onStatusChange: (status: ActivityV2Status) => void;
  hasStudentAttempts?: boolean;
  studentCount?: number;
  className?: string;
}

export const ActivityStatusManager: React.FC<ActivityStatusManagerProps> = ({
  currentStatus,
  onStatusChange,
  hasStudentAttempts = false,
  studentCount = 0,
  className = ''
}) => {
  
  const getStatusConfig = (status: ActivityV2Status) => {
    switch (status) {
      case ActivityV2Status.DRAFT:
        return {
          label: 'Draft',
          description: 'Activity is being created/edited, not visible to students',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: FileText,
          variant: 'secondary' as const
        };
      case ActivityV2Status.PUBLISHED:
        return {
          label: 'Published',
          description: 'Activity is published but not yet active for students',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Eye,
          variant: 'default' as const
        };
      case ActivityV2Status.ACTIVE:
        return {
          label: 'Active',
          description: 'Activity is active and available to students',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: Play,
          variant: 'default' as const
        };
      case ActivityV2Status.INACTIVE:
        return {
          label: 'Inactive',
          description: 'Activity is temporarily disabled, not available to students',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: Pause,
          variant: 'destructive' as const
        };
    }
  };

  const currentConfig = getStatusConfig(currentStatus);
  const CurrentIcon = currentConfig.icon;

  const canChangeStatus = (targetStatus: ActivityV2Status): boolean => {
    // If there are student attempts, prevent certain status changes
    if (hasStudentAttempts) {
      // Can't go back to draft if students have attempted
      if (targetStatus === ActivityV2Status.DRAFT) return false;
      // Can only toggle between active and inactive
      if (currentStatus === ActivityV2Status.ACTIVE && targetStatus !== ActivityV2Status.INACTIVE) return false;
      if (currentStatus === ActivityV2Status.INACTIVE && targetStatus !== ActivityV2Status.ACTIVE) return false;
    }
    return true;
  };

  const getStatusOptions = () => {
    return Object.values(ActivityV2Status).filter(status => 
      status !== currentStatus && canChangeStatus(status)
    );
  };

  const handleStatusChange = (newStatus: string) => {
    const status = newStatus as ActivityV2Status;
    if (canChangeStatus(status)) {
      onStatusChange(status);
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <CurrentIcon className="h-5 w-5" />
          Activity Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={currentConfig.variant} className="flex items-center gap-1">
              <CurrentIcon className="h-3 w-3" />
              {currentConfig.label}
            </Badge>
            {hasStudentAttempts && (
              <div className="flex items-center gap-1 text-sm text-orange-600">
                <Users className="h-4 w-4" />
                <span>{studentCount} student{studentCount !== 1 ? 's' : ''} attempted</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Description */}
        <p className="text-sm text-gray-600">
          {currentConfig.description}
        </p>

        {/* Status Change Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Change status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={currentStatus} disabled>
                  <div className="flex items-center gap-2">
                    <CurrentIcon className="h-4 w-4" />
                    {currentConfig.label} (Current)
                  </div>
                </SelectItem>
                {getStatusOptions().map((status) => {
                  const config = getStatusConfig(status);
                  const StatusIcon = config.icon;
                  return (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <StatusIcon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Status Change Warnings */}
          {hasStudentAttempts && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800">Student Attempts Detected</p>
                  <p className="text-orange-700 mt-1">
                    Status changes are limited because students have already attempted this activity.
                    You can only toggle between Active and Inactive states.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex gap-2">
            {currentStatus === ActivityV2Status.DRAFT && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange(ActivityV2Status.PUBLISHED)}
                className="flex items-center gap-1"
              >
                <Eye className="h-4 w-4" />
                Publish
              </Button>
            )}
            
            {currentStatus === ActivityV2Status.PUBLISHED && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange(ActivityV2Status.ACTIVE)}
                className="flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                Activate
              </Button>
            )}
            
            {currentStatus === ActivityV2Status.ACTIVE && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleStatusChange(ActivityV2Status.INACTIVE)}
                className="flex items-center gap-1"
              >
                <Pause className="h-4 w-4" />
                Deactivate
              </Button>
            )}
            
            {currentStatus === ActivityV2Status.INACTIVE && (
              <Button 
                size="sm" 
                onClick={() => handleStatusChange(ActivityV2Status.ACTIVE)}
                className="flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                Reactivate
              </Button>
            )}
          </div>
        </div>

        {/* Status Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Students can only access Active activities</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Status changes take effect immediately</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
