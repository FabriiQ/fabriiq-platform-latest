import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { PaginationInput, BaseFilters } from "../types";
import { SystemStatus, SubmissionStatus, GradingType, GradingScale, AssessmentCategory } from "../constants";
import { ActivityRewardIntegration } from "@/features/rewards/activity-integration";
import { logger } from "@/server/api/utils/logger";
import { gradeAssessment } from "@/features/assessments/utils/auto-grading";
import { EventDrivenAnalyticsService } from "./event-driven-analytics";
import { updateGradebookWithActivityGrade } from "./gradebook.service";
// import { RewardService } from "./reward.service"; // Commented out until service exists
import type { InputJsonValue, QueryMode } from "../types/service";
import { submissionStorageService, type SubmissionUploadResult } from "@/lib/supabase/submission-storage.service";
// Removed unused import: import { z } from 'zod';

interface AssessmentServiceConfig {
  prisma: PrismaClient;
  defaultInstitutionId?: string;
  currentUserId?: string;
  defaultClassId?: string;
  defaultTermId?: string;
}

interface CreateAssessmentInput {
  title: string;
  description?: string;
  category: AssessmentCategory;
  subjectId: string;
  classId: string;
  topicId?: string;
  institutionId: string;
  termId: string;
  maxScore: number;
  passingScore?: number;
  weightage: number;
  gradingType: GradingType;
  gradingScale?: GradingScale;
  rubric?: Record<string, unknown>;
  rubricId?: string;
  bloomsDistribution?: Record<string, number>;
  dueDate?: Date;
  instructions?: string;
  resources?: Record<string, unknown>[];
  status?: SystemStatus;
  createdById: string;
  lessonPlanId?: string;
}

interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  category?: AssessmentCategory;
  maxScore?: number;
  weightage?: number;
  gradingType?: GradingType;
  gradingScale?: GradingScale;
  rubric?: Record<string, unknown>;
  dueDate?: Date;
  instructions?: string;
  resources?: Record<string, unknown>[];
  status?: SystemStatus;
}

export interface AssessmentServiceContext {
  prisma: Prisma.TransactionClient | PrismaClient;
}

export interface CreateSubmissionInput {
  assessmentId: string;
  studentId: string;
  answers: Array<{
    questionId: string;
    value?: string;
    choiceId?: string;
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    path: string;
    contentType: string;
    size: number;
  }>;
}

export interface GradeSubmissionInput {
  submissionId: string;
  gradingType?: 'RUBRIC' | 'SCORE' | 'HYBRID';

  // Score-based grading
  score?: number;
  feedback?: string;

  // Rubric-based grading
  rubricResults?: Array<{
    criteriaId: string;
    performanceLevelId: string;
    score: number;
    feedback?: string;
  }>;

  // Bloom's level analysis
  bloomsLevelScores?: Record<string, number>;
  bloomsAnalysis?: Array<{
    level: string;
    score: number;
    feedback: string;
    recommendations?: string[];
  }>;

  // Topic mastery updates
  updateTopicMastery?: boolean;
  topicMasteryChanges?: Array<{
    topicId: string;
    masteryLevel: number;
    evidence: string;
  }>;

  // Legacy support
  answerScores?: Array<{
    answerId: string;
    score: number;
    feedback?: string;
  }>;
}

interface BulkGradeSubmissionsInput {
  assessmentId: string;
  submissions: Array<{
    submissionId: string;
    score: number;
    feedback?: string;
  }>;
}

interface BulkGradeStudentsInput {
  assessmentId: string;
  grades: Array<{
    studentId: string;
    submissionId?: string;
    score: number;
    feedback?: string;
  }>;
}

export class AssessmentService {
  private prisma: PrismaClient;
  private config: AssessmentServiceConfig;

  constructor(config: AssessmentServiceConfig) {
    this.prisma = config.prisma;
    this.config = config;
  }

  /**
   * Create a new assessment
   */
  async createAssessment(input: CreateAssessmentInput) {
    try {
      logger.debug("Creating assessment", {
        title: input.title,
        classId: input.classId,
        subjectId: input.subjectId,
        createdById: input.createdById
      });

      // Check if subject exists
      const subject = await this.prisma.subject.findUnique({
        where: { id: input.subjectId },
      });

      if (!subject) {
        logger.warn("Subject not found when creating assessment", { subjectId: input.subjectId });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Subject not found",
        });
      }

      // Validate weightage (should be between 0 and 100)
      if (input.weightage < 0 || input.weightage > 100) {
        logger.warn("Invalid weightage when creating assessment", {
          weightage: input.weightage,
          title: input.title
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Weightage must be between 0 and 100",
        });
      }

      // Check total weightage of all assessments in the subject
      const existingAssessments = await this.prisma.assessment.findMany({
        where: { subjectId: input.subjectId },
        select: { weightage: true },
      });

      const totalWeightage = existingAssessments.reduce(
        (sum: number, assessment: { weightage: number | null }) => sum + (assessment.weightage || 0),
        0,
      );

      if (totalWeightage + input.weightage > 100) {
        logger.warn("Total weightage exceeds 100% when creating assessment", {
          existingWeightage: totalWeightage,
          newWeightage: input.weightage,
          total: totalWeightage + input.weightage
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total weightage of all assessments cannot exceed 100%",
        });
      }

      // Create assessment with enhanced fields
      const rubricData = input.rubric || {};
      if (input.description) {
        rubricData.description = input.description;
      }
      if (input.instructions) {
        rubricData.instructions = input.instructions;
      }

      const assessmentData: any = {
        title: input.title,
        category: input.category,
        maxScore: input.maxScore,
        passingScore: input.passingScore,
        weightage: input.weightage,
        gradingType: input.gradingType,
        gradingConfig: input.gradingScale ? { scale: input.gradingScale } as InputJsonValue : undefined,
        // Remove JSON rubric storage - use only rubricId for proper referencing
        bloomsDistribution: input.bloomsDistribution ? input.bloomsDistribution as InputJsonValue : undefined,
        dueDate: input.dueDate || null,
        status: input.status || SystemStatus.ACTIVE,
        // Required relations
        subject: { connect: { id: input.subjectId } },
        class: { connect: { id: input.classId } },
        institution: { connect: { id: input.institutionId } },
        term: { connect: { id: input.termId } },
        createdBy: { connect: { id: input.createdById } },
      };

