'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, User, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClassSelectorProps } from './types';

/**
 * ClassSelector Component
 * 
 * Displays a list of classes that the student can select to view their circles
 * Features:
 * - Class cards with member counts
 * - Course and term information
 * - Responsive grid layout
 * - Loading states
 * - Empty state handling
 */
export function ClassSelector({ 
  classes, 
  selectedClassId, 
  onClassSelect, 
  isLoading = false,
  className 
}: ClassSelectorProps) {
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ClassCardSkeleton key={`class-skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Classes Found</h3>
        <p className="text-muted-foreground">
          You're not enrolled in any classes yet.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-bold text-foreground">
          Choose Your Class Circle 🎯
        </h2>
        <p className="text-muted-foreground">
          Select a class to explore your learning community
        </p>
      </div>

      {/* Class Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((classItem) => (
          <ClassCard
            key={classItem.id}
            classItem={classItem}
            isSelected={selectedClassId === classItem.id}
            onSelect={() => onClassSelect(classItem.id)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {classes.length} class{classes.length !== 1 ? 'es' : ''} available
        </p>
      </div>
    </div>
  );
}

/**
 * ClassCard Component
 * Individual class card for selection
 */
interface ClassCardProps {
  classItem: ClassSelectorProps['classes'][0];
  isSelected?: boolean;
  onSelect: () => void;
}

function ClassCard({ classItem, isSelected = false, onSelect }: ClassCardProps) {
  // Generate simple class color using UX colors
  const getClassColor = () => {
    const colors = [
      'bg-primary',    // Primary color
      'bg-secondary',  // Secondary color
      'bg-accent',     // Accent color
      'bg-muted',      // Muted color
    ];
    const index = classItem.name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        "border border-border bg-card",
        isSelected && "ring-2 ring-primary/20 bg-primary/5"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        {/* Simple Header */}
        <div className={cn("h-2", getClassColor())}></div>

        <div className="p-4">
          {/* Class Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate mb-2">
                {classItem.name}
              </h3>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {classItem.code}
                </Badge>
              </div>
            </div>
            <ChevronRight
              size={16}
              className="text-muted-foreground flex-shrink-0 ml-2"
            />
          </div>

        {/* Course and Term Info */}
        <div className="space-y-1 mb-4">
          <p className="text-sm text-foreground font-medium truncate">
            {classItem.courseName}
          </p>
          {classItem.termName && (
            <p className="text-xs text-muted-foreground">
              {classItem.termName}
            </p>
          )}
        </div>

        {/* Member Statistics */}
        <div className="space-y-2">
          {/* Total Members */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users size={14} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                Total Members
              </span>
            </div>
            <span className="text-sm font-semibold text-primary">
              {classItem.memberCounts.total}
            </span>
          </div>

          {/* Teachers and Students */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-4">
              {classItem.memberCounts.teachers > 0 && (
                <div className="flex items-center space-x-1">
                  <GraduationCap size={12} />
                  <span>{classItem.memberCounts.teachers} teacher{classItem.memberCounts.teachers !== 1 ? 's' : ''}</span>
                </div>
              )}
              {classItem.memberCounts.students > 0 && (
                <div className="flex items-center space-x-1">
                  <User size={12} />
                  <span>{classItem.memberCounts.students} student{classItem.memberCounts.students !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Action Button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
          >
            View Circle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ClassCardSkeleton Component
 * Loading state for ClassCard
 */
function ClassCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
            <div className="h-4 w-4 bg-muted rounded" />
          </div>

          {/* Course Info */}
          <div className="space-y-1">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 bg-muted rounded w-8" />
            </div>
            <div className="h-3 bg-muted rounded w-32" />
          </div>

          {/* Button */}
          <div className="h-8 bg-muted rounded w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
