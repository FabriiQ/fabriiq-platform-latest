"use client";

import { useState, useEffect } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { api } from "@/trpc/react";
import { useToast } from "@/components/ui/feedback/toast";
import { AttendanceStatusType } from "@/server/api/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Save, Users, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Teacher {
  id: string;
  name: string;
  email: string;
  phone?: string;
  attendance?: {
    id: string;
    status: string;
    checkInTime?: Date;
    checkOutTime?: Date;
    remarks?: string;
  } | null;
}

interface TeacherAttendanceRecorderProps {
  campusId: string;
  initialDate?: Date;
  onSuccess?: () => void;
}

interface AttendanceRecord {
  teacherId: string;
  status: AttendanceStatusType;
  checkInTime?: Date;
  checkOutTime?: Date;
  remarks?: string;
}

const statusOptions = [
  { value: AttendanceStatusType.PRESENT, label: "Present", color: "bg-green-500", icon: CheckCircle },
  { value: AttendanceStatusType.ABSENT, label: "Absent", color: "bg-red-500", icon: XCircle },
  { value: AttendanceStatusType.LATE, label: "Late", color: "bg-yellow-500", icon: Clock },
  { value: AttendanceStatusType.EXCUSED, label: "Excused", color: "bg-blue-500", icon: AlertCircle },
  { value: AttendanceStatusType.LEAVE, label: "Leave", color: "bg-purple-500", icon: AlertCircle },
];

