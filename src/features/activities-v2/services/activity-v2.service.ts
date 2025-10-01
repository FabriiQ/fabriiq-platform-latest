/**
 * Activities V2 Service
 * 
 * Core service for Activities V2 operations
 * Integrates with existing grading system and question bank
 */

import { PrismaClient, AssessmentType } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { ActivityPurpose, SystemStatus, LearningActivityType } from '@/server/api/constants';
import { 
  ActivityV2Content, 
  CreateActivityV2Input, 
  SubmitActivityV2Input,
  ActivityV2GradingResult,
  QuizV2Content,
  ReadingV2Content,
  VideoV2Content
} from '../types';
import { QuestionBankService } from '@/features/question-bank/services/question-bank.service';
import { AdvancedFeaturesIntegrationService } from './advanced-features-integration.service';
import { CATIRTService } from './cat-irt.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { PaperBasedTestingService } from './paper-based-testing.service';

export class ActivityV2Service {
  private advancedFeaturesService: AdvancedFeaturesIntegrationService;
  private catIRTService: CATIRTService;
  private spacedRepetitionService: SpacedRepetitionService;
  private paperBasedTestingService: PaperBasedTestingService;

  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {
    // Initialize advanced features services
    this.catIRTService = new CATIRTService(this.prisma, this.questionBankService);
    this.spacedRepetitionService = new SpacedRepetitionService(this.prisma);
    this.paperBasedTestingService = new PaperBasedTestingService(this.prisma, this.questionBankService);
    this.advancedFeaturesService = new AdvancedFeaturesIntegrationService(
      this.prisma,
      this.catIRTService,
      this.spacedRepetitionService,
      this.paperBasedTestingService,
      this.questionBankService
    );
  }

