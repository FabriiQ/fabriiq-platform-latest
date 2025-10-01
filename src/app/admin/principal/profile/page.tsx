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
import { Edit, Settings, Users, GraduationCap, Award, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Principal Profile",
  description: "View and manage your principal profile",
};

export default async function PrincipalProfilePage() {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      return redirect("/login");
    }

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        activeCampuses: {
          include: {
            campus: true
          }
        }
      }
    });

    if (!user) {
      logger.error("User not found", { userId: session.user.id });
      return redirect("/login");
    }

    if (user.userType !== UserType.CAMPUS_PRINCIPAL) {
      logger.error("Unauthorized user type", { userType: user.userType });
      return redirect("/unauthorized");
    }

    // Extract profile data
    const profileData = user.profileData as Record<string, any> || {};
    
    const principalData = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      userType: user.userType,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      profileData: user.profileData,
      profileImageUrl: profileData.profileImageUrl,
      bio: profileData.bio,
      language: profileData.language,
      timezone: profileData.timezone,
      showEmail: profileData.showEmail,
      showBio: profileData.showBio,
      // Principal-specific fields
      department: profileData.department || 'Academic Leadership',
      position: profileData.position || 'Principal',
    };

    // Get campus-specific statistics for principal dashboard
    const campusIds = user.activeCampuses.map(ac => ac.campusId);
    const [teacherCount, studentCount, classCount, coordinatorCount] = await Promise.all([
      prisma.user.count({ 
        where: { 
          userType: { in: ['CAMPUS_TEACHER', 'TEACHER'] },
          activeCampuses: { some: { campusId: { in: campusIds } } },
          status: 'ACTIVE'
        } 
      }),
      prisma.user.count({ 
        where: { 
          userType: { in: ['CAMPUS_STUDENT', 'STUDENT'] },
          activeCampuses: { some: { campusId: { in: campusIds } } },
          status: 'ACTIVE'
        } 
      }),
      prisma.class.count({ 
        where: { 
          courseCampus: { campusId: { in: campusIds } },
          status: 'ACTIVE'
        } 
      }),
      prisma.user.count({ 
        where: { 
          userType: { in: ['CAMPUS_COORDINATOR', 'COORDINATOR'] },
          activeCampuses: { some: { campusId: { in: campusIds } } },
          status: 'ACTIVE'
        } 
      }),
    ]);

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Principal Profile</h1>
            <p className="text-muted-foreground">
              Manage your principal profile and view campus leadership overview
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/principal/settings">
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
              user={principalData}
              userType={user.userType}
              showActions={false}
            />
          </div>

          {/* Principal Dashboard */}
          <div className="space-y-6">
            {/* Campus Leadership */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Campus Leadership
                </CardTitle>
                <CardDescription>
                  Campuses under your leadership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.activeCampuses.map((access) => (
                  <div key={access.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{access.campus.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {access.campus.location}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Principal since {new Date(access.startDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {user.activeCampuses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No campus assignments
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Campus Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Campus Overview
                </CardTitle>
                <CardDescription>
                  Key metrics for your campuses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Teachers</span>
                  <span className="font-semibold">{teacherCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Students</span>
                  <span className="font-semibold">{studentCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Classes</span>
                  <span className="font-semibold">{classCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Coordinators</span>
                  <span className="font-semibold">{coordinatorCount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Leadership Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/principal/teacher-leaderboard">
                    <Award className="mr-2 h-4 w-4" />
                    Teacher Performance
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/principal/student-leaderboard">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Student Performance
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/principal/analytics">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Analytics Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/principal/reports">
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
    logger.error("Error loading principal profile", { error });
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your profile. Please try again later.
          </p>
          <Button asChild>
            <Link href="/admin/principal">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
