import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { ActivityV2ViewerPage } from "./activity-v2-viewer-page";

export const metadata: Metadata = {
  title: "Activity V2",
  description: "View and manage Activities V2 activity",
};

export default async function TeacherActivityV2Page({
  params,
}: {
  params: Promise<{ classId: string; activityId: string }>;
}) {
  const { classId, activityId } = await params;
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
      userType: true,
      teacherProfile: {
        select: {
          id: true
        }
      }
    }
  });

  if (!user || (user.userType !== 'CAMPUS_TEACHER' && user.userType !== 'TEACHER') || !user.teacherProfile) {
    return redirect("/login");
  }

  // Check if the teacher is assigned to this class
  const teacherAssignment = await prisma.teacherAssignment.findFirst({
    where: {
      teacherId: user.teacherProfile.id,
      classId: classId
    }
  });

  if (!teacherAssignment) {
    return redirect("/teacher/classes");
  }

  // Get activity details
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: {
      subject: true,
      topic: true,
      class: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      activityGrades: {
        select: {
          id: true,
          score: true,
          status: true,
          student: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!activity) {
    return redirect(`/teacher/classes/${classId}/activities`);
  }

  // Check if it's a V2 activity
  const gradingConfig = activity.gradingConfig as any;
  if (gradingConfig?.version !== '2.0') {
    // Redirect to legacy activity page
    return redirect(`/teacher/classes/${classId}/activities/${activityId}`);
  }

  // Check if teacher has access to this activity
  if (activity.classId !== classId) {
    return redirect(`/teacher/classes/${classId}/activities`);
  }

  return (
    <div className="container mx-auto py-6">
      <ActivityV2ViewerPage
        activity={activity}
        classId={classId}
        teacherId={user.teacherProfile.id}
      />
    </div>
  );
}
