'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/forms/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/forms/select';
import { Textarea } from '@/components/ui/forms/textarea';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { Save, X } from 'lucide-react';

const enrollmentEditSchema = z.object({
  status: z.enum(['ACTIVE', 'PENDING', 'COMPLETED', 'WITHDRAWN', 'INACTIVE'], {
    required_error: 'Status is required',
  }),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  notes: z.string().optional(),
});

type EnrollmentEditFormValues = z.infer<typeof enrollmentEditSchema>;

interface EnrollmentEditFormProps {
  enrollment: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EnrollmentEditForm({ enrollment, onSuccess, onCancel }: EnrollmentEditFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EnrollmentEditFormValues>({
    resolver: zodResolver(enrollmentEditSchema),
    defaultValues: {
      status: enrollment.status,
      startDate: enrollment.startDate ? new Date(enrollment.startDate) : new Date(),
      endDate: enrollment.endDate ? new Date(enrollment.endDate) : undefined,
      notes: enrollment.notes || '',
    },
  });

  const updateEnrollment = api.enrollment.updateEnrollment.useMutation({
    onSuccess: () => {
      setIsSubmitting(false);
      toast({
        title: 'Success',
        description: 'Enrollment updated successfully.',
      });
      onSuccess();
    },
    onError: (error) => {
      setIsSubmitting(false);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update enrollment.',

      });
    },
  });

  const onSubmit = (data: EnrollmentEditFormValues) => {
    setIsSubmitting(true);
    updateEnrollment.mutate({
      data: {
        id: enrollment.id,
        status: data.status,
        startDate: data.startDate,
        endDate: data.endDate,
      },
      updatedById: enrollment.id, // This should be the current user ID
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Student and Class Info (Read-only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Student</label>
            <p className="text-sm">{enrollment.student?.user?.name}</p>
            <p className="text-xs text-muted-foreground">{enrollment.student?.user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Class</label>
            <p className="text-sm">{enrollment.class?.name}</p>
            <p className="text-xs text-muted-foreground">
              {enrollment.class?.courseCampus?.course?.name} - {enrollment.class?.campus?.name}
            </p>
          </div>
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
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
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <DatePicker
                  date={field.value}
                  setDate={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date (Optional)</FormLabel>
                <DatePicker
                  date={field.value}
                  setDate={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this enrollment..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="mr-2">Updating...</span>
                <span className="animate-spin">⏳</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Update Enrollment
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
