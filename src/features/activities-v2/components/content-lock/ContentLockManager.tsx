'use client';

/**
 * Content Lock Manager Component for Activities V2
 * 
 * Prevents modification of activity content once students have attempted it
 * Maintains assessment integrity and prevents unfair changes
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  Users,
  Shield,
  Clock,
  CheckCircle,
  Info
} from 'lucide-react';

interface ContentLockManagerProps {
  hasStudentAttempts: boolean;
  studentAttemptCount: number;
  firstAttemptDate?: Date;
  lastAttemptDate?: Date;
  isContentLocked: boolean;
  onLockToggle?: (locked: boolean) => void;
  canOverrideLock?: boolean; // Admin/super-admin privilege
  className?: string;
}

export const ContentLockManager: React.FC<ContentLockManagerProps> = ({
  hasStudentAttempts,
  studentAttemptCount,
  firstAttemptDate,
  lastAttemptDate,
  isContentLocked,
  onLockToggle,
  canOverrideLock = false,
  className = ''
}) => {

  const shouldAutoLock = hasStudentAttempts && studentAttemptCount > 0;
  const effectiveLock = shouldAutoLock || isContentLocked;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getLockStatus = () => {
    if (shouldAutoLock) {
      return {
        type: 'auto-locked' as const,
        label: 'Auto-Locked',
        description: 'Content is automatically locked due to student attempts',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: Shield,
        variant: 'destructive' as const
      };
    } else if (isContentLocked) {
      return {
        type: 'manually-locked' as const,
        label: 'Manually Locked',
        description: 'Content has been manually locked by teacher',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        icon: Shield,
        variant: 'secondary' as const
      };
    } else {
      return {
        type: 'unlocked' as const,
        label: 'Unlocked',
        description: 'Content can be modified freely',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle,
        variant: 'default' as const
      };
    }
  };

  const lockStatus = getLockStatus();

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Content Protection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lock Status Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={lockStatus.variant} className="flex items-center gap-1">
              {isContentLocked ? (
                <Shield className="h-3 w-3" />
              ) : (
                <CheckCircle className="h-3 w-3" />
              )}
              {lockStatus.label}
            </Badge>
            {hasStudentAttempts && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Users className="h-4 w-4" />
                <span>{studentAttemptCount} attempt{studentAttemptCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Lock Description */}
        <p className="text-sm text-gray-600">
          {lockStatus.description}
        </p>

        {/* Student Attempt Information */}
        {hasStudentAttempts && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Student Activity Detected</p>
                <div className="text-blue-700 mt-1 space-y-1">
                  <p>• {studentAttemptCount} student{studentAttemptCount !== 1 ? 's have' : ' has'} attempted this activity</p>
                  {firstAttemptDate && (
                    <p>• First attempt: {formatDate(firstAttemptDate)}</p>
                  )}
                  {lastAttemptDate && (
                    <p>• Latest attempt: {formatDate(lastAttemptDate)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto-Lock Warning */}
        {shouldAutoLock && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Content Automatically Locked</strong>
              <br />
              This activity's content cannot be modified because students have already attempted it. 
              This protects assessment integrity and ensures fair evaluation for all students.
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Lock Controls */}
        {!shouldAutoLock && onLockToggle && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isContentLocked ? "outline" : "default"}
                onClick={() => onLockToggle(!isContentLocked)}
                className="flex items-center gap-1"
              >
                {isContentLocked ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Unlock Content
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Lock Content
                  </>
                )}
              </Button>
            </div>

            {!isContentLocked && (
              <div className="text-xs text-gray-500">
                <p>💡 Tip: Lock content before publishing to prevent accidental changes</p>
              </div>
            )}
          </div>
        )}

        {/* Admin Override Controls */}
        {shouldAutoLock && canOverrideLock && onLockToggle && (
          <div className="border-t pt-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Administrator Override Available</strong>
                <br />
                As an administrator, you can override the content lock. Use this feature carefully 
                as it may affect assessment integrity.
              </AlertDescription>
            </Alert>
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLockToggle && onLockToggle(false)}
                className="flex items-center gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <CheckCircle className="h-4 w-4" />
                Override Lock (Admin)
              </Button>
            </div>
          </div>
        )}

        {/* Protection Information */}
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            <span>Locked content prevents unfair modifications</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Lock status is automatically managed</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>Maintains assessment integrity</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
