/**
 * Computer Adaptive Testing (CAT) Service
 * Implements Item Response Theory (IRT) for adaptive question selection
 */

import { PrismaClient } from '@prisma/client';

export interface CATQuestion {
  id: string;
  difficulty: number; // IRT difficulty parameter (-3 to +3)
  discrimination: number; // IRT discrimination parameter (0.5 to 2.5)
  guessing: number; // IRT guessing parameter (0 to 0.25)
  content: any;
  bloomsLevel?: string;
  topicId?: string;
}

export interface CATSession {
  id: string;
  studentId: string;
  activityId: string;
  abilityEstimate: number;
  standardError: number;
  questionsAnswered: number;
  responses: CATResponse[];
  isTerminated: boolean;
  terminationReason?: 'max_questions' | 'precision_met' | 'time_limit';
}

export interface CATResponse {
  questionId: string;
  answer: any;
  isCorrect: boolean;
  responseTime: number;
  abilityBefore: number;
  abilityAfter: number;
  standardErrorBefore: number;
  standardErrorAfter: number;
}

export interface CATSettings {
  maxQuestions: number;
  minQuestions: number;
  targetPrecision: number; // Standard error threshold
  startingAbility: number;
  terminationCriteria: {
    maxQuestions: boolean;
    precisionMet: boolean;
    timeLimit?: number;
  };
}

