/**
 * Spaced Repetition System Service
 * 
 * Implements spaced repetition algorithms (SM-2, Anki, SuperMemo) to optimize
 * learning retention by scheduling review activities based on forgetting curves.
 */

import { PrismaClient, BloomsTaxonomyLevel } from '@prisma/client';
import { SpacedRepetitionSettings, QuizV2Question } from '../types';

export interface SpacedRepetitionCard {
  id: string;
  questionId: string;
  studentId: string;
  subjectId: string;
  
  // SM-2 Algorithm parameters
  easeFactor: number;      // 1.3 - 2.5 (default 2.5)
  interval: number;        // Days until next review
  repetitions: number;     // Number of successful repetitions
  
  // Scheduling
  nextReviewDate: Date;
  lastReviewDate?: Date;
  
  // Performance tracking
  totalReviews: number;
  correctReviews: number;
  averageResponseTime: number;
  
  // Learning state
  learningState: 'new' | 'learning' | 'review' | 'relearning' | 'graduated';
  lapseCount: number;      // Number of times forgotten
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewSession {
  id: string;
  studentId: string;
  activityId: string;
  cards: SpacedRepetitionCard[];
  currentCardIndex: number;
  startedAt: Date;
  completedAt?: Date;
  totalCards: number;
  correctAnswers: number;
  averageResponseTime: number;
}

export interface ReviewResult {
  cardId: string;
  questionId: string;
  isCorrect: boolean;
  responseTime: number;
  difficulty: 'again' | 'hard' | 'good' | 'easy'; // User-reported difficulty
  confidence: number; // 1-5 scale
}

export class SpacedRepetitionService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Initialize spaced repetition cards for new questions
   */
  async initializeCards(
    studentId: string,
    subjectId: string,
    questionIds: string[]
  ): Promise<SpacedRepetitionCard[]> {
    const cards: SpacedRepetitionCard[] = [];

    for (const questionId of questionIds) {
      // Check if card already exists
      // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
      // const existingCard = await this.prisma.spacedRepetitionCard.findUnique({
      //   where: {
      //     studentId_questionId: {
      //       studentId,
      //       questionId
      //     }
      //   }
      // });
      const existingCard = null; // Temporary fix

      if (!existingCard) {
        const card: SpacedRepetitionCard = {
          id: `sr_${studentId}_${questionId}_${Date.now()}`,
          questionId,
          studentId,
          subjectId,
          easeFactor: 2.5,
          interval: 1,
          repetitions: 0,
          nextReviewDate: new Date(), // Available immediately for first review
          totalReviews: 0,
          correctReviews: 0,
          averageResponseTime: 0,
          learningState: 'new',
          lapseCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        cards.push(card);
      }
    }

    // Save new cards to database
    if (cards.length > 0) {
      await this.saveCards(cards);
    }

    return cards;
  }

  /**
   * Get cards due for review for a student
   */
  async getCardsForReview(
    studentId: string,
    subjectId?: string,
    limit: number = 20
  ): Promise<SpacedRepetitionCard[]> {
    const whereClause: any = {
      studentId,
      nextReviewDate: {
        lte: new Date()
      }
    };

    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
    // const cards = await this.prisma.spacedRepetitionCard.findMany({
    //   where: whereClause,
    //   orderBy: [
    //     { learningState: 'asc' }, // Prioritize new cards
    //     { nextReviewDate: 'asc' } // Then by due date
    //   ],
    //   take: limit
    // });
    // return cards.map(this.mapPrismaCardToCard);

    // Temporary fix - return empty array
    return [];
  }

  /**
   * Create a review session for a student
   */
  async createReviewSession(
    studentId: string,
    activityId: string,
    maxCards: number = 20
  ): Promise<ReviewSession> {
    // Get activity details to determine subject
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { subjectId: true }
    });

    if (!activity) {
      throw new Error(`Activity ${activityId} not found`);
    }

    // Get cards due for review
    const cards = await this.getCardsForReview(studentId, activity.subjectId, maxCards);

    const session: ReviewSession = {
      id: `review_${studentId}_${activityId}_${Date.now()}`,
      studentId,
      activityId,
      cards,
      currentCardIndex: 0,
      startedAt: new Date(),
      totalCards: cards.length,
      correctAnswers: 0,
      averageResponseTime: 0
    };

