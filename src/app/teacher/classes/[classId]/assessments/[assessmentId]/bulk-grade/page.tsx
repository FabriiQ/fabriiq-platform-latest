'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/trpc/react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BulkGradingInterface } from '@/components/assessments/grading/BulkGradingInterface';

export default function BulkGradePage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;
  const assessmentId = params?.assessmentId as string;

  // Fetch assessment with submissions
  const { data: assessmentData, isLoading: isLoadingAssessment, refetch } = api.assessment.getById.useQuery({
    assessmentId,
    includeSubmissions: true,
    includeRubric: true
  }, {
    enabled: !!assessmentId,
  });

  // Fetch class details
  const { data: classDetails } = api.class.getById.useQuery({
    classId
  }, {
    enabled: !!classId
  });

  if (isLoadingAssessment) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium mb-2">Assessment not found</h3>
        <p className="text-muted-foreground mb-4">
          The assessment you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button asChild>
          <Link href={`/teacher/classes/${classId}/assessments`}>
            Back to Assessments
          </Link>
        </Button>
      </div>
    );
  }

  const assessment = assessmentData;
  const submissions = assessment.submissions || [];

  const handleGradingComplete = () => {
    // Refetch data and redirect back to assessment
    refetch();
    router.push(`/teacher/classes/${classId}/assessments/${assessmentId}`);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/teacher/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/teacher/classes/${classId}`}>
                {classDetails?.name || 'Class'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/teacher/classes/${classId}/assessments`}>
                Assessments
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/teacher/classes/${classId}/assessments/${assessmentId}`}>
                {assessment.title}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Bulk Grade</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-center">
        <PageHeader
          title="Bulk Grade Submissions"
          description={`${assessment.title} • ${classDetails?.name || "Class"}`}
        />
        <Button variant="outline" asChild>
          <Link href={`/teacher/classes/${classId}/assessments/${assessmentId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Assessment
          </Link>
        </Button>
      </div>

      {/* Bulk Grading Interface */}
      <BulkGradingInterface
        assessmentId={assessmentId}
        submissions={submissions.map(submission => {
          // Type assertion to handle the submission data properly
          const submissionWithStudent = submission as any;
          return {
            id: submission.id,
            status: submission.status,
            submittedAt: submission.submittedAt,
            score: submission.score,
            feedback: submission.feedback,
            content: submission.content,
            attachments: submission.attachments,
            student: submissionWithStudent.student ? {
              id: submissionWithStudent.student.id,
              user: {
                name: submissionWithStudent.student.user?.name || null,
                email: submissionWithStudent.student.user?.email || '',
              }
            } : {
              id: '',
              user: { name: 'Unknown Student', email: '' }
            },
          };
        })}
        assessment={{
          id: assessment.id,
          title: assessment.title,
          maxScore: assessment.maxScore ?? null,
        }}
        onGradingComplete={handleGradingComplete}
      />
    </div>
  );
}