      // Add optional relations
      if (input.topicId) {
        assessmentData.topic = { connect: { id: input.topicId } };
      }
      if (input.lessonPlanId) {
        assessmentData.lessonPlan = { connect: { id: input.lessonPlanId } };
      }
      if (input.rubricId) {
        // Verify the rubric exists before connecting
        const rubricExists = await this.prisma.rubric.findUnique({
          where: { id: input.rubricId },
          select: { id: true, title: true }
        });

        if (rubricExists) {
          assessmentData.bloomsRubric = { connect: { id: input.rubricId } };
          logger.debug("Connecting assessment to rubric", {
            assessmentTitle: input.title,
            rubricId: input.rubricId,
            rubricTitle: rubricExists.title
          });
        } else {
          logger.warn("Attempted to connect assessment to non-existent rubric", {
            assessmentTitle: input.title,
            rubricId: input.rubricId
          });
        }
      }

      const assessment = await this.prisma.assessment.create({
        data: assessmentData,
      });

      logger.debug("Assessment created successfully", {
        assessmentId: assessment.id,
        title: assessment.title,
        classId: input.classId,
        rubricId: assessment.rubricId,
        hasRubricConnection: !!assessment.rubricId
      });

      // If a rubric was supposed to be connected, verify it was successful
      if (input.rubricId) {
        const verifyAssessment = await this.prisma.assessment.findUnique({
          where: { id: assessment.id },
          include: { bloomsRubric: { select: { id: true, title: true } } }
        });

        logger.debug("Rubric connection verification", {
          assessmentId: assessment.id,
          expectedRubricId: input.rubricId,
          actualRubricId: verifyAssessment?.rubricId,
          bloomsRubricConnected: !!verifyAssessment?.bloomsRubric,
          bloomsRubricId: verifyAssessment?.bloomsRubric?.id
        });
      }

