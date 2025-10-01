"use client";

import { useState, useCallback, useMemo } from "react";
import { useToast } from "@/components/ui/feedback/toast";
import { api } from "@/trpc/react";
import { Loader2, AlertCircle, Eye, CheckCircle2 } from "lucide-react";
import { Upload } from "@/components/ui/icons/custom-icons";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AssessmentGradingHeader } from "./AssessmentGradingHeader";
import { StudentList } from "./StudentList";
import type { StudentWithSubmission } from "./StudentList";
import { EnhancedGradingInterface } from "@/features/assessments/components/grading/EnhancedGradingInterface";
import { BatchGrading } from "@/features/assessments/components/grading/BatchGrading";
import { SubmissionStatus } from "@/server/api/constants";
import { BloomsTaxonomyLevel } from "@/features/bloom/types/bloom-taxonomy";
import { SubmissionViewDialog } from "@/components/assessments/submission/SubmissionViewDialog";
import { SubmissionFileUpload } from "@/components/assessments/submission/SubmissionFileUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EnhancedAssessmentGradingProps {
  assessment: any;
  classId: string;
  isClassTeacher: boolean;
}

export default function EnhancedAssessmentGradingInterface({
  assessment,
  classId,
  isClassTeacher,
}: EnhancedAssessmentGradingProps) {
  const { toast } = useToast();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [batchGrading, setBatchGrading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [createdSubmissions, setCreatedSubmissions] = useState<Set<string>>(new Set()); // Track created submissions
  const [newSubmissionIds, setNewSubmissionIds] = useState<Map<string, string>>(new Map()); // Track new submission IDs

  // Fetch class students
  const { data: classData, isLoading: isLoadingClass, refetch: refetchClass } = api.class.getById.useQuery(
    {
      classId,
      include: {
        students: true,
        teachers: false
      }
    },
    {
      enabled: !!classId,
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to load class data: ${error.message}`,
          variant: "error",
        });
      },
    }
  );

  // Fetch submissions for this assessment
  const { data: submissionsData, isLoading: isLoadingSubmissions, refetch: refetchSubmissions } = api.assessment.listSubmissions.useQuery(
    { assessmentId: assessment.id, take: 1000 },
    {
      enabled: !!assessment.id,
      onError: (error) => {
        toast({
          title: "Error",
          description: `Failed to load submissions: ${error.message}`,
          variant: "error",
        });
      },
    }
  );

  // Grade submission mutation
  const gradeMutation = api.assessment.grade.useMutation({
    onSuccess: async (data) => {
      console.log('Grade submission successful:', data);
      toast({
        title: "Success",
        description: "Submission graded successfully",
        variant: "success",
      });

      // Refetch both submissions and class data to ensure UI updates
      try {
        await Promise.all([
          refetchSubmissions(),
          refetchClass()
        ]);
        console.log('Data refreshed after grading');
      } catch (error) {
        console.error('Error refreshing data after grading:', error);
      }
    },
    onError: (error: any) => {
      console.error('Grade submission error:', error);
      toast({
        title: "Error",
        description: `Failed to grade submission: ${error.message}`,
        variant: "error",
      });
    },
  });

  // Get or create submission mutation for teacher workflow
  const getOrCreateSubmissionMutation = api.assessment.getOrCreateSubmission.useMutation({
    onSuccess: (data) => {
      console.log('Submission ready:', data.id);
    },
    onError: (error: any) => {
      console.error('Failed to get/create submission:', error);
    },
  });

  // Bulk grade students mutation (creates submissions if needed)
  const bulkGradeStudentsMutation = api.assessment.bulkGradeStudents.useMutation({
    onSuccess: (data) => {
      console.log('Bulk grading successful:', data);
      toast({
        title: "Success",
        description: data.message,
        variant: "success",
      });
      // Refetch data
      refetchSubmissions();
    },
    onError: (error: any) => {
      console.error('Bulk grading error:', error);
      toast({
        title: "Error",
        description: `Failed to bulk grade students: ${error.message}`,
        variant: "error",
      });
    },
  });

  // Helper function to get or create submission for teacher workflow
  const getOrCreateSubmission = async (assessmentId: string, studentId: string) => {
    return await getOrCreateSubmissionMutation.mutateAsync({
      assessmentId,
      studentId,
    });
  };

  // Combine students and submissions data
  const studentsWithSubmissions: StudentWithSubmission[] = useMemo(() => {
    if (!classData || !submissionsData) {
      console.log('Missing data for studentsWithSubmissions:', {
        hasClassData: !!classData,
        hasSubmissionsData: !!submissionsData
      });
      return [];
    }

    const students = (classData as any).students || [];
    const submissions = (submissionsData as any).items || [];

    console.log('Building studentsWithSubmissions:', {
      studentsCount: students.length,
      submissionsCount: submissions.length,
      submissions: submissions.map((s: any) => ({
        id: s.id,
        studentId: s.studentId,
        status: s.status,
        score: s.score
      }))
    });

    const result = students.map((enrollment: any): StudentWithSubmission => {
      const studentId = enrollment.studentId || enrollment.student?.id;
      const submission = submissions.find((sub: any) => sub.studentId === studentId);

      const studentWithSubmission = {
        id: studentId,
        name: enrollment.student?.user?.name || "Unknown",
        email: enrollment.student?.user?.email || "",
        submission: submission
          ? {
              id: submission.id,
              status: typeof submission.status === 'string' ? submission.status : String(submission.status),
              score: submission.score || 0,
              feedback: submission.feedback ? String(submission.feedback) : "",
              submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : undefined,
            }
          : undefined,
      };

      if (submission) {
        console.log(`Student ${studentWithSubmission.name} has submission:`, {
          submissionId: submission.id,
          status: submission.status,
          score: submission.score
        });
      }

      return studentWithSubmission;
    });

    console.log('Final studentsWithSubmissions result:', result.length, 'students');
    return result;
  }, [(classData as any)?.students, (submissionsData as any)?.items]);

  // Handle student selection
  const handleSelectStudent = useCallback((studentId: string) => {
    setSelectedStudentId(studentId);
  }, []);

  // Toggle batch grading mode
  const toggleBatchGrading = useCallback(() => {
    setBatchGrading((prev) => !prev);
  }, []);

  // Determine grading method based on assessment configuration
  const gradingMethod = useMemo(() => {
    // Use service-provided grading method if available
    if ((assessment as any).gradingMethod) {
      return (assessment as any).gradingMethod;
    }

    // Fallback to local determination
    // Check if assessment has a rubric ID
    const hasRubricId = !!assessment.rubricId;

    // Check if rubric data is loaded and valid
    const hasValidRubricData = assessment.bloomsRubric &&
      assessment.bloomsRubric.criteria &&
      assessment.bloomsRubric.criteria.length > 0 &&
      assessment.bloomsRubric.performanceLevels &&
      assessment.bloomsRubric.performanceLevels.length > 0;

    // Transform rubric data for debugging
    const transformedCriteria = hasValidRubricData ? (assessment.bloomsRubric.criteria || []).map((criterion: any) => ({
      id: criterion.id,
      name: criterion.name,
      criteriaLevelsCount: criterion.criteriaLevels?.length || 0,
      transformedPerformanceLevels: (criterion.criteriaLevels || []).map((cl: any) => ({
        levelId: cl.performanceLevel?.id,
        score: cl.performanceLevel?.score,
        name: cl.performanceLevel?.name,
      }))
    })) : [];

    // Determine final grading method
    const finalGradingMethod = hasRubricId && hasValidRubricData ? 'RUBRIC_BASED' : 'SCORE_BASED';

    console.log('🎯 EnhancedAssessmentGradingInterface - Grading Method Debug:', {
      assessmentId: assessment.id,
      rubricId: assessment.rubricId,
      hasRubricId,
      hasBloomsRubric: !!assessment.bloomsRubric,
      hasValidRubricData,
      bloomsRubricCriteria: assessment.bloomsRubric?.criteria?.length || 0,
      bloomsRubricPerformanceLevels: assessment.bloomsRubric?.performanceLevels?.length || 0,
      transformedCriteria,
      finalGradingMethod,
      serviceProvidedGradingMethod: (assessment as any).gradingMethod,
      rubricConfiguration: (assessment as any).rubricConfiguration,
      // Additional debugging info
      rubricDataStructure: assessment.bloomsRubric ? {
        id: assessment.bloomsRubric.id,
        title: assessment.bloomsRubric.title,
        type: assessment.bloomsRubric.type,
        criteriaCount: assessment.bloomsRubric.criteria?.length || 0,
        performanceLevelsCount: assessment.bloomsRubric.performanceLevels?.length || 0,
        criteriaDetails: (assessment.bloomsRubric.criteria || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          criteriaLevelsCount: c.criteriaLevels?.length || 0,
        })),
        performanceLevelsDetails: (assessment.bloomsRubric.performanceLevels || []).map((pl: any) => ({
          id: pl.id,
          name: pl.name,
          score: pl.score,
        })),
      } : null
    });

    // If we have a rubric ID but no valid rubric data, log a warning
    if (hasRubricId && !hasValidRubricData) {
      console.warn('Assessment has rubricId but invalid/missing rubric data:', {
        assessmentId: assessment.id,
        rubricId: assessment.rubricId,
        bloomsRubric: assessment.bloomsRubric
      });
    }

    return finalGradingMethod;
  }, [assessment.rubricId, assessment.bloomsRubric]);

  // Handle enhanced grading submission
  const handleEnhancedGrading = useCallback(async (result: {
    score: number;
    feedback?: string;
    criteriaGrades?: any[];
    bloomsLevelScores?: Record<BloomsTaxonomyLevel, number>;
  }) => {
    console.log('handleEnhancedGrading called with:', result);

    if (!selectedStudentId) {
      console.error('No student selected');
      toast({
        title: "Error",
        description: "No student selected for grading",
        variant: "error",
      });
      return;
    }

    const student = studentsWithSubmissions.find(s => s.id === selectedStudentId);
    if (!student) {
      console.error('Student not found');
      toast({
        title: "Error",
        description: "Selected student not found",
        variant: "error",
      });
      return;
    }

    // For manual assessments, get or create submission if it doesn't exist
    if (!student.submission) {
      console.log('No submission found for student:', student.name, '- getting or creating submission');

      // Get or create a submission for this student
      try {
        const submission = await getOrCreateSubmission(assessment.id, student.id);
        console.log('Got/created submission:', submission.id);

        // Update the student object with the submission
        student.submission = {
          id: submission.id,
          status: 'SUBMITTED',
          score: submission.score || 0,
          feedback: (submission.feedback as string) || '',
          submittedAt: submission.submittedAt || new Date(),
        };

        // Refresh submissions data to reflect the changes
        refetchSubmissions();
      } catch (error) {
        console.error('Failed to get/create submission:', error);
        toast({
          title: "Error",
          description: `Failed to prepare submission for ${student.name}. Please try again.`,
          variant: "error",
        });
        return;
      }
    }

    console.log('Submitting grade for submission:', student.submission?.id);

    // Prepare grading data for API
    const gradingData = {
      submissionId: student.submission?.id || '',
      gradingType: 'RUBRIC' as const,
      score: result.score,
      feedback: result.feedback || "",
      status: SubmissionStatus.GRADED,
      // Add rubric-specific data
      rubricResults: result.criteriaGrades?.map(cg => ({
        criteriaId: cg.criterionId,
        performanceLevelId: cg.levelId,
        score: cg.score,
        feedback: cg.feedback || '',
      })) || [],
      bloomsLevelScores: result.bloomsLevelScores || {},
      updateTopicMastery: true,
    };

    console.log('Final grading data:', gradingData);

    gradeMutation.mutate(gradingData);
  }, [selectedStudentId, studentsWithSubmissions, gradeMutation, getOrCreateSubmission, assessment.id, refetchSubmissions, toast]);

  // Calculate stats
  const gradedSubmissionsCount = useMemo(() => {
    return studentsWithSubmissions.filter(
      (student: StudentWithSubmission) => student.submission?.status === SubmissionStatus.GRADED
    ).length;
  }, [studentsWithSubmissions]);

  // Loading state
  if (isLoadingClass || isLoadingSubmissions) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Loading grading interface...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!assessment || !classData) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
        <p className="text-red-700">
          Could not load the assessment or class data. Please try again.
        </p>
      </div>
    );
  }

  // Debug logging
  console.log('Enhanced Grading Debug:', {
    assessmentId: assessment.id,
    rubricId: assessment.rubricId,
    hasRubric: !!assessment.rubric,
    gradingMethod,
    studentsCount: studentsWithSubmissions.length
  });

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <AssessmentGradingHeader
          title={assessment.title}
          description={`Grade student submissions for ${assessment.title}`}
          maxScore={assessment.maxScore || 100}
          submissionCount={gradedSubmissionsCount}
          totalStudents={studentsWithSubmissions.length}
          isBatchGrading={batchGrading}
          isClassTeacher={isClassTeacher}
          onToggleBatchGrading={toggleBatchGrading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {batchGrading ? (
          <BatchGrading
            students={studentsWithSubmissions.map(student => ({
              id: student.id,
              studentId: student.id,
              studentName: student.name,
              studentEmail: student.email,
              name: student.name,
              email: student.email,
              submissionId: student.submission?.id,
              currentScore: student.submission?.score || 0,
              currentFeedback: student.submission?.feedback || '',
              status: student.submission?.status as any || 'pending',
              submittedAt: student.submission?.submittedAt,
            }))}
            maxScore={assessment.maxScore || 100}
            gradingMethod={gradingMethod as 'SCORE_BASED' | 'RUBRIC_BASED'}
            bloomsDistribution={assessment.bloomsDistribution as Record<BloomsTaxonomyLevel, number>}
            onSave={async (grades) => {
              // Handle batch grading save with single API call
              console.log('Batch grading save:', grades);

              try {
                // Prepare grades data for bulk operation
                const gradesToSubmit = grades.map(grade => {
                  const student = studentsWithSubmissions.find(s => s.id === grade.studentId);
                  return {
                    studentId: grade.studentId,
                    submissionId: student?.submission?.id, // Optional - will create if not provided
                    score: grade.score,
                    feedback: grade.feedback || '',
                  };
                });

                if (gradesToSubmit.length === 0) {
                  toast({
                    title: "Warning",
                    description: "No grades to save",
                    variant: "warning",
                  });
                  return;
                }

                // Single API call to handle everything
                await bulkGradeStudentsMutation.mutateAsync({
                  assessmentId: assessment.id,
                  grades: gradesToSubmit,
                });

              } catch (error) {
                console.error('Batch grading error:', error);
                toast({
                  title: "Error",
                  description: "Failed to save grades. Please try again.",
                  variant: "error",
                });
              }
            }}
            isSaving={bulkGradeStudentsMutation.isLoading}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="md:col-span-1 border rounded-md p-4">
              <TabsContent value="all" className="mt-0">
                <StudentList
                  students={studentsWithSubmissions}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={handleSelectStudent}
                  filter="all"
                  maxScore={assessment.maxScore || 100}
                />
              </TabsContent>

              <TabsContent value="graded" className="mt-0">
                <StudentList
                  students={studentsWithSubmissions}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={handleSelectStudent}
                  filter="graded"
                  maxScore={assessment.maxScore || 100}
                />
              </TabsContent>

              <TabsContent value="ungraded" className="mt-0">
                <StudentList
                  students={studentsWithSubmissions}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={handleSelectStudent}
                  filter="ungraded"
                  maxScore={assessment.maxScore || 100}
                />
              </TabsContent>
            </div>

            <div className="md:col-span-2">
              {/* Show rubric warning if rubricId exists but no valid rubric data */}
              {assessment.rubricId && (!assessment.bloomsRubric || !assessment.bloomsRubric.criteria || assessment.bloomsRubric.criteria.length === 0) && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Rubric Not Available</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        This assessment was configured to use a rubric, but the rubric data is not available.
                        Falling back to simple score-based grading.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedStudentId && (
                <div className="space-y-4">
                  {/* Submission Actions */}
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">
                        {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.name}'s Submission
                      </h3>
                      {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission && (
                        <Badge variant="outline">
                          {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission?.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* View Submission Button */}
                      {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission && (() => {
                        const selected = studentsWithSubmissions.find(s => s.id === selectedStudentId);
                        const submissionId = selected?.submission?.id || '';
                        const full = (submissionsData as any)?.items?.find((it: any) => it.id === submissionId);
                        const attachmentsRaw = full?.attachments;
                        const contentRaw = full?.content;
                        return (
                          <SubmissionViewDialog
                            submission={{
                              id: submissionId,
                              status: (selected?.submission?.status as any) || SubmissionStatus.DRAFT,
                              submittedAt: selected?.submission?.submittedAt || null,
                              score: selected?.submission?.score || null,
                              feedback: selected?.submission?.feedback,
                              content: contentRaw ?? {},
                              attachments: attachmentsRaw ?? [],
                              student: {
                                id: selectedStudentId!,
                                user: {
                                  name: selected?.name || null,
                                  email: selected?.email || '',
                                }
                              }
                            }}
                            assessment={{
                              id: assessment.id,
                              title: assessment.title,
                              maxScore: assessment.maxScore,
                            }}
                          />
                        );
                      })()}

                      {/* Upload Submission Button */}
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
                              Upload Submission Files - {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission?.id || createdSubmissions.has(selectedStudentId || '') ? (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-800">
                                      Submission Ready
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-green-700 border-green-300">
                                    ID: {studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission?.id?.slice(-8)}
                                  </Badge>
                                </div>
                                {(() => {
                                  const existingSubmissionId = studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission?.id;
                                  const newSubmissionId = selectedStudentId ? newSubmissionIds.get(selectedStudentId) : null;
                                  const submissionId = existingSubmissionId || newSubmissionId;

                                  if (submissionId) {
                                    return (
                                      <SubmissionFileUpload
                                        submissionId={submissionId}
                                        maxFiles={10}
                                        maxFileSize={50}
                                        onFilesChange={(files) => {
                                          console.log('Files changed:', files);
                                          // Optionally refresh submissions data
                                          refetchSubmissions();
                                        }}
                                      />
                                    );
                                  } else {
                                    return (
                                      <div className="text-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                                        <p className="text-gray-600">Loading submission data...</p>
                                        <p className="text-sm text-gray-500 mt-2">Please wait while we prepare the upload interface.</p>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div className="mb-6">
                                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                  <h3 className="text-lg font-medium mb-2">No Submission Found</h3>
                                  <p className="text-muted-foreground mb-4">
                                    This student hasn't submitted this assessment yet. Create a submission to upload files and begin grading.
                                  </p>
                                </div>

                                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 max-w-md mx-auto">
                                  <div className="space-y-4">
                                    <div className="text-sm text-muted-foreground">
                                      <p className="mb-2">Creating a submission will:</p>
                                      <ul className="text-left space-y-1">
                                        <li>• Allow file uploads for this student</li>
                                        <li>• Enable grading and feedback</li>
                                        <li>• Track submission status</li>
                                      </ul>
                                    </div>

                                    <Button
                                      onClick={async () => {
                                        try {
                                          const submission = await getOrCreateSubmission(assessment.id, selectedStudentId);
                                          console.log('Got/created submission:', submission.id);

                                          // Add to created submissions set for immediate UI update
                                          if (selectedStudentId) {
                                            setCreatedSubmissions(prev => new Set(prev).add(selectedStudentId));
                                            // Store the new submission ID
                                            setNewSubmissionIds(prev => new Map(prev).set(selectedStudentId, submission.id));
                                          }

                                          // Force a complete refresh of all data
                                          await Promise.all([
                                            refetchSubmissions(),
                                            refetchClass()
                                          ]);

                                          // Small delay to ensure state updates
                                          setTimeout(() => {
                                            toast({
                                              title: "Success",
                                              description: "Submission created successfully! You can now upload files.",
                                              variant: "success",
                                            });
                                          }, 200);

                                        } catch (error: any) {
                                          console.error('Failed to get/create submission:', error);
                                          toast({
                                            title: "Error",
                                            description: error.message || "Failed to create submission. Please try again.",
                                            variant: "error",
                                          });
                                        }
                                      }}
                                      disabled={getOrCreateSubmissionMutation.isLoading}
                                      className="w-full"
                                    >
                                      {getOrCreateSubmissionMutation.isLoading ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Creating Submission...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-2" />
                                          Create Submission
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Enhanced Grading Interface */}
                  <EnhancedGradingInterface
                    assessmentId={assessment.id}
                    submissionId={studentsWithSubmissions.find(s => s.id === selectedStudentId)?.submission?.id || ''}
                    maxScore={assessment.maxScore || 100}
                    gradingMethod={gradingMethod as 'SCORE_BASED' | 'RUBRIC_BASED'}
                    rubric={assessment.bloomsRubric && assessment.bloomsRubric.criteria && assessment.bloomsRubric.criteria.length > 0 && assessment.bloomsRubric.performanceLevels && assessment.bloomsRubric.performanceLevels.length > 0 ? {
                      id: assessment.bloomsRubric.id,
                      criteria: (assessment.bloomsRubric.criteria || []).map((criterion: any) => ({
                        id: criterion.id,
                        name: criterion.name,
                        description: criterion.description || '',
                        bloomsLevel: criterion.bloomsLevel,
                        weight: criterion.weight || 1,
                        learningOutcomeIds: criterion.learningOutcomeIds || [],
                        performanceLevels: (criterion.criteriaLevels || []).map((cl: any) => ({
                          levelId: cl.performanceLevel?.id || '',
                          description: cl.description || cl.performanceLevel?.description || '',
                          score: cl.performanceLevel?.score || 0,
                        }))
                      })),
                      performanceLevels: (assessment.bloomsRubric.performanceLevels || []).map((pl: any) => ({
                        id: pl.id,
                        name: pl.name,
                        description: pl.description || '',
                        scoreRange: {
                          min: pl.minScore || 0,
                          max: pl.maxScore || pl.score || 0,
                        },
                        color: pl.color,
                      })),
                    } : undefined}
                    bloomsDistribution={assessment.bloomsDistribution as Record<BloomsTaxonomyLevel, number>}
                    onGradeSubmit={handleEnhancedGrading}
                    readOnly={false}
                  />
                </div>
              )}
              {!selectedStudentId && (
                <div className="flex flex-col items-center justify-center h-full border rounded-md p-8">
                  <p className="text-gray-500 mb-4">
                    Select a student from the list to grade their submission
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </Tabs>
    </div>
  );
}
