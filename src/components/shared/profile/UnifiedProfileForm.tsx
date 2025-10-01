'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/trpc/react';
import { cn } from '@/lib/utils';
import { Plus, Edit, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { UserType } from '@prisma/client';

// Base form schema that can be extended for different roles
const baseProfileSchema = z.object({
  displayName: z.string().min(2, {
    message: 'Display name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  bio: z.string().max(500, {
    message: 'Bio must not exceed 500 characters.',
  }).optional(),
  language: z.string().default('en'),
  timezone: z.string().default('UTC'),
  showEmail: z.boolean().default(false),
  showBio: z.boolean().default(true),
});

// Extended schemas for different roles
const teacherProfileSchema = baseProfileSchema.extend({
  specialization: z.string().optional(),
  qualifications: z.string().optional(),
});

const studentProfileSchema = baseProfileSchema.extend({
  enrollmentNumber: z.string().optional(),
  currentGrade: z.string().optional(),
  interests: z.string().optional(),
});

const adminProfileSchema = baseProfileSchema.extend({
  department: z.string().optional(),
  position: z.string().optional(),
});

type BaseProfileFormData = z.infer<typeof baseProfileSchema>;
type TeacherProfileFormData = z.infer<typeof teacherProfileSchema>;
type StudentProfileFormData = z.infer<typeof studentProfileSchema>;
type AdminProfileFormData = z.infer<typeof adminProfileSchema>;

interface UnifiedProfileFormProps {
  userType: UserType;
  initialData?: Partial<BaseProfileFormData>;
  onSubmit?: (data: any) => void;
  className?: string;
  showImageUpload?: boolean;
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Kolkata', label: 'India Standard Time' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ar', label: 'Arabic' },
];

export function UnifiedProfileForm({ 
  userType, 
  initialData = {}, 
  onSubmit,
  className,
  showImageUpload = true 
}: UnifiedProfileFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Choose schema based on user type
  const getSchema = () => {
    switch (userType) {
      case 'CAMPUS_TEACHER':
      case 'TEACHER':
        return teacherProfileSchema;
      case 'CAMPUS_STUDENT':
      case 'STUDENT':
        return studentProfileSchema;
      case 'SYSTEM_ADMIN':
      case 'CAMPUS_ADMIN':
      case 'CAMPUS_COORDINATOR':
      case 'CAMPUS_PRINCIPAL':
        return adminProfileSchema;
      default:
        return baseProfileSchema;
    }
  };

  const form = useForm({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      displayName: initialData.displayName || '',
      email: initialData.email || '',
      bio: initialData.bio || '',
      language: initialData.language || 'en',
      timezone: initialData.timezone || 'UTC',
      showEmail: initialData.showEmail || false,
      showBio: initialData.showBio || true,
      ...initialData,
    },
  });

  const getUserInitials = () => {
    const name = session?.user?.name || 'User';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit({ ...values, profileImage: selectedFile });
      }
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your profile information and preferences
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            {/* Profile Avatar */}
            {showImageUpload && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Picture</h3>
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={previewUrl || (session?.user as any)?.image || undefined}
                        alt={session?.user?.name || 'Profile'}
                      />
                      <AvatarFallback className="text-lg">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="profile-image"
                      className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Upload a new profile picture. Recommended size: 400x400px
                    </p>
                    <label htmlFor="profile-image">
                      <Button type="button" variant="outline" size="sm" asChild>
                        <span className="cursor-pointer">
                          <Plus className="h-4 w-4 mr-2" />
                          Choose File
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your display name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Bio */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about yourself..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Brief description about yourself (max 500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
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
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Privacy Settings</h3>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="showEmail"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show email to other users</FormLabel>
                        <FormDescription>
                          Allow other users to see your email address
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showBio"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Show bio to other users</FormLabel>
                        <FormDescription>
                          Allow other users to see your bio
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>

          <div className="px-6 pb-6">
            <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
