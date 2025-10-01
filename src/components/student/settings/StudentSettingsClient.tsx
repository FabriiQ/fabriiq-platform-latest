'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnifiedProfileForm, UnifiedSettingsForm } from '@/components/shared/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/trpc/react';
import { UserType } from '@prisma/client';
import { User, Settings, Shield, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StudentSettingsClientProps {
  studentId: string;
  initialData: any;
  userType: UserType;
}

export function StudentSettingsClient({ 
  studentId, 
  initialData, 
  userType 
}: StudentSettingsClientProps) {
  const router = useRouter();

  // Update student profile mutation
  const updateProfile = api.user.updateProfile.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleProfileSubmit = async (data: any) => {
    try {
      await updateProfile.mutateAsync({
        userId: studentId,
        data: {
          displayName: data.displayName,
          email: data.email,
          bio: data.bio,
          language: data.language,
          timezone: data.timezone,
          showEmail: data.showEmail,
          showBio: data.showBio,
          enrollmentNumber: data.enrollmentNumber,
          currentGrade: data.currentGrade,
          interests: data.interests?.split(',').map((i: string) => i.trim()).filter(Boolean) || [],
          profileImage: data.profileImage,
        }
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleSettingsSubmit = async (data: any) => {
    try {
      // Update user settings via API
      await updateProfile.mutateAsync({
        userId: studentId,
        data: {
          settings: data,
        }
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="academic" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Academic
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="privacy" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Privacy
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="profile" className="space-y-6">
        <UnifiedProfileForm
          userType={userType}
          initialData={initialData}
          onSubmit={handleProfileSubmit}
          showImageUpload={true}
        />
      </TabsContent>
      
      <TabsContent value="academic" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>
              Update your academic details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="enrollment">Enrollment Number</Label>
                <Input
                  id="enrollment"
                  value={initialData.enrollmentNumber}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact administration to change enrollment number
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grade">Current Grade</Label>
                <Input
                  id="grade"
                  value={initialData.currentGrade}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Grade is automatically updated by the system
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interests">Interests</Label>
              <Textarea
                id="interests"
                placeholder="Enter your interests separated by commas..."
                defaultValue={initialData.interests}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Help us personalize your learning experience
              </p>
            </div>

            <Button type="button" onClick={() => {
              toast({
                title: "Info",
                description: "Academic information updates are handled in the Profile tab",
              });
            }}>
              Update Academic Info
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="settings" className="space-y-6">
        <UnifiedSettingsForm
          userType={userType}
          initialData={initialData}
          onSubmit={handleSettingsSubmit}
        />
      </TabsContent>
      
      <TabsContent value="privacy" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Privacy & Security</CardTitle>
            <CardDescription>
              Manage your privacy settings and account security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Profile Visibility</h4>
                  <p className="text-sm text-muted-foreground">
                    Control who can see your profile information
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Data Export</h4>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of your data
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Account Deletion</h4>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and data
                  </p>
                </div>
                <Button variant="destructive" size="sm">
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
