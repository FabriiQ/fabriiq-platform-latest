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
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/trpc/react';
import { SystemStatus } from '@/server/api/constants';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/forms/form';
import { Loader2 } from 'lucide-react';

// Define the form schema
const holidaySchema = z.object({
  name: z.string().min(1, 'Holiday name is required'),
  description: z.string().optional(),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date({
    required_error: 'End date is required',
  }).optional(),
  type: z.string().min(1, 'Holiday type is required'),
  status: z.string().min(1, 'Status is required'),
  campusIds: z.array(z.string()).optional(),
  sendNotifications: z.boolean().default(true),
});

type HolidayFormValues = z.infer<typeof holidaySchema>;

export default function CreateHolidayPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch campuses for dropdown
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
  const form = useForm<HolidayFormValues>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      name: '',
      description: '',
      startDate: new Date(),
      type: 'OTHER',
      status: SystemStatus.ACTIVE,
      campusIds: user?.userType === 'CAMPUS_ADMIN' && userCampusId ? [userCampusId] : [],
      sendNotifications: true,
    },
  });

  // Create holiday with sync mutation
  const createHolidayMutation = api.unifiedCalendar.createHolidayWithSync.useMutation({
    onSuccess: (result) => {
      const campusCount = result.syncResult?.campusCount || 0;
      const campusScope = campusCount > 0
        ? `for ${campusCount} campus${campusCount > 1 ? 'es' : ''}`
        : 'for all campuses';

      toast({
        title: 'Success',
        description: `Holiday created successfully ${campusScope}${result.syncResult?.syncedUsers ? ` and synced to ${result.syncResult.syncedUsers} users` : ''}`,
        variant: 'success',
      });
      router.push('/admin/system/calendar');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create holiday',
        variant: 'error',
      });
    }
  });

  const onSubmit = async (data: HolidayFormValues) => {
    try {
      if (createHolidayMutation.isLoading || isSubmitting) return; // prevent duplicate clicks
      setIsSubmitting(true);

      // Determine campus scope based on user role
      let campusIds = data.campusIds || [];

      // Campus admins can only create holidays for their own campus
      if (user?.userType === 'CAMPUS_ADMIN' && userCampusId) {
        campusIds = [userCampusId];
      }

      // If no specific campuses selected by system admin, apply to all campuses
      if ((user?.userType === 'SYSTEM_ADMIN' || user?.userType === 'SYSTEM_MANAGER') && campusIds.length === 0) {
        campusIds = campuses.map(c => c.id);
      }

      await createHolidayMutation.mutateAsync({
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate || data.startDate,
        campusIds: campusIds,
        type: data.type as 'NATIONAL' | 'RELIGIOUS' | 'INSTITUTIONAL' | 'ADMINISTRATIVE' | 'WEATHER' | 'OTHER',
        syncOptions: {
          syncToStudents: data.sendNotifications,
          syncToTeachers: data.sendNotifications,
          syncToCampusUsers: data.sendNotifications,
          notifyUsers: data.sendNotifications
        }
      });
    } catch (error) {
      console.error('Error creating holiday:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Create Holiday"
        description="Add a new holiday to the calendar system"
      />
      
      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Holiday Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter holiday name" />
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
                    <FormLabel>End Date (Optional)</FormLabel>
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
                    <FormLabel>Holiday Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select holiday type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NATIONAL">National Holiday</SelectItem>
                        <SelectItem value="RELIGIOUS">Religious Holiday</SelectItem>
                        <SelectItem value="INSTITUTIONAL">Institutional Holiday</SelectItem>
                        <SelectItem value="ADMINISTRATIVE">Administrative Holiday</SelectItem>
                        <SelectItem value="WEATHER">Weather Holiday</SelectItem>
                        <SelectItem value="OTHER">Other Holiday</SelectItem>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Enter holiday description" />
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
                      ? 'As a campus admin, holidays will be created for your assigned campus only.'
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
                      Notify relevant users (students, teachers, staff) about this holiday
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
              <Button type="submit" disabled={isSubmitting || createHolidayMutation.isLoading}>
                {(isSubmitting || createHolidayMutation.isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting || createHolidayMutation.isLoading ? 'Creating…' : 'Create Holiday'}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
} 