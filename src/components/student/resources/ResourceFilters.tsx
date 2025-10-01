'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface Course {
  id: string;
  name: string;
  code: string;
}

interface ResourceFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCourse: string;
  onCourseChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  courses?: Course[];
  showCourseFilter?: boolean;
}

/**
 * ResourceFilters Component
 * 
 * Provides search and filtering controls for resources:
 * - Search input with icon
 * - Course filter dropdown (optional)
 * - Resource type filter dropdown
 * - Responsive layout
 */
export function ResourceFilters({
  searchTerm,
  onSearchChange,
  selectedCourse,
  onCourseChange,
  selectedType,
  onTypeChange,
  courses = [],
  showCourseFilter = true,
}: ResourceFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Course Filter */}
          {showCourseFilter && (
            <select
              value={selectedCourse}
              onChange={(e) => onCourseChange(e.target.value)}
              className="px-3 py-2 border border-input bg-background rounded-md text-sm min-w-[150px]"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          )}

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm min-w-[120px]"
          >
            <option value="all">All Types</option>
            <option value="FILE">Documents</option>
            <option value="VIDEO">Videos</option>
            <option value="LINK">Links</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