export function TeacherAttendanceRecorder({
  campusId,
  initialDate = new Date(),
  onSuccess,
}: TeacherAttendanceRecorderProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [searchTerm, setSearchTerm] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatusType | "">("");
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  // Fetch teachers for attendance
  const {
    data: teachersData,
    isLoading: isLoadingTeachers,
    refetch: refetchTeachers,
  } = api.teacherAttendance.getTeachersForAttendance.useQuery(
    {
      campusId,
      date: selectedDate,
    },
    {
      refetchOnWindowFocus: false,
      retry: 1,
    }
  );

  // Bulk create mutation
  const bulkCreateMutation = api.teacherAttendance.bulkCreate.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
          variant: "default",
        });
        refetchTeachers();
        onSuccess?.();
      } else {
        toast({
          title: "Partial Success",
          description: `${data.message}. ${data.errors?.length || 0} errors occurred.`,
          variant: "destructive",
        });
      }
      setIsSubmitting(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save attendance",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const teachers = teachersData?.teachers || [];
  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Initialize attendance records from existing data
  useEffect(() => {
    if (teachers.length > 0) {
      const initialRecords: Record<string, AttendanceRecord> = {};
      teachers.forEach(teacher => {
        if (teacher.attendance) {
          initialRecords[teacher.id] = {
            teacherId: teacher.id,
            status: teacher.attendance.status as AttendanceStatusType,
            checkInTime: teacher.attendance.checkInTime || undefined,
            checkOutTime: teacher.attendance.checkOutTime || undefined,
            remarks: teacher.attendance.remarks || undefined,
          };
        }
      });
      setAttendanceRecords(initialRecords);
    }
  }, [teachers]);

  const handleStatusChange = (teacherId: string, status: AttendanceStatusType) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        teacherId,
        status,
      },
    }));
  };

  const handleRemarksChange = (teacherId: string, remarks: string) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        teacherId,
        remarks,
      },
    }));
  };

  const handleTimeChange = (teacherId: string, field: 'checkInTime' | 'checkOutTime', time: string) => {
    if (!time) return;
    
    const [hours, minutes] = time.split(':');
    const timeDate = new Date(selectedDate);
    timeDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    setAttendanceRecords(prev => ({
      ...prev,
      [teacherId]: {
        ...prev[teacherId],
        teacherId,
        [field]: timeDate,
      },
    }));
  };

  const handleBulkStatusApply = () => {
    if (!bulkStatus || selectedTeachers.size === 0) return;

    const updates: Record<string, AttendanceRecord> = {};
    selectedTeachers.forEach(teacherId => {
      updates[teacherId] = {
        ...attendanceRecords[teacherId],
        teacherId,
        status: bulkStatus,
      };
    });

    setAttendanceRecords(prev => ({ ...prev, ...updates }));
    setBulkStatus("");
    setSelectedTeachers(new Set());
  };

  const handleSelectAll = () => {
    if (selectedTeachers.size === filteredTeachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(filteredTeachers.map(t => t.id)));
    }
  };

  const handleTeacherSelect = (teacherId: string) => {
    const newSelected = new Set(selectedTeachers);
    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
    } else {
      newSelected.add(teacherId);
    }
    setSelectedTeachers(newSelected);
  };

  const handleSubmit = async () => {
    const records = Object.values(attendanceRecords).filter(record => record.status);
    
    if (records.length === 0) {
      toast({
        title: "No Records",
        description: "Please mark attendance for at least one teacher",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    bulkCreateMutation.mutate({
      campusId,
      date: selectedDate,
      records,
    });
  };

  const getStatusBadge = (status: AttendanceStatusType) => {
    const option = statusOptions.find(opt => opt.value === status);
    if (!option) return null;

    const Icon = option.icon;
    return (
      <Badge variant="secondary" className={cn("text-white", option.color)}>
        <Icon className="w-3 h-3 mr-1" />
        {option.label}
      </Badge>
    );
  };

  if (isLoadingTeachers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Teachers...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher Attendance
          </CardTitle>
          <CardDescription>
            Mark attendance for teachers on {format(selectedDate, "MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Picker */}
          <div className="flex items-center gap-4">
            <DatePicker
              value={selectedDate}
              onChange={(date) => date && setSelectedDate(date)}
              placeholder="Select date"
            />
            <div className="text-sm text-muted-foreground">
              {teachers.length} teachers found
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search teachers by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Bulk Actions */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Checkbox
              checked={selectedTeachers.size === filteredTeachers.length && filteredTeachers.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              Select All ({selectedTeachers.size} selected)
            </span>
            <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as AttendanceStatusType)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Bulk Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkStatusApply}
              disabled={!bulkStatus || selectedTeachers.size === 0}
              variant="outline"
              size="sm"
            >
              Apply to Selected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teachers List */}
      <div className="space-y-4">
        {filteredTeachers.map(teacher => {
          const record = attendanceRecords[teacher.id];
          const isSelected = selectedTeachers.has(teacher.id);

          return (
            <Card key={teacher.id} className={cn("transition-all", isSelected && "ring-2 ring-primary")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleTeacherSelect(teacher.id)}
                  />
                  
                  <Avatar>
                    <AvatarFallback>
                      {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-medium">{teacher.name}</h3>
                    <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status */}
                    <Select
                      value={record?.status || ""}
                      onValueChange={(value) => handleStatusChange(teacher.id, value as AttendanceStatusType)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Check-in Time */}
                    <Input
                      type="time"
                      placeholder="Check-in"
                      value={record?.checkInTime ? format(record.checkInTime, "HH:mm") : ""}
                      onChange={(e) => handleTimeChange(teacher.id, 'checkInTime', e.target.value)}
                      className="w-32"
                    />

                    {/* Check-out Time */}
                    <Input
                      type="time"
                      placeholder="Check-out"
                      value={record?.checkOutTime ? format(record.checkOutTime, "HH:mm") : ""}
                      onChange={(e) => handleTimeChange(teacher.id, 'checkOutTime', e.target.value)}
                      className="w-32"
                    />

                    {/* Status Badge */}
                    {record?.status && getStatusBadge(record.status)}
                  </div>
                </div>

                {/* Remarks */}
                <div className="mt-4">
                  <Textarea
                    placeholder="Remarks (optional)"
                    value={record?.remarks || ""}
                    onChange={(e) => handleRemarksChange(teacher.id, e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(attendanceRecords).length === 0}
          className="min-w-32"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Attendance
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
