import { redirect } from 'next/navigation';

interface EditPageProps {
  params: {
    classId: string;
    activityId: string;
  };
}

export default function EditActivityV2Page({ params }: EditPageProps) {
  // For now, redirect to the main activity page
  // In the future, we could pass an edit query parameter or implement direct editing
  redirect(`/teacher/classes/${params.classId}/activities-v2/${params.activityId}?edit=true`);
}