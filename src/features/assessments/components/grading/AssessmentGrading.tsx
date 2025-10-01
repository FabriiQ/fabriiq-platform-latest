'use client';

/**
 * Assessment Grading Component
 *
 * This component allows teachers to grade assessment submissions
 * using Bloom's Taxonomy and rubrics.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/core/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/feedback/alert';
import { Separator } from '@/components/ui/separator';
import { BloomsTaxonomyBadge } from '@/features/bloom/components/taxonomy/BloomsTaxonomyBadge';
import { RubricGrading, CognitiveGrading, GradingInterface } from '@/features/bloom/components/grading';
import { GradableContentType } from '@/features/bloom/types/grading';
import { BloomsTaxonomyLevel } from '@/features/bloom/types/bloom-taxonomy';
import { EnhancedGradingInterface } from './EnhancedGradingInterface';
import { api } from '@/trpc/react';
import { useToast } from '@/components/ui/feedback/toast';
import { SubmissionFileUpload } from '@/components/assessments/submission/SubmissionFileUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye } from 'lucide-react';
import { Upload } from '@/components/ui/icons/custom-icons';
import { useMemo } from 'react';

interface AssessmentGradingProps {
  assessmentId: string;
  studentId: string;
  submissionId: string;
  onGraded?: () => void;
  className?: string;
}

/**
 * AssessmentGrading component
 */
