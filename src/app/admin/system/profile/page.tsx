import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { UserType } from "@prisma/client";
import { logger } from "@/server/api/utils/logger";
import { UnifiedProfileDisplay } from "@/components/shared/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Settings, Users, Server, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "System Admin Profile",
  description: "View and manage your system administrator profile",
};

export default async function SystemAdminProfilePage() {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      return redirect("/login");
    }

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        userType: true,
        phoneNumber: true,
        dateOfBirth: true,
        profileData: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      }
    });

    if (!user) {
      logger.error("User not found", { userId: session.user.id });
      return redirect("/login");
    }

    if (user.userType !== UserType.SYSTEM_ADMIN) {
      logger.error("Unauthorized user type", { userType: user.userType });
      return redirect("/unauthorized");
    }

    // Extract profile data
    const profileData = user.profileData as Record<string, any> || {};
    
    const adminData = {
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      username: user.username,
      userType: user.userType,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      profileData: user.profileData as Record<string, any>,
      profileImageUrl: profileData.profileImageUrl,
      bio: profileData.bio,
      language: profileData.language,
      timezone: profileData.timezone,
      showEmail: profileData.showEmail,
      showBio: profileData.showBio,
      // Admin-specific fields
      department: profileData.department || 'System Administration',
      position: profileData.position || 'System Administrator',
    };

    // Get system statistics for admin dashboard
    const [userCount, institutionCount, campusCount] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.institution.count({ where: { status: 'ACTIVE' } }),
      prisma.campus.count({ where: { status: 'ACTIVE' } }),
    ]);

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Administrator Profile</h1>
            <p className="text-muted-foreground">
              Manage your system administrator profile and view system overview
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/system/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <UnifiedProfileDisplay
              user={adminData}
              userType={user.userType}
              showActions={false}
            />
          </div>

          {/* System Overview */}
          <div className="space-y-6">
            {/* System Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  System Overview
                </CardTitle>
                <CardDescription>
                  Current system statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="font-semibold">{userCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Institutions</span>
                  <span className="font-semibold">{institutionCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Campuses</span>
                  <span className="font-semibold">{campusCount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Account Status</div>
                  <div className="font-semibold text-green-600">{user.status}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Member Since</div>
                  <div className="font-semibold">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {user.lastLoginAt && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Last Login</div>
                    <div className="font-semibold">
                      {new Date(user.lastLoginAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/system/users">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/system/institutions">
                    Manage Institutions
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/system/campuses">
                    Manage Campuses
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/system/reports">
                    View Reports
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    logger.error("Error loading system admin profile", { error });
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your profile. Please try again later.
          </p>
          <Button asChild>
            <Link href="/admin/system">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
