import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { StreamlinedAttendanceWorkflow } from "@/components/attendance/StreamlinedAttendanceWorkflow";

export const metadata: Metadata = {
  title: "Take Attendance | System Admin",
  description: "Take attendance for classes across the system",
};

export default async function SystemTakeAttendancePage() {
  const session = await getSessionCache();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get user details from database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      userType: true,
    },
  });

  if (!user || user.userType !== 'SYSTEM_ADMIN') {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <StreamlinedAttendanceWorkflow />
    </div>
  );
}
