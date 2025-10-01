import { redirect } from 'next/navigation';

interface EditPageProps {
  params: {
    classId: string;
    activityId: string;
  };
}

export default function EditLegacyActivityPage({ params }: EditPageProps) {
  // Redirect legacy activity edit route to Activities V2 edit route
  redirect(`/teacher/classes/${params.classId}/activities-v2/${params.activityId}?edit=true`);
}