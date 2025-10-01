 'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from '@/trpc/react';
import { Button } from "@/components/ui/atoms/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/data-display/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/forms/form";
import { Input } from "@/components/ui/atoms/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/atoms/textarea";
import { Checkbox } from "@/components/ui/atoms/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/navigation/tabs";
import { Save, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TRPCClientErrorLike } from '@trpc/client';
import { AppRouter } from '@/server/api/root';
import { SystemStatus } from '@prisma/client';
import type { CreateStudentResult } from '@/server/api/services/student-validation.service';

// Emergency contact relationship options
const RELATIONSHIP_OPTIONS = [
  { value: "PARENT", label: "Parent" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "SIBLING", label: "Sibling" },
  { value: "GRANDPARENT", label: "Grandparent" },
  { value: "AUNT_UNCLE", label: "Aunt/Uncle" },
  { value: "FRIEND", label: "Friend" },
  { value: "OTHER", label: "Other" },
] as const;

// Define the schema for the form
const systemStudentFormSchema = z.object({
  firstName: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  lastName: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], {
    required_error: "Please select a gender.",
  }).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  campusId: z.string().min(1, {
    message: "Please select a campus",
  }),
  programId: z.string().optional(),
  courseId: z.string().optional(),
  classId: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.enum(["PARENT", "GUARDIAN", "SPOUSE", "SIBLING", "GRANDPARENT", "AUNT_UNCLE", "FRIEND", "OTHER"]).optional(),
  notes: z.string().optional(),
  sendInvitation: z.boolean().optional(),
  requirePasswordChange: z.boolean().optional(),
  // Manual credential creation fields
  createManualAccount: z.boolean().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

// Conditional validation schema
const systemStudentFormSchemaWithValidation = systemStudentFormSchema.refine(
  (data) => {
    if (data.createManualAccount) {
      return data.username && data.username.length >= 3 && data.password && data.password.length >= 6;
    }
    return true;
  },
  {
    message: "Username (min 3 chars) and password (min 6 chars) are required when creating manual account",
    path: ["username"],
  }
);

type SystemStudentFormData = z.infer<typeof systemStudentFormSchemaWithValidation>;

interface Campus {
  id: string;
  name: string;
  code: string;
}

interface Program {
  id: string;
  name: string;
  code: string;
  campusId: string;
}

interface Course {
  id: string;
  name: string;
  code: string;
  programId: string;
}

interface Class {
  id: string;
  name: string;
  code: string;
  courseId: string;
}

interface SystemStudentFormProps {
  userId: string;
  campuses: Campus[];
  isLoadingCampuses: boolean;
  studentId?: string;
  initialData?: Partial<SystemStudentFormData>;
}

