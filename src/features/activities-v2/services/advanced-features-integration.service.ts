/**
 * Advanced Features Integration Service
 *
 * Integrates CAT/IRT, Spaced Repetition, and Paper-based Testing
 * with the main Activities V2 system.
 */

import { PrismaClient } from '@prisma/client';
import { QuizV2Content, CATSettings, CATMarkingConfig, SpacedRepetitionSettings } from '../types';
import { DEFAULT_CAT_SETTINGS, mergeCATSettings } from '../utils/cat-config-defaults';
import { CATIRTService } from './cat-irt.service';
import { SpacedRepetitionService } from './spaced-repetition.service';
import { PaperBasedTestingService } from './paper-based-testing.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';

export interface AdvancedAssessmentSession {
  id: string;
  activityId: string;
  studentId: string;
  assessmentMode: 'standard' | 'cat' | 'spaced_repetition';

  // Session data
  startedAt: Date;
  completedAt?: Date;
  currentQuestionIndex: number;
  totalQuestions: number;

  // Mode-specific sessions
  catSession?: any;
  spacedRepetitionSession?: any;

  // Results
  score?: number;
  maxScore?: number;
  questionsAnswered: number;
  correctAnswers: number;
  averageResponseTime: number;

  // Analytics
  learningGains: number;
  difficultyProgression: number[];
  abilityProgression?: number[];
}

export class AdvancedFeaturesIntegrationService {
  constructor(
    private prisma: PrismaClient,
    private catIRTService: CATIRTService,
    private spacedRepetitionService: SpacedRepetitionService,
    private paperBasedTestingService: PaperBasedTestingService,
    private questionBankService: QuestionBankService
  ) {}

