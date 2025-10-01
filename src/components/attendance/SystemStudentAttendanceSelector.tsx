'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, User, Users, BookOpen } from 'lucide-react';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AttendanceStudentView } from './AttendanceStudentView';

// Define types for the data structures
interface SystemStudent {
  id: string; // user id
  userId: string;
  studentProfileId?: string; // add profile id for attendance APIs
  name: string;
  email: string;
  status: string;
  enrollmentNumber?: string;
  campus?: {
    id: string;
    name: string;
  } | null;
  program?: {
    id: string;
    name: string;
  } | null;
  classCount: number;
}

interface SystemStudentsData {
  students: SystemStudent[];
  totalCount: number;
  hasMore: boolean;
}

export function SystemStudentAttendanceSelector() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Fetch all campuses for filtering
  const { data: campuses, isLoading: isLoadingCampuses } = api.campus.getAll.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch system students
  const { data: studentsData, isLoading: isLoadingStudents } = api.systemAnalytics.getSystemStudents.useQuery(
    {
      status: 'ACTIVE',
      campusId: selectedCampus || undefined,
      search: searchTerm || undefined,
      skip: 0,
      take: 50,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  ) as { data: SystemStudentsData | undefined, isLoading: boolean };

  // Filter students based on search term and selected campus
  const filteredStudents = studentsData?.students || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold">System Student Attendance</h2>
          <p className="text-muted-foreground">View and manage attendance by student across all campuses</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full md:w-auto md:min-w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search students..."
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

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd')
                  )
                ) : (
                  <span>Date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                defaultMonth={dateRange.from || undefined}
                selected={{
                  from: dateRange.from || undefined,
                  to: dateRange.to || undefined,
                }}
                onSelect={(range) => {
                  setDateRange({
                    from: range?.from || null,
                    to: range?.to || null,
                  });
                  if (range?.to) {
                    setIsCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {(dateRange.from || dateRange.to) && (
            <Button variant="ghost" size="icon" onClick={() => setDateRange({ from: null, to: null })}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          )}
        </div>
      </div>

      {selectedStudent ? (
        <AttendanceStudentView
          studentId={selectedStudent}
          classId={null}
          dateRange={dateRange}
          onBack={() => setSelectedStudent(null)}
        />
      ) : (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{studentsData?.totalCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Students</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{filteredStudents.length}</div>
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
                  <div className="text-2xl font-bold text-orange-600">N/A</div>
                  <div className="text-sm text-muted-foreground">Avg Attendance</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Students Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingStudents ? (
              Array(6).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-[150px] w-full" />
              ))
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student: SystemStudent) => (
                <Card
                  key={student.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedStudent(student.studentProfileId || student.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {student.name?.charAt(0) || 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">{student.name}</CardTitle>
                          <CardDescription>{student.enrollmentNumber || 'No enrollment number'}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        {student.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{student.email}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{student.campus?.name || 'No campus'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Classes:</span>
                        <span className="font-medium">{student.classCount}</span>
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
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="mb-4">No students found matching your criteria</p>
                      <Button variant="outline" onClick={() => {
                        setSearchTerm('');
                        setSelectedCampus(null);
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
