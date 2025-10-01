'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/atoms/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/forms/date-picker';
import { Textarea } from '@/components/ui/forms/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/forms/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/feedback/toast';
import { api } from '@/trpc/react';
import { SystemStatus } from '@/server/api/constants';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/forms/form';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Define the form schema
const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date({
    required_error: 'End date is required',
  }),
  type: z.enum(['REGISTRATION','ADD_DROP','WITHDRAWAL','EXAMINATION','GRADING','ORIENTATION','GRADUATION','OTHER'], {
    required_error: 'Event type is required'
  }),
  status: z.string().min(1, 'Status is required'),
  location: z.string().optional(),
  institutionId: z.string().optional(),
  campusIds: z.array(z.string()).optional(),
  sendNotifications: z.boolean().default(true),
});

type EventFormValues = z.infer<typeof eventSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);



  // Fetch campuses for dropdown (system admin sees all, campus admin sees only their campus)
  const { data: campuses = [] } = api.campus.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  // Get user's campus ID from their profile
  const userCampusId = (user as any)?.primaryCampusId;

  // Filter campuses based on user role
  const availableCampuses = user?.userType === 'SYSTEM_ADMIN' || user?.userType === 'SYSTEM_MANAGER'
    ? campuses
    : campuses.filter(campus => campus.id === userCampusId);

  // Initialize the form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 1)),
      type: 'REGISTRATION',
      status: SystemStatus.ACTIVE,
      location: '',
      campusIds: user?.userType === 'CAMPUS_ADMIN' && userCampusId ? [userCampusId] : [],
      sendNotifications: true,
    },
  });

  // Create academic event mutation
  const createAcademicEvent = api.unifiedCalendar.createAcademicEventWithSync.useMutation({
    onError: (error) => {
      toast({ title: 'Error', description: error.message || 'Failed to create academic event', variant: 'error' });
    }
  });

  // Submit function with notification support
  const onSubmit = async (data: EventFormValues) => {
    if (createAcademicEvent.isLoading || isSubmitting) return; // prevent duplicate clicks
    setIsSubmitting(true);
    try {
      // Make sure institutionId is set
      if (!data.institutionId && user?.institutionId) {
        data.institutionId = user.institutionId;
      }

      // Determine campus scope based on user role
      let campusIds = data.campusIds || [];

      // Campus admins can only create events for their own campus
      if (user?.userType === 'CAMPUS_ADMIN' && userCampusId) {
        campusIds = [userCampusId];
      }

      // Create the event with notification option and campus scope
      const eventData = {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type,
        status: data.status,
        location: data.location,
        institutionId: data.institutionId,
        campusIds: campusIds,
        sendNotifications: data.sendNotifications,
      };

      console.log('Submitting event data:', eventData);

      // Call the unified calendar API to create academic event
      await createAcademicEvent.mutateAsync({
        name: eventData.name,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        campusIds: eventData.campusIds,
        // academicCycleId is now optional, so we don't need to provide it
        type: eventData.type,
        priority: 'NORMAL',
        syncOptions: {
          syncToStudents: true,
          syncToTeachers: true,
          syncToCampusUsers: false,
          notifyUsers: eventData.sendNotifications
        }
      });

      // Show success message with campus scope info
      const campusScope = campusIds.length > 0
        ? `for ${campusIds.length} campus${campusIds.length > 1 ? 'es' : ''}`
        : 'for all campuses';

      toast({
        title: 'Success',
        description: `Academic event created successfully ${campusScope}${data.sendNotifications ? ' and notifications sent' : ''}`,
        variant: 'success',
      });

      // Navigate back to calendar page
      router.push('/admin/system/calendar');
    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: 'Failed to create academic event',
        variant: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Create Academic Event"
        description="Add a new event to the academic calendar"
      />

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter event name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="REGISTRATION">Registration</SelectItem>
                        <SelectItem value="ADD_DROP">Add/Drop</SelectItem>
                        <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                        <SelectItem value="EXAMINATION">Examination</SelectItem>
                        <SelectItem value="GRADING">Grading</SelectItem>
                        <SelectItem value="ORIENTATION">Orientation</SelectItem>
                        <SelectItem value="GRADUATION">Graduation</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
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
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={SystemStatus.ACTIVE}>Active</SelectItem>
                        <SelectItem value={SystemStatus.INACTIVE}>Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter event location" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />



            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter event description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campus Selection */}
            <FormField
              control={form.control}
              name="campusIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Target Campuses {user?.userType === 'CAMPUS_ADMIN' ? '' : '(Optional)'}
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {availableCampuses.map((campus) => (
                        <div key={campus.id} className="flex items-center space-x-2">
                          <Checkbox
                            checked={field.value?.includes(campus.id) || false}
                            disabled={user?.userType === 'CAMPUS_ADMIN'}
                            onCheckedChange={(checked) => {
                              if (user?.userType === 'CAMPUS_ADMIN') return; // Prevent changes for campus admin
                              const currentValue = field.value || [];
                              if (checked) {
                                field.onChange([...currentValue, campus.id]);
                              } else {
                                field.onChange(currentValue.filter((id: string) => id !== campus.id));
                              }
                            }}
                          />
                          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {campus.name}
                            {user?.userType === 'CAMPUS_ADMIN' && campus.id === userCampusId && (
                              <span className="ml-2 text-xs text-muted-foreground">(Your Campus)</span>
                            )}
                          </label>
                        </div>
                      ))}
                      {availableCampuses.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {user?.userType === 'CAMPUS_ADMIN'
                            ? 'No campus assigned to your account'
                            : 'No campuses available'
                          }
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <p className="text-sm text-muted-foreground">
                    {user?.userType === 'CAMPUS_ADMIN'
                      ? 'As a campus admin, events will be created for your assigned campus only.'
                      : 'Leave empty to apply to all campuses. Select specific campuses to limit scope.'
                    }
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sendNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Send Notifications
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Notify relevant users (students, teachers, staff) about this event
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/admin/system/calendar')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || createAcademicEvent.isLoading}>
                {(isSubmitting || createAcademicEvent.isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting || createAcademicEvent.isLoading ? 'Creating…' : 'Create Event'}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}