  /**
   * Start an advanced assessment session based on activity configuration
   */
  async startAdvancedAssessment(
    activityId: string,
    studentId: string
  ): Promise<AdvancedAssessmentSession> {
    console.log(`[CAT] Starting advanced assessment - Activity: ${activityId}, Student: ${studentId}`);

    try {
      // Resolve student profile ID (studentId might be userId)
      let resolvedStudentId = studentId;
      const studentProfile = await this.prisma.studentProfile.findFirst({
        where: {
          OR: [
            { id: studentId },
            { userId: studentId }
          ]
        }
      });

      if (!studentProfile) {
        throw new Error(`Student profile not found for ID: ${studentId}`);
      }

      resolvedStudentId = studentProfile.id;
      console.log(`[CAT] Resolved student profile ID: ${resolvedStudentId} (from input: ${studentId})`);

      const activity = await this.prisma.activity.findUnique({
        where: { id: activityId },
        include: {
          subject: true,
          class: true
        }
      });

      if (!activity) {
        console.error(`[CAT] Activity not found: ${activityId}`);
        throw new Error(`Activity ${activityId} not found`);
      }

      console.log(`[CAT] Activity found: ${activity.title}`);

      // Safely cast and validate content
      const content = activity.content as unknown as QuizV2Content;
      if (!content || typeof content !== 'object' || content.type !== 'quiz') {
        console.error(`[CAT] Invalid content type for activity ${activityId}:`, {
          contentType: content?.type,
          hasContent: !!content
        });
        throw new Error('Advanced features only available for quiz activities');
      }

      console.log(`[CAT] Quiz content validated - Assessment mode: ${content.assessmentMode}, CAT enabled: ${!!content.catSettings}`);
      const session: AdvancedAssessmentSession = {
        id: `advanced_${activityId}_${resolvedStudentId}_${Date.now()}`,
        activityId,
        studentId: resolvedStudentId,
        assessmentMode: content.assessmentMode || 'standard',
        startedAt: new Date(),
        currentQuestionIndex: 0,
        totalQuestions: content.questions.length,
        questionsAnswered: 0,
        correctAnswers: 0,
        averageResponseTime: 0,
        learningGains: 0,
        difficultyProgression: []
      };

      console.log(`[CAT] Created session object: ${session.id}, Mode: ${session.assessmentMode}`);

      // Initialize mode-specific sessions
      switch (content.assessmentMode) {
        case 'cat':
          // Support both root-level catSettings and settings.catSettings
          const effectiveCatSettings = (content.catSettings || (content as any).settings?.catSettings) as CATSettings | undefined;
          // If CAT mode is selected but no settings exist, use defaults
          const normalizedSettings: CATSettings = effectiveCatSettings
            ? {
                enabled: effectiveCatSettings.enabled ?? true,
                algorithm: effectiveCatSettings.algorithm || 'irt_2pl',
                startingDifficulty: typeof effectiveCatSettings.startingDifficulty === 'number' ? effectiveCatSettings.startingDifficulty : 0,
                terminationCriteria: {
                  minQuestions: effectiveCatSettings.terminationCriteria?.minQuestions ?? 5,
                  maxQuestions: effectiveCatSettings.terminationCriteria?.maxQuestions ?? 20,
                  standardErrorThreshold: effectiveCatSettings.terminationCriteria?.standardErrorThreshold ?? 0.3,
                },
                itemSelectionMethod: effectiveCatSettings.itemSelectionMethod || 'maximum_information',
                questionTypes: (effectiveCatSettings.questionTypes && effectiveCatSettings.questionTypes.length > 0)
                  ? effectiveCatSettings.questionTypes
                  : ['MULTIPLE_CHOICE'],
                difficultyRange: effectiveCatSettings.difficultyRange || { min: -3, max: 3 },
                bloomsLevels: effectiveCatSettings.bloomsLevels,
              }
            : {
                // Use default CAT settings when none are configured
                enabled: true,
                algorithm: 'irt_2pl',
                startingDifficulty: 0,
                terminationCriteria: {
                  minQuestions: 5,
                  maxQuestions: 20,
                  standardErrorThreshold: 0.3, // Standard threshold - prevents early termination
                },
                itemSelectionMethod: 'maximum_information',
                questionTypes: ['MULTIPLE_CHOICE'],
                difficultyRange: { min: -3, max: 3 }
              };

          console.log(`[CAT] Initializing CAT session with settings:`, normalizedSettings);
          console.log(`[CAT] Using ${effectiveCatSettings ? 'configured' : 'default'} CAT settings`);

          try {
            session.catSession = await this.catIRTService.initializeCATSession(
              activityId,
              resolvedStudentId,
              normalizedSettings
            );
            console.log(`[CAT] CAT session initialized:`, session.catSession);
          } catch (catError) {
            console.error(`[CAT] Failed to initialize CAT session:`, catError);
            throw new Error(`Failed to initialize CAT session: ${catError instanceof Error ? catError.message : String(catError)}`);
          }
          break;

        case 'spaced_repetition':
          if (content.spacedRepetitionSettings) {
            console.log(`[CAT] Initializing spaced repetition session`);
            try {
              session.spacedRepetitionSession = await this.spacedRepetitionService.createReviewSession(
                studentId,
                activityId
              );
              console.log(`[CAT] Spaced repetition session initialized`);
            } catch (srError) {
              console.error(`[CAT] Failed to initialize spaced repetition session:`, srError);
              throw new Error(`Failed to initialize spaced repetition session: ${srError.message}`);
            }
          } else {
            console.warn(`[CAT] Spaced repetition mode selected but no settings found for activity ${activityId}`);
            throw new Error('Spaced repetition mode selected but no settings configured');
          }
          break;

        default:
          console.log(`[CAT] Standard assessment mode - no special initialization needed`);
          break;
      }

      // Save the session to memory store
      try {
        await this.saveSession(session);
        console.log(`[CAT] Advanced assessment session ${session.id} created and saved successfully`);
      } catch (saveError) {
        console.error(`[CAT] Failed to save session ${session.id}:`, saveError);
        throw new Error(`Failed to save assessment session: ${saveError.message}`);
      }

      return session;
    } catch (error) {
      console.error(`[CAT] Error creating advanced assessment session:`, error);
      throw error;
    }
  }

  /**
   * Get the next question for the student based on assessment mode
   */
  async getNextQuestion(sessionId: string): Promise<{
    question: any;
    questionNumber: number;
    totalQuestions: number;
    isLastQuestion: boolean;
    estimatedDifficulty?: number;
    adaptiveContext?: any;
  } | null> {
    console.log(`[CAT] Getting next question for session: ${sessionId}`);

    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        console.error(`[CAT] Session not found: ${sessionId}`);
        throw new Error(`Session ${sessionId} not found`);
      }

      console.log(`[CAT] Session found: ${session.id}, Mode: ${session.assessmentMode}, Questions answered: ${session.questionsAnswered}`);

      const activity = await this.prisma.activity.findUnique({
        where: { id: session.activityId }
      });

      if (!activity) {
        console.error(`[CAT] Activity not found for session: ${session.activityId}`);
        throw new Error(`Activity ${session.activityId} not found`);
      }

