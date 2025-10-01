'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/atoms/button';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/forms/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, Save } from 'lucide-react';
import { useToast } from '@/components/ui/feedback/toast';
import { SystemStatus } from '@prisma/client';
import { api } from '@/trpc/react';

// Form schema for class editing
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  minCapacity: z.coerce.number().int().min(1, 'Minimum capacity must be at least 1'),
  maxCapacity: z.coerce.number().int().min(1, 'Maximum capacity must be greater than minimum'),
  facilityId: z.string().nullable(),
  status: z.nativeEnum(SystemStatus),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditSystemClassPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const classId = params?.id as string;

  // Fetch class details
  const { data: classData, isLoading: isLoadingClass } = api.class.getById.useQuery(
    {
      classId,
      include: {
        facility: true,
        courseCampus: {
          include: {
            course: true,
            campus: true
          }
        }
      }
    },
    {
      enabled: !!classId,
      retry: 1,
    }
  );

  // Fetch available facilities for the campus
  const { data: facilitiesData } = api.facility.getFacilitiesByCampus.useQuery(
    { campusId: classData?.courseCampus?.campusId || '' },
    {
      enabled: !!classData?.courseCampus?.campusId,
    }
  );

  // Extract facilities array from the response
  const facilities = facilitiesData?.facilities || [];

  // Update mutation
  const updateClass = api.class.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Class updated successfully',
        variant: 'success',
      });
      router.push(`/admin/system/classes/${classId}`);
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update class',
        variant: 'error',
      });
    },
  });

  // Form initialization
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      minCapacity: 1,
      maxCapacity: 30,
      facilityId: null,
      status: SystemStatus.ACTIVE,
    },
  });

  // Set form values when data is loaded
  useEffect(() => {
    if (classData) {
      form.reset({
        name: classData.name,
        code: classData.code,
        minCapacity: classData.minCapacity,
        maxCapacity: classData.maxCapacity,
        facilityId: classData.facilityId || null,
        status: classData.status,
      });
    }
  }, [classData, form]);

  const onSubmit = async (data: FormValues) => {
    updateClass.mutate({
      id: classId,
      name: data.name,
      status: data.status,
      minCapacity: data.minCapacity,
      maxCapacity: data.maxCapacity,
      facilityId: data.facilityId || undefined
    });
  };

  if (isLoadingClass) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Class not found</h1>
          <p className="text-gray-600 mt-2">The class you're looking for doesn't exist.</p>
          <Link href="/admin/system/classes">
            <Button className="mt-4">Back to Classes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Link href={`/admin/system/classes/${classId}`}>
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <PageHeader
          title={`Edit ${classData.name}`}
          description="Update class details and settings"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Class Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="minCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Capacity</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facility</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a facility" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">No facility</SelectItem>
                          {facilities?.map((facility) => (
                            <SelectItem key={facility.id} value={facility.id}>
                              {facility.name} ({facility.code})
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
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={SystemStatus.ACTIVE}>Active</SelectItem>
                          <SelectItem value={SystemStatus.INACTIVE}>Inactive</SelectItem>
                          <SelectItem value={SystemStatus.ARCHIVED}>Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/admin/system/classes/${classId}`)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateClass.isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateClass.isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
