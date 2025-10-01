import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { UserType } from "@prisma/client";
import { logger } from "@/server/api/utils/logger";
import { UnifiedProfileDisplay } from "@/components/shared/profile";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile information",
};

export default async function StudentProfilePage() {
  try {
    const session = await getSessionCache();

    if (!session?.user?.id) {
      return redirect("/login");
    }

    // Get user details from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        studentProfile: true
      }
    }) as any;

    if (!user) {
      logger.error("User not found", { userId: session.user.id });
      return redirect("/login");
    }

    if (user.userType !== UserType.CAMPUS_STUDENT && user.userType !== 'STUDENT') {
      logger.error("Unauthorized user type", { userType: user.userType });
      return redirect("/unauthorized");
    }

    if (!user.studentProfile) {
      logger.error("Student profile not found", { userId: user.id });
      return redirect("/unauthorized");
    }

    // Extract profile data from user.profileData and studentProfile
    const profileData = user.profileData as Record<string, any> || {};
    
    const studentData = {
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
      language: profileData.language || user.studentProfile?.language,
      timezone: profileData.timezone || user.studentProfile?.timezone,
      showEmail: profileData.showEmail,
      showBio: profileData.showBio,
      // Student-specific fields
      enrollmentNumber: user.studentProfile.enrollmentNumber,
      currentGrade: user.studentProfile.currentGrade,
      interests: user.studentProfile.interests?.join(', '),
    };

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">
              View and manage your profile information
            </p>
          </div>

          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/student/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        <UnifiedProfileDisplay
          user={studentData}
          userType={user.userType}
          showActions={false} // We're showing actions in the header instead
        />

        {/* Additional Student-specific Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Academic Progress Card */}
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Academic Progress</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Current Level: {user.studentProfile.currentLevel || 1}</div>
              <div>Total Points: {user.studentProfile.totalPoints || 0}</div>
              <div>Attendance Rate: {user.studentProfile.attendanceRate ? `${(user.studentProfile.attendanceRate * 100).toFixed(1)}%` : 'N/A'}</div>
            </div>
          </div>

          {/* Performance Card */}
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Performance</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div>Academic Score: {user.studentProfile.academicScore ? `${(user.studentProfile.academicScore * 100).toFixed(1)}%` : 'N/A'}</div>
              <div>Participation Rate: {user.studentProfile.participationRate ? `${(user.studentProfile.participationRate * 100).toFixed(1)}%` : 'N/A'}</div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-card text-card-foreground rounded-lg border p-6">
            <h3 className="font-semibold mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/student/classes">View Classes</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/student/grades">View Grades</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/student/achievements">Achievements</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    logger.error("Error loading student profile", { error });
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your profile. Please try again later.
          </p>
          <Button asChild>
            <Link href="/student">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }
}
