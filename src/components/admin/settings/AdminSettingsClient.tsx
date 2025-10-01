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
import { User, Settings, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminSettingsClientProps {
  userId: string;
  initialData: any;
  userType: UserType;
}

export function AdminSettingsClient({ 
  userId, 
  initialData, 
  userType 
}: AdminSettingsClientProps) {
  const router = useRouter();

  // Update admin profile mutation
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
        userId,
        data: {
          displayName: data.displayName,
          email: data.email,
          bio: data.bio,
          language: data.language,
          timezone: data.timezone,
          showEmail: data.showEmail,
          showBio: data.showBio,
          department: data.department,
          position: data.position,
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
        userId,
        data: {
          settings: data,
        }
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getAdminTypeLabel = () => {
    switch (userType) {
      case UserType.SYSTEM_ADMIN:
        return 'System Administrator';
      case UserType.CAMPUS_ADMIN:
        return 'Campus Administrator';
      case UserType.CAMPUS_PRINCIPAL:
        return 'Principal';
      case UserType.CAMPUS_COORDINATOR:
        return 'Coordinator';
      default:
        return 'Administrator';
    }
  };

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Profile
        </TabsTrigger>
        <TabsTrigger value="admin" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Admin
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </TabsTrigger>
        <TabsTrigger value="security" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security
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
      
      <TabsContent value="admin" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Administrative Information</CardTitle>
            <CardDescription>
              Update your administrative role and department details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Administrative Role</Label>
                <Input
                  id="role"
                  value={getAdminTypeLabel()}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Contact system administrator to change role
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="Your department"
                  defaultValue={initialData.department}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position Title</Label>
              <Input
                id="position"
                placeholder="Your position title"
                defaultValue={initialData.position}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-notes">Administrative Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Any additional administrative information or responsibilities..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This information helps other administrators understand your role
              </p>
            </div>

            <Button type="button" onClick={() => {
              toast({
                title: "Info",
                description: "Administrative information updates are handled in the Profile tab",
              });
            }}>
              Update Admin Info
            </Button>
          </CardContent>
        </Card>

        {/* Access Management */}
        <Card>
          <CardHeader>
            <CardTitle>Access Management</CardTitle>
            <CardDescription>
              Manage your administrative access and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Campus Access</h4>
                  <p className="text-sm text-muted-foreground">
                    View and manage campus assignments
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Permission Levels</h4>
                  <p className="text-sm text-muted-foreground">
                    Review your current permission levels
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Audit Log</h4>
                  <p className="text-sm text-muted-foreground">
                    View your administrative activity log
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View Log
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
      
      <TabsContent value="security" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Administrative Security</CardTitle>
            <CardDescription>
              Enhanced security settings for administrative accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Required for all administrative accounts
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Session Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage active sessions and devices
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">API Keys</h4>
                  <p className="text-sm text-muted-foreground">
                    Manage API keys for administrative access
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Security Audit</h4>
                  <p className="text-sm text-muted-foreground">
                    Review security events and alerts
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View Audit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
