'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/data-display/card';
import { PageHeader } from '@/components/ui/page-header';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from 'next-auth/react';
import { EnrollmentEditForm } from './enrollment-edit-form';

export default function EditEnrollmentPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const enrollmentId = params?.id as string;

  // Fetch enrollment details
  const { data: enrollment, isLoading, error } = api.enrollment.getEnrollment.useQuery(
    { id: enrollmentId },
    { enabled: !!enrollmentId }
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <PageHeader
            title="Enrollment Not Found"
            description="The requested enrollment could not be found"
          />
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              The enrollment you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button asChild className="mt-4">
              <Link href="/admin/system/enrollment">Back to Enrollments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Edit Enrollment"
          description={`${enrollment.enrollment?.student?.user?.name} - ${enrollment.enrollment?.class?.name}`}
        />
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Information</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentEditForm
            enrollment={enrollment.enrollment}
            onSuccess={() => {
              toast({
                title: 'Success',
                description: 'Enrollment updated successfully.',
              });
              router.push(`/admin/system/enrollment/${enrollmentId}`);
            }}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