export class CATService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Initialize a new CAT session
   */
  async initializeSession(
    studentId: string,
    activityId: string,
    settings: CATSettings
  ): Promise<CATSession> {
    const session: CATSession = {
      id: `cat_${activityId}_${studentId}_${Date.now()}`,
      studentId,
      activityId,
      abilityEstimate: settings.startingAbility,
      standardError: 1.0, // Initial high uncertainty
      questionsAnswered: 0,
      responses: [],
      isTerminated: false
    };

    return session;
  }

  /**
   * Select the next optimal question using IRT
   */
  async selectNextQuestion(
    session: CATSession,
    availableQuestions: CATQuestion[]
  ): Promise<CATQuestion | null> {
    if (session.isTerminated) {
      return null;
    }

    // Filter out already answered questions
    const answeredQuestionIds = session.responses.map(r => r.questionId);
    const unansweredQuestions = availableQuestions.filter(
      q => !answeredQuestionIds.includes(q.id)
    );

    if (unansweredQuestions.length === 0) {
      return null;
    }

    // Find question with maximum information at current ability level
    let bestQuestion = unansweredQuestions[0];
    let maxInformation = this.calculateInformation(bestQuestion, session.abilityEstimate);

    for (const question of unansweredQuestions.slice(1)) {
      const information = this.calculateInformation(question, session.abilityEstimate);
      if (information > maxInformation) {
        maxInformation = information;
        bestQuestion = question;
      }
    }

    return bestQuestion;
  }

  /**
   * Process a student's response and update ability estimate
   */
  async processResponse(
    session: CATSession,
    questionId: string,
    answer: any,
    isCorrect: boolean,
    responseTime: number,
    question: CATQuestion
  ): Promise<CATSession> {
    const abilityBefore = session.abilityEstimate;
    const standardErrorBefore = session.standardError;

    // Update ability estimate using Maximum Likelihood Estimation (MLE)
    const newAbility = this.updateAbilityEstimate(
      session.abilityEstimate,
      question,
      isCorrect
    );

    // Update standard error
    const newStandardError = this.updateStandardError(
      session.standardError,
      question,
      newAbility
    );

    // Create response record
    const response: CATResponse = {
      questionId,
      answer,
      isCorrect,
      responseTime,
      abilityBefore,
      abilityAfter: newAbility,
      standardErrorBefore,
      standardErrorAfter: newStandardError
    };

    // Update session
    const updatedSession: CATSession = {
      ...session,
      abilityEstimate: newAbility,
      standardError: newStandardError,
      questionsAnswered: session.questionsAnswered + 1,
      responses: [...session.responses, response]
    };

    return updatedSession;
  }

  /**
   * Check if CAT session should terminate
   */
  shouldTerminate(session: CATSession, settings: CATSettings): boolean {
    // Check minimum questions requirement
    if (session.questionsAnswered < settings.minQuestions) {
      return false;
    }

    // Check maximum questions limit
    if (session.questionsAnswered >= settings.maxQuestions) {
      return true;
    }

    // Check precision criterion
    if (session.standardError <= settings.targetPrecision) {
      return true;
    }

    return false;
  }

  /**
   * Calculate Fisher Information for a question at given ability level
   */
  private calculateInformation(question: CATQuestion, ability: number): number {
    const { difficulty, discrimination, guessing } = question;
    
    // 3PL IRT model probability
    const probability = this.calculateProbability(question, ability);
    
    // Fisher Information formula for 3PL model
    const numerator = Math.pow(discrimination, 2) * Math.pow(probability - guessing, 2);
    const denominator = probability * (1 - probability) * Math.pow(1 - guessing, 2);
    
    return numerator / denominator;
  }

  /**
   * Calculate probability of correct response using 3PL IRT model
   */
  private calculateProbability(question: CATQuestion, ability: number): number {
    const { difficulty, discrimination, guessing } = question;
    
    const exponent = discrimination * (ability - difficulty);
    const probability = guessing + (1 - guessing) / (1 + Math.exp(-exponent));
    
    return Math.max(0.001, Math.min(0.999, probability)); // Bound between 0.001 and 0.999
  }

  /**
   * Update ability estimate using Maximum Likelihood Estimation
   */
  private updateAbilityEstimate(
    currentAbility: number,
    question: CATQuestion,
    isCorrect: boolean
  ): number {
    const learningRate = 0.3; // Adaptive learning rate
    const probability = this.calculateProbability(question, currentAbility);
    
    // Gradient of log-likelihood
    const gradient = question.discrimination * (
      (isCorrect ? 1 : 0) - probability
    );
    
    // Update ability with bounded result
    const newAbility = currentAbility + learningRate * gradient;
    return Math.max(-4, Math.min(4, newAbility)); // Bound ability between -4 and +4
  }

  /**
   * Update standard error of ability estimate
   */
  private updateStandardError(
    currentStandardError: number,
    question: CATQuestion,
    newAbility: number
  ): number {
    const information = this.calculateInformation(question, newAbility);
    const newVariance = 1 / (1 / Math.pow(currentStandardError, 2) + information);
    
    return Math.sqrt(newVariance);
  }

  /**
   * Get final ability score and confidence interval
   */
  getFinalScore(session: CATSession): {
    ability: number;
    standardError: number;
    confidenceInterval: { lower: number; upper: number };
    reliability: number;
  } {
    const confidenceLevel = 1.96; // 95% confidence interval
    
    return {
      ability: session.abilityEstimate,
      standardError: session.standardError,
      confidenceInterval: {
        lower: session.abilityEstimate - confidenceLevel * session.standardError,
        upper: session.abilityEstimate + confidenceLevel * session.standardError
      },
      reliability: 1 - Math.pow(session.standardError, 2)
    };
  }

  /**
   * Convert ability estimate to percentage score
   */
  abilityToPercentage(ability: number): number {
    // Convert ability (-4 to +4) to percentage (0 to 100)
    // Using logistic transformation
    const normalized = (ability + 4) / 8; // Normalize to 0-1
    return Math.round(normalized * 100);
  }

  /**
   * Generate CAT performance report
   */
  generateReport(session: CATSession): {
    summary: any;
    questionAnalysis: any[];
    recommendations: string[];
  } {
    const finalScore = this.getFinalScore(session);
    const percentageScore = this.abilityToPercentage(session.abilityEstimate);
    
    return {
      summary: {
        questionsAnswered: session.questionsAnswered,
        finalAbility: session.abilityEstimate,
        percentageScore,
        standardError: session.standardError,
        reliability: finalScore.reliability,
        confidenceInterval: finalScore.confidenceInterval
      },
      questionAnalysis: session.responses.map(response => ({
        questionId: response.questionId,
        isCorrect: response.isCorrect,
        responseTime: response.responseTime,
        abilityChange: response.abilityAfter - response.abilityBefore,
        informationGained: 1 / Math.pow(response.standardErrorAfter, 2) - 
                          1 / Math.pow(response.standardErrorBefore, 2)
      })),
      recommendations: this.generateRecommendations(session)
    };
  }

  /**
   * Generate personalized learning recommendations
   */
  private generateRecommendations(session: CATSession): string[] {
    const recommendations: string[] = [];
    const ability = session.abilityEstimate;
    
    if (ability < -1) {
      recommendations.push('Focus on fundamental concepts and basic practice problems');
      recommendations.push('Consider reviewing prerequisite topics');
    } else if (ability < 0) {
      recommendations.push('Practice with moderate difficulty problems');
      recommendations.push('Review areas where you struggled');
    } else if (ability < 1) {
      recommendations.push('Challenge yourself with more advanced problems');
      recommendations.push('Explore applications of the concepts');
    } else {
      recommendations.push('Excellent performance! Consider helping peers or exploring advanced topics');
      recommendations.push('Look into real-world applications and research');
    }
    
    return recommendations;
  }
}
