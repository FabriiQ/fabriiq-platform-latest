import { getSessionCache } from "@/utils/session-cache";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { CreateActivityV2Client } from "./create-activity-v2-client";

export const metadata: Metadata = {
  title: "Create Activity V2",
  description: "Create a new Activities V2 activity for your class",
};

export default async function CreateActivityV2Page({
  params,
}: {
  params: Promise<{ classId: string; activityType: string }>;
}) {
  const { classId, activityType } = await params;
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

  // Get class details with subjects
  const classDetails = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      courseCampus: {
        select: {
          course: {
            select: {
              subjects: {
                select: {
                  id: true,
                  name: true,
                  code: true
                },
                where: {
                  status: 'ACTIVE'
                }
              }
            }
          }
        }
      }
    }
  });

  if (!classDetails) {
    return redirect("/teacher/classes");
  }

  // Extract subjects from the nested structure
  const subjects = classDetails.courseCampus?.course?.subjects || [];

  // Map activity type ID to display name
  const getActivityTypeName = (typeId: string): string => {
    switch (typeId) {
      case 'quiz-v2':
        return 'Quiz V2';
      case 'reading-v2':
        return 'Reading V2';
      case 'video-v2':
        return 'Video V2';
      default:
        return 'Activity V2';
    }
  };

  // Map activity type ID to actual type
  const getActivityType = (typeId: string): 'quiz' | 'reading' | 'video' => {
    switch (typeId) {
      case 'quiz-v2':
        return 'quiz';
      case 'reading-v2':
        return 'reading';
      case 'video-v2':
        return 'video';
      default:
        return 'quiz';
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create {getActivityTypeName(activityType)}</h1>
        <p className="text-muted-foreground">Class: {classDetails.name}</p>
      </div>

      <CreateActivityV2Client
        activityType={getActivityType(activityType)}
        classId={classId}
        subjects={subjects}
      />
    </div>
  );
}
