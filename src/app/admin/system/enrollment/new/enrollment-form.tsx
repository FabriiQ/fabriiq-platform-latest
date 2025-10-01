'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/forms/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/forms/form';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Save, Search } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/trpc/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';

const enrollmentFormSchema = z.object({
  campusId: z.string().optional(),
  studentId: z.string({
    required_error: 'Student is required',
  }),
  classId: z.string({
    required_error: 'Class is required',
  }),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  status: z.enum(['ACTIVE', 'PENDING', 'COMPLETED', 'WITHDRAWN', 'INACTIVE'], {
    required_error: 'Status is required',
  }).default('ACTIVE'),
  notes: z.string().optional(),
});

type Campus = {
  id: string;
  name: string;
  code: string;
};

type Student = {
  id: string;
  name: string;
  email: string;
  campusId: string;
  campusName?: string;
  enrollmentNumber?: string;
  phone?: string;
  isEnrolled?: boolean;
  enrollmentStatus?: string;
};

type Class = {
  id: string;
  name: string;
  campusId: string;
  campusName: string;
  programName: string;
  courseName: string;
  termName: string;
};

type SystemEnrollmentFormProps = {
  campuses: Campus[];
  students: Student[];
  classes: Class[];
};

export function SystemEnrollmentForm({ campuses, students, classes }: SystemEnrollmentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>('single');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [singleFormCampus, setSingleFormCampus] = useState<string>('');
  const [singleFormSearchTerm, setSingleFormSearchTerm] = useState<string>('');
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(students);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>(classes);
  const [singleFormStudents, setSingleFormStudents] = useState<Student[]>(students);
  const [singleFormClasses, setSingleFormClasses] = useState<Class[]>(classes);

  // tRPC mutations
  const createEnrollment = api.enrollment.createEnrollment.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      setError('');
      toast({
        title: 'Enrollment Created Successfully',
        description: 'The student has been enrolled in the selected class.',
      });
      router.push('/admin/system/enrollment');
    },
    onError: (error: any) => {
      setIsSubmitting(false);

      // Enhanced error handling with specific error types
      let errorTitle = 'Enrollment Failed';
      let errorDescription = 'An unexpected error occurred while creating the enrollment.';

      if (error.message) {
        if (error.message.includes('already enrolled')) {
          errorTitle = 'Student Already Enrolled';
          errorDescription = 'This student is already enrolled in the selected class or a similar class.';
        } else if (error.message.includes('not found')) {
          errorTitle = 'Invalid Selection';
          errorDescription = 'The selected student or class could not be found. Please refresh and try again.';
        } else if (error.message.includes('permission')) {
          errorTitle = 'Permission Denied';
          errorDescription = 'You do not have permission to enroll students in this class.';
        } else if (error.message.includes('capacity')) {
          errorTitle = 'Class Full';
          errorDescription = 'The selected class has reached its maximum capacity.';
        } else {
          errorDescription = error.message;
        }
      }

      setError(errorDescription);
      toast({
        title: errorTitle,
        description: errorDescription,

      });
    }
  });

  const bulkEnroll = api.enrollment.bulkEnroll.useMutation({
    onSuccess: (result) => {
      setIsSubmitting(false);
      setSelectedStudents([]);
      setSelectAll(false);
      bulkForm.reset();
      setError('');

      const enrolledCount = result?.count || selectedStudents.length;
      const failedCount = selectedStudents.length - enrolledCount;

      let successMessage = `Successfully enrolled ${enrolledCount} student${enrolledCount !== 1 ? 's' : ''}`;
      if (failedCount > 0) {
        successMessage += `. ${failedCount} student${failedCount !== 1 ? 's' : ''} could not be enrolled (may already be enrolled).`;
      }

      toast({
        title: 'Bulk Enrollment Completed',
        description: successMessage,
      });

      // Redirect after a short delay to show the success message
      setTimeout(() => {
        router.push('/admin/system/enrollment');
      }, 1500);
    },
    onError: (error: any) => {
      setIsSubmitting(false);

      // Enhanced error handling for bulk enrollment
      let errorTitle = 'Bulk Enrollment Failed';
      let errorDescription = 'An unexpected error occurred while enrolling students.';

      if (error.message) {
        if (error.message.includes('already enrolled')) {
          errorTitle = 'Some Students Already Enrolled';
          errorDescription = 'Some selected students are already enrolled in the class. Only new students were enrolled.';
        } else if (error.message.includes('no students')) {
          errorTitle = 'No Students Selected';
          errorDescription = 'Please select at least one student to enroll.';
        } else if (error.message.includes('class not found')) {
          errorTitle = 'Class Not Found';
          errorDescription = 'The selected class could not be found. Please refresh and try again.';
        } else if (error.message.includes('permission')) {
          errorTitle = 'Permission Denied';
          errorDescription = 'You do not have permission to perform bulk enrollment for this class.';
        } else {
          errorDescription = error.message;
        }
      }

      setError(errorDescription);
      toast({
        title: errorTitle,
        description: errorDescription,

      });
    }
  });

  const singleForm = useForm({
    resolver: zodResolver(enrollmentFormSchema),
    defaultValues: {
      campusId: '',
      studentId: '',
      classId: '',
      startDate: new Date(),
      endDate: undefined,
      status: 'ACTIVE',
      notes: '',
    },
  });

  const bulkForm = useForm({
    resolver: zodResolver(
      z.object({
        campusId: z.string({
          required_error: 'Campus is required',
        }),
        classId: z.string({
          required_error: 'Class is required',
        }),
        startDate: z.date({
          required_error: 'Start date is required',
        }),
        status: z.enum(['ACTIVE', 'PENDING'], {
          required_error: 'Status is required',
        }).default('ACTIVE'),
      })
    ),
    defaultValues: {
      campusId: 'all',
      classId: '',
      startDate: new Date(),
      status: 'ACTIVE',
    },
  });

  // Filter students and classes when campus selection changes
  useEffect(() => {
    if (selectedCampus === 'all') {
      setFilteredStudents(students);
      setFilteredClasses(classes);
    } else {
      setFilteredStudents(students.filter(student => student.campusId === selectedCampus));
      setFilteredClasses(classes.filter(classItem => classItem.campusId === selectedCampus));
    }
  }, [selectedCampus, students, classes]);

  // Filter students based on search term
  useEffect(() => {
    const filtered = students.filter(student => {
      const matchesCampus = selectedCampus === 'all' || student.campusId === selectedCampus;
      const matchesSearch = searchTerm === '' || 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        student.email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCampus && matchesSearch;
    });
    setFilteredStudents(filtered);
  }, [searchTerm, selectedCampus, students]);

  // Handle select all checkbox
  useEffect(() => {
    if (selectAll) {
      setSelectedStudents(filteredStudents.map(student => student.id));
    } else {
      setSelectedStudents([]);
    }
  }, [selectAll, filteredStudents]);

  // Filter students and classes for single form when campus or search changes
  useEffect(() => {
    let filteredStudents = students;
    let filteredClasses = classes;

    // Filter by campus
    if (singleFormCampus !== '') {
      filteredStudents = filteredStudents.filter(student => student.campusId === singleFormCampus);
      filteredClasses = filteredClasses.filter(classItem => classItem.campusId === singleFormCampus);
    }

    // Filter students by search term
    if (singleFormSearchTerm !== '') {
      filteredStudents = filteredStudents.filter(student =>
        student.name.toLowerCase().includes(singleFormSearchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(singleFormSearchTerm.toLowerCase())
      );
    }

    setSingleFormStudents(filteredStudents);
    setSingleFormClasses(filteredClasses);

    // Reset form selections when filters change
    if (singleFormCampus !== '' || singleFormSearchTerm !== '') {
      singleForm.setValue('studentId', '');
      singleForm.setValue('classId', '');
    }
  }, [singleFormCampus, singleFormSearchTerm, students, classes, singleForm]);

  // Handle student checkbox change
  const handleStudentCheckboxChange = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  // Handle single enrollment form submission
  function onSubmitSingle(data: any) {
    setIsSubmitting(true);
    setError('');

    // Use session from useSession hook
    if (!session?.user?.id) {
      setError('User session not found');
      setIsSubmitting(false);
      return;
    }

    createEnrollment.mutate({
      studentId: data.studentId,
      classId: data.classId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      notes: data.notes,
      createdById: session.user.id,
    });
  }

  // Handle bulk enrollment form submission
  function onSubmitBulk(data: any) {
    if (selectedStudents.length === 0) {
      setError('Please select at least one student');
      toast({
        title: 'Error',
        description: 'Please select at least one student',
      });
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Use session from useSession hook instead of API call
    if (!session?.user?.id) {
      setError('User session not found');
      setIsSubmitting(false);
      return;
    }

    bulkEnroll.mutate({
      studentIds: selectedStudents,
      classId: data.classId,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "ACTIVE", // Default status for bulk enrollment
      createdById: session.user.id,
      notes: data.notes,
    });
  }

  return (
    <Tabs defaultValue="single" className="w-full" onValueChange={setActiveTab}>
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="single">Single Enrollment</TabsTrigger>
        <TabsTrigger value="bulk">Bulk Enrollment</TabsTrigger>
      </TabsList>

      <TabsContent value="single" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Create New Enrollment</CardTitle>
            <CardDescription>Enroll a student in a class</CardDescription>
          </CardHeader>
          <Form {...singleForm}>
            <form onSubmit={singleForm.handleSubmit(onSubmitSingle)}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <FormLabel>Campus Filter</FormLabel>
                  <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {campuses.map((campus) => (
                        <SelectItem key={campus.id} value={campus.id}>
                          {campus.name} ({campus.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <FormField
                  control={singleForm.control}
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        setSingleFormCampus(value);
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {campuses.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id}>
                              {campus.name} ({campus.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select a campus to filter students and classes
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Search Students</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name or email..."
                      value={singleFormSearchTerm}
                      onChange={(e) => setSingleFormSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <FormField
                  control={singleForm.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student</FormLabel>
                      <div className="space-y-2">
                        {field.value ? (
                          <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                            <div>
                              <p className="font-medium">
                                {singleFormStudents.find(s => s.id === field.value)?.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {singleFormStudents.find(s => s.id === field.value)?.email}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => field.onChange('')}
                            >
                              Change
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="max-h-48 overflow-y-auto border rounded-md">
                              {singleFormStudents.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                  {singleFormCampus ? 'No students found for selected campus' : 'No students available'}
                                </div>
                              ) : (
                                singleFormStudents.map((student) => (
                                  <div
                                    key={student.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                    onClick={() => field.onChange(student.id)}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="font-medium">{student.name}</p>
                                        <p className="text-sm text-gray-500">{student.email}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={singleForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {singleFormClasses.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name} - {classItem.courseName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={singleForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={singleForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={singleForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any additional notes here"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/admin/system/enrollment">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Processing...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Enrollment
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </TabsContent>

      <TabsContent value="bulk" className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Bulk Enrollment</CardTitle>
            <CardDescription>Enroll multiple students in a class</CardDescription>
          </CardHeader>
          <Form {...bulkForm}>
            <form onSubmit={bulkForm.handleSubmit(onSubmitBulk)}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
                    {error}
                  </div>
                )}

                <FormField
                  control={bulkForm.control}
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedCampus(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a campus" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Campuses</SelectItem>
                          {campuses.map((campus) => (
                            <SelectItem key={campus.id} value={campus.id}>
                              {campus.name} ({campus.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={bulkForm.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredClasses.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name} - {classItem.courseName} ({classItem.campusName})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={bulkForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={bulkForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border rounded-md p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectAll}
                        onCheckedChange={(checked) => setSelectAll(checked === true)}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium">
                        Select All Students
                      </label>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto border rounded-md">
                    <div className="p-2 space-y-2">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <div key={student.id} className="flex items-start space-x-3 p-3 hover:bg-accent rounded-md border border-transparent hover:border-border">
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked) => handleStudentCheckboxChange(student.id, checked === true)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <label htmlFor={`student-${student.id}`} className="font-medium text-sm cursor-pointer">
                                  {student.name}
                                </label>
                                {student.isEnrolled && (
                                  <Badge variant="secondary" className="text-xs">
                                    Enrolled
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1 space-y-1">
                                <p className="text-xs text-muted-foreground">{student.email}</p>
                                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                  {student.enrollmentNumber && (
                                    <span>ID: {student.enrollmentNumber}</span>
                                  )}
                                  {student.campusName && (
                                    <span>Campus: {student.campusName}</span>
                                  )}
                                  {student.phone && (
                                    <span>Phone: {student.phone}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground">
                          No students found matching your search criteria
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {selectedStudents.length} students selected
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/admin/system/enrollment">Cancel</Link>
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="mr-2">Processing...</span>
                      <span className="animate-spin">⏳</span>
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Create Bulk Enrollment
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
