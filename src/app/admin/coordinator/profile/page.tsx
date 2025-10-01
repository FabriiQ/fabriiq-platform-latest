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
import { Edit, Settings, Users, GraduationCap, BookOpen, Calendar } from "lucide-react";

export const metadata: Metadata = {
  title: "Coordinator Profile",
  description: "View and manage your coordinator profile",
};

export default async function CoordinatorProfilePage() {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      return redirect("/login");
    }

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        coordinatorProfile: true,
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

    if (user.userType !== UserType.CAMPUS_COORDINATOR && user.userType !== 'COORDINATOR') {
      logger.error("Unauthorized user type", { userType: user.userType });
      return redirect("/unauthorized");
    }

    if (!user.coordinatorProfile) {
      logger.error("Coordinator profile not found", { userId: user.id });
      return redirect("/unauthorized");
    }

    // Extract profile data
    const profileData = user.profileData as Record<string, any> || {};
    
    const coordinatorData = {
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
      // Coordinator-specific fields
      department: user.coordinatorProfile.department || 'Academic Coordination',
      position: profileData.position || 'Academic Coordinator',
    };

    // Get coordinator-specific statistics
    const campusIds = user.activeCampuses.map(ac => ac.campusId);
    const [teacherCount, studentCount, classCount, programCount] = await Promise.all([
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
      prisma.program.count({ 
        where: { 
          status: 'ACTIVE'
        } 
      }),
    ]);

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Coordinator Profile</h1>
            <p className="text-muted-foreground">
              Manage your coordinator profile and view academic coordination overview
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/coordinator/settings">
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
              user={coordinatorData}
              userType={user.userType}
              showActions={false}
            />
          </div>

          {/* Coordinator Dashboard */}
          <div className="space-y-6">
            {/* Campus Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Campus Assignments
                </CardTitle>
                <CardDescription>
                  Campuses you coordinate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {user.activeCampuses.map((access) => (
                  <div key={access.id} className="p-3 border rounded-lg">
                    <div className="font-medium">{access.campus.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {(access.campus.address as any)?.city || 'Location not specified'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Coordinator since {new Date(access.startDate).toLocaleDateString()}
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

            {/* Coordination Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Coordination Overview</CardTitle>
                <CardDescription>
                  Key metrics for your coordination areas
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
                  <span className="text-sm text-muted-foreground">Programs</span>
                  <span className="font-semibold">{programCount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Department Information */}
            <Card>
              <CardHeader>
                <CardTitle>Department Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Department</div>
                  <div className="font-semibold">{user.coordinatorProfile.department || 'Not specified'}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Coordinator Since</div>
                  <div className="font-semibold">
                    {new Date(user.coordinatorProfile.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Coordination Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/coordinator/teachers">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Teachers
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/coordinator/students">
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Manage Students
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/coordinator/classes">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Manage Classes
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/admin/coordinator/attendance">
                    <Calendar className="mr-2 h-4 w-4" />
                    Attendance Overview
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    logger.error("Error loading coordinator profile", { error });
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your profile. Please try again later.
          </p>
          <Button asChild>
            <Link href="/admin/coordinator">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
