'use client';

import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { ResourceCard } from './ResourceCard';

interface Resource {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  url?: string | null;
  tags: string[];
  settings?: any;
  createdAt: Date;
}

interface Course {
  id: string;
  name: string;
  code: string;
}

interface ResourceGridProps {
  resources: Resource[];
  courses?: Course[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  showCourseInfo?: boolean;
}

/**
 * ResourceGrid Component
 * 
 * Displays resources in a responsive grid layout:
 * - Responsive grid (1-3 columns based on screen size)
 * - Loading state with skeleton cards
 * - Empty state with custom message
 * - Course information display (optional)
 */
export function ResourceGrid({
  resources,
  courses = [],
  isLoading = false,
  emptyMessage = "No resources found",
  emptyDescription = "Resources will appear here when available",
  showCourseInfo = false,
}: ResourceGridProps) {
  // Get course name by ID
  const getCourseName = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.name : 'Course';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="p-6 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                <div className="h-5 w-16 bg-gray-200 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-6 w-16 bg-gray-200 rounded"></div>
                <div className="h-6 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="flex space-x-2 pt-2">
                <div className="h-8 bg-gray-200 rounded flex-1"></div>
                <div className="h-8 w-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Empty state
  if (resources.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{emptyMessage}</h3>
            <p className="text-muted-foreground">{emptyDescription}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Resources grid
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          courseName={
            showCourseInfo && resource.settings?.courseId
              ? getCourseName(resource.settings.courseId)
              : undefined
          }
          showCourse={showCourseInfo}
        />
      ))}
    </div>
  );
}
