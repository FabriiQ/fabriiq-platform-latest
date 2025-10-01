/**
 * Computer Adaptive Testing (CAT) with Item Response Theory (IRT) Service
 * 
 * Implements adaptive testing algorithms that adjust question difficulty
 * based on student performance using IRT models.
 */

import { PrismaClient, DifficultyLevel, BloomsTaxonomyLevel } from '@prisma/client';
import { CATSettings, QuizV2Question, QuestionResult } from '../types';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';

export interface IRTParameters {
  discrimination: number; // a parameter (0.5-3.0)
  difficulty: number;     // b parameter (-3.0 to 3.0)
  guessing?: number;      // c parameter (0-0.3) for 3PL model
}

export interface StudentAbility {
  theta: number;          // Ability estimate (-4.0 to 4.0)
  standardError: number;  // Standard error of measurement
  confidence: number;     // Confidence level (0-1)
}

export interface CATSession {
  id: string;
  activityId: string;
  studentId: string;
  currentAbility: StudentAbility;
  questionsAsked: string[];
  responses: CATResponse[];
  isComplete: boolean;
  terminationReason?: 'max_questions' | 'min_questions' | 'standard_error' | 'manual';
}

export interface CATResponse {
  questionId: string;
  isCorrect: boolean;
  responseTime: number;
  irtParameters: IRTParameters;
  abilityBefore: number;
  abilityAfter: number;
  informationGain: number;
}

export class CATIRTService {
  constructor(
    private prisma: PrismaClient,
    private questionBankService: QuestionBankService
  ) {}

  /**
   * Initialize a new CAT session for a student
   */
  async initializeCATSession(
    activityId: string,
    studentId: string,
    settings: CATSettings
  ): Promise<CATSession> {
    // Get student's historical performance to estimate initial ability
    const initialAbility = await this.estimateInitialAbility(studentId, activityId);

    const session: CATSession = {
      id: `cat_${activityId}_${studentId}_${Date.now()}`,
      activityId,
      studentId,
      currentAbility: initialAbility,
      questionsAsked: [],
      responses: [],
      isComplete: false
    };

    return session;
  }

  /**
   * Select the next best question for the student based on current ability estimate
   */
  async selectNextQuestion(
    session: CATSession,
    settings: CATSettings,
    availableQuestions: QuizV2Question[]
  ): Promise<QuizV2Question | null> {
    // Filter out already asked questions
    const candidateQuestions = availableQuestions.filter(
      q => !session.questionsAsked.includes(q.id)
    );

    if (candidateQuestions.length === 0) {
      return null;
    }

    // Get IRT parameters for candidate questions
    const questionsWithIRT = await Promise.all(
      candidateQuestions.map(async (q) => ({
        question: q,
        irtParams: await this.getQuestionIRTParameters(q.id)
      }))
    );

    // Select question based on item selection method
    switch (settings.itemSelectionMethod) {
      case 'maximum_information':
        return this.selectByMaximumInformation(questionsWithIRT, session.currentAbility);
      case 'bayesian':
        return this.selectByBayesian(questionsWithIRT, session.currentAbility);
      case 'weighted':
        return this.selectByWeighted(questionsWithIRT, session.currentAbility);
      default:
        return this.selectByMaximumInformation(questionsWithIRT, session.currentAbility);
    }
  }

  /**
   * Update student ability estimate after a response
   */
  async updateAbilityEstimate(
    session: CATSession,
    questionId: string,
    isCorrect: boolean,
    responseTime: number,
    settings: CATSettings
  ): Promise<StudentAbility> {
    const irtParams = await this.getQuestionIRTParameters(questionId);
    const previousAbility = session.currentAbility.theta;

    // Calculate new ability using Maximum Likelihood Estimation (MLE)
    const newAbility = this.calculateMLE(
      session.responses.concat([{
        questionId,
        isCorrect,
        responseTime,
        irtParameters: irtParams,
        abilityBefore: previousAbility,
        abilityAfter: 0, // Will be updated
        informationGain: 0 // Will be calculated
      }]),
      settings.algorithm
    );

    // Calculate standard error
    const standardError = this.calculateStandardError(session.responses, newAbility);

    // Calculate information gain
    const informationGain = this.calculateInformationGain(irtParams, newAbility);

    // Update session
    const response: CATResponse = {
      questionId,
      isCorrect,
      responseTime,
      irtParameters: irtParams,
      abilityBefore: previousAbility,
      abilityAfter: newAbility,
      informationGain
    };

    session.responses.push(response);
    session.questionsAsked.push(questionId);
    session.currentAbility = {
      theta: newAbility,
      standardError,
      confidence: this.calculateConfidence(standardError)
    };

    return session.currentAbility;
  }

