'use client';

import { useState } from 'react';
import { api } from '@/trpc/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  CalendarIcon, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Search,
  Save,
  ArrowLeft,
  UserCheck,
  UserX
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { AttendanceStatusType } from '@/server/api/constants';
import { cn } from '@/lib/utils';

type WorkflowStep = 'select' | 'attendance';

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatusType;
  remarks?: string;
}

export function StreamlinedAttendanceWorkflow() {
  const [step, setStep] = useState<WorkflowStep>('select');
  const [selectedCampusId, setSelectedCampusId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch campuses
  const { data: campuses } = api.campus.getAll.useQuery();

  // Fetch classes for selected campus
  const { data: classes } = api.class.getByCampusId.useQuery(
    { campusId: selectedCampusId },
    { enabled: !!selectedCampusId }
  );

  // Fetch class details and students
  const { data: classData, isLoading: isLoadingClass } = api.class.getById.useQuery(
    { classId: selectedClassId },
    { enabled: !!selectedClassId && step === 'attendance' }
  );

  // Fetch existing attendance
  const { data: existingAttendance } = api.attendance.getByQuery.useQuery(
    {
      classId: selectedClassId,
      date: selectedDate,
    },
    {
      enabled: !!selectedClassId && !!selectedDate && step === 'attendance',
      onSuccess: (data) => {
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
      setStep('select');
      setAttendanceRecords({});
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

  const handleStartAttendance = () => {
    if (!selectedCampusId || !selectedClassId) {
      toast.error('Please select campus and class');
      return;
    }
    setStep('attendance');
  };

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
    const records = Object.values(attendanceRecords).filter(record => record.status);
    
    if (records.length === 0) {
      toast.error('Please mark attendance for at least one student');
      return;
    }

    await markAttendanceMutation.mutateAsync({
      classId: selectedClassId,
      date: selectedDate,
      attendanceRecords: records,
    });
  };

  const getStatusColor = (status: AttendanceStatusType) => {
    switch (status) {
      case AttendanceStatusType.PRESENT:
        return 'bg-green-100 text-green-800 border-green-300';
      case AttendanceStatusType.ABSENT:
        return 'bg-red-100 text-red-800 border-red-300';
      case AttendanceStatusType.LATE:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case AttendanceStatusType.EXCUSED:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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

  if (step === 'select') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Take Attendance</h1>
          <p className="text-muted-foreground mt-2">
            Select a class and date to begin taking attendance
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Class Selection</CardTitle>
            <CardDescription>Choose the class and date for attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campus</label>
                <Select value={selectedCampusId} onValueChange={setSelectedCampusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {campuses?.map((campus: any) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <Select 
                  value={selectedClassId} 
                  onValueChange={setSelectedClassId}
                  disabled={!selectedCampusId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes?.map((classItem: any) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              onClick={handleStartAttendance}
              disabled={!selectedCampusId || !selectedClassId}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              Start Taking Attendance
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setStep('select')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Taking Attendance</h1>
          <p className="text-muted-foreground">
            {classData?.name} • {format(selectedDate, 'PPPP')}
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={markAttendanceMutation.isLoading || Object.keys(attendanceRecords).length === 0}
        >
          <Save className="h-4 w-4 mr-2" />
          {markAttendanceMutation.isLoading ? 'Saving...' : 'Save Attendance'}
        </Button>
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
                <UserCheck className="h-4 w-4 mr-2" />
                All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction(AttendanceStatusType.ABSENT)}
              >
                <UserX className="h-4 w-4 mr-2" />
                All Absent
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingClass ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading students...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student: any) => {
                const record = attendanceRecords[student.id];
                return (
                  <div key={student.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50">
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
                          className={cn(
                            "min-w-[80px]",
                            record?.status === status && getStatusColor(status)
                          )}
                        >
                          {getStatusIcon(status)}
                          <span className="ml-1 capitalize">{status.toLowerCase()}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
