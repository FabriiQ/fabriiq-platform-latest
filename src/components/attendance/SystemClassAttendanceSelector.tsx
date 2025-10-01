'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, BookOpen, Users, Building } from 'lucide-react';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AttendanceClassView } from './AttendanceClassView';

// Define types for the data structures
interface SystemClass {
  id: string;
  name: string;
  code?: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  campus: {
    id: string;
    name: string;
  };
  term: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
  };
  teacher?: {
    id: string;
    name: string;
  };
  facility?: {
    id: string;
    name: string;
  };
  program?: {
    id: string;
    name: string;
  };
  studentCount: number;
  teacherCount: number;
  activityCount: number;
  assessmentCount: number;
}

interface SystemClassesData {
  classes: SystemClass[];
  totalCount: number;
  hasMore: boolean;
}

export function SystemClassAttendanceSelector() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch all campuses for filtering
  const { data: campuses, isLoading: isLoadingCampuses } = api.campus.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch filter options (programs, terms, etc.)
  const { data: filterOptions } = api.systemAnalytics.getFilterOptions.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch system classes
  const { data: classesData, isLoading: isLoadingClasses, error: classesError } = api.systemAnalytics.getSystemClasses.useQuery(
    {
      status: 'ACTIVE',
      campusId: selectedCampus || undefined,
      programId: selectedProgram || undefined,
      search: searchTerm || undefined,
      skip: 0,
      take: 50,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
      onError: (error) => {
        console.error('Error fetching system classes:', error);
      }
    }
  ) as { data: SystemClassesData | undefined, isLoading: boolean, error: any };

  // Filter classes based on search term
  const filteredClasses = classesData?.classes || [];

  // Show error if classes failed to load
  if (classesError) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Classes</h3>
          <p className="text-red-600 text-sm mt-1">
            {classesError.message || 'Failed to load classes across campuses'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">System Class Attendance</h2>
          <p className="text-muted-foreground">View and manage attendance by class across all campuses</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full md:w-auto md:min-w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search classes..."
              className="w-full pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Select value={selectedCampus || 'all-campuses'} onValueChange={(value) => setSelectedCampus(value === 'all-campuses' ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Campuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-campuses">All Campuses</SelectItem>
              {campuses?.map((campus) => (
                <SelectItem key={campus.id} value={campus.id}>
                  {campus.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedProgram || 'all-programs'} onValueChange={(value) => setSelectedProgram(value === 'all-programs' ? null : value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-programs">All Programs</SelectItem>
              {filterOptions?.programs?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComponent
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date: Date | undefined) => {
                  if (date) {
                    setSelectedDate(date);
                  } else {
                    setSelectedDate(null);
                  }
                  setIsCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          {selectedDate && (
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(null)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          )}
        </div>
      </div>

      {selectedClass ? (
        <AttendanceClassView
          classId={selectedClass}
          date={selectedDate}
          onBack={() => setSelectedClass(null)}
        />
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{classesData?.totalCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Classes</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{filteredClasses.length}</div>
                  <div className="text-sm text-muted-foreground">Filtered Results</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{campuses?.length || 0}</div>
                  <div className="text-sm text-muted-foreground">Campuses</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredClasses.reduce((sum, cls) => sum + cls.studentCount, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Students</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingClasses ? (
              Array(6).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-[200px] w-full" />
              ))
            ) : filteredClasses.length > 0 ? (
              filteredClasses.map((classItem) => (
                <Card
                  key={classItem.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedClass(classItem.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{classItem.name}</CardTitle>
                        <CardDescription>{classItem.code}</CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{classItem.course.name}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{classItem.campus.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Students:</span>
                        <span className="font-medium">{classItem.studentCount}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Teacher:</span>
                        <span className="font-medium">{classItem.teacher?.name || 'No teacher'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Attendance Rate:</span>
                        <span className="font-medium">N/A</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <Card>
                  <CardContent className="py-10">
                    <div className="text-center text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">No classes found matching your criteria</p>
                      <Button variant="outline" onClick={() => {
                        setSearchTerm('');
                        setSelectedCampus(null);
                        setSelectedProgram(null);
                      }}>
                        Clear filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