export function SystemStudentForm({
  userId,
  campuses,
  isLoadingCampuses,
  studentId,
  initialData
}: SystemStudentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("none");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("none");
  const router = useRouter();
  const isEditing = !!studentId && !!initialData;

  // Get programs for selected campus
  const { data: programCampuses, isLoading: isLoadingPrograms } = api.program.getProgramCampusesByCampus.useQuery(
    { campusId: selectedCampusId },
    { enabled: selectedCampusId !== "" }
  );

  // Extract programs from program campuses
  const programs = programCampuses?.map(pc => ({
    id: pc.program.id,
    name: pc.program.name,
    code: pc.program.code,
    campusId: selectedCampusId, // Add campusId for filtering
  })) || [];

  // Get courses for selected program
  const { data: coursesResponse, isLoading: isLoadingCourses } = api.course.listByProgram.useQuery(
    { programId: selectedProgramId },
    { enabled: selectedProgramId !== "none" && selectedProgramId !== "" }
  );

  // Extract courses array from response
  const courses = coursesResponse?.courses || [];

  // Get courseCampus for selected course and campus
  const { data: courseCampus } = api.course.getCampus.useQuery(
    { courseId: selectedCourseId, campusId: selectedCampusId },
    { enabled: selectedCourseId !== "none" && selectedCourseId !== "" && selectedCampusId !== "" }
  );

  // Get classes for selected course campus
  const { data: classes = [], isLoading: isLoadingClasses } = api.class.getByCourseCampus.useQuery(
    { courseCampusId: courseCampus?.id || "" },
    { enabled: !!courseCampus?.id }
  );

  // Create student mutation
  const createSystemStudent = api.user.createStudent.useMutation({
    onSuccess: (result: CreateStudentResult) => {
      console.log('Mutation success:', result);
      setIsSubmitting(false);

      // Handle the CreateStudentResult response
      if (result && typeof result === 'object') {
        if (result.success === true) {
          toast.success(result.message || "Student created successfully");
          router.push("/admin/system/students");
        } else {
          console.error('Student creation failed:', result);
          toast.error(result.message || "Failed to create student");

          // Handle validation errors if present
          if (result.validation?.errors) {
            const errors = result.validation.errors;
            if (errors.email) {
              form.setError("email", { type: "manual", message: errors.email });
            }
            if (errors.username) {
              form.setError("username", { type: "manual", message: errors.username });
            }
            if (errors.general) {
              toast.error(errors.general);
            }
          }
        }
      } else {
        console.error('Invalid result structure:', result);
        toast.error("Student creation failed - invalid response");
      }
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Mutation error:', error);
      setIsSubmitting(false);
      toast.error(error.message || "Failed to create student");
    },
  });

  // Set default values based on whether we're editing or creating
  const defaultValues: SystemStudentFormData = initialData
    ? {
        firstName: initialData.firstName || "",
        lastName: initialData.lastName || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        dateOfBirth: initialData.dateOfBirth || "",
        gender: initialData.gender,
        address: initialData.address || "",
        city: initialData.city || "",
        state: initialData.state || "",
        postalCode: initialData.postalCode || "",
        country: initialData.country || "United States",
        campusId: initialData.campusId || "",
        programId: initialData.programId || "none",
        courseId: initialData.courseId || "none",
        classId: initialData.classId || "none",
        emergencyContactName: initialData.emergencyContactName || "",
        emergencyContactPhone: initialData.emergencyContactPhone || "",
        emergencyContactRelationship: initialData.emergencyContactRelationship || undefined,
        notes: initialData.notes || "",
        sendInvitation: initialData.sendInvitation ?? true,
        requirePasswordChange: initialData.requirePasswordChange ?? true,
        createManualAccount: initialData.createManualAccount ?? false,
        username: initialData.username || "",
        password: initialData.password || "",
      }
    : {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: undefined,
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "United States",
        campusId: "",
        programId: "none",
        courseId: "none",
        classId: "none",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelationship: undefined,
        notes: "",
        sendInvitation: true,
        requirePasswordChange: true,
        createManualAccount: false,
        username: "",
        password: "",
      };

  const form = useForm<SystemStudentFormData>({
    resolver: zodResolver(systemStudentFormSchemaWithValidation),
    defaultValues
  });

  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData && isEditing) {
      const updatedDefaults = {
        ...defaultValues,
        ...initialData,
      };
      form.reset(updatedDefaults);
    }
  }, [initialData, isEditing, form]);

  // Watch for form changes to update hierarchical selections
  const watchedCampusId = form.watch("campusId");
  const watchedProgramId = form.watch("programId");
  const watchedCourseId = form.watch("courseId");
  const createManualAccount = form.watch("createManualAccount");

  // Update state when form values change
  useEffect(() => {
    if (watchedCampusId !== selectedCampusId) {
      setSelectedCampusId(watchedCampusId);
      // Reset dependent fields when campus changes
      form.setValue("programId", "none");
      form.setValue("courseId", "none");
      form.setValue("classId", "none");
    }
  }, [watchedCampusId, selectedCampusId, form]);

  useEffect(() => {
    if (watchedProgramId !== selectedProgramId) {
      setSelectedProgramId(watchedProgramId);
      // Reset dependent fields when program changes
      form.setValue("courseId", "none");
      form.setValue("classId", "none");
    }
  }, [watchedProgramId, selectedProgramId, form]);

  useEffect(() => {
    if (watchedCourseId !== selectedCourseId) {
      setSelectedCourseId(watchedCourseId);
      // Reset dependent field when course changes
      form.setValue("classId", "none");
    }
  }, [watchedCourseId, selectedCourseId, form]);

  async function onSubmit(data: SystemStudentFormData) {
    try {
      setIsSubmitting(true);
      console.log('Form submission started');
      console.log('Submitting data:', data);

      // Validate required fields
      if (!data.campusId) {
        toast.error("Please select a campus");
        setIsSubmitting(false);
        return;
      }

      if (isEditing && studentId) {
        // Update existing student - would need to implement this mutation
        toast.info("Student editing not yet implemented");
        setIsSubmitting(false);
      } else {
        console.log('Creating new student...');

        const mutationData = {
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          username: data.createManualAccount && data.username ? data.username : undefined,
          password: data.createManualAccount && data.password ? data.password : undefined,
          phoneNumber: data.phone,
          campusId: data.campusId,
          classId: data.classId && data.classId !== "none" ? data.classId : undefined,
          profileData: {
            dateOfBirth: data.dateOfBirth,
            address: data.address,
            city: data.city,
            state: data.state,
            postalCode: data.postalCode,
            country: data.country,
            gender: data.gender,
            emergencyContact: {
              name: data.emergencyContactName,
              phone: data.emergencyContactPhone,
              relationship: data.emergencyContactRelationship,
            },
            notes: data.notes,
            sendInvitation: data.sendInvitation,
            requirePasswordChange: data.requirePasswordChange,
            createManualAccount: data.createManualAccount,
          },
        };

        console.log('Mutation data:', mutationData);
        createSystemStudent.mutate(mutationData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error("An error occurred while submitting the form");
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          {isEditing ? "Edit Student" : "Create New Student"}
        </CardTitle>
        <CardDescription>
          {isEditing 
            ? "Update student information and settings" 
            : "Add a new student to the system with complete profile information"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log('Form validation errors:', errors);
            toast.error("Please fix the form errors before submitting");
          })} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="academic">Academic</TabsTrigger>
                <TabsTrigger value="account">Account</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                          <SelectItem value="PREFER_NOT_TO_SAY">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input placeholder="United States" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Emergency Contact</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 987-6543" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="emergencyContactRelationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RELATIONSHIP_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="academic" className="space-y-4">
                <FormField
                  control={form.control}
                  name="campusId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCampuses}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingCampuses ? "Loading campuses..." : "Select a campus"} />
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingPrograms || !selectedCampusId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedCampusId
                                ? "Select a campus first"
                                : isLoadingPrograms
                                  ? "Loading programs..."
                                  : "Select a program"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No program selected</SelectItem>
                          {programs.map((program) => (
                            <SelectItem key={program.id} value={program.id}>
                              {program.name} ({program.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingCourses || selectedProgramId === "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              selectedProgramId === "none"
                                ? "Select a program first"
                                : isLoadingCourses
                                  ? "Loading courses..."
                                  : "Select a course"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No course selected</SelectItem>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.name} ({course.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class (Optional)</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={isLoadingClasses || selectedCourseId === "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              selectedCourseId === "none"
                                ? "Select a course first"
                                : isLoadingClasses
                                  ? "Loading classes..."
                                  : "Select a class"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No class selected</SelectItem>
                          {classes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name} ({classItem.code || 'No Code'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about the student..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="account" className="space-y-4">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="sendInvitation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Send invitation email</FormLabel>
                          <FormDescription>
                            Send an email invitation to the student with login instructions
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requirePasswordChange"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Require password change on first login</FormLabel>
                          <FormDescription>
                            Force the student to change their password when they first log in
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="createManualAccount"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Create manual account credentials</FormLabel>
                          <FormDescription>
                            Manually set username and password instead of auto-generating
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {createManualAccount && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="student_username" {...field} />
                            </FormControl>
                            <FormDescription>
                              Minimum 3 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormDescription>
                              Minimum 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <CardFooter className="flex justify-between px-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/system/students")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Update Student" : "Create Student"}
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
