import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { TeacherAttendanceDashboard } from "@/components/teacher/attendance/TeacherAttendanceDashboard";
import { getUserSession } from "@/server/api/trpc";

export const metadata: Metadata = {
  title: "Teacher Attendance | Campus Admin",
  description: "Manage teacher attendance at your campus",
};

export default async function TeacherAttendancePage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Get user session with campus information
  const userSession = await getUserSession();
  
  if (!userSession?.user?.primaryCampusId) {
    redirect("/admin");
  }

  return (
    <div className="container mx-auto py-6">
      <TeacherAttendanceDashboard
        campusId={userSession.user.primaryCampusId}
        userRole={userSession.user.userType}
      />
    </div>
  );
}
