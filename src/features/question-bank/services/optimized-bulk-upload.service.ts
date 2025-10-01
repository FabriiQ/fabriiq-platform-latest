/**
 * Optimized Bulk Upload Service for Large Question Datasets
 * Handles 100,000+ questions efficiently with batch processing, memory optimization, and progress tracking
 */

import { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { SystemStatus, DifficultyLevel } from '@/features/question-bank/models/types';
import { toPrismaSystemStatus } from '@/lib/utils/enum-converters';

interface OptimizedBulkUploadInput {
  questionBankId: string;
  questions: any[];
  validateOnly?: boolean;
  batchSize?: number;
  maxConcurrency?: number;
}

interface BulkUploadProgress {
  processed: number;
  total: number;
  successful: number;
  failed: number;
  currentBatch: number;
  totalBatches: number;
  estimatedTimeRemaining?: number;
  memoryUsage?: number;
}

interface BulkUploadResult {
  total: number;
  successful: number;
  failed: number;
  errors: { index: number; message: string; row?: number }[];
  processingTime: number;
  averageQuestionsPerSecond: number;
}

export class OptimizedBulkUploadService {
  private prisma: PrismaClient;
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_MAX_CONCURRENCY = 5;
  private readonly PROGRESS_REPORT_INTERVAL = 50;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Optimized bulk upload with batch processing and memory management
   */
  async bulkUploadQuestions(
    input: OptimizedBulkUploadInput,
    userId: string,
    onProgress?: (progress: BulkUploadProgress) => void
  ): Promise<BulkUploadResult> {
    const startTime = Date.now();
    const { questionBankId, questions, validateOnly = false } = input;
    const batchSize = input.batchSize || this.DEFAULT_BATCH_SIZE;
    const maxConcurrency = input.maxConcurrency || this.DEFAULT_MAX_CONCURRENCY;

    const results: BulkUploadResult = {
      total: questions.length,
      successful: 0,
      failed: 0,
      errors: [],
      processingTime: 0,
      averageQuestionsPerSecond: 0
    };

    try {
      console.log(`🚀 Starting optimized bulk upload: ${questions.length.toLocaleString()} questions`);
      console.log(`📊 Configuration: Batch size: ${batchSize}, Max concurrency: ${maxConcurrency}`);

      // Validate question bank exists
      const questionBank = await this.validateQuestionBank(questionBankId);
      
      // Pre-cache subject and topic data for faster lookups
      const { subjectCache, topicCache, courseCache } = await this.buildLookupCaches();
      
      // Split questions into batches
      const batches = this.createBatches(questions, batchSize);
      const totalBatches = batches.length;
      
      console.log(`📦 Created ${totalBatches} batches for processing`);

      // Process batches with controlled concurrency
      let processed = 0;
      let currentBatch = 0;

      for (let i = 0; i < batches.length; i += maxConcurrency) {
        const batchGroup = batches.slice(i, i + maxConcurrency);
        
        // Process batch group concurrently
        const batchPromises = batchGroup.map(async (batch, batchIndex) => {
          const actualBatchIndex = i + batchIndex;
          return this.processBatch(
            batch,
            actualBatchIndex,
            questionBankId,
            userId,
            validateOnly,
            questionBank.institutionId,
            subjectCache,
            topicCache,
            courseCache
          );
        });

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Aggregate results
        for (const [batchIndex, result] of batchResults.entries()) {
          currentBatch = i + batchIndex + 1;
          
          if (result.status === 'fulfilled') {
            results.successful += result.value.successful;
            results.failed += result.value.failed;
            results.errors.push(...result.value.errors);
          } else {
            // Handle batch failure
            const batchSize = batchGroup[batchIndex]?.length || 0;
            results.failed += batchSize;
            results.errors.push({
              index: -1,
              message: `Batch ${currentBatch} failed: ${result.reason}`,
              row: i * this.DEFAULT_BATCH_SIZE + batchIndex * batchSize
            });
          }
          
          processed += batchGroup[batchIndex]?.length || 0;
          
          // Report progress
          if (onProgress && (processed % this.PROGRESS_REPORT_INTERVAL === 0 || currentBatch === totalBatches)) {
            const progress: BulkUploadProgress = {
              processed,
              total: questions.length,
              successful: results.successful,
              failed: results.failed,
              currentBatch,
              totalBatches,
              estimatedTimeRemaining: this.calculateETA(startTime, processed, questions.length),
              memoryUsage: this.getMemoryUsage()
            };
            
            onProgress(progress);
          }
        }

        // Memory management: force garbage collection between batch groups
        if (global.gc && currentBatch % 10 === 0) {
          global.gc();
        }

        // Small delay to prevent overwhelming the database
        if (i + maxConcurrency < batches.length) {
          await this.delay(50);
        }
      }

      // Calculate final metrics
      const processingTime = Date.now() - startTime;
      results.processingTime = processingTime;
      results.averageQuestionsPerSecond = Math.round((results.successful / processingTime) * 1000);

      console.log(`✅ Bulk upload completed in ${(processingTime / 1000).toFixed(2)}s`);
      console.log(`📊 Results: ${results.successful.toLocaleString()} successful, ${results.failed.toLocaleString()} failed`);
      console.log(`⚡ Average speed: ${results.averageQuestionsPerSecond.toLocaleString()} questions/second`);

      return results;

    } catch (error) {
      console.error('❌ Critical error in bulk upload:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to bulk upload questions',
        cause: error,
      });
    }
  }

  /**
   * Validate question bank exists and return metadata
   */
  private async validateQuestionBank(questionBankId: string) {
    const questionBank = await this.prisma.questionBank.findUnique({
      where: { id: questionBankId, status: toPrismaSystemStatus(SystemStatus.ACTIVE) },
      include: {
        institution: {
          select: { id: true, name: true }
        }
      }
    });

    if (!questionBank) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Question bank not found',
      });
    }

    return questionBank;
  }

  /**
   * Build lookup caches for subjects, topics, and courses
   */
  private async buildLookupCaches() {
    console.log('🔍 Building lookup caches...');
    
    const [subjects, topics, courses] = await Promise.all([
      this.prisma.subject.findMany({
        select: { id: true, name: true, code: true, courseId: true }
      }),
      this.prisma.subjectTopic.findMany({
        select: { id: true, code: true, title: true, subjectId: true }
      }),
      this.prisma.course.findMany({
        select: { id: true, name: true, code: true }
      })
    ]);

    const subjectCache = new Map();
    const topicCache = new Map();
    const courseCache = new Map();

    // Build subject cache with multiple lookup keys
    subjects.forEach(subject => {
      subjectCache.set(subject.id, subject);
      subjectCache.set(subject.name.toLowerCase(), subject);
      subjectCache.set(subject.code.toLowerCase(), subject);
    });

    // Build topic cache
    topics.forEach(topic => {
      topicCache.set(topic.id, topic);
      topicCache.set(`${topic.subjectId}-${topic.code}`, topic);
      topicCache.set(`${topic.subjectId}-${topic.title.toLowerCase()}`, topic);
    });

    // Build course cache
    courses.forEach(course => {
      courseCache.set(course.id, course);
      courseCache.set(course.code.toLowerCase(), course);
    });

    console.log(`📚 Cached ${subjects.length} subjects, ${topics.length} topics, ${courses.length} courses`);
    
    return { subjectCache, topicCache, courseCache };
  }

  /**
   * Create batches from questions array
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a single batch of questions
   */
  private async processBatch(
    questions: any[],
    batchIndex: number,
    questionBankId: string,
    userId: string,
    validateOnly: boolean,
    institutionId: string,
    subjectCache: Map<string, any>,
    topicCache: Map<string, any>,
    courseCache: Map<string, any>
  ) {
    const batchResults = {
      successful: 0,
      failed: 0,
      errors: [] as { index: number; message: string; row?: number }[]
    };

    console.log(`📦 Processing batch ${batchIndex + 1} (${questions.length} questions)`);

    if (validateOnly) {
      // Fast validation mode
      for (const [questionIndex, question] of questions.entries()) {
        try {
          await this.validateQuestion(question, subjectCache, topicCache, courseCache);
          batchResults.successful++;
        } catch (error) {
          batchResults.failed++;
          batchResults.errors.push({
            index: batchIndex * this.DEFAULT_BATCH_SIZE + questionIndex,
            message: error instanceof Error ? error.message : String(error),
            row: batchIndex * this.DEFAULT_BATCH_SIZE + questionIndex + 2 // +2 for header and 1-based indexing
          });
        }
      }
      return batchResults;
    }

    // Prepare batch data for database insertion
    const questionsToCreate = [];
    const usageStatsToCreate = [];
    const categoryMappingsToCreate = [];

    for (const [questionIndex, question] of questions.entries()) {
      try {
        const validatedQuestion = await this.validateAndPrepareQuestion(
          question,
          questionBankId,
          userId,
          institutionId,
          subjectCache,
          topicCache,
          courseCache
        );

        questionsToCreate.push(validatedQuestion);
        
        // Prepare usage stats
        usageStatsToCreate.push({
          questionId: validatedQuestion.id, // We'll need to get this after creation
        });

        // Prepare category mappings if any
        if (question.categoryIds && question.categoryIds.length > 0) {
          question.categoryIds.forEach((categoryId: string) => {
            categoryMappingsToCreate.push({
              questionId: validatedQuestion.id, // We'll need to get this after creation
              categoryId
            });
          });
        }

      } catch (error) {
        batchResults.failed++;
        batchResults.errors.push({
          index: batchIndex * this.DEFAULT_BATCH_SIZE + questionIndex,
          message: error instanceof Error ? error.message : String(error),
          row: batchIndex * this.DEFAULT_BATCH_SIZE + questionIndex + 2
        });
      }
    }

    // Batch insert questions using createMany for better performance
    if (questionsToCreate.length > 0) {
      try {
        await this.prisma.question.createMany({
          data: questionsToCreate,
          skipDuplicates: true
        });

        batchResults.successful += questionsToCreate.length;
        
        // Note: createMany doesn't return created records, so we can't easily create
        // usage stats and category mappings in the same transaction.
        // For maximum performance, we might skip these for bulk uploads
        // or handle them in a separate process.

      } catch (error) {
        console.error(`❌ Batch ${batchIndex + 1} database error:`, error);
        batchResults.failed += questionsToCreate.length;
        batchResults.errors.push({
          index: -1,
          message: `Database error for batch ${batchIndex + 1}: ${error}`,
          row: batchIndex * this.DEFAULT_BATCH_SIZE
        });
      }
    }

    return batchResults;
  }

  /**
   * Validate question data without database operations
   */
  private async validateQuestion(
    question: any,
    subjectCache: Map<string, any>,
    topicCache: Map<string, any>,
    courseCache: Map<string, any>
  ) {
    // Validate required fields
    if (!question.title || !question.questionType || !question.subjectId) {
      throw new Error('Missing required fields: title, questionType, or subjectId');
    }

    // Validate subject exists
    const subject = this.findInCache(subjectCache, question.subjectId);
    if (!subject) {
      throw new Error(`Subject "${question.subjectId}" not found`);
    }

    // Validate topic if provided
    if (question.topicId && question.topicId.trim() !== '') {
      const topic = topicCache.get(question.topicId);
      if (!topic) {
        throw new Error(`Topic "${question.topicId}" not found`);
      }
    }

    // Validate course if provided
    if (question.courseId && question.courseId.trim() !== '') {
      const course = courseCache.get(question.courseId);
      if (!course) {
        console.warn(`Course "${question.courseId}" not found, will use subject's course`);
      }
    }

    return true;
  }

  /**
   * Validate and prepare question for database insertion
   */
  private async validateAndPrepareQuestion(
    question: any,
    questionBankId: string,
    userId: string,
    institutionId: string,
    subjectCache: Map<string, any>,
    topicCache: Map<string, any>,
    courseCache: Map<string, any>
  ) {
    // Validate question
    await this.validateQuestion(question, subjectCache, topicCache, courseCache);

    // Resolve subject
    const subject = this.findInCache(subjectCache, question.subjectId);

    // Resolve course
    let validCourseId = subject.courseId; // Default to subject's course
    if (question.courseId && question.courseId.trim() !== '') {
      const course = courseCache.get(question.courseId.toLowerCase());
      if (course) {
        validCourseId = course.id;
      }
    }

    // Resolve topic
    let validTopicId = null;
    if (question.topicId && question.topicId.trim() !== '') {
      const topic = topicCache.get(question.topicId);
      if (topic) {
        validTopicId = topic.id;
      }
    }

    // Generate partition key
    const partitionKey = `inst_${institutionId}_grade_${question.gradeLevel || 0}_subj_${subject.id}`;

    // Generate unique ID for the question
    const questionId = this.generateQuestionId();

    return {
      id: questionId,
      questionBankId,
      title: question.title,
      questionType: question.questionType,
      difficulty: question.difficulty || DifficultyLevel.MEDIUM,
      content: question.content || {},
      subjectId: subject.id,
      courseId: validCourseId,
      topicId: validTopicId,
      gradeLevel: question.gradeLevel,
      sourceId: question.sourceId,
      sourceReference: question.sourceReference,
      year: question.year,
      bloomsLevel: question.bloomsLevel,
      learningOutcomeIds: question.learningOutcomeIds || [],
      metadata: {
        ...question.metadata || {},
        actionVerbs: question.actionVerbs || [],
      },
      status: toPrismaSystemStatus(SystemStatus.ACTIVE),
      partitionKey,
      createdById: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Find item in cache using multiple possible keys
   */
  private findInCache(cache: Map<string, any>, key: string): any {
    // Try exact match first
    let item = cache.get(key);
    if (item) return item;

    // Try lowercase match
    item = cache.get(key.toLowerCase());
    if (item) return item;

    // Try partial matches for names
    for (const [cacheKey, cacheValue] of cache.entries()) {
      if (typeof cacheKey === 'string' && cacheKey.includes(key.toLowerCase())) {
        return cacheValue;
      }
    }

    return null;
  }

  /**
   * Generate unique question ID
   */
  private generateQuestionId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate estimated time remaining
   */
  private calculateETA(startTime: number, processed: number, total: number): number {
    if (processed === 0) return 0;

    const elapsed = Date.now() - startTime;
    const rate = processed / elapsed;
    const remaining = total - processed;

    return Math.round(remaining / rate);
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024); // MB
    }
    return 0;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch create usage stats for questions (separate process for performance)
   */
  async createUsageStatsForQuestions(questionIds: string[]): Promise<void> {
    const batchSize = 1000;
    const batches = this.createBatches(questionIds, batchSize);

    for (const batch of batches) {
      const usageStatsData = batch.map(questionId => ({
        questionId,
        usageCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        partialCount: 0,
        averageTime: 0,
        difficultyRating: 0,
        lastUsedAt: new Date()
      }));

      await this.prisma.questionUsageStats.createMany({
        data: usageStatsData,
        skipDuplicates: true
      });
    }
  }

  /**
   * Get bulk upload statistics
   */
  async getBulkUploadStats(questionBankId: string) {
    const stats = await this.prisma.question.groupBy({
      by: ['difficulty', 'questionType', 'gradeLevel'],
      where: { questionBankId },
      _count: true
    });

    return {
      totalQuestions: stats.reduce((sum, stat) => sum + stat._count, 0),
      byDifficulty: stats.reduce((acc, stat) => {
        acc[stat.difficulty] = (acc[stat.difficulty] || 0) + stat._count;
        return acc;
      }, {} as Record<string, number>),
      byType: stats.reduce((acc, stat) => {
        acc[stat.questionType] = (acc[stat.questionType] || 0) + stat._count;
        return acc;
      }, {} as Record<string, number>),
      byGrade: stats.reduce((acc, stat) => {
        const grade = stat.gradeLevel || 0;
        acc[grade] = (acc[grade] || 0) + stat._count;
        return acc;
      }, {} as Record<number, number>)
    };
  }
}