export function AssessmentGrading({
  assessmentId,
  studentId,
  submissionId,
  onGraded,
  className = '',
}: AssessmentGradingProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('submission');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch assessment data with rubric
  const { data: assessment, isLoading: assessmentLoading } = api.assessment.getById.useQuery({
    assessmentId,
    includeRubric: true
  });

  // Fetch submission data
  const { data: submission, isLoading: submissionLoading } = api.assessment.getSubmission.useQuery({
    id: submissionId,
  });

  // Use rubric from assessment data (bloomsRubric) if available, otherwise fetch separately
  const rubricFromAssessment = assessment?.bloomsRubric;

  // Check for embedded rubric in the assessment's rubric JSON field (legacy support)
  const embeddedRubric = useMemo(() => {
    if (!assessment?.rubric) return null;

    try {
      const rubricData = typeof assessment.rubric === 'string'
        ? JSON.parse(assessment.rubric)
        : assessment.rubric;

      // Validate that it has the required structure for grading
      if (rubricData.criteria && rubricData.criteria.length > 0 &&
          rubricData.performanceLevels && rubricData.performanceLevels.length > 0) {
        return {
          id: 'embedded-rubric',
          criteria: rubricData.criteria,
          performanceLevels: rubricData.performanceLevels,
          title: rubricData.title || 'Assessment Rubric',
          type: rubricData.type || 'ANALYTIC'
        };
      }
    } catch (error) {
      console.warn('Failed to parse embedded rubric:', error);
    }

    return null;
  }, [assessment?.rubric]);

  const { data: rubricFromApi, isLoading: rubricLoading } = api.rubric.getById.useQuery(
    { id: assessment?.rubricId || '' },
    {
      enabled: !!assessment?.rubricId && !rubricFromAssessment && !embeddedRubric,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );

  // Use rubric from assessment data first, then embedded rubric, then API fetch
  const rubric = rubricFromAssessment || embeddedRubric || rubricFromApi;

  // Fetch student data
  const { data: student, isLoading: studentLoading } = api.user.getById.useQuery(
    studentId
  );

  // Submit grades mutation
  const submitGradesMutation = api.submission.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Grades submitted',
        description: 'The grades have been submitted successfully',
      });

      if (onGraded) {
        onGraded();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error submitting grades',
        description: error.message || 'There was an error submitting the grades',
        variant: 'error',
      });
    },
  });

  // Handle rubric grade change
  const handleRubricGradeChange = (rubricResult: {
    score: number;
    criteriaGrades: Array<{
      criterionId: string;
      levelId: string;
      score: number;
      feedback?: string;
    }>;
    bloomsLevelScores?: Record<BloomsTaxonomyLevel, number>;
  }) => {
    if (!submission) return;

    setIsSubmitting(true);

    submitGradesMutation.mutate({
      id: submission.id,
      data: {
        score: rubricResult.score,
        feedback: JSON.stringify({
          bloomsLevelScores: rubricResult.bloomsLevelScores,
          criteriaResults: rubricResult.criteriaGrades.map(grade => ({
            criterionId: grade.criterionId,
            score: grade.score,
            feedback: grade.feedback,
          })),
        }),
        status: 'GRADED' as any,
        gradedById: undefined, // Will be set by the server
      }
    }, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  // Handle cognitive grade change
  const handleCognitiveGradeChange = (cognitiveResult: {
    score: number;
    feedback?: string;
    bloomsLevelScores?: Record<BloomsTaxonomyLevel, number>;
  }) => {
    if (!submission) return;

    setIsSubmitting(true);

    submitGradesMutation.mutate({
      id: submission.id,
      data: {
        score: cognitiveResult.score,
        feedback: JSON.stringify({
          feedback: cognitiveResult.feedback,
          bloomsLevelScores: cognitiveResult.bloomsLevelScores,
        }),
        status: 'GRADED' as any,
        gradedById: undefined, // Will be set by the server
      }
    }, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  // Check if submission is already graded
  const isGraded = submission?.status === 'GRADED';

  // Render loading state
  if (assessmentLoading || submissionLoading || studentLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
          <CardDescription>
            Loading assessment data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state if assessment or submission not found
  if (!assessment || !submission) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle>Assessment or Submission Not Found</CardTitle>
          <CardDescription>
            The assessment or submission could not be found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-destructive/15 text-destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              The assessment or submission could not be found. Please check the assessment and student IDs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Render the submission content
  const renderSubmission = () => {
    if (!submission.content) {
      return (
        <Alert>
          <AlertTitle>No Submission Content</AlertTitle>
          <AlertDescription>
            The student has not provided any content for this submission.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {student?.name || 'Student'}'s Submission
            </h2>
            <p className="text-sm text-muted-foreground">
              Submitted on {new Date(submission.submittedAt || '').toLocaleDateString()} at {new Date(submission.submittedAt || '').toLocaleTimeString()}
            </p>
          </div>
          {assessment.bloomsDistribution && (
            <div className="flex space-x-2">
              {Object.entries(assessment.bloomsDistribution as Record<BloomsTaxonomyLevel, number>)
                .filter(([_, percentage]) => percentage > 0)
                .map(([level, _]) => (
                  <BloomsTaxonomyBadge key={level} level={level as BloomsTaxonomyLevel} />
                ))}
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Submission Content</h3>
            <div className="flex items-center gap-2">
              {/* Upload Files Button */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Files
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      Upload Submission Files - {student?.name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <SubmissionFileUpload
                      submissionId={submission.id}
                      maxFiles={10}
                      maxFileSize={50}
                      onFilesChange={(files) => {
                        console.log('Files changed:', files);
                        // Optionally refresh submission data
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              {/* View Attachments Button */}
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-1" />
                View Files
              </Button>
            </div>
          </div>

          {/* Display the submission content */}
          {/* This would need to be adapted based on your actual submission structure */}
          <div className="p-4 border rounded-md bg-muted whitespace-pre-wrap">
            {typeof submission.content === 'string'
              ? submission.content
              : JSON.stringify(submission.content, null, 2)}
          </div>

          {/* If there are attachments, display them */}
          {submission.attachments && (
            <div className="space-y-2 mt-4">
              <h3 className="text-lg font-medium">Attachments</h3>
              <div className="p-4 border rounded-md bg-muted">
                {typeof submission.attachments === 'string'
                  ? submission.attachments
                  : JSON.stringify(submission.attachments, null, 2)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle enhanced grading interface
  const handleEnhancedGrading = (result: {
    score: number;
    feedback?: string;
    criteriaGrades?: Array<{
      criterionId: string;
      levelId: string;
      score: number;
      feedback?: string;
    }>;
    bloomsLevelScores?: Record<BloomsTaxonomyLevel, number>;
  }) => {
    if (!submission) return;

    setIsSubmitting(true);

    submitGradesMutation.mutate({
      id: submission.id,
      data: {
        score: result.score,
        feedback: JSON.stringify({
          feedback: result.feedback,
          bloomsLevelScores: result.bloomsLevelScores,
          criteriaResults: result.criteriaGrades?.map(grade => ({
            criterionId: grade.criterionId,
            score: grade.score,
            feedback: grade.feedback,
          })),
        }),
        status: 'GRADED' as any,
        gradedById: undefined, // Will be set by the server
      }
    }, {
      onSettled: () => setIsSubmitting(false),
    });
  };

  // Render the enhanced grading interface
  const renderGradingInterface = () => {
    // Use grading method from assessment service if available, otherwise determine locally
    let gradingMethod: 'SCORE_BASED' | 'RUBRIC_BASED' = (assessment as any).gradingMethod || 'SCORE_BASED';

    // Fallback logic if gradingMethod is not provided by service
    if (!(assessment as any).gradingMethod) {
      // Priority: 1. Assessment gradingType, 2. Presence of rubric
      if (assessment.gradingType === 'MANUAL' && assessment.rubricId) {
        gradingMethod = 'RUBRIC_BASED';
      } else if (assessment.rubricId && rubric) {
        // Fallback: if rubric exists and is loaded, use rubric-based
        gradingMethod = 'RUBRIC_BASED';
      }
    }

    const hasRubric = assessment.rubricId && rubric;
    const rubricConfiguration = (assessment as any).rubricConfiguration;

    // Debug logging to help identify the issue
    console.log('Assessment Grading Debug:', {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      rubricId: assessment.rubricId,
      hasBloomsRubric: !!assessment.bloomsRubric,
      hasEmbeddedRubric: !!embeddedRubric,
      hasRubricFromApi: !!rubricFromApi,
      hasRubricData: !!rubric,
      rubricCriteria: (rubric as any)?.criteria?.length || 0,
      rubricPerformanceLevels: (rubric as any)?.performanceLevels?.length || 0,
      hasRubric,
      gradingMethod,
      gradingType: assessment.gradingType,
      rubricConfiguration,
      computedGradingMethod: (assessment as any).gradingMethod,
      // Ensure we're using the assessment's specific rubric, not a fallback
      usingSpecificRubric: !!assessment.rubricId,
      rubricSource: rubricFromAssessment ? 'assessment.bloomsRubric' :
                   embeddedRubric ? 'assessment.rubric (embedded)' :
                   'api.rubric.getById'
    });

    // Prepare rubric data if available
    const rubricData = hasRubric ? {
      id: rubric.id,
      criteria: (rubric as any).criteria as any,
      performanceLevels: (rubric as any).performanceLevels as any,
    } : undefined;

    // Prepare Bloom's distribution
    const bloomsDistribution = assessment.bloomsDistribution as Record<BloomsTaxonomyLevel, number> | undefined;

    return (
      <EnhancedGradingInterface
        assessmentId={assessmentId}
        submissionId={submission.id}
        maxScore={assessment.maxScore || 100}
        gradingMethod={gradingMethod as 'SCORE_BASED' | 'RUBRIC_BASED'}
        rubric={rubricData}
        bloomsDistribution={bloomsDistribution}
        initialValues={{
          score: submission.score || 0,
          feedback: typeof submission.feedback === 'string' ? submission.feedback : '',
          criteriaGrades: (submission.attachments as any)?.gradingDetails?.criteriaResults,
          bloomsLevelScores: (submission.attachments as any)?.gradingDetails?.bloomsLevelScores,
        }}
        onGradeSubmit={handleEnhancedGrading}
        readOnly={isGraded}
        showTopicMasteryImpact={true}
        topicMasteryData={[]} // Real data will be fetched by the component
      />
    );
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle>
          Grade: {assessment.title}
        </CardTitle>
        <CardDescription>
          Student: {student?.name || 'Unknown Student'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="submission">Submission</TabsTrigger>
            <TabsTrigger value="grading">Grading</TabsTrigger>
          </TabsList>

          <TabsContent value="submission" className="pt-4">
            {renderSubmission()}
          </TabsContent>

          <TabsContent value="grading" className="pt-4">
            {renderGradingInterface()}

            {isSubmitting && (
              <div className="flex justify-center mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
