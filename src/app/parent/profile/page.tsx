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
import { Edit, Settings, Users, GraduationCap, User, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Parent Profile",
  description: "View and manage your parent profile",
};

export default async function ParentProfilePage() {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      return redirect("/login");
    }

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      logger.error("User not found", { userId: session.user.id });
      return redirect("/login");
    }

    if (user.userType !== UserType.CAMPUS_PARENT) {
      logger.error("Unauthorized user type", { userType: user.userType });
      return redirect("/unauthorized");
    }

    // Extract profile data
    const profileData = user.profileData as Record<string, any> || {};
    
    const parentData = {
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
      // Parent-specific fields
      occupation: profileData.occupation || 'Not specified',
      emergencyContact: profileData.emergencyContact || 'Not specified',
    };

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Parent Profile</h1>
            <p className="text-muted-foreground">
              Manage your parent profile and view your children's information
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/parent/settings">
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
              user={parentData}
              userType={user.userType}
              showActions={false}
            />
          </div>

          {/* Parent Dashboard */}
          <div className="space-y-6">
            {/* Children Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  My Children
                </CardTitle>
                <CardDescription>
                  Students under your care
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Children information will be displayed here once the parent profile system is fully implemented.
                </p>
              </CardContent>
            </Card>

            {/* Parent Information */}
            <Card>
              <CardHeader>
                <CardTitle>Parent Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Occupation</div>
                  <div className="font-semibold">{profileData.occupation || 'Not specified'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Emergency Contact</div>
                  <div className="font-semibold">{profileData.emergencyContact || 'Not specified'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Parent Since</div>
                  <div className="font-semibold">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/parent/children">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    View All Children
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/parent/messages">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Messages
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/parent/meetings">
                    Schedule Meeting
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/parent/reports">
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
    logger.error("Error loading parent profile", { error });
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your profile. Please try again later.
          </p>
          <Button asChild>
            <Link href="/parent">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
