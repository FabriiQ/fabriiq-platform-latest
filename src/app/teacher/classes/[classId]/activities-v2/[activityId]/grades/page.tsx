import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { api } from '@/trpc/server';
import { ActivityV2GradesPage } from './activity-v2-grades-page';

interface PageProps {
  params: {
    classId: string;
    activityId: string;
  };
}

export default async function ActivityV2GradesPageRoute({ params }: PageProps) {
  const { classId, activityId } = params;
  
  // Get user session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return redirect('/auth/signin');
  }

  // Ensure user is a teacher
  const user = await api.user.getCurrentUser.query();
  if (!user.teacherProfile) {
    return redirect('/student/dashboard');
  }

  // Get activity data
  const activity = await api.activityV2.getById.query({ id: activityId });
  if (!activity) {
    return redirect(`/teacher/classes/${classId}/activities`);
  }

  // Check if it's a V2 activity
  const gradingConfig = activity.gradingConfig as any;
  if (gradingConfig?.version !== '2.0') {
    // Redirect to legacy activity grades
    return redirect(`/teacher/classes/${classId}/activities/${activityId}/grades`);
  }

  // Check if teacher has access to this activity
  if (activity.classId !== classId) {
    return redirect(`/teacher/classes/${classId}/activities`);
  }

  return (
    <div className="container mx-auto py-6">
      <ActivityV2GradesPage
        activity={activity}
        classId={classId}
        teacherId={user.teacherProfile.id}
      />
    </div>
  );
}
