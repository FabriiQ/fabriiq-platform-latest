'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Users, GraduationCap, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CircleHeaderProps } from './types';
import styles from './circle.module.css';

/**
 * CircleHeader Component
 * 
 * Header component for circle pages showing class information and navigation
 * Features:
 * - Class name and course information
 * - Member count statistics
 * - Back navigation
 * - Responsive design
 */
export function CircleHeader({ 
  classInfo, 
  memberCounts, 
  showBackButton = false, 
  onBack,
  className 
}: CircleHeaderProps) {
  return (
    <div className={cn(styles.circleHeader, "space-y-6", className)}>
      {/* Navigation and Title */}
      <div className="flex items-center space-x-4">
        {showBackButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </Button>
        )}

        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-3xl font-bold text-foreground truncate">
            {classInfo.name} Circle 🌟
          </h1>
          <div className="flex items-center justify-center space-x-2 mt-2">
            <Badge variant="outline" className="text-xs font-medium">
              {classInfo.code}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {classInfo.courseName}
            </span>
            {classInfo.termName && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  {classInfo.termName}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Member Statistics */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Total Members */}
        <div className="flex items-center space-x-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg">
          <Users size={16} />
          <span className="font-medium text-sm">
            {memberCounts.total} Member{memberCounts.total !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Teachers Count */}
        {memberCounts.teachers > 0 && (
          <div className="flex items-center space-x-2 bg-secondary text-secondary-foreground px-3 py-2 rounded-lg">
            <GraduationCap size={16} />
            <span className="font-medium text-sm">
              {memberCounts.teachers} Teacher{memberCounts.teachers !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Students Count */}
        {memberCounts.students > 0 && (
          <div className="flex items-center space-x-2 bg-accent text-accent-foreground px-3 py-2 rounded-lg">
            <User size={16} />
            <span className="font-medium text-sm">
              {memberCounts.students} Student{memberCounts.students !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="text-center space-y-2">
          <p className="text-base text-muted-foreground">
            🤝 Connect with your learning community in{' '}
            <span className="font-semibold text-foreground">{classInfo.courseName}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Build relationships, share knowledge, and grow together! 🌱
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * CircleHeaderSkeleton Component
 * Loading state for CircleHeader
 */
export function CircleHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 animate-pulse", className)}>
      {/* Title Skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-64" />
        <div className="flex items-center space-x-2">
          <div className="h-5 bg-muted rounded w-16" />
          <div className="h-4 bg-muted rounded w-32" />
        </div>
      </div>

      {/* Statistics Skeleton */}
      <div className="flex flex-wrap gap-4">
        <div className="h-9 bg-muted rounded w-24" />
        <div className="h-9 bg-muted rounded w-20" />
        <div className="h-9 bg-muted rounded w-22" />
      </div>

      {/* Description Skeleton */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

/**
 * CircleHeaderCompact Component
 * Compact version for smaller spaces
 */
export function CircleHeaderCompact({ 
  classInfo, 
  memberCounts, 
  className 
}: Omit<CircleHeaderProps, 'showBackButton' | 'onBack'>) {
  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground truncate">
          {classInfo.name}
        </h2>
        <div className="flex items-center space-x-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {classInfo.code}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {classInfo.courseName}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1 text-primary">
          <Users size={14} />
          <span className="text-sm font-medium">{memberCounts.total}</span>
        </div>
        
        {memberCounts.teachers > 0 && (
          <div className="flex items-center space-x-1 text-blue-600">
            <GraduationCap size={14} />
            <span className="text-sm">{memberCounts.teachers}</span>
          </div>
        )}
        
        {memberCounts.students > 0 && (
          <div className="flex items-center space-x-1 text-green-600">
            <User size={14} />
            <span className="text-sm">{memberCounts.students}</span>
          </div>
        )}
      </div>
    </div>
  );
}