    return session;
  }

  /**
   * Process a review result and update the card using spaced repetition algorithm
   */
  async processReviewResult(
    cardId: string,
    result: ReviewResult,
    algorithm: SpacedRepetitionSettings['algorithm'] = 'sm2'
  ): Promise<SpacedRepetitionCard> {
    const card = await this.getCard(cardId);
    if (!card) {
      throw new Error(`Card ${cardId} not found`);
    }

    // Update performance statistics
    card.totalReviews++;
    if (result.isCorrect) {
      card.correctReviews++;
    }
    
    // Update average response time
    card.averageResponseTime = (
      (card.averageResponseTime * (card.totalReviews - 1)) + result.responseTime
    ) / card.totalReviews;

    // Apply spaced repetition algorithm
    switch (algorithm) {
      case 'sm2':
        this.applySM2Algorithm(card, result);
        break;
      case 'anki':
        this.applyAnkiAlgorithm(card, result);
        break;
      case 'supermemo':
        this.applySuperMemoAlgorithm(card, result);
        break;
      default:
        this.applySM2Algorithm(card, result);
    }

    card.lastReviewDate = new Date();
    card.updatedAt = new Date();

    // Save updated card
    await this.saveCard(card);

    return card;
  }

  /**
   * Get learning statistics for a student
   */
  async getLearningStatistics(studentId: string, subjectId?: string): Promise<{
    totalCards: number;
    newCards: number;
    learningCards: number;
    reviewCards: number;
    graduatedCards: number;
    dueCards: number;
    averageEaseFactor: number;
    averageInterval: number;
    retentionRate: number;
  }> {
    const whereClause: any = { studentId };
    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
    // const cards = await this.prisma.spacedRepetitionCard.findMany({
    //   where: whereClause
    // });
    // const mappedCards = cards.map(this.mapPrismaCardToCard);

    // Temporary fix - return empty array
    const mappedCards: SpacedRepetitionCard[] = [];
    const now = new Date();

    const stats = {
      totalCards: mappedCards.length,
      newCards: mappedCards.filter(c => c.learningState === 'new').length,
      learningCards: mappedCards.filter(c => c.learningState === 'learning').length,
      reviewCards: mappedCards.filter(c => c.learningState === 'review').length,
      graduatedCards: mappedCards.filter(c => c.learningState === 'graduated').length,
      dueCards: mappedCards.filter(c => c.nextReviewDate <= now).length,
      averageEaseFactor: mappedCards.reduce((sum, c) => sum + c.easeFactor, 0) / mappedCards.length || 2.5,
      averageInterval: mappedCards.reduce((sum, c) => sum + c.interval, 0) / mappedCards.length || 1,
      retentionRate: mappedCards.reduce((sum, c) => sum + (c.totalReviews > 0 ? c.correctReviews / c.totalReviews : 0), 0) / mappedCards.length || 0
    };

    return stats;
  }

  /**
   * Generate personalized review schedule
   */
  async generateReviewSchedule(
    studentId: string,
    days: number = 7,
    subjectId?: string
  ): Promise<Array<{ date: Date; cardCount: number; estimatedTime: number }>> {
    const whereClause: any = { studentId };
    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
    // const cards = await this.prisma.spacedRepetitionCard.findMany({
    //   where: whereClause
    // });
    // const mappedCards = cards.map(this.mapPrismaCardToCard);

    // Temporary fix - return empty array
    const mappedCards: SpacedRepetitionCard[] = [];
    const schedule: Array<{ date: Date; cardCount: number; estimatedTime: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const cardsForDay = mappedCards.filter((card: SpacedRepetitionCard) =>
        card.nextReviewDate >= date && card.nextReviewDate < nextDay
      );

      const estimatedTime = cardsForDay.length * 30; // 30 seconds per card average

      schedule.push({
        date,
        cardCount: cardsForDay.length,
        estimatedTime
      });
    }

    return schedule;
  }

  // Private helper methods

  private applySM2Algorithm(card: SpacedRepetitionCard, result: ReviewResult): void {
    if (result.isCorrect && result.difficulty !== 'again') {
      // Correct answer
      if (card.repetitions === 0) {
        card.interval = 1;
      } else if (card.repetitions === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      
      card.repetitions++;
      card.learningState = card.repetitions >= 2 ? 'review' : 'learning';
    } else {
      // Incorrect answer or marked as "again"
      card.repetitions = 0;
      card.interval = 1;
      card.lapseCount++;
      card.learningState = 'relearning';
    }

    // Update ease factor based on difficulty
    const difficultyMap = { again: 0, hard: 1, good: 2, easy: 3 };
    const q = difficultyMap[result.difficulty] ?? 2;
    
    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02)));

    // Set next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + card.interval);
    card.nextReviewDate = nextReview;
  }

  private applyAnkiAlgorithm(card: SpacedRepetitionCard, result: ReviewResult): void {
    // Anki algorithm (simplified version)
    const difficultyMultipliers = { again: 0, hard: 1.2, good: 2.5, easy: 4.0 };
    const multiplier = difficultyMultipliers[result.difficulty] ?? 2.5;

    if (result.isCorrect && result.difficulty !== 'again') {
      if (card.learningState === 'new' || card.learningState === 'learning') {
        // Learning phase
        const learningSteps = [1, 10]; // 1 minute, 10 minutes (in days for simplicity)
        if (card.repetitions < learningSteps.length) {
          card.interval = learningSteps[card.repetitions] / (24 * 60); // Convert to days
        } else {
          card.interval = 1; // Graduate to 1 day
          card.learningState = 'review';
        }
      } else {
        // Review phase
        card.interval = Math.round(card.interval * multiplier);
      }
      
      card.repetitions++;
    } else {
      // Lapse
      card.repetitions = 0;
      card.interval = 1;
      card.lapseCount++;
      card.learningState = 'relearning';
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    }

    // Set next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.max(1, card.interval));
    card.nextReviewDate = nextReview;
  }

  private applySuperMemoAlgorithm(card: SpacedRepetitionCard, result: ReviewResult): void {
    // SuperMemo algorithm (simplified SM-2 variant)
    const grade = result.isCorrect ? (result.difficulty === 'easy' ? 5 : result.difficulty === 'good' ? 4 : 3) : 2;

    if (grade >= 3) {
      if (card.repetitions === 0) {
        card.interval = 1;
      } else if (card.repetitions === 1) {
        card.interval = 6;
      } else {
        card.interval = Math.round(card.interval * card.easeFactor);
      }
      card.repetitions++;
    } else {
      card.repetitions = 0;
      card.interval = 1;
      card.lapseCount++;
    }

    // Update ease factor
    card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

    // Update learning state
    if (card.repetitions >= 2 && card.interval >= 21) {
      card.learningState = 'graduated';
    } else if (card.repetitions >= 1) {
      card.learningState = 'review';
    } else {
      card.learningState = grade >= 3 ? 'learning' : 'relearning';
    }

    // Set next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + card.interval);
    card.nextReviewDate = nextReview;
  }

  private async getCard(cardId: string): Promise<SpacedRepetitionCard | null> {
    // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
    // const card = await this.prisma.spacedRepetitionCard.findUnique({
    //   where: { id: cardId }
    // });
    // return card ? this.mapPrismaCardToCard(card) : null;

    // Temporary fix - return null
    return null;
  }

  private async saveCard(card: SpacedRepetitionCard): Promise<void> {
    // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
    // await this.prisma.spacedRepetitionCard.upsert({
    //   where: { id: card.id },
    //   update: {
    //     easeFactor: card.easeFactor,
    //     interval: card.interval,
    //     repetitions: card.repetitions,
    //     nextReviewDate: card.nextReviewDate,
    //     lastReviewDate: card.lastReviewDate,
    //     totalReviews: card.totalReviews,
    //     correctReviews: card.correctReviews,
    //     averageResponseTime: card.averageResponseTime,
    //     learningState: card.learningState,
    //     lapseCount: card.lapseCount,
    //     updatedAt: card.updatedAt
    //   },
    //   create: {
    //     id: card.id,
    //     questionId: card.questionId,
    //     studentId: card.studentId,
    //     subjectId: card.subjectId,
    //     easeFactor: card.easeFactor,
    //     interval: card.interval,
    //     repetitions: card.repetitions,
    //     nextReviewDate: card.nextReviewDate,
    //     lastReviewDate: card.lastReviewDate,
    //     totalReviews: card.totalReviews,
    //     correctReviews: card.correctReviews,
    //     averageResponseTime: card.averageResponseTime,
    //     learningState: card.learningState,
    //     lapseCount: card.lapseCount,
    //     createdAt: card.createdAt,
    //     updatedAt: card.updatedAt
    //   }
    // });

    // Temporary fix - do nothing
    console.log('SpacedRepetitionCard save skipped - model not in schema:', card.id);
  }

  private async saveCards(cards: SpacedRepetitionCard[]): Promise<void> {
    for (const card of cards) {
      await this.saveCard(card);
    }
  }

  // TODO: Uncomment when SpacedRepetitionCard model is added to main Prisma schema
  // private mapPrismaCardToCard(prismaCard: any): SpacedRepetitionCard {
  //   return {
  //     id: prismaCard.id,
  //     questionId: prismaCard.questionId,
  //     studentId: prismaCard.studentId,
  //     subjectId: prismaCard.subjectId,
  //     easeFactor: prismaCard.easeFactor,
  //     interval: prismaCard.interval,
  //     repetitions: prismaCard.repetitions,
  //     nextReviewDate: prismaCard.nextReviewDate,
  //     lastReviewDate: prismaCard.lastReviewDate,
  //     totalReviews: prismaCard.totalReviews,
  //     correctReviews: prismaCard.correctReviews,
  //     averageResponseTime: prismaCard.averageResponseTime,
  //     learningState: prismaCard.learningState,
  //     lapseCount: prismaCard.lapseCount,
  //     createdAt: prismaCard.createdAt,
  //     updatedAt: prismaCard.updatedAt
  //   };
  // }
}
