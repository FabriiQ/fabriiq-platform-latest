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
import { User, Settings, Shield, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ParentSettingsClientProps {
  parentId: string;
  initialData: any;
  userType: UserType;
}

export function ParentSettingsClient({ 
  parentId, 
  initialData, 
  userType 
}: ParentSettingsClientProps) {
  const router = useRouter();

  // Update parent profile mutation
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
        userId: parentId,
        data: {
          displayName: data.displayName,
          email: data.email,
          bio: data.bio,
          language: data.language,
          timezone: data.timezone,
          showEmail: data.showEmail,
          showBio: data.showBio,
          occupation: data.occupation,
          emergencyContact: data.emergencyContact,
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
        userId: parentId,
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
        <TabsTrigger value="family" className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Family
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
      
      <TabsContent value="family" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Family Information</CardTitle>
            <CardDescription>
              Update your family and emergency contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  placeholder="Your occupation"
                  defaultValue={initialData.occupation}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="emergency">Emergency Contact</Label>
                <Input
                  id="emergency"
                  placeholder="Emergency contact number"
                  defaultValue={initialData.emergencyContact}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="family-notes">Family Notes</Label>
              <Textarea
                id="family-notes"
                placeholder="Any additional family information or special notes..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This information helps teachers better understand your family situation
              </p>
            </div>

            <Button type="button" onClick={() => {
              toast({
                title: "Info",
                description: "Family information updates are handled in the Profile tab",
              });
            }}>
              Update Family Info
            </Button>
          </CardContent>
        </Card>

        {/* Children Management */}
        <Card>
          <CardHeader>
            <CardTitle>Children Management</CardTitle>
            <CardDescription>
              Manage your children's accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Add Child</h4>
                  <p className="text-sm text-muted-foreground">
                    Link a new child to your parent account
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Add Child
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Permission Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage what information you can access for each child
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Communication Preferences</h4>
                  <p className="text-sm text-muted-foreground">
                    Set how you want to receive updates about your children
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>
            </div>
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
                  <h4 className="font-medium">Child Information Access</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage who can access your children's information
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