      const content = activity.content as unknown as QuizV2Content;
      console.log(`[CAT] Processing next question for mode: ${session.assessmentMode}`);

      switch (session.assessmentMode) {
        case 'cat':
          console.log(`[CAT] Getting next CAT question`);
          return this.getNextCATQuestion(session, content);

        case 'spaced_repetition':
          console.log(`[CAT] Getting next spaced repetition question`);
          return this.getNextSpacedRepetitionQuestion(session, content);

        default:
          console.log(`[CAT] Getting next standard question`);
          return this.getNextStandardQuestion(session, content);
      }
    } catch (error) {
      console.error(`[CAT] Error getting next question for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Process a student's answer and update the session
   */
  async processAnswer(
    sessionId: string,
    questionId: string,
    answer: any,
    responseTime: number
  ): Promise<{
    isCorrect: boolean;
    score: number;
    feedback?: string;
    achievements?: any[];
    nextQuestionAvailable: boolean;
    sessionComplete: boolean;
    adaptiveUpdate?: any;
    questionResult?: {
      questionId: string;
      isCorrect: boolean;
      score: number;
      maxScore: number;
      timeSpent: number;
      difficulty?: string;
      questionType?: string;
      wasUnanswered?: boolean;
      penaltyApplied?: number;
      feedback?: string;
    };
    sessionTotals?: {
      currentScore: number;
      maxPossibleScore: number;
      questionsAnswered: number;
      correctAnswers: number;
      percentage: number;
    };
  }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Get the question for grading
    const question = await this.questionBankService.getQuestion(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // Grade the answer
    const isCorrect = await this.gradeAnswer(question, answer);
    const isUnanswered = answer === null || answer === undefined || (typeof answer === 'string' && answer.trim() === '');

    // Get marking configuration for this session
    const markingConfig = await this.getMarkingConfig(session.activityId);
    const basePoints = this.getQuestionPointsFromQuestion(question, markingConfig);

    let score = 0;
    let penaltyApplied = 0;

    if (isUnanswered) {
      // Unanswered questions: apply configured penalty (default: 0)
      penaltyApplied = markingConfig.negativeMarking.unansweredPenalty;
      score = penaltyApplied;
    } else if (isCorrect) {
      // Correct answer: award full points
      score = basePoints;
    } else {
      // Wrong answer: apply negative marking based on question type
      if (question.questionType === 'MULTIPLE_CHOICE') {
        penaltyApplied = markingConfig.negativeMarking.enabled ? markingConfig.negativeMarking.mcqPenalty : 0;
      } else {
        // TITA or other question types
        penaltyApplied = markingConfig.negativeMarking.enabled ? markingConfig.negativeMarking.titaPenalty : 0;
      }
      score = penaltyApplied;
    }

    // Update session statistics and running totals
    session.questionsAnswered++;
    if (isCorrect) {
      session.correctAnswers++;
    }

    // Track raw score (including negative marks) and max possible score
    session.score = (session.score ?? 0) + score;
    session.maxScore = (session.maxScore ?? 0) + basePoints;

    // Update average response time
    session.averageResponseTime = (
      (session.averageResponseTime * (session.questionsAnswered - 1)) + responseTime
    ) / session.questionsAnswered;

    // Record usage event for analytics
    await this.recordQuestionUsageEvent(session, questionId, isCorrect, responseTime);

    let adaptiveUpdate: any = null;
    let sessionComplete = false;

    // Process based on assessment mode
    switch (session.assessmentMode) {
      case 'cat':
        adaptiveUpdate = await this.processCATAnswer(session, questionId, isCorrect, responseTime);
        sessionComplete = this.catIRTService.shouldTerminate(session.catSession,
          await this.getCATSettings(session.activityId));
        break;

      case 'spaced_repetition':
        adaptiveUpdate = await this.processSpacedRepetitionAnswer(session, questionId, isCorrect, responseTime);
        sessionComplete = session.questionsAnswered >= session.totalQuestions;
        break;

      default:
        sessionComplete = session.questionsAnswered >= session.totalQuestions;
    }

    // Update session
    if (sessionComplete) {
      session.completedAt = new Date();
      await this.finalizeSession(session);
    }

    await this.saveSession(session);

    return {
      isCorrect,
      score,
      feedback: this.generateFeedback(question, isCorrect, session.assessmentMode),
      achievements: await this.calculateAchievements(session, isCorrect, score),
      nextQuestionAvailable: !sessionComplete,
      sessionComplete,
      adaptiveUpdate,
      questionResult: {
        questionId,
        isCorrect,
        score,
        maxScore: basePoints,
        timeSpent: responseTime,
        difficulty: question.difficulty,
        questionType: question.questionType,
        wasUnanswered: isUnanswered,
        penaltyApplied: penaltyApplied,
        feedback: this.generateFeedback(question, isCorrect, session.assessmentMode)
      },
      sessionTotals: {
        currentScore: session.score || 0,
        maxPossibleScore: session.maxScore || 0,
        questionsAnswered: session.questionsAnswered,
        correctAnswers: session.correctAnswers,
        percentage: session.maxScore ? Math.round(((session.score || 0) / session.maxScore) * 100) : 0
      }
    };
  }

  /**
   * Generate comprehensive analytics for advanced assessment
   */
  async generateAdvancedAnalytics(activityId: string): Promise<{
    overview: {
      totalSessions: number;
      completedSessions: number;
      averageScore: number;
      averageTime: number;
    };
    catAnalytics?: {
      averageAbilityEstimate: number;
      averageQuestionsAsked: number;
      terminationReasons: Record<string, number>;
      abilityDistribution: number[];
    };
    spacedRepetitionAnalytics?: {
      totalCards: number;
      averageRetentionRate: number;
      learningVelocity: number;
      masteryProgression: Record<string, number>;
    };
    questionAnalytics: Array<{
      questionId: string;
      usageCount: number;
      correctRate: number;
      averageResponseTime: number;
      irtParameters?: {
        discrimination: number;
        difficulty: number;
        guessing?: number;
      };
    }>;
  }> {
    // Get all sessions for this activity
    const sessions = await this.getSessionsByActivity(activityId);
    const completedSessions = sessions.filter(s => s.completedAt);

    const overview = {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      averageScore: completedSessions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSessions.length || 0,
      averageTime: completedSessions.reduce((sum, s) => {
        const duration = s.completedAt && s.startedAt ?
          (s.completedAt.getTime() - s.startedAt.getTime()) / 1000 : 0;
        return sum + duration;
      }, 0) / completedSessions.length || 0
    };

    // Generate mode-specific analytics
    const catSessions = sessions.filter(s => s.assessmentMode === 'cat');
    const srSessions = sessions.filter(s => s.assessmentMode === 'spaced_repetition');

    let catAnalytics: any = null;
    let spacedRepetitionAnalytics: any = null;

    if (catSessions.length > 0) {
      catAnalytics = await this.generateCATAnalytics(catSessions);
    }

    if (srSessions.length > 0) {
      spacedRepetitionAnalytics = await this.generateSpacedRepetitionAnalytics(activityId);
    }

    // Generate question-level analytics
    const questionAnalytics = await this.generateQuestionAnalytics(activityId);

    return {
      overview,
      catAnalytics,
      spacedRepetitionAnalytics,
      questionAnalytics
    };
  }

  /**
   * Export activity for paper-based testing
   */
  async exportToPaperTest(
    activityId: string,
    configuration: any,
    teacherId: string
  ): Promise<any> {
    return this.paperBasedTestingService.generatePaperTest(activityId, configuration, teacherId);
  }

  /**
   * Import paper test results back to digital system
   */
  async importPaperTestResults(
    _paperTestId: string,
    results: any[],
    teacherId: string
  ): Promise<void> {
    // Process paper test results and create digital grades
    for (const result of results) {
      await this.paperBasedTestingService.gradeSubmission(
        result.submissionId,
        result.answers,
        teacherId,
        result.feedback
      );
    }
  }

  // Private helper methods

  private async getNextCATQuestion(session: AdvancedAssessmentSession, content: QuizV2Content): Promise<any> {
    console.log(`[CAT] Getting next CAT question for session ${session.id}`);

    if (!session.catSession) {
      console.error(`[CAT] No CAT session found for session ${session.id}`);
      return null;
    }

    // Resolve effective CAT settings (supports content.catSettings and settings.catSettings)
    const settings = await this.getCATSettings(session.activityId);
    const allowedTypes = settings.questionTypes && settings.questionTypes.length > 0
      ? settings.questionTypes
      : ['MULTIPLE_CHOICE'];

    try {
      console.log(`[CAT] Preparing candidate pool for CAT selection`);

      let questionPool = content.questions;

      if (!questionPool || questionPool.length === 0) {
        // Build a pool from subject if activity has no predefined questions
        const activity = await this.prisma.activity.findUnique({
          where: { id: session.activityId },
          select: { subjectId: true }
        });

        const candidates = await this.prisma.question.findMany({
          where: {
            status: 'ACTIVE',
            subjectId: activity?.subjectId || undefined,
            questionType: { in: allowedTypes as any }
          },
          select: { id: true, difficulty: true },
          take: Math.max(settings.terminationCriteria.maxQuestions * 3, 30)
        });

        const markingConfig = await this.getMarkingConfig(session.activityId);
        questionPool = candidates.map(c => ({ id: c.id, order: 0, points: this.getQuestionPointsFromQuestion({ difficulty: c.difficulty }, markingConfig) }));
      } else {
        // Filter predefined questions to allowed types
        const ids = questionPool.map(q => q.id);
        const detailed = await this.questionBankService.getQuestionsByIds(ids);
        const allowedSet = new Set(detailed.filter(d => allowedTypes.includes(d.questionType as any)).map(d => d.id));
        questionPool = questionPool.filter(q => allowedSet.has(q.id));
      }

      console.log(`[CAT] Selecting next question using CAT algorithm from pool size: ${questionPool.length}`);
      const nextQuestion = await this.catIRTService.selectNextQuestion(
        session.catSession,
        settings,
        questionPool
      );

      if (!nextQuestion) {
        console.log(`[CAT] No more questions available from CAT algorithm`);
        return null;
      }

      console.log(`[CAT] CAT algorithm selected question: ${nextQuestion.id}`);

      const question = await this.questionBankService.getQuestion(nextQuestion.id);

      if (!question) {
        console.error(`[CAT] Question ${nextQuestion.id} not found in question bank`);
        return null;
      }

      console.log(`[CAT] Question loaded from question bank: ${question.id}`);

      const result = {
        question,
        questionNumber: session.questionsAnswered + 1,
        totalQuestions: settings.terminationCriteria.maxQuestions,
        isLastQuestion: false, // CAT determines dynamically
        estimatedDifficulty: session.catSession.currentAbility?.theta || 0,
        adaptiveContext: {
          currentAbility: session.catSession.currentAbility,
          questionsAsked: session.catSession.questionsAsked?.length || 0
        }
      };

      console.log(`[CAT] Returning CAT question result:`, {
        questionId: result.question.id,
        questionNumber: result.questionNumber,
        estimatedDifficulty: result.estimatedDifficulty
      });

      return result;
    } catch (error) {
      console.error(`[CAT] Error getting next CAT question:`, error);
      throw new Error(`Failed to get next CAT question: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getNextSpacedRepetitionQuestion(session: AdvancedAssessmentSession, _content: QuizV2Content): Promise<any> {
    if (!session.spacedRepetitionSession) {
      return null;
    }

    const cards = session.spacedRepetitionSession.cards;
    if (session.currentQuestionIndex >= cards.length) {
      return null;
    }

    const card = cards[session.currentQuestionIndex];
    const question = await this.questionBankService.getQuestion(card.questionId);

    return {
      question,
      questionNumber: session.currentQuestionIndex + 1,
      totalQuestions: cards.length,
      isLastQuestion: session.currentQuestionIndex === cards.length - 1,
      adaptiveContext: {
        easeFactor: card.easeFactor,
        interval: card.interval,
        learningState: card.learningState
      }
    };
  }

  private async getNextStandardQuestion(session: AdvancedAssessmentSession, content: QuizV2Content): Promise<any> {
    if (session.currentQuestionIndex >= content.questions.length) {
      return null;
    }

    const quizQuestion = content.questions[session.currentQuestionIndex];
    const question = await this.questionBankService.getQuestion(quizQuestion.id);

    return {
      question,
      questionNumber: session.currentQuestionIndex + 1,
      totalQuestions: content.questions.length,
      isLastQuestion: session.currentQuestionIndex === content.questions.length - 1
    };
  }

  private async gradeAnswer(question: any, answer: any): Promise<boolean> {
    // Use existing question bank grading logic
    return this.questionBankService.gradeAnswer(question, answer);
  }

  private getQuestionPoints(_questionId: string, _activityId: string): number {
    // Get points for this question from activity configuration
    // This would look up the points in the activity's question configuration
    return 1; // Default
  }

  private async recordQuestionUsageEvent(
    session: AdvancedAssessmentSession,
    questionId: string,
    isCorrect: boolean,
    responseTime: number
  ): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: session.activityId },
      select: { classId: true, subjectId: true }
    });

    if (!activity) return;


    await this.prisma.questionUsageEvent.create({
      data: {
        questionId,
        activityId: session.activityId,
        studentId: session.studentId,
        classId: activity.classId,
        subjectId: activity.subjectId || '',
        isCorrect,
        responseTime,
        attemptNumber: 1,
        assessmentMode: session.assessmentMode,
        questionOrder: session.currentQuestionIndex + 1,
        totalQuestions: session.totalQuestions,
        startedAt: session.startedAt,
        completedAt: new Date(),
        previousQuestions: [] // Would track previous questions in session
      }
    });
  }

  private async processCATAnswer(
    session: AdvancedAssessmentSession,
    questionId: string,
    isCorrect: boolean,
    responseTime: number
  ): Promise<any> {
    if (!session.catSession) return null;

    const settings = await this.getCATSettings(session.activityId);
    const updatedAbility = await this.catIRTService.updateAbilityEstimate(
      session.catSession,
      questionId,
      isCorrect,
      responseTime,
      settings
    );

    session.abilityProgression = session.abilityProgression || [];
    session.abilityProgression.push(updatedAbility.theta);

    return {
      abilityEstimate: updatedAbility.theta,
      standardError: updatedAbility.standardError,
      confidence: updatedAbility.confidence
    };
  }

  private async processSpacedRepetitionAnswer(
    session: AdvancedAssessmentSession,
    questionId: string,
    isCorrect: boolean,
    responseTime: number
  ): Promise<any> {
    if (!session.spacedRepetitionSession) return null;

    const card = session.spacedRepetitionSession.cards[session.currentQuestionIndex];
    const difficulty = isCorrect ? 'good' : 'again';

    const updatedCard = await this.spacedRepetitionService.processReviewResult(
      card.id,
      {
        cardId: card.id,
        questionId,
        isCorrect,
        responseTime,
        difficulty: difficulty as any,
        confidence: isCorrect ? 4 : 2
      }
    );

    return {
      easeFactor: updatedCard.easeFactor,
      interval: updatedCard.interval,
      nextReviewDate: updatedCard.nextReviewDate,
      learningState: updatedCard.learningState
    };
  }

  private generateFeedback(_question: any, isCorrect: boolean, assessmentMode: string): string {
    let feedback = isCorrect ? 'Correct!' : 'Incorrect.';

    if (assessmentMode === 'cat') {
      feedback += isCorrect ? ' The system will adjust to your ability level.' : ' The system will provide easier questions.';
    } else if (assessmentMode === 'spaced_repetition') {
      feedback += isCorrect ? ' This will be reviewed again later.' : ' This will be reviewed sooner.';
    }

    return feedback;
  }

  private getQuestionPointsFromQuestion(question: any, markingConfig?: CATMarkingConfig): number {
    const diff = (question?.difficulty as string) || 'MEDIUM';
    const defaultConfig = markingConfig?.positiveMarking || {
      easy: 1,
      medium: 2,
      hard: 3
    };

    switch (diff.toUpperCase()) {
      case 'EASY':
        return defaultConfig.easy;
      case 'HARD':
        return defaultConfig.hard;
      default:
        return defaultConfig.medium;
    }
  }

  private async getMarkingConfig(activityId: string): Promise<CATMarkingConfig> {
    const settings = await this.getCATSettings(activityId);
    return settings.markingConfig || {
      positiveMarking: {
        easy: 1,
        medium: 2,
        hard: 3
      },
      negativeMarking: {
        enabled: true,
        mcqPenalty: -1,
        titaPenalty: 0,
        unansweredPenalty: 0
      },
      scoringMethod: 'percentile',
      percentileConfig: {
        populationMean: 0,
        populationStd: 1,
        minPercentile: 1,
        maxPercentile: 99
      }
    };
  }

  private calculateCATPercentile(abilityEstimate: number, config?: CATMarkingConfig['percentileConfig']): number {
    const { populationMean = 0, populationStd = 1, minPercentile = 1, maxPercentile = 99 } = config || {};

    // Convert theta (ability estimate) to percentile using normal distribution
    // Z-score = (theta - mean) / std
    const zScore = (abilityEstimate - populationMean) / populationStd;

    // Convert z-score to percentile using cumulative normal distribution approximation
    const percentile = this.normalCDF(zScore) * 100;

    // Clamp to configured range
    return Math.max(minPercentile, Math.min(maxPercentile, Math.round(percentile)));
  }

  private normalCDF(x: number): number {
    // Approximation of cumulative normal distribution function
    // Using Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private async calculateAchievements(session: AdvancedAssessmentSession, isCorrect: boolean, score: number): Promise<any[]> {
    const achievements: any[] = [];

    // Add mode-specific achievements
    if (session.assessmentMode === 'cat' && session.abilityProgression) {
      const currentAbility = session.abilityProgression[session.abilityProgression.length - 1];
      if (currentAbility > 1.0) {
        achievements.push({
          type: 'ability_milestone',
          title: 'High Ability',
          description: 'Your estimated ability is above average!',
          points: 50
        });
      }
    }

    return achievements;
  }

  private async finalizeSession(session: AdvancedAssessmentSession): Promise<void> {
    // Calculate final scores and learning gains
    // If running totals were maintained during the session (CAT), keep them; otherwise fall back
    session.score = session.score ?? session.correctAnswers;
    session.maxScore = session.maxScore ?? session.questionsAnswered;

    // For CAT sessions, calculate percentile and scaled scoring
    if (session.assessmentMode === 'cat' && session.catSession && session.abilityProgression) {
      const finalAbility = session.abilityProgression[session.abilityProgression.length - 1];
      const markingConfig = await this.getMarkingConfig(session.activityId);

      // Calculate percentile based on ability estimate
      const percentile = this.calculateCATPercentile(finalAbility, markingConfig.percentileConfig);

      // Store CAT-specific scoring information
      (session as any).catScoring = {
        abilityEstimate: finalAbility,
        standardError: session.catSession.currentAbility?.standardError || 0.5,
        percentile: percentile,
        questionsAsked: session.questionsAnswered,
        terminationReason: this.determineCATTerminationReason(session)
      };

      // If using percentile scoring method, override the raw score
      if (markingConfig.scoringMethod === 'percentile') {
        session.score = percentile;
        session.maxScore = 100; // Percentile is out of 100
      }
    }

    // Calculate learning gains (simplified)
    if (session.abilityProgression && session.abilityProgression.length > 1) {
      const initialAbility = session.abilityProgression[0];
      const finalAbility = session.abilityProgression[session.abilityProgression.length - 1];
      session.learningGains = finalAbility - initialAbility;
    }

    // Update learning analytics
    await this.updateLearningAnalytics(session);
  }

  private determineCATTerminationReason(session: AdvancedAssessmentSession): 'max_questions' | 'standard_error' | 'min_questions_reached' {
    // This would be determined by the CAT algorithm
    // For now, return based on questions asked
    const settings = session.catSession?.settings;
    if (!settings) return 'max_questions';

    if (session.questionsAnswered >= settings.terminationCriteria?.maxQuestions) {
      return 'max_questions';
    } else if (session.questionsAnswered <= settings.terminationCriteria?.minQuestions) {
      return 'min_questions_reached';
    } else {
      return 'standard_error';
    }
  }

  private async updateLearningAnalytics(session: AdvancedAssessmentSession): Promise<void> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: session.activityId },
      select: { subjectId: true }
    });

    if (!activity?.subjectId) return;

    // Update or create learning analytics record
    await this.prisma.learningAnalytics.upsert({
      where: {
        studentId_subjectId: {
          studentId: session.studentId,
          subjectId: activity.subjectId
        }
      },
      update: {
        questionsAnswered: { increment: session.questionsAnswered },
        correctAnswers: { increment: session.correctAnswers },
        totalStudyTime: { increment: Math.round((session.completedAt!.getTime() - session.startedAt.getTime()) / 60000) },
        lastUpdated: new Date()
      },
      create: {
        studentId: session.studentId,
        subjectId: activity.subjectId,
        questionsAnswered: session.questionsAnswered,
        correctAnswers: session.correctAnswers,
        totalStudyTime: Math.round((session.completedAt!.getTime() - session.startedAt.getTime()) / 60000)
      }
    });
  }

  // In-memory session storage with TTL cleanup
  private static sessionStore = new Map<string, { session: AdvancedAssessmentSession; timestamp: number }>();
  private static readonly SESSION_TTL = 4 * 60 * 60 * 1000; // 4 hours
  private static readonly MAX_SESSIONS = 10000; // Prevent memory leaks

  // Cleanup expired sessions periodically
  private static cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of Array.from(AdvancedFeaturesIntegrationService.sessionStore.entries())) {
      if (now - data.timestamp > AdvancedFeaturesIntegrationService.SESSION_TTL) {
        AdvancedFeaturesIntegrationService.sessionStore.delete(sessionId);
      }
    }
  }, 30 * 60 * 1000); // Cleanup every 30 minutes

  // Database operations with in-memory caching and persistence
  private async getSession(sessionId: string): Promise<AdvancedAssessmentSession | null> {
    try {
      // Check in-memory store first for performance
      const cached = AdvancedFeaturesIntegrationService.sessionStore.get(sessionId);
      if (cached && Date.now() - cached.timestamp < AdvancedFeaturesIntegrationService.SESSION_TTL) {
        // Update timestamp to extend TTL
        cached.timestamp = Date.now();
        return cached.session;
      }

      // If not in cache or expired, remove from cache
      if (cached) {
        AdvancedFeaturesIntegrationService.sessionStore.delete(sessionId);
      }

      // Try to load from database
      try {
        const dbSession = await this.prisma.advancedAssessmentSession.findUnique({
          where: { id: sessionId }
        });

        if (dbSession && dbSession.sessionData) {
          const session = JSON.parse(dbSession.sessionData as string) as AdvancedAssessmentSession;

          // Restore to memory cache
          AdvancedFeaturesIntegrationService.sessionStore.set(sessionId, {
            session,
            timestamp: Date.now()
          });

          console.log(`Session ${sessionId} restored from database`);
          return session;
        }
      } catch (dbError) {
        console.warn('Database session retrieval failed, continuing with memory-only:', dbError);
      }

      return null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  private async saveSession(session: AdvancedAssessmentSession): Promise<void> {
    try {
      // Prevent memory leaks by limiting session count
      if (AdvancedFeaturesIntegrationService.sessionStore.size >= AdvancedFeaturesIntegrationService.MAX_SESSIONS) {
        // Remove oldest session
        const oldestEntry = Array.from(AdvancedFeaturesIntegrationService.sessionStore.entries())
          .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
        if (oldestEntry) {
          AdvancedFeaturesIntegrationService.sessionStore.delete(oldestEntry[0]);
        }
      }

      // Save to in-memory store for fast access
      AdvancedFeaturesIntegrationService.sessionStore.set(session.id, {
        session: { ...session }, // Create a copy to avoid reference issues
        timestamp: Date.now()
      });

      // Persist to database for reliability
      try {
        await this.prisma.advancedAssessmentSession.upsert({
          where: { id: session.id },
          update: {
            sessionData: JSON.stringify(session),
            lastAccessedAt: new Date(),
            updatedAt: new Date()
          },
          create: {
            id: session.id,
            activityId: session.activityId,
            studentId: session.studentId,
            assessmentMode: session.assessmentMode,
            sessionData: JSON.stringify(session),
            startedAt: session.startedAt,
            lastAccessedAt: new Date()
          }
        });

        console.log(`Session ${session.id} saved to both memory and database`);
      } catch (dbError) {
        console.warn('Database session save failed, continuing with memory-only:', dbError);
        console.log(`Session ${session.id} saved to memory store only`);
      }
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  private async getSessionsByActivity(activityId: string): Promise<AdvancedAssessmentSession[]> {
    try {
      const sessions: AdvancedAssessmentSession[] = [];
      const now = Date.now();

      for (const [sessionId, data] of Array.from(AdvancedFeaturesIntegrationService.sessionStore.entries())) {
        // Skip expired sessions
        if (now - data.timestamp > AdvancedFeaturesIntegrationService.SESSION_TTL) {
          AdvancedFeaturesIntegrationService.sessionStore.delete(sessionId);
          continue;
        }

        if (data.session.activityId === activityId) {
          sessions.push(data.session);
        }
      }

      return sessions;
    } catch (error) {
      console.error('Error getting sessions by activity:', error);
      return [];
    }
  }

  private async getCATSettings(activityId: string): Promise<CATSettings> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId }
    });

    const content = activity?.content as unknown as QuizV2Content;
    const raw = (content?.catSettings || (content as any)?.settings?.catSettings) as Partial<CATSettings> | undefined;

    // Use the utility function to merge with defaults
    return mergeCATSettings(raw || {});
  }

  private async generateCATAnalytics(sessions: AdvancedAssessmentSession[]): Promise<any> {
    // Generate CAT-specific analytics
    return {};
  }

  private async generateSpacedRepetitionAnalytics(activityId: string): Promise<any> {
    // Generate spaced repetition analytics
    return {};
  }

  private async generateQuestionAnalytics(activityId: string): Promise<any[]> {
    // Generate question-level analytics
    return [];
  }
}
