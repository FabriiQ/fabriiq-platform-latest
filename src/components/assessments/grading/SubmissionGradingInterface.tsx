'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Save,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { SubmissionViewer } from '../submission/SubmissionViewer';
import { SubmissionStatus } from '@/server/api/constants';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface SubmissionGradingInterfaceProps {
  assessmentId: string;
  classId: string;
  submissions: Array<{
    id: string;
    status: SubmissionStatus;
    submittedAt: Date | null;
    score: number | null;
    feedback?: any;
    content?: any;
    attachments?: any;
    student: {
      id: string;
      user: {
        name: string | null;
        email: string;
      };
    };
  }>;
  assessment: {
    id: string;
    title: string;
    maxScore: number | null;
  };
  initialSubmissionIndex?: number;
  className?: string;
}

export function SubmissionGradingInterface({
  assessmentId,
  classId,
  submissions,
  assessment,
  initialSubmissionIndex = 0,
  className,
}: SubmissionGradingInterfaceProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(initialSubmissionIndex);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentSubmission = submissions[currentIndex];
  const maxScore = assessment.maxScore || 100;

  const gradeSubmissionMutation = api.assessment.grade.useMutation({
    onSuccess: () => {
      toast.success('Submission graded successfully');
      // Move to next submission or refresh data
      if (currentIndex < submissions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        resetForm();
      } else {
        // All submissions graded, redirect back to assessment
        router.push(`/teacher/classes/${classId}/assessments/${assessmentId}`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to grade submission: ${error.message}`);
    },
  });

  const resetForm = () => {
    setScore(currentSubmission?.score || 0);
    setFeedback('');
  };

  React.useEffect(() => {
    if (currentSubmission) {
      setScore(currentSubmission.score || 0);
      setFeedback(
        typeof currentSubmission.feedback === 'string' 
          ? currentSubmission.feedback 
          : ''
      );
    }
  }, [currentSubmission]);

  const handleGradeSubmission = async () => {
    if (!currentSubmission) return;

    setIsSubmitting(true);
    try {
      await gradeSubmissionMutation.mutateAsync({
        submissionId: currentSubmission.id,
        score,
        feedback,
        gradingType: 'SCORE',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateSubmission = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < submissions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const getSubmissionStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case SubmissionStatus.GRADED:
        return 'bg-green-100 text-green-800';
      case SubmissionStatus.SUBMITTED:
        return 'bg-blue-100 text-blue-800';
      case SubmissionStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!currentSubmission) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">No submissions found</h3>
        <p className="text-muted-foreground">
          There are no submissions to grade for this assessment.
        </p>
      </div>
    );
  }

  const submissionWithAssessment = {
    ...currentSubmission,
    assessment,
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Navigation Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                Grading: {assessment.title}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {currentSubmission.student.user.name || currentSubmission.student.user.email}
                </div>
                <Badge className={getSubmissionStatusColor(currentSubmission.status)}>
                  {currentSubmission.status.replace('_', ' ')}
                </Badge>
                <span>
                  Submission {currentIndex + 1} of {submissions.length}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateSubmission('prev')}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateSubmission('next')}
                disabled={currentIndex === submissions.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Grading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Submission View */}
        <div className="space-y-4">
          <SubmissionViewer
            submission={submissionWithAssessment}
            showGradingInfo={false}
          />
        </div>

        {/* Right: Grading Form */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Grade Submission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score Input */}
              <div className="space-y-2">
                <Label htmlFor="score">Score</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max={maxScore}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    / {maxScore}
                  </span>
                  <span className="text-sm font-medium">
                    ({Math.round((score / maxScore) * 100)}%)
                  </span>
                </div>
              </div>

              <Separator />

              {/* Feedback */}
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide feedback for the student..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                />
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/teacher/classes/${classId}/assessments/${assessmentId}`)}
                >
                  Back to Assessment
                </Button>
                
                <Button
                  onClick={handleGradeSubmission}
                  disabled={isSubmitting || score < 0 || score > maxScore}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Grade
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grading Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Total Submissions:</span>
                  <span className="font-medium">{submissions.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Graded:</span>
                  <span className="font-medium">
                    {submissions.filter(s => s.status === SubmissionStatus.GRADED).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Remaining:</span>
                  <span className="font-medium">
                    {submissions.filter(s => s.status !== SubmissionStatus.GRADED).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