      return assessment;
    } catch (error) {
      logger.error("Error creating assessment", {
        error,
        title: input.title,
        classId: input.classId,
        subjectId: input.subjectId
      });
      throw error;
    }
  }

  /**
   * Get assessment by ID with related data
   */
  async getAssessment(id: string, options?: { includeSubmissions?: boolean; includeRubric?: boolean }) {
    const includeRubric = options?.includeRubric !== false; // Default to true
    const includeSubmissions = options?.includeSubmissions !== false; // Default to true

    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            course: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        ...(includeRubric && {
          bloomsRubric: {
            include: {
              criteria: {
                include: {
                  criteriaLevels: {
                    include: {
                      performanceLevel: true,
                    },
                  },
                },
              },
              performanceLevels: true,
            },
          },
        }),
        ...(includeSubmissions && {
          submissions: {
            select: {
              id: true,
              status: true,
              submittedAt: true,
              createdAt: true,
              score: true,
              feedback: true,
              content: true,
              attachments: true,
              timeSpentMinutes: true,
              bloomsLevelScores: true,
              topicMasteryChanges: true,
              learningOutcomeAchievements: true,
              student: {
                select: {
                  id: true,
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        }),
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assessment not found",
      });
    }

    // Debug logging for rubric data
    logger.debug("Assessment fetched with rubric data", {
      assessmentId: assessment.id,
      rubricId: assessment.rubricId,
      hasBloomsRubric: !!assessment.bloomsRubric,
      bloomsRubricId: assessment.bloomsRubric?.id,
      criteriaCount: (assessment.bloomsRubric as any)?.criteria?.length || 0,
      performanceLevelsCount: (assessment.bloomsRubric as any)?.performanceLevels?.length || 0,
      rubricTitle: assessment.bloomsRubric?.title
    });

    // If we have a rubricId but no bloomsRubric, log a warning
    if (assessment.rubricId && !assessment.bloomsRubric) {
      logger.warn("Assessment has rubricId but no bloomsRubric data", {
        assessmentId: assessment.id,
        rubricId: assessment.rubricId
      });
    }

    // Determine grading method based on rubric presence and configuration
    const gradingMethod = this.determineGradingMethod(assessment);

    // Add computed grading method to the response
    const assessmentWithGradingMethod = {
      ...assessment,
      gradingMethod,
      // Ensure rubric data is properly structured for frontend
      rubricConfiguration: assessment.bloomsRubric ? {
        hasValidRubric: true,
        criteriaCount: (assessment.bloomsRubric as any).criteria?.length || 0,
        performanceLevelsCount: (assessment.bloomsRubric as any).performanceLevels?.length || 0,
        isComplete: ((assessment.bloomsRubric as any).criteria?.length || 0) > 0 &&
                   ((assessment.bloomsRubric as any).performanceLevels?.length || 0) > 0
      } : {
        hasValidRubric: false,
        criteriaCount: 0,
        performanceLevelsCount: 0,
        isComplete: false
      }
    };

    return assessmentWithGradingMethod;
  }

  /**
   * Determine grading method based on assessment configuration
   */
  private determineGradingMethod(assessment: any): 'SCORE_BASED' | 'RUBRIC_BASED' {
    // Priority 1: Explicit gradingType setting
    if (assessment.gradingType === 'RUBRIC') return 'RUBRIC_BASED';
    if (assessment.gradingType === 'SCORE') return 'SCORE_BASED';

    // Priority 2: Rubric association with valid criteria
    if (assessment.rubricId && assessment.bloomsRubric) {
      const rubric = assessment.bloomsRubric as any;
      const hasCriteria = rubric.criteria && rubric.criteria.length > 0;
      const hasPerformanceLevels = rubric.performanceLevels && rubric.performanceLevels.length > 0;

      if (hasCriteria && hasPerformanceLevels) {
        return 'RUBRIC_BASED';
      }
    }

    // Priority 3: Check for embedded rubric in the rubric JSON field (legacy support)
    if (assessment.rubric) {
      try {
        const rubricData = typeof assessment.rubric === 'string'
          ? JSON.parse(assessment.rubric)
          : assessment.rubric;

        const hasCriteria = rubricData.criteria && rubricData.criteria.length > 0;
        const hasPerformanceLevels = rubricData.performanceLevels && rubricData.performanceLevels.length > 0;

        if (hasCriteria && hasPerformanceLevels) {
          logger.debug("Using embedded rubric for grading method determination", {
            assessmentId: assessment.id,
            criteriaCount: rubricData.criteria.length,
            performanceLevelsCount: rubricData.performanceLevels.length
          });
          return 'RUBRIC_BASED';
        }
      } catch (error) {
        logger.warn("Failed to parse embedded rubric JSON for grading method", {
          assessmentId: assessment.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Default: Score-based grading
    return 'SCORE_BASED';
  }

  /**
   * Get paginated list of assessments
   */
  async listAssessments(
    pagination: PaginationInput,
    filters?: BaseFilters & {
      subjectId?: string;
      category?: AssessmentCategory;
      lessonPlanId?: string; // Add lessonPlanId filter
    },
  ) {
    const { page = 1, pageSize = 10, sortBy = "createdAt", sortOrder = "desc" } = pagination;
    const { status, search, subjectId, category, lessonPlanId } = filters || {};

    const where = {
      status: status as SystemStatus,
      subjectId,
      ...(category && { category: category as any }),
      ...(lessonPlanId && { lessonPlanId }), // Add lessonPlanId to where clause
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as QueryMode } },
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        include: {
          subject: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: total > page * pageSize,
    };
  }

  /**
   * Update assessment
   */
  async updateAssessment(id: string, input: UpdateAssessmentInput) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        subject: {
          include: {
            assessments: {
              where: {
                NOT: {
                  id,
                },
              },
              select: {
                weightage: true,
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assessment not found",
      });
    }

    // If weightage is being updated, validate total weightage
    if (input.weightage !== undefined) {
      if (input.weightage < 0 || input.weightage > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Weightage must be between 0 and 100",
        });
      }

      const totalOtherWeightage = assessment.subject.assessments.reduce(
        (sum: number, a: { weightage: number | null }) => sum + (a.weightage || 0),
        0,
      );

      if (totalOtherWeightage + input.weightage > 100) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Total weightage of all assessments cannot exceed 100%",
        });
      }
    }

    const updatedAssessment = await this.prisma.assessment.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.maxScore && { maxScore: input.maxScore }),
        ...(input.weightage !== undefined && { weightage: input.weightage }),
        ...(input.gradingType && { gradingType: input.gradingType }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.status && { status: input.status }),
        updatedAt: new Date(),
      },
    });

    return updatedAssessment;
  }

  /**
   * Delete assessment
   */
  async deleteAssessment(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assessment not found",
      });
    }

    // Check if assessment has any submissions
    if (assessment._count.submissions > 0) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Cannot delete assessment with existing submissions",
      });
    }

    await this.prisma.assessment.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Get assessment statistics
   */
  async getAssessmentStats(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: {
        submissions: {
          select: {
            status: true,
            score: true,
            submittedAt: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assessment not found",
      });
    }

    // Calculate submission status distribution
    const submissionStatusDistribution = assessment.submissions.reduce(
      (acc: Record<string, number>, submission: { status: string }) => {
        acc[submission.status] = (acc[submission.status] || 0) + 1;
        return acc;
      },
      {},
    );

    // Calculate score distribution
    const scores = assessment.submissions
      .filter((s: { score: number | null }) => s.score !== null)
      .map((s: { score: number | null }) => s.score as number);

    const scoreStats = scores.length > 0 ? {
      min: Math.min(...scores),
      max: Math.max(...scores),
      average: scores.reduce((a: number, b: number) => a + b, 0) / scores.length,
      median: scores.sort((a: number, b: number) => a - b)[Math.floor(scores.length / 2)],
    } : null;

    // Calculate submission timeline
    const submissionTimeline = assessment.submissions
      .filter((s: { submittedAt: Date | null }) => s.submittedAt !== null)
      .reduce((acc: Record<string, number>, submission: { submittedAt: Date | null }) => {
        const date = (submission.submittedAt as Date).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalSubmissions: assessment._count.submissions,
      submissionStatusDistribution,
      scoreStats,
      submissionTimeline,
    };
  }

  async createSubmission(input: CreateSubmissionInput) {
    const { assessmentId, studentId, answers } = input;

    // Check if assessment exists and is published
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: assessmentId,
        status: 'ACTIVE', // Only allow submissions for published assessments
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assessment not found or not published',
      });
    }

    // Check if student is enrolled in the class
    const studentEnrollment = await this.prisma.studentEnrollment.findFirst(
      {
        where: {
          studentId,
          classId: assessment.classId,
          status: 'ACTIVE',
        },
      }
    );

    if (!studentEnrollment) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Student is not enrolled in this class',
      });
    }

    // Check if student already submitted
    const existingSubmission =
      await this.prisma.assessmentSubmission.findFirst({
        where: {
          assessmentId,
          studentId,
          status: {
            notIn: [SubmissionStatus.DRAFT]
          },
        },
      });

    if (existingSubmission) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'You have already submitted this assessment',
      });
    }

    // Check if past due date (if set and late submissions not allowed)
    const now = new Date();
    const policySettings = assessment.policyId ?
      await this.prisma.assessmentPolicy.findUnique({
        where: { id: assessment.policyId }
      }) : null;

    // Parse settings to get allowLateSubmissions
    const settings = policySettings?.settings ?
      (typeof policySettings.settings === 'string'
        ? JSON.parse(policySettings.settings as string)
        : policySettings.settings) : {};
    const allowLateSubmissions = settings.allowLateSubmissions ?? false;

    if (
      assessment.dueDate &&
      now > assessment.dueDate &&
      !allowLateSubmissions
    ) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'The deadline for this assessment has passed',
      });
    }

    // Try to get questions from rubric field
    const assessmentData = assessment.rubric ?
      (typeof assessment.rubric === 'string'
        ? JSON.parse(assessment.rubric as string)
        : assessment.rubric) : {};
    const questions = assessmentData.questions || [];

    // Validate answers against questions
    const questionIds = questions.map((q: any) => q.id);
    for (const answer of answers) {
      if (!questionIds.includes(answer.questionId)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Question with ID ${answer.questionId} does not exist in this assessment`,
        });
      }
    }

    // Check if all required questions are answered
    const requiredQuestions = questions.filter((q: any) => q.required);
    const answeredQuestionIds = answers.map((a) => a.questionId);

    for (const requiredQuestion of requiredQuestions) {
      if (!answeredQuestionIds.includes(requiredQuestion.id)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Required question "${requiredQuestion.text}" must be answered`,
        });
      }
    }

    // Determine submission status (LATE or SUBMITTED)
    const status =
      assessment.dueDate && now > assessment.dueDate
        ? SubmissionStatus.LATE
        : SubmissionStatus.SUBMITTED;

    // Format answers for storage
    const formattedAnswers = answers.reduce((acc: Record<string, any>, answer) => {
      acc[answer.questionId] = answer.value || answer.choiceId;
      return acc;
    }, {});

    // Check if assessment is auto-gradable
    let gradingResults: any = null;
    let finalStatus = status;
    let score: number | null = null;

    if (assessment.gradingType === GradingType.AUTOMATIC) {
      try {
        // Perform automatic grading
        const autoGradingResults = gradeAssessment(questions, formattedAnswers);
        gradingResults = autoGradingResults;

        // If auto-grading was successful, update status and score
        finalStatus = SubmissionStatus.GRADED;
        score = autoGradingResults.totalScore;

        logger.debug('Auto-graded assessment submission', {
          assessmentId,
          studentId,
          score,
          totalQuestions: questions.length,
          requiresManualGrading: autoGradingResults.requiresManualGrading
        });

        // If some questions require manual grading, mark for review
        if (autoGradingResults.requiresManualGrading) {
          finalStatus = SubmissionStatus.UNDER_REVIEW; // Using UNDER_REVIEW instead of NEEDS_REVIEW
        }
      } catch (error) {
        logger.error('Error auto-grading assessment', {
          assessmentId,
          studentId,
          error
        });
        // Continue with submission even if auto-grading fails
      }
    }

    // Create the submission with content field storing the answers as JSON
    const submission = await this.prisma.assessmentSubmission.create({
      data: {
        assessment: { connect: { id: assessmentId } },
        student: { connect: { id: studentId } },
        status: finalStatus,
        submittedAt: now,
        score,
        content: JSON.stringify({
          answers: formattedAnswers
        }) as unknown as InputJsonValue,
        attachments: input.attachments ?
          JSON.stringify(input.attachments) as unknown as InputJsonValue :
          undefined,
        gradingDetails: gradingResults ?
          JSON.stringify(gradingResults) as unknown as InputJsonValue :
          undefined,
        gradedAt: finalStatus === SubmissionStatus.GRADED ? now : null,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        assessment: true,
      },
    });

    // Process rewards for auto-graded submissions
    if (finalStatus === SubmissionStatus.GRADED && score !== null) {
      try {
        // Create an activity grade-like object for the reward system
        const activityGrade = {
          id: submission.id,
          studentId: submission.studentId,
          activityId: submission.assessmentId,
          score: submission.score,
          status: submission.status
        };

        const activityRewards = new ActivityRewardIntegration(this.prisma);
        const rewardResult = await activityRewards.processActivityGrade(activityGrade);

        logger.debug('Processed auto-graded assessment rewards', {
          assessmentId: submission.assessmentId,
          studentId: submission.studentId,
          pointsAwarded: rewardResult.points,
          levelUp: rewardResult.levelUp,
          achievementsUnlocked: rewardResult.achievements.length
        });
      } catch (rewardError) {
        logger.error('Error processing auto-graded assessment rewards', {
          error: rewardError,
          assessmentId: submission.assessmentId,
          studentId: submission.studentId
        });
        // Continue even if reward processing fails
      }
    }

    return submission;
  }

  async getSubmission(id: string) {
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id },
      include: {
        assessment: true,
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        gradedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    // Refresh attachment URLs if they exist
    if (submission.attachments) {
      try {
        const attachments = typeof submission.attachments === 'string'
          ? JSON.parse(submission.attachments)
          : submission.attachments;

        if (Array.isArray(attachments)) {
          const refreshedAttachments = await this.refreshAttachmentUrls(attachments);
          submission.attachments = refreshedAttachments as any;
        }
      } catch (error) {
        logger.warn('Failed to refresh attachment URLs for submission', {
          error,
          submissionId: submission.id,
        });
      }
    }

    return submission;
  }

  async listSubmissions(
    filters: { assessmentId: string; status?: SubmissionStatus },
    skip = 0,
    take = 10
  ) {
    const [items, total] = await Promise.all([
      this.prisma.assessmentSubmission.findMany({
        where: {
          assessmentId: filters.assessmentId,
          ...(filters.status && { status: filters.status as any }),
        },
        select: {
          id: true,
          status: true,
          score: true,
          feedback: true,
          content: true,
          attachments: true, // Include attachments
          submittedAt: true,
          gradedAt: true,
          updatedAt: true,
          studentId: true, // Needed for client-side mapping of submissions to students
          student: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.assessmentSubmission.count({
        where: {
          assessmentId: filters.assessmentId,
          ...(filters.status && { status: filters.status as any }),
        },
      }),
    ]);

    // Refresh attachment URLs for all submissions
    const itemsWithRefreshedUrls = await Promise.all(
      items.map(async (submission) => {
        if (submission.attachments) {
          try {
            const attachments = typeof submission.attachments === 'string'
              ? JSON.parse(submission.attachments)
              : submission.attachments;

            if (Array.isArray(attachments)) {
              const refreshedAttachments = await this.refreshAttachmentUrls(attachments);
              return {
                ...submission,
                attachments: refreshedAttachments as any,
              };
            }
          } catch (error) {
            logger.warn('Failed to refresh attachment URLs for submission in list', {
              error,
              submissionId: submission.id,
            });
          }
        }
        return submission;
      })
    );

    return { items: itemsWithRefreshedUrls, total };
  }

  async gradeSubmission(input: GradeSubmissionInput) {
    const {
      submissionId,
      gradingType = 'SCORE',
      score,
      feedback,
      rubricResults,
      bloomsLevelScores,
      bloomsAnalysis,
      updateTopicMastery,
      topicMasteryChanges,
      answerScores
    } = input;

    // Check if submission exists
    const submission = await this.prisma.assessmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        student: {
          select: {
            id: true,
            userId: true
          }
        },
        assessment: {
          include: {
            topic: true,
            bloomsRubric: {
              include: {
                criteria: {
                  include: {
                    criteriaLevels: true
                  }
                }
              }
            }
          }
        },
      },
    });

    if (!submission) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Submission not found',
      });
    }

    let finalScore = score || 0;
    let gradingDetails: any = {
      gradingType,
      answerScores: [],
      rubricResults: [],
      bloomsAnalysis: []
    };

    // Handle rubric-based grading
    if (gradingType === 'RUBRIC' && rubricResults && rubricResults.length > 0) {
      // Calculate score from rubric results
      finalScore = rubricResults.reduce((total, result) => total + result.score, 0);
      gradingDetails.rubricResults = rubricResults;

      // Store detailed rubric feedback
      gradingDetails.criteriaScores = rubricResults.map(result => ({
        criteriaId: result.criteriaId,
        score: result.score,
        feedback: result.feedback
      }));
    }

    // Handle Bloom's level analysis
    if (bloomsLevelScores) {
      gradingDetails.bloomsLevelScores = bloomsLevelScores;
    }

    if (bloomsAnalysis) {
      gradingDetails.bloomsAnalysis = bloomsAnalysis;
    }

    // Legacy answer scores support
    if (answerScores && answerScores.length > 0) {
      const content = submission.content ? JSON.parse(String(submission.content)) : {};
      const answers = content.answers || [];

      gradingDetails.answerScores = answers.map((answer: any) => {
        const matchingScore = answerScores.find(
          (score) => score.answerId === answer.questionId
        );
        return {
          questionId: answer.questionId,
          score: matchingScore?.score || 0,
          feedback: matchingScore?.feedback || '',
        };
      });
    }

    // Validate final score
    if (submission.assessment.maxScore !== null && (finalScore < 0 || finalScore > submission.assessment.maxScore)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Score must be between 0 and ${submission.assessment.maxScore}`,
      });
    }

    // Update the submission with enhanced grading data
    const updatedSubmission = await this.prisma.assessmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: finalScore,
        feedback: feedback as unknown as InputJsonValue,
        gradingDetails: gradingDetails as unknown as InputJsonValue,
        status: SubmissionStatus.GRADED,
        gradedAt: new Date(),
        gradedById: this.config.currentUserId,
      },
    });

    // Create assessment result with enhanced data
    await this.createOrUpdateAssessmentResult({
      studentId: submission.student.userId, // Use userId from StudentProfile, not studentProfileId
      assessmentId: submission.assessmentId,
      score: finalScore,
      maxScore: submission.assessment.maxScore || 100,
      passingScore: submission.assessment.passingScore || 60,
      rubricResults: rubricResults ? JSON.stringify(rubricResults) : null,
      criteriaScores: gradingDetails.criteriaScores ? JSON.stringify(gradingDetails.criteriaScores) : null,
      bloomsLevelScores: bloomsLevelScores ? JSON.stringify(bloomsLevelScores) : null,
      bloomsAnalysis: bloomsAnalysis ? JSON.stringify(bloomsAnalysis) : null,
      // Pass topicId to find or create TopicMastery record
      topicId: submission.assessment.topicId || undefined
    });

    // Handle topic mastery updates
    if (updateTopicMastery && topicMasteryChanges && submission.assessment.topicId) {
      await this.updateTopicMastery(submission.studentId, topicMasteryChanges);
    }

    // Update gradebook with assessment grade
    try {
      // Find the class gradebook
      const gradebook = await this.prisma.gradeBook.findFirst({
        where: {
          classId: submission.assessment.classId
        }
      });

      if (gradebook) {
        // Create an activity grade-like object for gradebook integration
        const assessmentGrade = {
          id: updatedSubmission.id,
          activityId: updatedSubmission.assessmentId,
          studentId: updatedSubmission.studentId,
          score: updatedSubmission.score || 0,
          maxScore: submission.assessment.maxScore || 100,
          submittedAt: updatedSubmission.submittedAt,
          gradedAt: updatedSubmission.gradedAt,
          status: updatedSubmission.status,
          // Add required fields for ActivityGrade compatibility
          content: updatedSubmission.content || {},
          feedback: updatedSubmission.feedback || '',
          createdAt: updatedSubmission.createdAt,
          updatedAt: updatedSubmission.updatedAt,
          attachments: updatedSubmission.attachments || {},
          points: null,
          gradedById: null,
          isArchived: false,
          timeSpentMinutes: null,
          learningStartedAt: null,
          learningCompletedAt: null,
          isCommitted: false,
          commitmentId: null,
          commitmentDeadline: null,
          commitmentMet: false,
          bloomsLevelScores: null,
          topicMasteryChanges: null,
          learningOutcomeAchievements: null,
          wordCount: null
        } as any;

        await updateGradebookWithActivityGrade(
          gradebook.id,
          updatedSubmission.studentId,
          assessmentGrade
        );

        logger.debug('Updated gradebook with assessment grade', {
          gradebookId: gradebook.id,
          assessmentId: updatedSubmission.assessmentId,
          studentId: updatedSubmission.studentId,
          score: updatedSubmission.score
        });
      }
    } catch (gradebookError) {
      logger.error('Error updating gradebook with assessment grade', {
        error: gradebookError,
        assessmentId: updatedSubmission.assessmentId,
        studentId: updatedSubmission.studentId
      });
      // Continue even if gradebook update fails
    }

    // Update analytics
    try {
      const eventAnalyticsService = new EventDrivenAnalyticsService(this.prisma);
      await eventAnalyticsService.processGradeEvent({
        submissionId: updatedSubmission.id,
        studentId: updatedSubmission.studentId,
        activityId: updatedSubmission.assessmentId,
        classId: submission.assessment.classId,
        subjectId: submission.assessment.subjectId || '',
        score: updatedSubmission.score || 0,
        maxScore: submission.assessment.maxScore || 100,
        percentage: ((updatedSubmission.score || 0) / (submission.assessment.maxScore || 100)) * 100,
        gradingType: gradingType as any,
        gradedBy: this.config.currentUserId || '',
        gradedAt: new Date(),
        bloomsLevelScores: bloomsLevelScores,
      });

      logger.debug('Updated analytics with assessment grade', {
        assessmentId: updatedSubmission.assessmentId,
        studentId: updatedSubmission.studentId,
        score: updatedSubmission.score
      });
    } catch (analyticsError) {
      logger.error('Error updating analytics with assessment grade', {
        error: analyticsError,
        assessmentId: updatedSubmission.assessmentId,
        studentId: updatedSubmission.studentId
      });
      // Continue even if analytics update fails
    }

    // Process rewards for assessment grade
    try {
      // Create an activity grade-like object for the reward system
      const activityGrade = {
        id: updatedSubmission.id,
        studentId: updatedSubmission.studentId,
        activityId: updatedSubmission.assessmentId, // Using assessmentId as activityId
        score: updatedSubmission.score,
        status: updatedSubmission.status
      };

      const activityRewards = new ActivityRewardIntegration(this.prisma);
      const rewardResult = await activityRewards.processActivityGrade(activityGrade);

      logger.debug('Processed assessment grade rewards', {
        assessmentId: updatedSubmission.assessmentId,
        studentId: updatedSubmission.studentId,
        pointsAwarded: rewardResult.points,
        levelUp: rewardResult.levelUp,
        achievementsUnlocked: rewardResult.achievements.length
      });
    } catch (rewardError) {
      logger.error('Error processing assessment grade rewards', {
        error: rewardError,
        assessmentId: updatedSubmission.assessmentId,
        studentId: updatedSubmission.studentId
      });
      // Continue even if reward processing fails
    }

    return updatedSubmission;
  }

  async bulkGradeSubmissions(input: BulkGradeSubmissionsInput) {
    const { assessmentId, submissions } = input;

    // Check if assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: assessmentId,
        NOT: {
          status: SystemStatus.DELETED
        }
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assessment not found',
      });
    }

    // Validate all submissions first
    const submissionIds = submissions.map(sub => sub.submissionId);
    const existingSubmissions = await this.prisma.assessmentSubmission.findMany({
      where: {
        id: { in: submissionIds },
        assessmentId,
        status: {
          notIn: [SubmissionStatus.DRAFT]
        },
      },
      select: {
        id: true,
        studentId: true,
      }
    });

    // Check if all submissions exist
    const existingIds = new Set(existingSubmissions.map(s => s.id));
    const missingSubmissions = submissionIds.filter(id => !existingIds.has(id));
    if (missingSubmissions.length > 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Submissions not found: ${missingSubmissions.join(', ')}`,
      });
    }

    // Validate scores
    for (const sub of submissions) {
      if (assessment.maxScore !== null && (sub.score < 0 || sub.score > assessment.maxScore)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Score for submission ${sub.submissionId} must be between 0 and ${assessment.maxScore}`,
        });
      }
    }

    // Use a single transaction to update all submissions
    const results = await this.prisma.$transaction(async (tx) => {
      const updatedSubmissions: any[] = [];

      // Batch update all submissions
      for (const sub of submissions) {
        const updated = await tx.assessmentSubmission.update({
          where: { id: sub.submissionId },
          data: {
            score: sub.score,
            feedback: sub.feedback as unknown as InputJsonValue,
            status: SubmissionStatus.GRADED,
            gradedAt: new Date(),
            gradedById: this.config.currentUserId,
          },
        });
        updatedSubmissions.push(updated);
      }

      return updatedSubmissions;
    });

    // Process additional operations for each graded submission
    for (const updated of results) {
      const studentSubmission = existingSubmissions.find(s => s.id === updated.id);
      if (!studentSubmission) continue;

      // Update gradebook with assessment grade (async, don't wait)
      this.updateGradebookForSubmission(updated, assessment, studentSubmission.studentId).catch(error => {
        logger.error('Error updating gradebook with bulk assessment grade', {
          error,
          assessmentId: updated.assessmentId,
          studentId: studentSubmission.studentId
        });
      });

      // Update analytics (async, don't wait)
      this.updateAnalyticsForSubmission(updated, assessment, studentSubmission.studentId).catch(error => {
        logger.error('Error updating analytics with bulk assessment grade', {
          error,
          assessmentId: updated.assessmentId,
          studentId: studentSubmission.studentId
        });
      });

      // Process rewards (async, don't wait)
      this.processRewardsForSubmission(updated, studentSubmission.studentId).catch(error => {
        logger.error('Error processing bulk assessment grade rewards', {
          error,
          assessmentId: updated.assessmentId,
          studentId: studentSubmission.studentId
        });
      });
    }

    return {
      count: results.length,
      message: `Successfully graded ${results.length} submissions`,
    };
  }

  private async updateGradebookForSubmission(updated: any, assessment: any, studentId: string) {
    // Find the class gradebook
    const gradebook = await this.prisma.gradeBook.findFirst({
      where: {
        classId: assessment.classId
      }
    });

    if (gradebook) {
      // Create an activity grade-like object for gradebook integration
      const assessmentGrade = {
        id: updated.id,
        activityId: updated.assessmentId,
        studentId: studentId,
        score: updated.score || 0,
        maxScore: assessment.maxScore || 100,
        submittedAt: updated.submittedAt,
        gradedAt: updated.gradedAt,
        status: updated.status,
        // Add required fields for ActivityGrade compatibility
        content: updated.content || {},
        feedback: updated.feedback || '',
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        attachments: updated.attachments || {},
        points: null,
        gradedById: null,
        isArchived: false,
        timeSpentMinutes: null,
        learningStartedAt: null,
        learningCompletedAt: null,
        isCommitted: false,
        commitmentId: null,
        commitmentDeadline: null,
        commitmentMet: false,
        bloomsLevelScores: null,
        topicMasteryChanges: null,
        learningOutcomeAchievements: null,
        wordCount: null
      } as any;

      await updateGradebookWithActivityGrade(
        gradebook.id,
        studentId,
        assessmentGrade
      );
    }
  }

  private async updateAnalyticsForSubmission(updated: any, assessment: any, studentId: string) {
    const eventAnalyticsService = new EventDrivenAnalyticsService(this.prisma);
    await eventAnalyticsService.processGradeEvent({
      submissionId: updated.id,
      studentId: studentId,
      activityId: updated.assessmentId,
      classId: assessment.classId,
      subjectId: assessment.subjectId || '',
      score: updated.score || 0,
      maxScore: assessment.maxScore || 100,
      percentage: ((updated.score || 0) / (assessment.maxScore || 100)) * 100,
      gradingType: 'MANUAL',
      gradedBy: this.config.currentUserId || '',
      gradedAt: new Date(),
      bloomsLevelScores: undefined,
    });
  }

  private async processRewardsForSubmission(updated: any, studentId: string) {
    // Create an activity grade-like object for the reward system
    const activityGrade = {
      id: updated.id,
      studentId: studentId,
      activityId: updated.assessmentId, // Using assessmentId as activityId
      score: updated.score,
      status: updated.status
    };

    const activityRewards = new ActivityRewardIntegration(this.prisma);
    const rewardResult = await activityRewards.processActivityGrade(activityGrade);

    logger.debug('Processed bulk assessment grade rewards', {
      assessmentId: updated.assessmentId,
      studentId: studentId,
      pointsAwarded: rewardResult.points,
      levelUp: rewardResult.levelUp,
      achievementsUnlocked: rewardResult.achievements.length
    });
  }

  async bulkGradeStudents(input: BulkGradeStudentsInput) {
    const { assessmentId, grades } = input;

    // Check if assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: {
        id: assessmentId,
        NOT: {
          status: SystemStatus.DELETED
        }
      },
    });

    if (!assessment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assessment not found',
      });
    }

    const results: any[] = [];
    const errors: Array<{studentId: string; error: string}> = [];

    for (const grade of grades) {
      try {
        let submissionId = grade.submissionId;

        // Create submission if it doesn't exist
        if (!submissionId) {
          const newSubmission = await this.prisma.assessmentSubmission.create({
            data: {
              assessmentId,
              studentId: grade.studentId,
              status: SubmissionStatus.SUBMITTED,
              submittedAt: new Date(),
              content: {}, // Empty content for manual grading
              attachments: [], // Empty attachments
            },
          });
          submissionId = newSubmission.id;
        }

        // Grade the submission
        const updatedSubmission = await this.prisma.assessmentSubmission.update({
          where: { id: submissionId },
          data: {
            score: grade.score,
            feedback: grade.feedback || '',
            status: SubmissionStatus.GRADED,
            gradedAt: new Date(),
          },
          include: {
            student: {
              select: {
                id: true,
                userId: true
              }
            },
            assessment: {
              include: {
                topic: true
              }
            }
          }
        });

        // Process rewards (similar to individual grading)
        // TODO: Implement reward processing when RewardService is available
        /*
        try {
          const rewardService = new RewardService({ prisma: this.prisma });
          await rewardService.processAssessmentGradeRewards({
            studentId: updatedSubmission.studentId,
            assessmentId: updatedSubmission.assessmentId,
            score: updatedSubmission.score || 0,
            maxScore: assessment.maxScore || 100,
            topicId: updatedSubmission.assessment.topic?.id
          });
        } catch (rewardError) {
          logger.error('Error processing bulk assessment grade rewards', {
            error: rewardError,
            assessmentId: updatedSubmission.assessmentId,
            studentId: updatedSubmission.studentId
          });
          // Continue even if reward processing fails
        }
        */

        results.push(updatedSubmission);
      } catch (error) {
        logger.error('Error grading student submission', {
          error,
          studentId: grade.studentId,
          assessmentId
        });
        errors.push({
          studentId: grade.studentId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      count: results.length,
      errors: errors.length,
      message: `Successfully graded ${results.length} submissions${errors.length > 0 ? ` with ${errors.length} errors` : ''}`,
      errorDetails: errors.length > 0 ? errors : undefined
    };
  }

  async publishAssessment(id: string) {
    // Check if assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assessment not found',
      });
    }

    // Publish assessment
    return this.prisma.assessment.update({
      where: { id },
      data: {
        status: SystemStatus.ACTIVE,
      },
    });
  }

  async unpublishAssessment(id: string) {
    // Check if assessment exists
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
    });

    if (!assessment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Assessment not found',
      });
    }

    // Unpublish assessment
    return this.prisma.assessment.update({
      where: { id },
      data: {
        status: SystemStatus.INACTIVE,
      },
    });
  }

  /**
   * Get paginated list of assessments for a specific class
   */
  async listAssessmentsByClass(
    filters: {
      classId: string;
      category?: AssessmentCategory;
      status?: SystemStatus;
      lessonPlanId?: string; // Add lessonPlanId filter
    },
    pagination: PaginationInput = { page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc" }
  ) {
    const { page = 1, pageSize = 10, sortBy = "createdAt", sortOrder = "desc" } = pagination;

    const where = {
      classId: filters.classId,
      ...(filters.category && { category: filters.category as any }),
      ...(filters.lessonPlanId && { lessonPlanId: filters.lessonPlanId }), // Add lessonPlanId to where clause
      status: filters.status || SystemStatus.ACTIVE,
    };

    const [total, items] = await Promise.all([
      this.prisma.assessment.count({ where }),
      this.prisma.assessment.findMany({
        where,
        include: {
          subject: true,
          topic: true,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: total > page * pageSize,
    };
  }

  /**
   * Create or update assessment result with enhanced data
   */
  private async createOrUpdateAssessmentResult(data: {
    studentId: string;
    assessmentId: string;
    score: number;
    maxScore: number;
    passingScore: number;
    rubricResults?: string | null;
    criteriaScores?: string | null;
    bloomsLevelScores?: string | null;
    bloomsAnalysis?: string | null;
    topicId?: string; // Changed from topicMasteryId to topicId
  }) {
    const existingResult = await this.prisma.assessmentResult.findFirst({
      where: {
        studentId: data.studentId,
        assessmentId: data.assessmentId
      }
    });

    // Find or create TopicMastery record if topicId is provided
    let validTopicMasteryId: string | undefined = undefined;
    if (data.topicId) {
      try {
        // First, verify the topic exists
        const topic = await this.prisma.subjectTopic.findUnique({
          where: { id: data.topicId },
          select: { id: true, subjectId: true }
        });

        if (topic) {
          // Find existing TopicMastery or create one
          let topicMastery = await this.prisma.topicMastery.findFirst({
            where: {
              studentId: data.studentId,
              topicId: data.topicId
            }
          });

          if (!topicMastery) {
            // Create new TopicMastery record
            topicMastery = await this.prisma.topicMastery.create({
              data: {
                studentId: data.studentId,
                topicId: data.topicId,
                subjectId: topic.subjectId,
                rememberLevel: 0,
                understandLevel: 0,
                applyLevel: 0,
                analyzeLevel: 0,
                evaluateLevel: 0,
                createLevel: 0,
                overallMastery: 0,
                lastAssessmentDate: new Date()
              }
            });
            console.log(`Created new TopicMastery record for student ${data.studentId} and topic ${data.topicId}`);
          }

          validTopicMasteryId = topicMastery.id;
        } else {
          console.warn(`Topic with ID ${data.topicId} not found, skipping topicMasteryId`);
        }
      } catch (error) {
        console.warn(`Error handling TopicMastery for topic ${data.topicId}:`, error);
      }
    }

    const resultData = {
      score: data.score,
      maxScore: data.maxScore,
      passingScore: data.passingScore,
      ...(data.rubricResults ? { rubricResults: data.rubricResults as InputJsonValue } : {}),
      ...(data.criteriaScores ? { criteriaScores: data.criteriaScores as InputJsonValue } : {}),
      ...(data.bloomsLevelScores ? { bloomsLevelScores: data.bloomsLevelScores as InputJsonValue } : {}),
      ...(data.bloomsAnalysis ? { bloomsAnalysis: data.bloomsAnalysis as InputJsonValue } : {}),
      submittedAt: new Date()
    };

    if (existingResult) {
      return this.prisma.assessmentResult.update({
        where: { id: existingResult.id },
        data: {
          ...resultData,
          ...(validTopicMasteryId ? { topicMasteryId: validTopicMasteryId } : {})
        }
      });
    } else {
      return this.prisma.assessmentResult.create({
        data: {
          ...resultData,
          studentId: data.studentId,
          assessmentId: data.assessmentId,
          ...(validTopicMasteryId ? { topicMasteryId: validTopicMasteryId } : {})
        }
      });
    }
  }

  /**
   * Update topic mastery based on assessment results
   */
  private async updateTopicMastery(studentId: string, changes: Array<{
    topicId: string;
    masteryLevel: number;
    evidence: string;
  }>) {
    for (const change of changes) {
      // Get the topic to determine the subject
      const topic = await this.prisma.subjectTopic.findUnique({
        where: { id: change.topicId }
      });

      if (!topic) continue;

      const existingMastery = await this.prisma.topicMastery.findFirst({
        where: {
          studentId,
          topicId: change.topicId
        }
      });

      if (existingMastery) {
        await this.prisma.topicMastery.update({
          where: { id: existingMastery.id },
          data: {
            overallMastery: change.masteryLevel,
            lastAssessmentDate: new Date()
          }
        });
      } else {
        await this.prisma.topicMastery.create({
          data: {
            studentId,
            topicId: change.topicId,
            subjectId: topic.subjectId,
            overallMastery: change.masteryLevel,
            lastAssessmentDate: new Date()
          }
        });
      }
    }
  }

  /**
   * Upload file for submission
   */
  async uploadSubmissionFile(
    file: File | Buffer,
    fileName: string,
    submissionId: string,
    uploaderId: string
  ): Promise<SubmissionUploadResult> {
    try {
      // First, find the submission to get the actual student ID
      const submission = await this.prisma.assessmentSubmission.findFirst({
        where: {
          id: submissionId,
          status: {
            in: [SubmissionStatus.DRAFT, SubmissionStatus.SUBMITTED]
          }
        },
        include: {
          student: {
            include: {
              user: true
            }
          },
          assessment: {
            include: {
              class: {
                include: {
                  teachers: {
                    include: {
                      teacher: {
                        include: {
                          user: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!submission) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submission not found or cannot be modified',
        });
      }

      // Check if the uploader is either the student or a teacher of the class
      const isStudent = submission.studentId === uploaderId;
      const isTeacher = submission.assessment.class.teachers.some(
        (teacherEnrollment: any) => teacherEnrollment.teacher.user.id === uploaderId
      );

      if (!isStudent && !isTeacher) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to upload files for this submission',
        });
      }

      // Upload file using storage service
      const uploadResult = await submissionStorageService.uploadSubmissionFile(
        file,
        fileName,
        submissionId,
        submission.studentId // Use the actual student ID from the submission
      );

      // Update submission with new attachment
      const currentAttachments = submission.attachments as any[] || [];
      const updatedAttachments = [
        ...currentAttachments,
        {
          id: uploadResult.id,
          name: uploadResult.name,
          url: uploadResult.url,
          path: uploadResult.path,
          contentType: uploadResult.mimeType,
          size: uploadResult.size,
          uploadedAt: uploadResult.uploadedAt.toISOString(),
        }
      ];

      await this.prisma.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          attachments: JSON.stringify(updatedAttachments) as unknown as InputJsonValue,
          updatedAt: new Date(),
        }
      });

      return uploadResult;
    } catch (error) {
      logger.error('Failed to upload submission file', {
        error,
        submissionId,
        uploaderId,
        fileName
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to upload submission file',
      });
    }
  }

  /**
   * Delete submission file
   */
  async deleteSubmissionFile(
    submissionId: string,
    fileId: string,
    deleterId: string
  ): Promise<void> {
    try {
      // Find the submission with authorization check
      const submission = await this.prisma.assessmentSubmission.findFirst({
        where: {
          id: submissionId,
          status: {
            in: [SubmissionStatus.DRAFT, SubmissionStatus.SUBMITTED]
          }
        },
        include: {
          student: {
            include: {
              user: true
            }
          },
          assessment: {
            include: {
              class: {
                include: {
                  teachers: {
                    include: {
                      teacher: {
                        include: {
                          user: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!submission) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Submission not found or cannot be modified',
        });
      }

      // Check if the deleter is either the student or a teacher of the class
      const isStudent = submission.studentId === deleterId;
      const isTeacher = submission.assessment.class.teachers.some(
        (teacherEnrollment: any) => teacherEnrollment.teacher.user.id === deleterId
      );

      if (!isStudent && !isTeacher) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not authorized to delete files from this submission',
        });
      }

      const currentAttachments = submission.attachments as any[] || [];
      const fileToDelete = currentAttachments.find(att => att.id === fileId);

      if (!fileToDelete) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found in submission',
        });
      }

      // Delete from storage
      await submissionStorageService.deleteSubmissionFile(fileToDelete.path, submissionId);

      // Update submission attachments
      const updatedAttachments = currentAttachments.filter(att => att.id !== fileId);

      await this.prisma.assessmentSubmission.update({
        where: { id: submissionId },
        data: {
          attachments: JSON.stringify(updatedAttachments) as unknown as InputJsonValue,
          updatedAt: new Date(),
        }
      });

    } catch (error) {
      logger.error('Failed to delete submission file', {
        error,
        submissionId,
        fileId,
        deleterId
      });

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete submission file',
      });
    }
  }

  /**
   * Refresh attachment URLs with fresh signed URLs
   */
  async refreshAttachmentUrls(attachments: any[]): Promise<any[]> {
    if (!attachments || !Array.isArray(attachments)) {
      return [];
    }

    const refreshedAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        try {
          if (attachment.path) {
            // Generate fresh signed URL
            const freshUrl = await submissionStorageService.getSubmissionFileUrl(attachment.path);
            return {
              ...attachment,
              url: freshUrl,
            };
          }
          return attachment;
        } catch (error) {
          logger.warn('Failed to refresh attachment URL', {
            error,
            attachmentId: attachment.id,
            path: attachment.path,
          });
          // Return original attachment if URL refresh fails
          return attachment;
        }
      })
    );

    return refreshedAttachments;
  }
}