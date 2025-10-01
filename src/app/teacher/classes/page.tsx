import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionCache } from '@/utils/session-cache';
import { prisma } from '@/server/db';
import { ClassesGrid } from "@/components/teacher/classes/ClassesGrid";

export default async function TeacherClassesPage() {
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
      primaryCampusId: true,
      teacherProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user || (user.userType !== 'CAMPUS_TEACHER' && user.userType !== 'TEACHER') || !user.teacherProfile) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6">
      <ClassesGrid teacherId={user.teacherProfile.id} />
    </div>
  );
}