'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Save,
  Eye,
  CheckCircle2,
  AlertCircle,
  User,
  FileText
} from 'lucide-react';
import { Upload } from '@/components/ui/icons/custom-icons';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { SubmissionStatus } from '@/server/api/constants';
import { toast } from 'sonner';
import { SubmissionViewDialog } from '../submission/SubmissionViewDialog';

interface BulkGradingSubmission {
  id: string;
  status: any; // Accept any status type to handle enum differences
  submittedAt: Date | null;
  score: number | null;
  feedback?: any;
  content?: any;
  attachments?: any;
  student?: {
    id: string;
    user: {
      name: string | null;
      email?: string;
    };
  };
}

interface BulkGradingInterfaceProps {
  assessmentId: string;
  submissions: BulkGradingSubmission[];
  assessment: {
    id: string;
    title: string;
    maxScore?: number | null;
  };
  onGradingComplete?: () => void;
  className?: string;
}

interface GradeInput {
  submissionId: string;
  score: number;
  feedback: string;
  selected: boolean;
}

export function BulkGradingInterface({
  assessmentId,
  submissions,
  assessment,
  onGradingComplete,
  className,
}: BulkGradingInterfaceProps) {
  const [grades, setGrades] = useState<Record<string, GradeInput>>(() => {
    const initialGrades: Record<string, GradeInput> = {};
    submissions.forEach(submission => {
      initialGrades[submission.id] = {
        submissionId: submission.id,
        score: submission.score || 0,
        feedback: typeof submission.feedback === 'string' ? submission.feedback : '',
        selected: false,
      };
    });
    return initialGrades;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [progress, setProgress] = useState(0);

  const maxScore = assessment.maxScore || 100;
  const utils = api.useUtils();

  // Use ultra-optimized bulk grading for 800+ students with fallback
  const ultraBulkGradeMutation = api.assessment.ultraBulkGradeSubmissions.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully graded ${result.count} submissions with scores`);
      // Invalidate queries to refresh the UI with updated scores
      utils.assessment.getById.invalidate({ assessmentId });
      utils.assessment.listSubmissions.invalidate({ assessmentId });
      onGradingComplete?.();
    },
    onError: (error) => {
      console.error('Ultra bulk grading failed, trying regular bulk grading:', error);
      // Fallback to regular bulk grading
      handleRegularBulkGrade();
    },
  });

  // Fallback to regular bulk grading
  const regularBulkGradeMutation = api.assessment.bulkGradeSubmissions.useMutation({
    onSuccess: (result) => {
      toast.success(`Successfully graded submissions with scores (fallback method)`);
      // Invalidate queries to refresh the UI with updated scores
      utils.assessment.getById.invalidate({ assessmentId });
      utils.assessment.listSubmissions.invalidate({ assessmentId });
      onGradingComplete?.();
    },
    onError: (error) => {
      toast.error(`Failed to grade submissions: ${error.message}`);
    },
  });

  const updateGrade = (submissionId: string, field: keyof Omit<GradeInput, 'submissionId'>, value: any) => {
    setGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value,
      }
    }));
  };

  const toggleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setGrades(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id].selected = newSelectAll;
      });
      return updated;
    });
  };

  const handleRegularBulkGrade = async () => {
    const selectedGrades = Object.values(grades).filter(grade => grade.selected);
    const gradesWithScores = selectedGrades.filter(grade => {
      const score = Number(grade.score);
      return !isNaN(score) && score > 0;
    });

    if (gradesWithScores.length === 0) return;

    try {
      await regularBulkGradeMutation.mutateAsync({
        assessmentId,
        grades: gradesWithScores.map(grade => ({
          submissionId: grade.submissionId,
          score: Number(grade.score),
          feedback: grade.feedback || '',
          status: SubmissionStatus.GRADED,
        })),
      });
    } catch (error) {
      console.error('Regular bulk grading also failed:', error);
    }
  };

  const handleBulkGrade = async () => {
    const selectedGrades = Object.values(grades).filter(grade => grade.selected);

    if (selectedGrades.length === 0) {
      toast.error('Please select at least one submission to grade');
      return;
    }

    // Filter to only include grades with actual scores entered (not 0 or empty)
    const gradesWithScores = selectedGrades.filter(grade => {
      const score = Number(grade.score);
      return !isNaN(score) && score > 0;
    });

    if (gradesWithScores.length === 0) {
      toast.error('Please enter scores for the selected submissions before grading');
      return;
    }

    if (gradesWithScores.length < selectedGrades.length) {
      const skippedCount = selectedGrades.length - gradesWithScores.length;
      toast.warning(`${skippedCount} submissions will be skipped because they have no score entered`);
    }

    setIsSubmitting(true);
    setProgress(0);

    try {
      // Show progress for large batches
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await ultraBulkGradeMutation.mutateAsync({
        assessmentId,
        grades: gradesWithScores.map(grade => ({
          submissionId: grade.submissionId,
          score: Number(grade.score),
          feedback: grade.feedback || '',
        })),
      });

      clearInterval(progressInterval);
      setProgress(100);

      // Reset progress after a short delay
      setTimeout(() => setProgress(0), 1000);

      // Debug: Log the grades that were submitted
      console.log('Bulk grading completed for:', {
        assessmentId,
        gradesCount: gradesWithScores.length,
        grades: gradesWithScores.map(g => ({
          submissionId: g.submissionId,
          score: Number(g.score)
        }))
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.values(grades).filter(g => g.selected).length;

  const getStatusColor = (status: SubmissionStatus) => {
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg">
              Bulk Grading: {assessment.title}
            </CardTitle>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedCount} of {submissions.length} selected
              </span>
              <Button
                onClick={handleBulkGrade}
                disabled={isSubmitting || selectedCount === 0}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Grade Selected ({selectedCount})
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left py-3 px-2 sm:px-4 w-8 sm:w-12">
                    <Checkbox
                      checked={selectAll}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left py-3 px-2 sm:px-4">Student</th>
                  <th className="text-left py-3 px-2 sm:px-4 hidden sm:table-cell">Status</th>
                  <th className="text-left py-3 px-2 sm:px-4 hidden md:table-cell">Submitted</th>
                  <th className="text-left py-3 px-2 sm:px-4 w-20 sm:w-32">Score</th>
                  <th className="text-left py-3 px-2 sm:px-4 hidden lg:table-cell">Feedback</th>
                  <th className="text-right py-3 px-2 sm:px-4 w-16 sm:w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => {
                  const grade = grades[submission.id];
                  const studentName = submission.student?.user?.name || submission.student?.user?.email || 'Unknown Student';
                  
                  return (
                    <React.Fragment key={submission.id}>
                      <tr className="border-b hover:bg-muted/25">
                        <td className="py-3 px-2 sm:px-4">
                          <Checkbox
                            checked={grade.selected}
                            onCheckedChange={(checked) =>
                              updateGrade(submission.id, 'selected', checked)
                            }
                          />
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm sm:text-base">{studentName}</p>
                              <p className="text-xs text-muted-foreground hidden sm:block">
                                {submission.student?.user?.email}
                              </p>
                              {/* Show status on mobile */}
                              <div className="sm:hidden">
                                <Badge className={`${getStatusColor(submission.status)} text-xs`}>
                                  {submission.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                          <Badge className={getStatusColor(submission.status)}>
                            {submission.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-sm text-muted-foreground hidden md:table-cell">
                          {submission.submittedAt
                            ? new Date(submission.submittedAt).toLocaleDateString()
                            : 'Not submitted'
                          }
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <div className="flex items-center gap-1 sm:gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={maxScore}
                              value={grade.score}
                              onChange={(e) =>
                                updateGrade(submission.id, 'score', Number(e.target.value))
                              }
                              className="w-12 sm:w-16 h-8 text-sm"
                            />
                            <span className="text-xs text-muted-foreground">
                              /{maxScore}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                          <Textarea
                            placeholder="Feedback..."
                            value={grade.feedback}
                            onChange={(e) =>
                              updateGrade(submission.id, 'feedback', e.target.value)
                            }
                            className="min-h-[60px] text-sm"
                            rows={2}
                          />
                        </td>
                        <td className="py-3 px-2 sm:px-4 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 justify-end">
                            <SubmissionViewDialog
                              submission={submission}
                              assessment={assessment}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Open upload dialog for this submission
                                // This would need to be implemented with a state management approach
                                console.log('Upload files for submission:', submission.id);
                              }}
                              className="w-full sm:w-auto text-xs sm:text-sm px-2 sm:px-3"
                            >
                              <Upload className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                              <span className="hidden sm:inline ml-1">Upload</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {/* Mobile feedback row - only show on small screens */}
                      <tr className="lg:hidden border-b bg-muted/10">
                        <td colSpan={7} className="py-2 px-2 sm:px-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground">
                              Feedback for {studentName}:
                            </Label>
                            <Textarea
                              placeholder="Enter feedback..."
                              value={grade.feedback}
                              onChange={(e) =>
                                updateGrade(submission.id, 'feedback', e.target.value)
                              }
                              className="min-h-[50px] text-sm"
                              rows={2}
                            />
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Progress Indicator for Large Batches */}
      {isSubmitting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing {selectedCount} submissions...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ultra-optimized processing for large batches. Please wait...
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grading Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Submissions</p>
              <p className="text-2xl font-bold">{submissions.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Already Graded</p>
              <p className="text-2xl font-bold">
                {submissions.filter(s => s.status === SubmissionStatus.GRADED).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Selected for Grading</p>
              <p className="text-2xl font-bold">{selectedCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">
                {submissions.filter(s => s.status !== SubmissionStatus.GRADED).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
