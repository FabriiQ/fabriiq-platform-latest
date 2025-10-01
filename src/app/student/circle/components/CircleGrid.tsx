'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { MemberCard, MemberCardSkeleton } from './MemberCard';
import { CircleGridProps } from './types';
import styles from './circle.module.css';

/**
 * CircleGrid Component
 * 
 * Displays class members in a responsive grid layout
 * Features:
 * - Responsive grid (2-3-4 columns based on screen size)
 * - Teachers displayed first
 * - Current user highlighting
 * - Loading states
 * - Empty state handling
 */
export function CircleGrid({ 
  members, 
  currentUserId, 
  classInfo, 
  isLoading = false,
  className 
}: CircleGridProps) {
  // Sort members: teachers first, then students, alphabetically within each group
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      // Teachers first
      if (a.role === 'TEACHER' && b.role === 'STUDENT') return -1;
      if (a.role === 'STUDENT' && b.role === 'TEACHER') return 1;
      
      // Within same role, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [members]);

  // Separate teachers and students for display
  const teachers = sortedMembers.filter(member => member.role === 'TEACHER');
  const students = sortedMembers.filter(member => member.role === 'STUDENT');

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        {/* Teachers Section Skeleton */}
        <div>
          <div className="h-6 w-20 bg-muted rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <MemberCardSkeleton key={`teacher-skeleton-${index}`} />
            ))}
          </div>
        </div>

        {/* Students Section Skeleton */}
        <div>
          <div className="h-6 w-24 bg-muted rounded mb-4 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <MemberCardSkeleton key={`student-skeleton-${index}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-12 h-12 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Members Found</h3>
        <p className="text-muted-foreground">
          This class doesn't have any members yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Teachers Section */}
      {teachers.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Teachers
            </h2>
            <span className="text-sm text-muted-foreground">
              ({teachers.length})
            </span>
          </div>
          <div className={cn(styles.circleGrid, "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4")}>
            {teachers.map((teacher, index) => (
              <div key={teacher.id} style={{ animationDelay: `${index * 0.1}s` }}>
                <MemberCard
                  member={teacher}
                  showRole={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Section */}
      {students.length > 0 && (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Students
            </h2>
            <span className="text-sm text-muted-foreground">
              ({students.length})
            </span>
          </div>
          <div className={cn(styles.circleGrid, "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4")}>
            {students.map((student, index) => (
              <div key={student.id} style={{ animationDelay: `${(teachers.length + index) * 0.1}s` }}>
                <MemberCard
                  member={student}
                  showRole={false} // Don't show role for students since it's obvious
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="border-t pt-4">
        <p className="text-sm text-muted-foreground text-center">
          {members.length} member{members.length !== 1 ? 's' : ''} in {classInfo.name}
          {teachers.length > 0 && students.length > 0 && (
            <span> • {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} • {students.length} student{students.length !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * CircleGridCompact Component
 * Compact version for smaller spaces
 */
export function CircleGridCompact({ 
  members, 
  currentUserId, 
  classInfo, 
  isLoading = false,
  className 
}: CircleGridProps) {
  const sortedMembers = React.useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === 'TEACHER' && b.role === 'STUDENT') return -1;
      if (a.role === 'STUDENT' && b.role === 'TEACHER') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [members]);

  if (isLoading) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3", className)}>
        {Array.from({ length: 8 }).map((_, index) => (
          <MemberCardSkeleton key={`compact-skeleton-${index}`} compact />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sortedMembers.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            compact={true}
            showRole={member.role === 'TEACHER'}
          />
        ))}
      </div>
      
      <p className="text-xs text-muted-foreground text-center">
        {members.length} member{members.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