  /**
   * Check if CAT session should terminate
   */
  shouldTerminate(session: CATSession, settings: CATSettings): boolean {
    const { minQuestions, maxQuestions, standardErrorThreshold } = settings.terminationCriteria;
    const questionsAnswered = session.responses.length;
    const currentStandardError = session.currentAbility.standardError;

    console.log(`[CAT] Checking termination criteria:`, {
      questionsAnswered,
      minQuestions,
      maxQuestions,
      currentStandardError,
      standardErrorThreshold,
      sessionId: session.id
    });

    // Must ask minimum questions first
    if (questionsAnswered < minQuestions) {
      console.log(`[CAT] Not terminating: Haven't reached minimum questions (${questionsAnswered}/${minQuestions})`);
      return false;
    }

    // Stop if reached maximum questions
    if (questionsAnswered >= maxQuestions) {
      session.terminationReason = 'max_questions';
      console.log(`[CAT] Terminating: Reached maximum questions (${questionsAnswered}/${maxQuestions})`);
      return true;
    }

    // Stop if standard error is below threshold (high precision) AND we've asked minimum questions
    // Add additional safeguard: require at least 3 questions regardless of standard error
    if (currentStandardError <= standardErrorThreshold && questionsAnswered >= minQuestions && questionsAnswered >= 3) {
      session.terminationReason = 'standard_error';
      console.log(`[CAT] Terminating: Standard error threshold met (${currentStandardError} <= ${standardErrorThreshold})`);
      console.log(`[CAT] Termination after ${questionsAnswered} questions with standard error ${currentStandardError}`);
      return true;
    }

    console.log(`[CAT] Continuing: Termination criteria not met`);
    return false;
  }

  /**
   * Generate final CAT results
   */
  generateCATResults(session: CATSession): {
    finalAbility: StudentAbility;
    questionsAnswered: number;
    correctAnswers: number;
    averageResponseTime: number;
    terminationReason: string;
    abilityProgression: number[];
  } {
    const correctAnswers = session.responses.filter(r => r.isCorrect).length;
    const averageResponseTime = session.responses.reduce((sum, r) => sum + r.responseTime, 0) / session.responses.length;
    const abilityProgression = session.responses.map(r => r.abilityAfter);

    return {
      finalAbility: session.currentAbility,
      questionsAnswered: session.responses.length,
      correctAnswers,
      averageResponseTime,
      terminationReason: session.terminationReason || 'unknown',
      abilityProgression
    };
  }

  // Private helper methods

