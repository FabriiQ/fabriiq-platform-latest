'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, 
  Save, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { AttendanceStatusType } from '@/server/api/constants';

interface SystemAttendanceTakerProps {
  classId: string;
  date: Date;
  onBack: () => void;
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatusType;
  remarks?: string;
}

export function SystemAttendanceTaker({ classId, date, onBack }: SystemAttendanceTakerProps) {
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch class details
  const { data: classData, isLoading: isLoadingClass } = api.class.getById.useQuery(
    { classId },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Fetch existing attendance for the date
  const { data: existingAttendance, isLoading: isLoadingAttendance } = api.attendance.getByQuery.useQuery(
    {
      classId,
      date,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
      enabled: !!classId && !!date,
      onSuccess: (data) => {
        // Pre-populate existing attendance records
        if (data?.attendanceRecords) {
          const records: Record<string, AttendanceRecord> = {};
          data.attendanceRecords.forEach((record: any) => {
            records[record.student.id] = {
              studentId: record.student.id,
              status: record.status,
              remarks: record.remarks || '',
            };
          });
          setAttendanceRecords(records);
        }
      },
    }
  );

  // Mark attendance mutation
  const markAttendanceMutation = api.attendance.bulkCreate.useMutation({
    onSuccess: () => {
      toast.success('Attendance saved successfully');
      onBack();
    },
    onError: (error) => {
      toast.error(`Failed to save attendance: ${error.message}`);
    },
  });

  const students = classData?.students || [];
  const filteredStudents = students.filter((student: any) =>
    student.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.enrollmentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = (studentId: string, status: AttendanceStatusType) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        status,
      }
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        studentId,
        remarks,
      }
    }));
  };

  const handleBulkAction = (status: AttendanceStatusType) => {
    const newRecords: Record<string, AttendanceRecord> = {};
    filteredStudents.forEach((student: any) => {
      newRecords[student.id] = {
        studentId: student.id,
        status,
        remarks: attendanceRecords[student.id]?.remarks || '',
      };
    });
    setAttendanceRecords(prev => ({ ...prev, ...newRecords }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const records = Object.values(attendanceRecords).filter(record => record.status);
      
      if (records.length === 0) {
        toast.error('Please mark attendance for at least one student');
        return;
      }

      await markAttendanceMutation.mutateAsync({
        classId,
        date,
        attendanceRecords: records,
      });
    } catch (error) {
      console.error('Failed to save attendance:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: AttendanceStatusType) => {
    switch (status) {
      case AttendanceStatusType.PRESENT:
        return 'bg-green-50 text-green-700 border-green-200';
      case AttendanceStatusType.ABSENT:
        return 'bg-red-50 text-red-700 border-red-200';
      case AttendanceStatusType.LATE:
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case AttendanceStatusType.EXCUSED:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: AttendanceStatusType) => {
    switch (status) {
      case AttendanceStatusType.PRESENT:
        return <CheckCircle className="h-4 w-4" />;
      case AttendanceStatusType.ABSENT:
        return <XCircle className="h-4 w-4" />;
      case AttendanceStatusType.LATE:
        return <Clock className="h-4 w-4" />;
      case AttendanceStatusType.EXCUSED:
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const attendanceStats = {
    total: filteredStudents.length,
    present: Object.values(attendanceRecords).filter(r => r.status === AttendanceStatusType.PRESENT).length,
    absent: Object.values(attendanceRecords).filter(r => r.status === AttendanceStatusType.ABSENT).length,
    late: Object.values(attendanceRecords).filter(r => r.status === AttendanceStatusType.LATE).length,
    excused: Object.values(attendanceRecords).filter(r => r.status === AttendanceStatusType.EXCUSED).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {isLoadingClass ? (
            <Skeleton className="h-8 w-[300px]" />
          ) : (
            <div>
              <h2 className="text-2xl font-bold">Take Attendance</h2>
              <p className="text-muted-foreground">
                {classData?.name} • {format(date, 'PPPP')}
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || Object.keys(attendanceRecords).length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{attendanceStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{attendanceStats.present}</div>
              <div className="text-sm text-muted-foreground">Present</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{attendanceStats.absent}</div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{attendanceStats.late}</div>
              <div className="text-sm text-muted-foreground">Late</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{attendanceStats.excused}</div>
              <div className="text-sm text-muted-foreground">Excused</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>Mark attendance for each student</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[200px]"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction(AttendanceStatusType.PRESENT)}
              >
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction(AttendanceStatusType.ABSENT)}
              >
                Mark All Absent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingClass || isLoadingAttendance ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStudents.map((student: any) => {
                const record = attendanceRecords[student.id];
                return (
                  <div key={student.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {student.user?.name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="font-medium">{student.user?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.enrollmentNumber}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {Object.values(AttendanceStatusType).map((status) => (
                        <Button
                          key={status}
                          variant={record?.status === status ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleStatusChange(student.id, status)}
                          className={record?.status === status ? getStatusColor(status) : ''}
                        >
                          {getStatusIcon(status)}
                          <span className="ml-1 capitalize">{status.toLowerCase()}</span>
                        </Button>
                      ))}
                    </div>

                    <div className="w-[200px]">
                      <Input
                        placeholder="Remarks (optional)"
                        value={record?.remarks || ''}
                        onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students found matching your search</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