  /**
   * Create a new Activities V2 activity
   */
  async createActivity(input: CreateActivityV2Input, userId: string) {
    try {
      // Validate content based on type
      await this.validateActivityContent(input.content);

      // Handle empty topicId - convert to null for database
      const topicId = input.topicId && input.topicId.trim() !== '' ? input.topicId : null;

      // Create activity using existing Activity model
      const activity = await this.prisma.activity.create({
        data: {
          title: input.title,
          purpose: ActivityPurpose.ASSESSMENT, // V2 activities are primarily assessments
          assessmentType: this.getAssessmentType(input.content.type),
          // DUAL STORAGE: Store activity type in both locations for compatibility
          learningType: this.getLearningType(input.content.type), // Legacy field for backward compatibility
          subjectId: input.subjectId,
          topicId: topicId,
          classId: input.classId,
          content: input.content as any, // V2 content with content.type for forward compatibility
          isGradable: input.isGradable,
          maxScore: input.maxScore,
          passingScore: input.passingScore,
          weightage: input.weightage,
          startDate: input.startDate,
          endDate: input.endDate,
          bloomsLevel: input.bloomsLevel,
          // TODO: Handle learningOutcomeIds through ActivityOutcome relation
          status: SystemStatus.ACTIVE,
          createdById: userId,
          // Mark as V2 activity
          gradingConfig: {
            version: '2.0',
            type: input.content.type
          }
        }
      });

      return activity;
    } catch (error) {
      console.error('Error creating Activities V2 activity:', error);
      console.error('Input data:', JSON.stringify(input, null, 2));
      console.error('User ID:', userId);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create activity',
        cause: error
      });
    }
  }

  /**
   * Submit Activities V2 activity for grading with enhanced analytics
   */
  async submitActivity(input: SubmitActivityV2Input, studentId: string): Promise<ActivityV2GradingResult> {
    try {
      const activity = await this.prisma.activity.findUnique({
        where: { id: input.activityId },
        include: {
          subject: true,
          topic: true,
          class: true
        }
      });

      if (!activity) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Activity not found'
        });
      }

      const content = activity.content as unknown as ActivityV2Content;

      // Grade based on activity type
      let gradingResult: ActivityV2GradingResult;

      switch (content.type) {
        case 'quiz':
          // Pass both analytics and question timings
          const quizAnalytics = {
            ...input.analytics,
            questionTimings: input.questionTimings || {}
          };
          gradingResult = await this.gradeQuizActivity(activity, input.answers, studentId, input.timeSpent, quizAnalytics);
          break;
        case 'reading':
          gradingResult = await this.gradeReadingActivity(activity, input.progress, studentId, input.timeSpent);
          break;
        case 'video':
          gradingResult = await this.gradeVideoActivity(activity, input.progress, studentId, input.timeSpent);
          break;
        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Unsupported activity type'
          });
      }

      // Save grade to database with enhanced data and get grade ID
      const activityGradeId = await this.saveActivityGrade(input.activityId, studentId, gradingResult, input.timeSpent, input.questionTimings);

      // Include grade ID in result for mastery updates
      gradingResult.activityGradeId = activityGradeId;

      // Extract analytics data from grading result if available
      const analyticsData = (gradingResult as any).analytics || input.analytics || {};
      
      // Merge question timings from input if available
      if (input.questionTimings && Object.keys(input.questionTimings).length > 0) {
        analyticsData.questionTimings = {
          ...analyticsData.questionTimings,
          ...input.questionTimings
        };
        console.log('Merged question timings:', input.questionTimings);
      }
      
      console.log('Final analytics data being used:', {
        hasBloomsDistribution: !!analyticsData.bloomsDistribution,
        bloomsKeys: Object.keys(analyticsData.bloomsDistribution || {}),
        hasDifficultyDistribution: !!analyticsData.difficultyDistribution,
        hasQuestionTimings: !!analyticsData.questionTimings,
        questionTimingKeys: Object.keys(analyticsData.questionTimings || {})
      });

      // Comprehensive post-submission processing
      await Promise.all([
        this.triggerAchievements(input.activityId, studentId, gradingResult, analyticsData),
        this.trackAnalytics(input.activityId, studentId, gradingResult, input.timeSpent, analyticsData),
        this.updateTopicMastery(activity, studentId, gradingResult, analyticsData, activityGradeId),
        this.updateBloomsAnalytics(activity, studentId, gradingResult, analyticsData, activityGradeId),
        this.updateLearningAnalytics(activity, studentId, gradingResult, analyticsData),
        this.createJourneyEvent(input.activityId, studentId, gradingResult, activity),
        this.updateGradebook(input.activityId, studentId, activity)
      ]);

      return gradingResult;
    } catch (error) {
      console.error('Error submitting Activities V2 activity:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to submit activity',
        cause: error
      });
    }
  }

  /**
   * Grade quiz activity with enhanced analytics
   */
  private async gradeQuizActivity(
    activity: any,
    answers: Record<string, any>,
    studentId: string,
    timeSpent: number,
    analytics?: any
  ): Promise<ActivityV2GradingResult> {
    const content = activity.content as QuizV2Content;
    let totalScore = 0;
    let maxScore = 0;
    const questionResults: Array<{
      questionId: string;
      isCorrect: boolean;
      score: number;
      maxScore: number;
      timeSpent: number;
      feedback: string;
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
      questionType?: string;
    }> = [];

    // Initialize analytics collections
    const bloomsDistribution: Record<string, { correct: number; total: number; score: number }> = {};
    const difficultyDistribution: Record<string, { correct: number; total: number; score: number }> = {};
    const questionTimings: Record<string, number> = {};

    // Grade each question using Question Bank questions
    for (const quizQuestion of content.questions) {
      const question = await this.questionBankService.getQuestion(quizQuestion.id);
      const studentAnswer = answers[quizQuestion.id];
      
      // Use existing grading logic from question bank
      const isCorrect = this.gradeQuestionAnswer(question, studentAnswer);
      const questionScore = isCorrect ? quizQuestion.points : 0;
      
      totalScore += questionScore;
      maxScore += quizQuestion.points;

      // Collect Bloom's taxonomy data
      if (question.bloomsLevel) {
        const bloomsLevel = question.bloomsLevel.toString();
        if (!bloomsDistribution[bloomsLevel]) {
          bloomsDistribution[bloomsLevel] = { correct: 0, total: 0, score: 0 };
        }
        bloomsDistribution[bloomsLevel].total++;
        if (isCorrect) {
          bloomsDistribution[bloomsLevel].correct++;
          bloomsDistribution[bloomsLevel].score += quizQuestion.points;
        }
      }

      // Collect difficulty distribution data
      if (question.difficulty) {
        const difficulty = question.difficulty;
        if (!difficultyDistribution[difficulty]) {
          difficultyDistribution[difficulty] = { correct: 0, total: 0, score: 0 };
        }
        difficultyDistribution[difficulty].total++;
        if (isCorrect) {
          difficultyDistribution[difficulty].correct++;
          difficultyDistribution[difficulty].score += quizQuestion.points;
        }
      }

      // Get actual per-question timing from analytics or estimate
      const questionTime = analytics?.questionTimings?.[quizQuestion.id] || 
                          (timeSpent > 0 ? parseFloat((timeSpent / content.questions.length).toFixed(2)) : 0);
      questionTimings[quizQuestion.id] = questionTime;

      console.log(`[Question ${quizQuestion.order || (content.questions.indexOf(quizQuestion) + 1)}] Details:`, {
        id: quizQuestion.id,
        isCorrect,
        score: `${questionScore}/${quizQuestion.points}`,
        timeSpent: `${questionTime}s`,
        bloomsLevel: question.bloomsLevel,
        difficulty: question.difficulty
      });

      questionResults.push({
        questionId: quizQuestion.id,
        isCorrect,
        score: parseFloat(questionScore.toFixed(2)),
        maxScore: quizQuestion.points,
        timeSpent: questionTime,
        feedback: isCorrect ? 'Correct!' : 'Incorrect',
        difficulty: question.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
        questionType: question.questionType
      });

      // Track question usage for analytics with proper timing
      await this.trackQuestionUsage({
        questionId: quizQuestion.id,
        activityId: activity.id,
        studentId,
        classId: activity.classId,
        subjectId: activity.subjectId,
        isCorrect,
        timeSpent: questionTime, // Fix parameter name to match trackQuestionUsage method
        responseTime: questionTime,
        attemptNumber: 1,
        assessmentMode: content.assessmentMode,
        questionOrder: quizQuestion.order,
        totalQuestions: content.questions.length,
        startedAt: new Date(Date.now() - timeSpent * 1000),
        completedAt: new Date()
      });
      
    }

    const percentage = maxScore > 0 ? parseFloat(((totalScore / maxScore) * 100).toFixed(2)) : 0;
    // Handle both percentage and points-based passing scores
    const passingScore = activity.passingScore || 60;
    const passed = passingScore > 100 ? 
      (totalScore >= passingScore) : // Points-based comparison
      (percentage >= passingScore); // Percentage-based comparison

    console.log('Quiz grading calculation:', {
      totalScore: parseFloat(totalScore.toFixed(2)),
      maxScore,
      percentage,
      passingScore,
      passed,
      timeSpent,
      activityId: activity.id,
      calculationCheck: `${percentage} >= ${passingScore} = ${percentage >= passingScore}`,
      passedCheck: passed
    });

    // Calculate achievements
    const achievements = this.calculateAchievements(content.achievementConfig, {
      score: parseFloat(totalScore.toFixed(2)),
      maxScore,
      percentage,
      timeSpent,
      isFirstAttempt: true, // TODO: Track attempts
      isPerfectScore: totalScore === maxScore
    });

    // Compile analytics data for this activity
    const quizAnalytics = {
      bloomsDistribution,
      difficultyDistribution,
      questionTimings,
      averageTimePerQuestion: content.questions.length > 0 ? parseFloat((timeSpent / content.questions.length).toFixed(2)) : 0,
      totalQuestions: content.questions.length,
      answeredQuestions: Object.keys(answers).length,
      pauseCount: analytics?.pauseCount || 0
    };

    // Add analytics to the result for use in post-processing
    const result: ActivityV2GradingResult = {
      score: parseFloat(totalScore.toFixed(2)),
      maxScore,
      percentage,
      passed,
      feedback: this.generateQuizFeedback(percentage, passed, questionResults),
      achievements,
      questionResults,
      completedAt: new Date()
    };

    // Attach analytics data that will be used by other functions
    (result as any).analytics = quizAnalytics;

    console.log('Quiz analytics collected:', {
      activityId: activity.id,
      bloomsLevels: Object.keys(bloomsDistribution),
      bloomsData: bloomsDistribution,
      difficultyData: difficultyDistribution,
      totalQuestions: content.questions.length,
      averageTime: `${quizAnalytics.averageTimePerQuestion}s`,
      finalScore: `${result.score}/${maxScore} (${percentage}%)`
    });

    return result;
  }

  /**
   * Grade reading activity
   */
  private async gradeReadingActivity(
    activity: any,
    progress: any,
    studentId: string,
    timeSpent: number
  ): Promise<ActivityV2GradingResult> {
    const content = activity.content as ReadingV2Content;
    const criteria = content.completionCriteria || {};

    let completed = true;
    const feedback: string[] = [];

    // Ensure progress object exists with default values
    const safeProgress = progress || {};
    const scrollPercentage = safeProgress.scrollPercentage || 0;
    const bookmarks = safeProgress.bookmarks || [];
    const highlights = safeProgress.highlights || [];

    // Check completion criteria
    if (criteria.minTimeSeconds && timeSpent < criteria.minTimeSeconds) {
      completed = false;
      feedback.push(`Minimum reading time not met (${timeSpent}s < ${criteria.minTimeSeconds}s)`);
    }

    if (criteria.scrollPercentage && scrollPercentage < criteria.scrollPercentage) {
      completed = false;
      feedback.push(`Minimum scroll percentage not met (${scrollPercentage}% < ${criteria.scrollPercentage}%)`);
    }

    if (criteria.interactionRequired && (!bookmarks.length && !highlights.length)) {
      completed = false;
      feedback.push('Required interaction not completed');
    }

    const score = completed ? (activity.maxScore || 100) : 0;
    const maxScore = activity.maxScore || 100;
    const percentage = (score / maxScore) * 100;

    // Calculate achievements
    const achievements = this.calculateAchievements(content.achievementConfig, {
      score,
      maxScore,
      percentage,
      timeSpent,
      isFirstAttempt: true,
      isPerfectScore: completed
    });

    return {
      score,
      maxScore,
      percentage,
      passed: completed,
      feedback: completed ? 'Reading completed successfully!' : feedback.join(', '),
      achievements,
      completedAt: new Date()
    };
  }

  /**
   * Grade video activity
   */
  private async gradeVideoActivity(
    activity: any,
    progress: any,
    studentId: string,
    timeSpent: number
  ): Promise<ActivityV2GradingResult> {
    const content = activity.content as VideoV2Content;
    const criteria = content.completionCriteria || {};

    let completed = true;
    const feedback: string[] = [];

    // Ensure progress object exists with default values
    const safeProgress = progress || {};
    const watchedPercentage = safeProgress.watchedPercentage || 0;
    const interactionResponses = safeProgress.interactionResponses || [];

    // Check completion criteria
    if (criteria.minWatchPercentage && watchedPercentage < criteria.minWatchPercentage) {
      completed = false;
      feedback.push(`Minimum watch percentage not met (${watchedPercentage}% < ${criteria.minWatchPercentage}%)`);
    }

    if (criteria.minWatchTimeSeconds && timeSpent < criteria.minWatchTimeSeconds) {
      completed = false;
      feedback.push(`Minimum watch time not met (${timeSpent}s < ${criteria.minWatchTimeSeconds}s)`);
    }

    // Check interaction points
    if (criteria.interactionPoints) {
      const requiredInteractions = criteria.interactionPoints.filter((ip: any) => ip.required);
      const completedInteractions = interactionResponses.length;
      if (completedInteractions < requiredInteractions.length) {
        completed = false;
        feedback.push('Required interactions not completed');
      }
    }

    const score = completed ? (activity.maxScore || 100) : 0;
    const maxScore = activity.maxScore || 100;
    const percentage = (score / maxScore) * 100;

    // Calculate achievements
    const achievements = this.calculateAchievements(content.achievementConfig, {
      score,
      maxScore,
      percentage,
      timeSpent,
      isFirstAttempt: true,
      isPerfectScore: completed
    });

    return {
      score,
      maxScore,
      percentage,
      passed: completed,
      feedback: completed ? 'Video completed successfully!' : feedback.join(', '),
      achievements,
      completedAt: new Date()
    };
  }

  // Helper methods
  private getAssessmentType(activityType: string): AssessmentType {
    switch (activityType) {
      case 'quiz': return AssessmentType.QUIZ;
      case 'reading': return AssessmentType.ASSIGNMENT;
      case 'video': return AssessmentType.ASSIGNMENT;
      default: return AssessmentType.QUIZ;
    }
  }

  private getLearningType(activityType: string): LearningActivityType {
    switch (activityType) {
      case 'quiz': return LearningActivityType.QUIZ;
      case 'reading': return LearningActivityType.READING;
      case 'video': return LearningActivityType.VIDEO;
      default: return LearningActivityType.QUIZ;
    }
  }

  private async validateActivityContent(content: ActivityV2Content): Promise<void> {
    if (content.version !== '2.0') {
      throw new Error('Invalid content version');
    }

    if (content.type === 'quiz') {
      const quizContent = content as QuizV2Content;
      // For CAT mode, questions are selected automatically, so we don't require pre-selected questions
      if (quizContent.assessmentMode !== 'cat' && (!quizContent.questions?.length)) {
        throw new Error('Quiz must have at least one question (unless using CAT mode)');
      }
    }
  }

  private gradeQuestionAnswer(question: any, answer: any): boolean {
    // Use existing question grading logic
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        const correctOption = question.content?.options?.find((opt: any) => opt.isCorrect);
        return answer === correctOption?.id;

      case 'TRUE_FALSE':
        return answer === question.content?.isTrue;

      case 'MULTIPLE_RESPONSE':
        if (!Array.isArray(answer)) return false;
        const correctOptions = question.content?.options?.filter((opt: any) => opt.isCorrect) || [];
        const correctIds = correctOptions.map((opt: any) => opt.id);
        // Check if all selected answers are correct and all correct answers are selected
        return answer.length === correctIds.length &&
               answer.every((id: string) => correctIds.includes(id));

      case 'FILL_IN_THE_BLANKS':
        // Handle both old and new format
        if (question.content?.blanks) {
          // New format: multiple blanks
          const blanks = question.content.blanks;
          if (typeof answer === 'object' && answer !== null) {
            // Answer is an object with blank IDs as keys
            return blanks.every((blank: any) => {
              const userAnswer = answer[blank.id];
              if (!userAnswer) return false;
              return blank.correctAnswers?.some((correct: string) =>
                userAnswer.toLowerCase().trim() === correct.toLowerCase().trim()
              );
            });
          }
        } else if (question.content?.correctAnswers) {
          // Old format: single answer or array of answers
          const correctAnswers = question.content.correctAnswers;
          if (Array.isArray(correctAnswers)) {
            return correctAnswers.some((correct: string) =>
              answer?.toLowerCase().trim() === correct.toLowerCase().trim()
            );
          }
        }
        return false;

      case 'MATCHING':
        if (typeof answer !== 'object' || answer === null) return false;
        const pairs = question.content?.pairs || [];
        const correctMatches = question.content?.correctMatches || {};

        // Check if all matches are correct
        return Object.keys(correctMatches).every(leftId => {
          return answer[leftId] === correctMatches[leftId];
        });

      case 'NUMERIC':
        const numericAnswer = parseFloat(answer);
        if (isNaN(numericAnswer)) return false;

        if (question.content?.acceptableRange) {
          const range = question.content.acceptableRange;
          return numericAnswer >= range.min && numericAnswer <= range.max;
        } else if (question.content?.correctAnswer !== undefined) {
          const correctAnswer = question.content.correctAnswer;
          const decimalPlaces = question.content?.decimalPlaces;

          if (decimalPlaces !== undefined) {
            const roundedAnswer = Math.round(numericAnswer * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
            const roundedCorrect = Math.round(correctAnswer * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
            return roundedAnswer === roundedCorrect;
          }
          return numericAnswer === correctAnswer;
        }
        return false;

      case 'SHORT_ANSWER':
      case 'ESSAY':
        // For text-based questions, we can do basic comparison
        // In a real system, this might use AI or manual grading
        if (question.content?.correctAnswer) {
          return answer?.toLowerCase().trim() === question.content.correctAnswer.toLowerCase().trim();
        }
        return false; // Requires manual grading

      default:
        console.warn(`Grading not implemented for question type: ${question.questionType}`);
        return false;
    }
  }

  private calculateAchievements(config: any, context: any): any[] {
    if (!config.enabled) return [];

    const achievements: Array<{
      type: string;
      title: string;
      description: string;
      points: any;
      icon: string;
      color: string;
    }> = [];

    if (config.triggers.completion) {
      achievements.push({
        type: 'completion',
        title: 'Activity Completed',
        description: 'You completed the activity!',
        points: config.points.base,
        icon: '✅',
        color: 'green'
      });
    }

    if (config.triggers.perfectScore && context.isPerfectScore) {
      achievements.push({
        type: 'perfect_score',
        title: 'Perfect Score!',
        description: 'You got everything right!',
        points: config.points.perfectScore || 0,
        icon: '🌟',
        color: 'gold'
      });
    }

    return achievements;
  }

  private generateQuizFeedback(percentage: number, passed: boolean, questionResults: any[]): string {
    const correctCount = questionResults.filter(q => q.isCorrect).length;
    const totalCount = questionResults.length;
    
    return `You answered ${correctCount} out of ${totalCount} questions correctly (${percentage.toFixed(1)}%). ${
      passed ? 'Great job!' : 'Keep practicing!'
    }`;
  }

  private async saveActivityGrade(
    activityId: string,
    studentId: string,
    result: ActivityV2GradingResult,
    timeSpent: number,
    questionTimings?: Record<string, number>
  ): Promise<string> { // Return the grade ID for mastery updates
    const activityGrade = await this.prisma.activityGrade.upsert({
      where: {
        activityId_studentId: { activityId, studentId }
      },
      update: {
        score: result.score,
        feedback: result.feedback,
        status: 'GRADED',
        gradedAt: new Date(),
        timeSpentMinutes: Math.ceil(timeSpent / 60),
        content: {
          achievements: result.achievements,
          questionResults: result.questionResults,
          percentage: result.percentage,
          passed: result.passed
        } as any
      },
      create: {
        activityId,
        studentId,
        score: result.score,
        feedback: result.feedback,
        status: 'GRADED',
        gradedAt: new Date(),
        timeSpentMinutes: Math.ceil(timeSpent / 60),
        content: {
          achievements: result.achievements,
          questionResults: result.questionResults,
          percentage: result.percentage,
          passed: result.passed
        } as any
      }
    });
    
    return activityGrade.id; // Return ID for mastery updates
  }

  private async trackQuestionUsage(event: any): Promise<void> {
    try {
      // Track question usage for analytics using the existing analytics system
      // This could be integrated with the question bank analytics later
      console.log('Question usage tracked:', {
        questionId: event.questionId,
        activityId: event.activityId,
        studentId: event.studentId,
        isCorrect: event.isCorrect,
        timeSpent: event.timeSpent || 0
      });
    } catch (error) {
      console.error('Error tracking question usage:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Trigger achievements and points for Activities V2 with enhanced analytics
   */
  private async triggerAchievements(
    activityId: string,
    studentId: string,
    result: ActivityV2GradingResult,
    analytics?: any
  ): Promise<void> {
    try {
      // Get activity details for points calculation
      const activity = await this.prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          subject: true,
          topic: true,
          class: true
        }
      });

      if (!activity) {
        console.warn('Activity not found for achievements:', activityId);
        return;
      }

      // Award points using unified points service
      try {
        const { UnifiedPointsService } = await import('@/features/activties/services/unified-points.service');
        const pointsService = new UnifiedPointsService(this.prisma);
        
        const pointsResult = await pointsService.awardActivityPoints(activityId, studentId, {
          score: result.score,
          maxScore: result.maxScore,
          isGraded: true,
          activityType: (activity.content as any)?.type || 'activities-v2',
          purpose: activity.purpose,
          preventDuplicates: true
        });

        console.log('Points awarded for Activities V2:', {
          activityId,
          studentId,
          points: pointsResult.points,
          levelUp: pointsResult.levelUp
        });
      } catch (pointsError) {
        console.error('Error awarding points:', pointsError);
      }

      // Create achievements based on performance
      const { AchievementService } = await import('@/server/api/services/achievement.service');
      const achievementService = new AchievementService({ prisma: this.prisma });
      
      const achievements: any[] = [];
      
      // Base completion achievement
      try {
        const completionAchievement = await achievementService.createAchievement({
          studentId,
          title: 'Activity Completed',
          description: `Completed "${activity.title}" with ${result.percentage.toFixed(1)}% score`,
          type: 'activity-completion',
          classId: activity.classId,
          subjectId: activity.subjectId,
          progress: 1,
          total: 1,
          icon: 'check-circle'
        });
        
        achievements.push({
          type: 'completion',
          title: 'Activity Completed',
          description: `Completed "${activity.title}"`,
          points: Math.round(result.percentage), // Points based on percentage
          icon: 'check-circle',
          color: 'blue'
        });
      } catch (achievementError) {
        console.error('Error creating completion achievement:', achievementError);
      }
      
      // Perfect score achievement
      if (result.percentage >= 100) {
        try {
          await achievementService.createAchievement({
            studentId,
            title: 'Perfect Score!',
            description: `Got 100% on "${activity.title}"`,
            type: 'perfect-score',
            classId: activity.classId,
            subjectId: activity.subjectId,
            progress: 1,
            total: 1,
            icon: 'star'
          });
          
          achievements.push({
            type: 'perfect_score',
            title: 'Perfect Score!',
            description: 'You got everything right!',
            points: 50, // Bonus points for perfect score
            icon: 'star',
            color: 'gold'
          });
        } catch (achievementError) {
          console.error('Error creating perfect score achievement:', achievementError);
        }
      }
      
      // High performance achievement (80%+)
      else if (result.percentage >= 80) {
        try {
          await achievementService.createAchievement({
            studentId,
            title: 'High Performer',
            description: `Scored ${result.percentage.toFixed(1)}% on "${activity.title}"`,
            type: 'high-performance',
            classId: activity.classId,
            subjectId: activity.subjectId,
            progress: 1,
            total: 1,
            icon: 'zap'
          });
          
          achievements.push({
            type: 'high_performance',
            title: 'High Performer',
            description: `Excellent work! You scored ${result.percentage.toFixed(1)}%`,
            points: 25, // Bonus points for high performance
            icon: 'zap',
            color: 'green'
          });
        } catch (achievementError) {
          console.error('Error creating high performance achievement:', achievementError);
        }
      }

      // Update the result with processed achievements
      result.achievements = achievements;

      console.log('Activities V2 achievements and points processed:', { 
        activityId, 
        studentId, 
        achievementCount: achievements.length,
        totalPoints: achievements.reduce((sum, ach) => sum + (ach.points || 0), 0)
      });

    } catch (error) {
      console.error('Error triggering achievements:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Track analytics for Activities V2 with enhanced data
   */
  private async trackAnalytics(
    activityId: string,
    studentId: string,
    result: ActivityV2GradingResult,
    timeSpent: number,
    analytics?: any
  ): Promise<void> {
    try {
      // Get activity details for learning time record
      const activity = await this.prisma.activity.findUnique({
        where: { id: activityId },
        select: { classId: true, content: true }
      });

      if (!activity) {
        console.warn('Activity not found for analytics tracking:', activityId);
        return;
      }

      // Track activity_submit event using existing analytics system (like legacy activities)
      try {
        const analyticsModule = await import('@/features/activties/analytics/activity-analytics');
        
        // Check if analyticsManager exists and has trackEvent method
        if (analyticsModule.analyticsManager && typeof analyticsModule.analyticsManager.trackEvent === 'function') {
          const activityContent = activity.content as any;
          analyticsModule.analyticsManager.trackEvent('activity_submit', {
            activityId,
            activityType: activityContent?.type || 'activities-v2',
            score: result.percentage,
            passed: result.passed,
            timeSpent,
            studentId,
            bloomsDistribution: analytics?.bloomsDistribution,
            difficultyDistribution: analytics?.difficultyDistribution,
            version: '2.0'
          });

          console.log('Activity submit event tracked for Activities V2:', {
            activityId,
            studentId,
            activityType: activityContent?.type,
            score: result.percentage
          });
        } else {
          console.warn('Analytics manager not available or trackEvent method missing');
          // Fallback - just log the analytics data
          const activityContent = activity.content as any;
          console.log('Analytics data (fallback logging):', {
            event: 'activity_submit',
            activityId,
            activityType: activityContent?.type || 'activities-v2',
            score: result.percentage,
            passed: result.passed,
            timeSpent,
            studentId,
            bloomsDistribution: analytics?.bloomsDistribution,
            difficultyDistribution: analytics?.difficultyDistribution,
            version: '2.0'
          });
        }
      } catch (analyticsError) {
        console.error('Error importing or using analytics module:', analyticsError);
        // Still continue with fallback logging
        const activityContent = activity.content as any;
        console.log('Analytics data (error fallback):', {
          event: 'activity_submit',
          activityId,
          activityType: activityContent?.type || 'activities-v2',
          score: result.percentage,
          passed: result.passed,
          timeSpent,
          studentId,
          version: '2.0'
        });
      }

      // Create learning time record
      const timeSpentMinutes = Math.ceil(timeSpent / 60);
      if (timeSpentMinutes > 0) {
        const now = new Date();
        const startedAt = new Date(now.getTime() - timeSpent * 1000);
        const partitionKey = `class_${activity.classId}_${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`;

        await this.prisma.learningTimeRecord.create({
          data: {
            studentId,
            activityId,
            classId: activity.classId,
            timeSpentMinutes,
            startedAt,
            completedAt: now,
            partitionKey
          }
        });

        console.log('Learning time record created:', {
          activityId,
          studentId,
          timeSpentMinutes,
          classId: activity.classId
        });
      }

      // Enhanced analytics tracking
      const analyticsData = {
        activityId,
        studentId,
        version: '2.0',
        score: result.score,
        maxScore: result.maxScore,
        percentage: result.percentage,
        passed: result.passed,
        timeSpent,
        questionCount: result.questionResults?.length || 0,
        correctAnswers: result.questionResults?.filter(q => q.isCorrect).length || 0,
        achievements: result.achievements.length,
        // Enhanced analytics
        averageTimePerQuestion: analytics?.averageTimePerQuestion || 0,
        pauseCount: analytics?.pauseCount || 0,
        bloomsDistribution: analytics?.bloomsDistribution || {},
        difficultyDistribution: analytics?.difficultyDistribution || {},
        totalQuestions: analytics?.totalQuestions || 0,
        answeredQuestions: analytics?.answeredQuestions || 0
      };

      console.log('Enhanced analytics tracked:', analyticsData);

    } catch (error) {
      console.error('Error tracking analytics:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Update gradebook with activity grade
   */
  private async updateGradebook(
    activityId: string,
    studentId: string,
    activity: any
  ): Promise<void> {
    try {
      // Find the activity grade record
      const activityGrade = await this.prisma.activityGrade.findFirst({
        where: {
          activityId,
          studentId
        }
      });

      if (!activityGrade) {
        console.warn('Activity grade not found for gradebook update:', { activityId, studentId });
        return;
      }

      // Find the gradebook for this class
      const gradebook = await this.prisma.gradeBook.findFirst({
        where: { classId: activity.classId },
        select: { id: true }
      });

      if (!gradebook) {
        console.warn('Gradebook not found for class:', activity.classId);
        return;
      }

      // Update gradebook with activity grade using the integration service
      const { GradebookBloomIntegrationService } = await import('@/server/api/services/gradebook-bloom-integration.service');
      const gbService = new GradebookBloomIntegrationService({ prisma: this.prisma });

      await gbService.updateGradebookWithActivityGrade(gradebook.id, studentId, activityGrade.id);

      // Update topic mastery if activity has a topic
      if (activity.topicId) {
        await gbService.updateTopicMasteryForStudentTopic(studentId, activity.classId, activity.topicId);
      }

      console.log('Gradebook updated for Activities V2 completion:', {
        activityId,
        studentId,
        gradebookId: gradebook.id,
        topicUpdated: !!activity.topicId
      });

    } catch (error) {
      console.error('Error updating gradebook:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Create journey event for completed activity
   */
  private async createJourneyEvent(
    activityId: string,
    studentId: string,
    result: ActivityV2GradingResult,
    activity: any
  ): Promise<void> {
    try {
      // Import the journey event service
      const { JourneyEventService } = await import('@/server/api/services/journey-event.service');
      const journeyEventService = new JourneyEventService({ prisma: this.prisma });

      // Determine activity type from content
      const activityType = activity.content?.type || 'activity';
      const activityTypeDisplay = activityType.charAt(0).toUpperCase() + activityType.slice(1);

      // Create journey event
      await journeyEventService.createJourneyEvent({
        studentId,
        title: `${activityTypeDisplay} Completed`,
        description: `Completed "${activity.title}" with ${result.percentage.toFixed(1)}% score`,
        date: new Date(),
        type: 'activity',
        classId: activity.classId,
        subjectId: activity.subjectId,
        icon: activityType === 'quiz' ? 'quiz' : activityType === 'reading' ? 'book' : 'video',
        metadata: {
          activityId,
          activityType,
          score: result.score,
          maxScore: result.maxScore,
          percentage: result.percentage,
          passed: result.passed,
          achievements: result.achievements.length
        }
      });

      console.log('Journey event created for Activities V2 completion:', {
        activityId,
        studentId,
        activityType,
        score: result.score
      });

    } catch (error) {
      console.error('Error creating journey event:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Start an advanced assessment session (CAT, Spaced Repetition)
   */
  async startAdvancedAssessment(activityId: string, studentId: string) {
    return this.advancedFeaturesService.startAdvancedAssessment(activityId, studentId);
  }

  /**
   * Get next question for advanced assessment
   */
  async getNextAdvancedQuestion(sessionId: string) {
    return this.advancedFeaturesService.getNextQuestion(sessionId);
  }

  /**
   * Process answer for advanced assessment
   */
  async processAdvancedAnswer(sessionId: string, questionId: string, answer: any, responseTime: number) {
    return this.advancedFeaturesService.processAnswer(sessionId, questionId, answer, responseTime);
  }

  /**
   * Generate advanced analytics
   */
  async generateAdvancedAnalytics(activityId: string) {
    return this.advancedFeaturesService.generateAdvancedAnalytics(activityId);
  }

  /**
   * Export activity to paper test
   */
  async exportToPaperTest(activityId: string, configuration: any, teacherId: string) {
    return this.paperBasedTestingService.generatePaperTest(activityId, configuration, teacherId);
  }

  /**
   * Import paper test results
   */
  async importPaperTestResults(paperTestId: string, results: any[], teacherId: string) {
    return this.advancedFeaturesService.importPaperTestResults(paperTestId, results, teacherId);
  }

  /**
   * Get spaced repetition statistics
   */
  async getSpacedRepetitionStats(studentId: string, subjectId?: string) {
    return this.spacedRepetitionService.getLearningStatistics(studentId, subjectId);
  }

  /**
   * Generate review schedule for spaced repetition
   */
  async generateReviewSchedule(studentId: string, days: number = 7, subjectId?: string) {
    return this.spacedRepetitionService.generateReviewSchedule(studentId, days, subjectId);
  }

  /**
   * Update topic mastery based on activity performance
   */
  private async updateTopicMastery(
    activity: any,
    studentId: string,
    result: ActivityV2GradingResult,
    analytics?: any,
    activityGradeId?: string
  ): Promise<void> {
    try {
      if (!activity.topicId) return;

      // Use the existing bloom topic mastery system
      const bloomsLevelScores: Record<string, { score: number; maxScore: number }> = {};
      
      // If we have bloom's distribution from analytics (correct format expected)
      if (analytics?.bloomsDistribution) {
        Object.entries(analytics.bloomsDistribution).forEach(([level, data]: [string, any]) => {
          if (data && typeof data === 'object' && 'correct' in data && 'total' in data && 'score' in data) {
            const percentage = data.total > 0 ? (data.correct / data.total) * 100 : 0;
            bloomsLevelScores[level] = {
              score: data.score || 0, // Use the actual score from the data
              maxScore: data.total * (activity.maxScore || 100) / (analytics.totalQuestions || 1)
            };
          }
        });
        
        console.log('Processed Bloom\'s level scores:', bloomsLevelScores);
      } else if (activity.bloomsLevel) {
        // Fallback to activity's single bloom level
        bloomsLevelScores[activity.bloomsLevel] = {
          score: result.score || 0,
          maxScore: activity.maxScore || 100
        };
      }

      // Only proceed if we have bloom level scores
      if (Object.keys(bloomsLevelScores).length > 0) {
        // Update topic mastery using existing database structure
        // Check if student exists first to avoid foreign key constraint violations
        const studentExists = await this.prisma.student.findUnique({
          where: { id: studentId },
          select: { id: true, userId: true }
        });
        
        if (!studentExists) {
          console.warn(`Student ${studentId} not found, skipping topic mastery update`);
          return;
        }

        // Try different composite key formats that might be used
        try {
          await this.prisma.topicMastery.upsert({
            where: {
              studentId_topicId_subjectId: {
                studentId,
                topicId: activity.topicId,
                subjectId: activity.subjectId
              }
            },
            update: {
              // Initialize mastery levels based on bloomsLevelScores (convert to percentages)
              rememberLevel: bloomsLevelScores['REMEMBER'] ? 
                (bloomsLevelScores['REMEMBER'].score / bloomsLevelScores['REMEMBER'].maxScore) * 100 : 0,
              understandLevel: bloomsLevelScores['UNDERSTAND'] ? 
                (bloomsLevelScores['UNDERSTAND'].score / bloomsLevelScores['UNDERSTAND'].maxScore) * 100 : 0,
              applyLevel: bloomsLevelScores['APPLY'] ? 
                (bloomsLevelScores['APPLY'].score / bloomsLevelScores['APPLY'].maxScore) * 100 : 0,
              analyzeLevel: bloomsLevelScores['ANALYZE'] ? 
                (bloomsLevelScores['ANALYZE'].score / bloomsLevelScores['ANALYZE'].maxScore) * 100 : 0,
              evaluateLevel: bloomsLevelScores['EVALUATE'] ? 
                (bloomsLevelScores['EVALUATE'].score / bloomsLevelScores['EVALUATE'].maxScore) * 100 : 0,
              createLevel: bloomsLevelScores['CREATE'] ? 
                (bloomsLevelScores['CREATE'].score / bloomsLevelScores['CREATE'].maxScore) * 100 : 0,
              overallMastery: parseFloat(result.percentage.toFixed(2)),
              lastAssessmentDate: new Date(),
              updatedAt: new Date()
            },
            create: {
              studentId,
              topicId: activity.topicId,
              subjectId: activity.subjectId,
              // Initialize mastery levels based on bloomsLevelScores (convert to percentages)
              rememberLevel: bloomsLevelScores['REMEMBER'] ? 
                (bloomsLevelScores['REMEMBER'].score / bloomsLevelScores['REMEMBER'].maxScore) * 100 : 0,
              understandLevel: bloomsLevelScores['UNDERSTAND'] ? 
                (bloomsLevelScores['UNDERSTAND'].score / bloomsLevelScores['UNDERSTAND'].maxScore) * 100 : 0,
              applyLevel: bloomsLevelScores['APPLY'] ? 
                (bloomsLevelScores['APPLY'].score / bloomsLevelScores['APPLY'].maxScore) * 100 : 0,
              analyzeLevel: bloomsLevelScores['ANALYZE'] ? 
                (bloomsLevelScores['ANALYZE'].score / bloomsLevelScores['ANALYZE'].maxScore) * 100 : 0,
              evaluateLevel: bloomsLevelScores['EVALUATE'] ? 
                (bloomsLevelScores['EVALUATE'].score / bloomsLevelScores['EVALUATE'].maxScore) * 100 : 0,
              createLevel: bloomsLevelScores['CREATE'] ? 
                (bloomsLevelScores['CREATE'].score / bloomsLevelScores['CREATE'].maxScore) * 100 : 0,
              overallMastery: parseFloat(result.percentage.toFixed(2)),
              lastAssessmentDate: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
        } catch (upsertError) {
          console.error('TopicMastery upsert failed, trying alternative approach:', upsertError);
          
          // Double-check student exists in fallback
          if (!studentExists) {
            console.warn('Student not found in fallback approach, skipping');
            return;
          }
          
          // Fallback: Try to find and update, or create if not found
          const existingMastery = await this.prisma.topicMastery.findFirst({
            where: {
              studentId,
              topicId: activity.topicId,
              subjectId: activity.subjectId
            }
          });
          
          const masteryData = {
            rememberLevel: bloomsLevelScores['REMEMBER'] ? 
              (bloomsLevelScores['REMEMBER'].score / bloomsLevelScores['REMEMBER'].maxScore) * 100 : 0,
            understandLevel: bloomsLevelScores['UNDERSTAND'] ? 
              (bloomsLevelScores['UNDERSTAND'].score / bloomsLevelScores['UNDERSTAND'].maxScore) * 100 : 0,
            applyLevel: bloomsLevelScores['APPLY'] ? 
              (bloomsLevelScores['APPLY'].score / bloomsLevelScores['APPLY'].maxScore) * 100 : 0,
            analyzeLevel: bloomsLevelScores['ANALYZE'] ? 
              (bloomsLevelScores['ANALYZE'].score / bloomsLevelScores['ANALYZE'].maxScore) * 100 : 0,
            evaluateLevel: bloomsLevelScores['EVALUATE'] ? 
              (bloomsLevelScores['EVALUATE'].score / bloomsLevelScores['EVALUATE'].maxScore) * 100 : 0,
            createLevel: bloomsLevelScores['CREATE'] ? 
              (bloomsLevelScores['CREATE'].score / bloomsLevelScores['CREATE'].maxScore) * 100 : 0,
            overallMastery: parseFloat(result.percentage.toFixed(2)),
            lastAssessmentDate: new Date(),
            updatedAt: new Date()
          };
          
          if (existingMastery) {
            await this.prisma.topicMastery.update({
              where: { id: existingMastery.id },
              data: masteryData
            });
          } else {
            await this.prisma.topicMastery.create({
              data: {
                studentId,
                topicId: activity.topicId,
                subjectId: activity.subjectId,
                ...masteryData,
                lastAssessmentDate: new Date(),
                createdAt: new Date()
              }
            });
          }
        }

        console.log('Topic mastery updated for Activities V2:', {
          studentId,
          topicId: activity.topicId,
          subjectId: activity.subjectId,
          overallMastery: result.percentage,
          bloomsLevels: Object.keys(bloomsLevelScores)
        });
      } else {
        console.log('No Bloom\'s level scores available for topic mastery update');
      }

    } catch (error) {
      console.error('Error updating topic mastery:', error);
      // Don't throw to avoid breaking submission flow
    }
  }

  /**
   * Update Bloom's taxonomy analytics
   */
  private async updateBloomsAnalytics(
    activity: any,
    studentId: string,
    result: ActivityV2GradingResult,
    analytics?: any,
    activityGradeId?: string
  ): Promise<void> {
    try {
      // Use existing bloom analytics service if available
      if (analytics?.bloomsDistribution && Object.keys(analytics.bloomsDistribution).length > 0) {
        // Create or update bloom analytics record
        const bloomsAnalyticsData = {
          studentId,
          activityId: activity.id,
          classId: activity.classId,
          subjectId: activity.subjectId,
          topicId: activity.topicId,
          bloomsDistribution: analytics.bloomsDistribution,
          overallScore: result.percentage,
          assessmentDate: new Date(),
          metadata: {
            version: '2.0',
            activityGradeId,
            timeSpent: analytics.averageTimePerQuestion || 0,
            questionCount: result.questionResults?.length || 0,
            correctAnswers: result.questionResults?.filter(q => q.isCorrect).length || 0
          }
        };

        // Store bloom analytics data in activity grade attachments for integration
        if (activityGradeId) {
          try {
            // Get current attachments
            const currentGrade = await this.prisma.activityGrade.findUnique({ 
              where: { id: activityGradeId },
              select: { attachments: true }
            });
            
            // Update with bloom analytics data
            await this.prisma.activityGrade.update({
              where: { id: activityGradeId },
              data: {
                attachments: {
                  ...(currentGrade?.attachments as any || {}),
                  bloomsAnalytics: bloomsAnalyticsData,
                  // Add flag to indicate this is Activities V2 data
                  version: '2.0',
                  source: 'activities-v2'
                }
              }
            });
            
            console.log('Bloom analytics stored in activity grade attachments:', {
              activityGradeId,
              studentId,
              activityId: activity.id,
              bloomsLevels: Object.keys(analytics.bloomsDistribution)
            });
          } catch (attachmentError) {
            console.error('Error storing bloom analytics in attachments:', attachmentError);
          }
        }
        
        // Try to create dedicated bloom analytics record if table exists
        try {
          await this.prisma.$executeRaw`
            INSERT INTO bloom_analytics (
              student_id, activity_id, class_id, subject_id, topic_id,
              blooms_distribution, overall_score, assessment_date, metadata, source
            ) VALUES (
              ${studentId}, ${activity.id}, ${activity.classId}, ${activity.subjectId}, ${activity.topicId || null},
              ${JSON.stringify(analytics.bloomsDistribution)}::jsonb, 
              ${result.percentage}, 
              ${new Date()}, 
              ${JSON.stringify(bloomsAnalyticsData.metadata)}::jsonb,
              'activities-v2'
            )
            ON CONFLICT (student_id, activity_id) DO UPDATE SET
              overall_score = EXCLUDED.overall_score,
              blooms_distribution = EXCLUDED.blooms_distribution,
              assessment_date = EXCLUDED.assessment_date,
              metadata = EXCLUDED.metadata,
              source = EXCLUDED.source,
              updated_at = CURRENT_TIMESTAMP
          `;
          
          console.log('Dedicated bloom analytics record created/updated');
        } catch (dbError) {
          // Table might not exist yet - that's okay, data is in attachments
          console.log('Bloom analytics table not available, using attachments fallback');
        }

        console.log('Bloom\'s analytics updated for Activities V2:', {
          studentId,
          activityId: activity.id,
          subjectId: activity.subjectId,
          topicId: activity.topicId,
          overallScore: result.percentage,
          bloomsLevels: Object.keys(analytics.bloomsDistribution)
        });
      } else {
        console.log('No Bloom\'s distribution data available for analytics update');
      }

    } catch (error) {
      console.error('Error updating Bloom\'s analytics:', error);
      // Don't throw to avoid breaking submission flow
    }
  }

  /**
   * Update comprehensive learning analytics
   */
  private async updateLearningAnalytics(
    activity: any,
    studentId: string,
    result: ActivityV2GradingResult,
    analytics?: any
  ): Promise<void> {
    try {
      const learningData = {
        studentId,
        activityId: activity.id,
        classId: activity.classId,
        subjectId: activity.subjectId,
        topicId: activity.topicId,
        score: result.percentage,
        timeSpent: analytics?.averageTimePerQuestion || 0,
        difficultyDistribution: analytics?.difficultyDistribution || {},
        bloomsDistribution: analytics?.bloomsDistribution || {},
        achievements: result.achievements.length,
        completedAt: new Date()
      };

      console.log('Learning analytics update:', learningData);
      // TODO: Integrate with comprehensive learning analytics system
      // await this.learningAnalyticsService.updateAnalytics(learningData);

    } catch (error) {
      console.error('Error updating learning analytics:', error);
    }
  }
}