  private async estimateInitialAbility(studentId: string, activityId: string): Promise<StudentAbility> {
    // Get student's historical performance in similar activities
    const historicalPerformance = await this.prisma.activityGrade.findMany({
      where: {
        studentId,
        activity: {
          subjectId: {
            in: await this.getActivitySubjectId(activityId)
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (historicalPerformance.length === 0) {
      // No history, start with neutral ability
      return {
        theta: 0.0,
        standardError: 1.0,
        confidence: 0.5
      };
    }

    // Calculate average performance and convert to theta scale
    const averageScore = historicalPerformance.reduce((sum, grade) => sum + (grade.score || 0), 0) / historicalPerformance.length;
    // Use points field as max score, fallback to 100
    const averageMaxScore = historicalPerformance.reduce((sum, grade) => sum + (grade.points || 100), 0) / historicalPerformance.length;
    const percentage = averageScore / averageMaxScore;

    // Convert percentage to theta scale (-3 to 3)
    const theta = this.percentageToTheta(percentage);

    return {
      theta,
      standardError: 0.8, // Start with moderate uncertainty
      confidence: Math.min(0.8, historicalPerformance.length / 10)
    };
  }

  private async getQuestionIRTParameters(questionId: string): Promise<IRTParameters> {
    // Get question from database with IRT parameters
    const question = await this.prisma.question.findUnique({
      where: { id: questionId }
      // TODO: Add questionUsageEvents relation when model is added to schema
    });

    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // Check if IRT parameters are cached in metadata
    if (question.metadata && typeof question.metadata === 'object' && question.metadata !== null) {
      const metadata = question.metadata as Record<string, any>;
      if (metadata.irtParameters) {
        return metadata.irtParameters as IRTParameters;
      }
    }

    // Calculate IRT parameters from usage data
    const irtParams = await this.calculateIRTParameters(question);
    
    // Cache the parameters
    const existingMetadata = question.metadata && typeof question.metadata === 'object' && question.metadata !== null
      ? question.metadata as Record<string, any>
      : {};

    await this.prisma.question.update({
      where: { id: questionId },
      data: {
        metadata: {
          ...existingMetadata,
          irtParameters: irtParams as any
        } as any
      }
    });

    return irtParams;
  }

  private async calculateIRTParameters(question: any): Promise<IRTParameters> {
    const usageEvents = question.questionUsageEvents || [];
    
    if (usageEvents.length < 10) {
      // Not enough data, use defaults based on difficulty
      return this.getDefaultIRTParameters(question.difficulty);
    }

    // Calculate discrimination (a parameter)
    const correctRate = usageEvents.filter((e: any) => e.isCorrect).length / usageEvents.length;
    const discrimination = this.calculateDiscrimination(usageEvents);

    // Calculate difficulty (b parameter) - convert from percentage to logit scale
    const difficulty = this.percentageToTheta(1 - correctRate);

    // Calculate guessing parameter (c parameter) for 3PL model
    const guessing = Math.max(0, Math.min(0.25, correctRate * 0.2));

    return {
      discrimination,
      difficulty,
      guessing
    };
  }

  private getDefaultIRTParameters(difficulty: DifficultyLevel): IRTParameters {
    switch (difficulty) {
      case DifficultyLevel.EASY:
        return { discrimination: 1.0, difficulty: -1.0, guessing: 0.1 };
      case DifficultyLevel.MEDIUM:
        return { discrimination: 1.2, difficulty: 0.0, guessing: 0.15 };
      case DifficultyLevel.HARD:
        return { discrimination: 1.4, difficulty: 1.0, guessing: 0.2 };
      default:
        return { discrimination: 1.0, difficulty: 0.0, guessing: 0.15 };
    }
  }

  private selectByMaximumInformation(
    questionsWithIRT: Array<{ question: QuizV2Question; irtParams: IRTParameters }>,
    ability: StudentAbility
  ): QuizV2Question {
    let maxInformation = 0;
    let bestQuestion = questionsWithIRT[0].question;

    for (const { question, irtParams } of questionsWithIRT) {
      const information = this.calculateInformationGain(irtParams, ability.theta);
      if (information > maxInformation) {
        maxInformation = information;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  private selectByBayesian(
    questionsWithIRT: Array<{ question: QuizV2Question; irtParams: IRTParameters }>,
    ability: StudentAbility
  ): QuizV2Question {
    // Bayesian item selection considers both information and prior uncertainty
    let maxUtility = 0;
    let bestQuestion = questionsWithIRT[0].question;

    for (const { question, irtParams } of questionsWithIRT) {
      const information = this.calculateInformationGain(irtParams, ability.theta);
      const uncertainty = ability.standardError;
      const utility = information * uncertainty; // Weight by current uncertainty
      
      if (utility > maxUtility) {
        maxUtility = utility;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  private selectByWeighted(
    questionsWithIRT: Array<{ question: QuizV2Question; irtParams: IRTParameters }>,
    ability: StudentAbility
  ): QuizV2Question {
    // Weighted selection considers multiple factors
    let maxScore = 0;
    let bestQuestion = questionsWithIRT[0].question;

    for (const { question, irtParams } of questionsWithIRT) {
      const information = this.calculateInformationGain(irtParams, ability.theta);
      const difficulty = Math.abs(irtParams.difficulty - ability.theta); // Distance from ability
      const discrimination = irtParams.discrimination;
      
      // Weighted score: prioritize high information, appropriate difficulty, good discrimination
      const score = (information * 0.5) + ((1 / (1 + difficulty)) * 0.3) + (discrimination * 0.2);
      
      if (score > maxScore) {
        maxScore = score;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  private calculateMLE(responses: CATResponse[], algorithm: string): number {
    // Maximum Likelihood Estimation for ability
    // This is a simplified implementation - in production, use numerical optimization
    
    let ability = 0;
    const maxIterations = 20;
    const tolerance = 0.001;

    for (let i = 0; i < maxIterations; i++) {
      let logLikelihood = 0;
      let derivative = 0;
      let secondDerivative = 0;

      for (const response of responses) {
        const p = this.calculateProbability(ability, response.irtParameters, algorithm);
        const q = 1 - p;
        
        if (response.isCorrect) {
          logLikelihood += Math.log(p);
          derivative += (response.irtParameters.discrimination * q);
          secondDerivative -= (response.irtParameters.discrimination ** 2 * p * q);
        } else {
          logLikelihood += Math.log(q);
          derivative -= (response.irtParameters.discrimination * p);
          secondDerivative -= (response.irtParameters.discrimination ** 2 * p * q);
        }
      }

      const change = derivative / secondDerivative;
      ability -= change;

      if (Math.abs(change) < tolerance) {
        break;
      }
    }

    return Math.max(-4, Math.min(4, ability)); // Constrain to reasonable range
  }

  private calculateProbability(ability: number, irtParams: IRTParameters, algorithm: string): number {
    const { discrimination, difficulty, guessing = 0 } = irtParams;
    const exponent = discrimination * (ability - difficulty);

    switch (algorithm) {
      case 'rasch':
        return 1 / (1 + Math.exp(-exponent));
      case 'irt_2pl':
        return 1 / (1 + Math.exp(-exponent));
      case 'irt_3pl':
        return guessing + (1 - guessing) / (1 + Math.exp(-exponent));
      default:
        return 1 / (1 + Math.exp(-exponent));
    }
  }

  private calculateInformationGain(irtParams: IRTParameters, ability: number): number {
    const p = this.calculateProbability(ability, irtParams, 'irt_2pl');
    const q = 1 - p;
    const information = (irtParams.discrimination ** 2) * p * q;

    // Cap information gain to prevent unrealistic values that cause premature termination
    const cappedInformation = Math.min(information, 2.0);

    if (information !== cappedInformation) {
      console.log(`[CAT] Information gain capped from ${information} to ${cappedInformation} for ability ${ability}`);
    }

    return cappedInformation;
  }

  private calculateStandardError(responses: CATResponse[], ability: number): number {
    if (responses.length === 0) return 1.0;

    const totalInformation = responses.reduce((sum, response) => {
      const info = this.calculateInformationGain(response.irtParameters, ability);
      console.log(`[CAT] Information gain for question ${response.questionId}: ${info}`);
      return sum + info;
    }, 0);

    const standardError = totalInformation > 0 ? 1 / Math.sqrt(totalInformation) : 1.0;
    console.log(`[CAT] Total information: ${totalInformation}, Standard error: ${standardError}`);

    return standardError;
  }

  private calculateConfidence(standardError: number): number {
    // Convert standard error to confidence level (0-1)
    return Math.max(0, Math.min(1, 1 - standardError));
  }

  private calculateDiscrimination(usageEvents: any[]): number {
    // Simplified discrimination calculation
    // In practice, use more sophisticated IRT calibration
    const responseVariance = this.calculateResponseVariance(usageEvents);
    return Math.max(0.5, Math.min(3.0, 1.0 + responseVariance));
  }

  private calculateResponseVariance(usageEvents: any[]): number {
    const correctRate = usageEvents.filter(e => e.isCorrect).length / usageEvents.length;
    return correctRate * (1 - correctRate);
  }

  private percentageToTheta(percentage: number): number {
    // Convert percentage (0-1) to theta scale (-3 to 3)
    if (percentage <= 0.01) return -3;
    if (percentage >= 0.99) return 3;
    
    // Use inverse normal transformation
    return Math.log(percentage / (1 - percentage)) / 1.7;
  }

  private async getActivitySubjectId(activityId: string): Promise<string[]> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { subjectId: true }
    });
    
    return activity?.subjectId ? [activity.subjectId] : [];
  }
}
