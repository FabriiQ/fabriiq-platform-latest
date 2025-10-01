/**
 * Question Bank Service
 *
 * This service provides the business logic for the question bank feature.
 * It handles operations like creating, updating, and retrieving questions,
 * as well as bulk operations and integration with other system components.
 */

import { PrismaClient, SystemStatus as PrismaSystemStatus, DifficultyLevel, QuestionType, BloomsTaxonomyLevel } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import {
  CreateQuestionBankInput,
  CreateQuestionInput,
  BulkUploadInput,
  GetQuestionsInput,
  SystemStatus
} from '../models/types';
import { toPrismaSystemStatus } from '../utils/enum-converters';

export class QuestionBankService {
  constructor(private prisma: PrismaClient) {
    // No custom model initialization needed - using standard Prisma models
  }

  /**
   * Create a new question bank
   */
  async createQuestionBank(input: CreateQuestionBankInput, userId: string) {
    try {
      // Generate partition key
      const partitionKey = `inst_${input.institutionId}`;

      // Create the question bank using standard Prisma model
      const questionBank = await this.prisma.questionBank.create({
        data: {
          name: input.name,
          description: input.description,
          institutionId: input.institutionId,
          status: toPrismaSystemStatus(SystemStatus.ACTIVE),
          partitionKey,
          createdById: userId,
        },
      });

      return questionBank;
    } catch (error) {
      console.error('Error creating question bank:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create question bank',
        cause: error,
      });
    }
  }

  /**
   * Create a new question
   */
  async createQuestion(input: CreateQuestionInput, userId: string) {
    try {
      // Validate question bank exists
      const questionBank = await this.prisma.questionBank.findUnique({
        where: {
          id: input.questionBankId,
          status: toPrismaSystemStatus(SystemStatus.ACTIVE)
        },
      });

      if (!questionBank) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question bank not found',
        });
      }

      // Generate partition key
      const partitionKey = `inst_${questionBank.institutionId}_grade_${input.gradeLevel || 0}_subj_${input.subjectId}`;

      // Create the question
      const question = await this.prisma.question.create({
        data: {
          questionBankId: input.questionBankId,
          title: input.title,
          questionType: input.questionType,
          difficulty: input.difficulty || DifficultyLevel.MEDIUM,
          content: input.content as any,
          subjectId: input.subjectId,
          courseId: input.courseId,
          topicId: input.topicId,
          gradeLevel: input.gradeLevel,
          sourceId: input.sourceId,
          sourceReference: input.sourceReference,
          year: input.year,
          // ✅ NEW: Include Bloom's taxonomy fields
          bloomsLevel: input.bloomsLevel,
          learningOutcomeIds: input.learningOutcomeIds || [],
          metadata: {
            ...input.metadata || {},
            actionVerbs: input.actionVerbs || [],
          },
          status: toPrismaSystemStatus(SystemStatus.ACTIVE),
          partitionKey,
          createdById: userId,
        },
      });

      // Create category mappings if provided
      if (input.categoryIds && input.categoryIds.length > 0) {
        await Promise.all(
          input.categoryIds.map((categoryId) =>
            this.prisma.questionCategoryMapping.create({
              data: {
                questionId: question.id,
                categoryId,
              },
            })
          )
        );
      }

      // Initialize usage stats
      await this.prisma.questionUsageStats.create({
        data: {
          questionId: question.id,
        },
      });

      return question;
    } catch (error) {
      console.error('Error creating question:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create question',
        cause: error,
      });
    }
  }

  /**
   * Bulk upload questions with real-time progress tracking
   */
  async bulkUploadQuestions(input: BulkUploadInput, userId: string, onProgress?: (progress: { processed: number; total: number; successful: number; failed: number }) => void) {
    const { questionBankId, questions, validateOnly = false } = input;
    const results = {
      total: questions.length,
      successful: 0,
      failed: 0,
      errors: [] as { index: number; message: string }[],
    };

    try {
      // Validate question bank exists and get institution info
      const questionBank = await this.prisma.questionBank.findUnique({
        where: { id: questionBankId, status: toPrismaSystemStatus(SystemStatus.ACTIVE) },
        include: {
          institution: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!questionBank) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question bank not found',
        });
      }

      console.log(`Starting bulk upload for question bank: ${questionBank.name} (Institution: ${questionBank.institution?.name})`);
      console.log(`Total questions to process: ${questions.length}, Validate only: ${validateOnly}`);

      // Process questions individually for better error handling and progress tracking
      let processed = 0;

      for (const [index, question] of questions.entries()) {
        try {
          // Report progress
          if (onProgress && processed % 10 === 0) {
            onProgress({
              processed,
              total: questions.length,
              successful: results.successful,
              failed: results.failed
            });
          }

          // If validateOnly is true, just count as successful
          if (validateOnly) {
            results.successful++;
            processed++;
            continue;
          }

          // Generate partition key using institution ID from question bank
          const partitionKey = `inst_${questionBank.institutionId}_grade_${question.gradeLevel || 0}_subj_${question.subjectId}`;

          console.log(`Processing question ${index + 1}/${questions.length}: "${question.title}" (Partition: ${partitionKey})`);

          // Validate and resolve subjectId - handle both ID and name/code
          let validSubjectId = question.subjectId;

          // First try to find by exact ID
          let subjectExists = await this.prisma.subject.findUnique({
            where: { id: question.subjectId },
            select: { id: true, name: true, courseId: true }
          });

          // If not found by ID, try to find by name or code
          if (!subjectExists) {
            subjectExists = await this.prisma.subject.findFirst({
              where: {
                OR: [
                  { name: { contains: question.subjectId, mode: 'insensitive' } },
                  { code: { contains: question.subjectId, mode: 'insensitive' } }
                ]
              },
              select: { id: true, name: true, courseId: true }
            });

            if (subjectExists) {
              validSubjectId = subjectExists.id;
              console.log(`Resolved subject "${question.subjectId}" to "${subjectExists.name}" (${subjectExists.id})`);
            }
          }

          if (!subjectExists) {
            throw new Error(`Subject "${question.subjectId}" not found. Please use a valid subject ID, name, or code.`);
          }

          // Use the subject's courseId if no courseId provided in CSV
          let validCourseId: string | null = null;
          if (question.courseId && question.courseId.trim() !== '') {
            const courseExists = await this.prisma.course.findUnique({
              where: { id: question.courseId },
              select: { id: true }
            });

            if (courseExists) {
              validCourseId = question.courseId;
            } else {
              console.warn(`Course ID ${question.courseId} not found, using subject's course instead`);
              validCourseId = subjectExists.courseId;
            }
          } else {
            // Use the subject's associated course
            validCourseId = subjectExists.courseId;
          }

          // Validate topicId exists if provided
          let validTopicId: string | null = null;
          if (question.topicId && question.topicId.trim() !== '') {
            const topicExists = await this.prisma.subjectTopic.findUnique({
              where: { id: question.topicId },
              select: { id: true }
            });

            if (topicExists) {
              validTopicId = question.topicId;
            } else {
              console.warn(`Topic ID ${question.topicId} not found, skipping topicId for question: ${question.title}`);
            }
          }

          // Create the question with proper error handling
          const createdQuestion = await this.prisma.question.create({
            data: {
              questionBankId,
              title: question.title,
              questionType: question.questionType as any,
              difficulty: (question.difficulty || DifficultyLevel.MEDIUM) as any,
              content: question.content as any,
              subjectId: validSubjectId,
              courseId: validCourseId, // Only set if valid
              topicId: validTopicId,   // Only set if valid
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
            },
          });

          console.log(`Successfully created question: ${createdQuestion.id}`);

          // Create category mappings if provided
          if (question.categoryIds && question.categoryIds.length > 0) {
            await Promise.all(
              question.categoryIds.map((categoryId) =>
                this.prisma.questionCategoryMapping.create({
                  data: {
                    questionId: createdQuestion.id,
                    categoryId,
                  },
                })
              )
            );
          }

          // Initialize usage stats
          await this.prisma.questionUsageStats.create({
            data: {
              questionId: createdQuestion.id,
            },
          });

          results.successful++;
          console.log(`Question ${index + 1} processed successfully`);

        } catch (error) {
          console.error(`Error processing question ${index + 1}:`, error);
          results.failed++;
          results.errors.push({
            index: index,
            message: error instanceof Error ? error.message : String(error),
          });
        }

        processed++;
      }

      // Final progress report
      if (onProgress) {
        onProgress({
          processed: questions.length,
          total: questions.length,
          successful: results.successful,
          failed: results.failed
        });
      }

      console.log(`Bulk upload completed. Total: ${results.total}, Successful: ${results.successful}, Failed: ${results.failed}`);

      return results;
    } catch (error) {
      console.error('Error bulk uploading questions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to bulk upload questions',
        cause: error,
      });
    }
  }

  /**
   * Get multiple questions by IDs
   */
  async getQuestionsByIds(ids: string[]) {
    try {
      const questions = await this.prisma.question.findMany({
        where: {
          id: { in: ids },
          status: 'ACTIVE'
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          },
          topic: {
            select: {
              id: true,
              title: true,
            }
          },
          questionBank: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      return questions;
    } catch (error) {
      console.error('Error getting questions by IDs:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get questions by IDs',
        cause: error,
      });
    }
  }

  /**
   * Get a single question by ID
   */
  async getQuestion(id: string) {
    try {
      // @ts-ignore - Using the custom implementation
      const question = await this.prisma.question.findUnique({
        where: { id },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            }
          },
          topic: {
            select: {
              id: true,
              title: true,
            }
          },
          questionBank: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      if (!question) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        });
      }

      return question;
    } catch (error) {
      console.error('Error getting question:', error);
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get question',
        cause: error,
      });
    }
  }

  /**
   * Get questions with filtering and pagination
   */
  async getQuestions(input: GetQuestionsInput) {
    try {
      const { questionBankId, filters = {}, pagination = { page: 1, pageSize: 20 }, sorting = { field: 'createdAt', direction: 'desc' } } = input;

      // Build where clause
      const where: any = {
        questionBankId,
      };

      // Handle status filter using our utility function
      where.status = toPrismaSystemStatus(filters.status);

      // Add filters
      if (filters.questionType) {
        where.questionType = filters.questionType;
      }

      if (filters.difficulty) {
        where.difficulty = filters.difficulty;
      }

      if (filters.subjectId) {
        where.subjectId = filters.subjectId;
      }

      if (filters.courseId) {
        where.courseId = filters.courseId;
      }

      if (filters.topicId) {
        where.topicId = filters.topicId;
      }

      if (filters.gradeLevel) {
        where.gradeLevel = filters.gradeLevel;
      }

      if (filters.year) {
        where.year = filters.year;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { path: '$.text', string_contains: filters.search } },
        ];
      }

      // Add category filter if provided
      const include: any = {};
      if (filters.categoryId) {
        include.categories = {
          where: {
            categoryId: filters.categoryId,
          },
        };

        // Only include questions that have this category
        where.categories = {
          some: {
            categoryId: filters.categoryId,
          },
        };
      }

      // Get total count
      // @ts-ignore - Using the custom implementation
      const total = await this.prisma.question.count({ where });

      // Get questions
      // @ts-ignore - Using the custom implementation
      const questions = await this.prisma.question.findMany({
        where,
        include,
        orderBy: {
          [sorting.field]: sorting.direction,
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      });

      return {
        items: questions,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: total > pagination.page * pagination.pageSize,
      };
    } catch (error) {
      console.error('Error getting questions:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get questions',
        cause: error,
      });
    }
  }



  /**
   * Get a question bank by ID
   */
  async getQuestionBank(id: string) {
    try {
      console.log('getQuestionBank called with ID:', id);

      // Validate the ID first
      if (!id || typeof id !== 'string') {
        console.log('Invalid question bank ID provided:', id);
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid question bank ID',
        });
      }

      console.log('Searching for question bank with ID:', id);
      const questionBank = await this.prisma.questionBank.findUnique({
        where: { id },
        include: {
          questions: {
            take: 1,
            include: {
              course: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              },
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              }
            }
          }
        }
      });

      console.log('Question bank query result:', questionBank ? 'Found' : 'Not found');

      if (!questionBank) {
        console.log('Question bank not found for ID:', id);

        // Let's also check if there are any question banks in the database
        const totalBanks = await this.prisma.questionBank.count();
        console.log('Total question banks in database:', totalBanks);

        // List some existing question bank IDs for debugging
        const existingBanks = await this.prisma.questionBank.findMany({
          select: { id: true, name: true },
          take: 5
        });
        console.log('Sample existing question banks:', existingBanks);

        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question bank not found',
        });
      }

      console.log('Successfully found question bank:', questionBank.name);
      return questionBank;
    } catch (error) {
      console.error('Error getting question bank:', error);
      // If it's already a TRPC error, just rethrow it
      if (error instanceof TRPCError) {
        throw error;
      }
      // Otherwise, wrap it in a TRPC error
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get question bank',
        cause: error,
      });
    }
  }

  /**
   * Update a question
   */
  async updateQuestion(id: string, input: Partial<CreateQuestionInput>, userId: string) {
    try {
      // Get the current question
      // @ts-ignore - Using the custom implementation
      const currentQuestion = await this.prisma.question.findUnique({
        where: { id },
      });

      if (!currentQuestion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        });
      }

      // Create a version record (in a real implementation, you would have a QuestionVersion model)
      // await this.prisma.questionVersion.create({
      //   data: {
      //     questionId: id,
      //     versionNumber: await this.getNextVersionNumber(id),
      //     content: currentQuestion.content,
      //     metadata: currentQuestion.metadata,
      //     createdById: currentQuestion.createdById,
      //   },
      // });

      // Update the question
      // @ts-ignore - Using the custom implementation
      const updatedQuestion = await this.prisma.question.update({
        where: { id },
        data: {
          title: input.title,
          questionType: input.questionType as any,
          difficulty: input.difficulty as any,
          content: input.content as any,
          subjectId: input.subjectId,
          courseId: input.courseId,
          topicId: input.topicId,
          gradeLevel: input.gradeLevel,
          sourceId: input.sourceId,
          sourceReference: input.sourceReference,
          year: input.year,
          metadata: input.metadata,
          updatedById: userId,
        },
      });

      // Update category mappings if provided
      if (input.categoryIds) {
        // Delete existing mappings
        // @ts-ignore - Using the custom implementation
        await this.prisma.questionCategoryMapping.deleteMany({
          where: { questionId: id },
        });

        // Create new mappings
        if (input.categoryIds.length > 0) {
          await Promise.all(
            input.categoryIds.map((categoryId) =>
              // @ts-ignore - Using the custom implementation
              this.prisma.questionCategoryMapping.create({
                data: {
                  questionId: id,
                  categoryId,
                },
              })
            )
          );
        }
      }

      return updatedQuestion;
    } catch (error) {
      console.error('Error updating question:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update question',
        cause: error,
      });
    }
  }

  /**
   * Delete a question (soft delete)
   */
  async deleteQuestion(id: string) {
    try {
      // @ts-ignore - Using the custom implementation
      const question = await this.prisma.question.update({
        where: { id },
        data: {
          status: PrismaSystemStatus.DELETED,
        },
      });

      return question;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete question',
        cause: error,
      });
    }
  }

  /**
   * Duplicate a question
   */
  async duplicateQuestion(id: string, userId: string) {
    try {
      // Get the original question
      // @ts-ignore - Using the custom implementation
      const originalQuestion = await this.prisma.question.findUnique({
        where: { id },
        include: {
          categories: true,
        },
      });

      if (!originalQuestion) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question not found',
        });
      }

      // Create a new question with the same data
      // @ts-ignore - Using the custom implementation
      const duplicatedQuestion = await this.prisma.question.create({
        data: {
          questionBankId: originalQuestion.questionBankId,
          title: `${originalQuestion.title} (Copy)`,
          questionType: originalQuestion.questionType,
          difficulty: originalQuestion.difficulty,
          content: originalQuestion.content as any,
          subjectId: originalQuestion.subjectId,
          courseId: originalQuestion.courseId,
          topicId: originalQuestion.topicId,
          gradeLevel: originalQuestion.gradeLevel,
          sourceId: originalQuestion.sourceId,
          sourceReference: originalQuestion.sourceReference,
          year: originalQuestion.year,
          metadata: originalQuestion.metadata as any,
          status: PrismaSystemStatus.ACTIVE,
          partitionKey: originalQuestion.partitionKey,
          createdById: userId,
        },
      });

      // Duplicate category mappings if any
      if (originalQuestion.categories && originalQuestion.categories.length > 0) {
        await Promise.all(
          originalQuestion.categories.map((mapping) =>
            // @ts-ignore - Using the custom implementation
            this.prisma.questionCategoryMapping.create({
              data: {
                questionId: duplicatedQuestion.id,
                categoryId: mapping.categoryId,
              },
            })
          )
        );
      }

      // Initialize usage stats
      // @ts-ignore - Using the custom implementation
      await this.prisma.questionUsageStats.create({
        data: {
          questionId: duplicatedQuestion.id,
        },
      });

      return duplicatedQuestion;
    } catch (error) {
      console.error('Error duplicating question:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to duplicate question',
        cause: error,
      });
    }
  }

  /**
   * Get question banks with filtering and pagination
   */
  async getQuestionBanks(input: {
    filters?: {
      search?: string;
      status?: SystemStatus | string;
      institutionId?: string;
      courseId?: string;
      subjectId?: string;
    };
    pagination?: {
      page: number;
      pageSize: number;
    };
    sorting?: {
      field: string;
      direction: 'asc' | 'desc';
    };
  }) {
    try {
      console.log('getQuestionBanks input:', JSON.stringify(input, null, 2));

      // Add timeout protection to prevent long-running queries
      const startTime = Date.now();
      const QUERY_TIMEOUT = 30000; // 30 seconds

      const {
        filters = {},
        pagination = { page: 1, pageSize: 20 },
        sorting = { field: 'createdAt', direction: 'desc' }
      } = input;

      // Build where clause
      const where: any = {};

      // Handle status filter using our utility function
      if (filters.status) {
        console.log('Converting status:', filters.status);
        where.status = toPrismaSystemStatus(filters.status);
        console.log('Converted status:', where.status);
      } else {
        where.status = PrismaSystemStatus.ACTIVE;
      }

      // Add institution filter if provided
      if (filters.institutionId) {
        where.institutionId = filters.institutionId;
      }

      // Add course and subject filters if provided
      if (filters.courseId || filters.subjectId) {
        where.questions = {
          some: {
            ...(filters.courseId ? { courseId: filters.courseId } : {}),
            ...(filters.subjectId ? { subjectId: filters.subjectId } : {})
          }
        };
      }

      // Add search filter if provided
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      console.log('Final where clause:', JSON.stringify(where, null, 2));

      // Get total count
      const total = await this.prisma.questionBank.count({ where });
      console.log('Total question banks:', total);

      // Get question banks without expensive nested joins to avoid timeout
      const questionBanks = await this.prisma.questionBank.findMany({
        where,
        orderBy: {
          [sorting.field]: sorting.direction,
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            }
          },
          updatedBy: {
            select: {
              id: true,
              name: true,
            }
          },
          // Get question count without expensive joins
          _count: {
            select: {
              questions: true
            }
          }
        }
      });

      // Get sample questions for all question banks in a single query for better performance
      const questionBankIds = questionBanks.map(bank => bank.id);
      let sampleQuestions: any[] = [];

      if (questionBankIds.length > 0) {
        try {
          sampleQuestions = await this.prisma.question.findMany({
            where: {
              questionBankId: { in: questionBankIds },
              status: 'ACTIVE'
            },
            select: {
              id: true,
              questionBankId: true,
              courseId: true,
              subjectId: true,
              course: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              },
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                }
              }
            },
            // Get one question per question bank using DISTINCT ON (PostgreSQL specific)
            // For other databases, we'll filter in application code
            orderBy: [
              { questionBankId: 'asc' },
              { createdAt: 'desc' }
            ]
          });
        } catch (sampleQuestionsError) {
          console.warn('Failed to fetch sample questions, continuing without them:', sampleQuestionsError);
          // Continue without sample questions rather than failing the entire request
          sampleQuestions = [];
        }
      }

      // Create a map of question bank ID to sample question for efficient lookup
      const sampleQuestionMap = new Map();
      sampleQuestions.forEach(question => {
        if (!sampleQuestionMap.has(question.questionBankId)) {
          sampleQuestionMap.set(question.questionBankId, question);
        }
      });

      // Combine question banks with their sample questions
      const questionBanksWithMetadata = questionBanks.map(bank => {
        const sampleQuestion = sampleQuestionMap.get(bank.id);
        return {
          ...bank,
          questions: sampleQuestion ? [sampleQuestion] : [],
          questionCount: bank._count.questions
        };
      });

      console.log(`Retrieved ${questionBanksWithMetadata.length} question banks`);

      // Check if query took too long and log performance metrics
      const executionTime = Date.now() - startTime;
      if (executionTime > QUERY_TIMEOUT / 2) {
        console.warn(`Slow getQuestionBanks query: ${executionTime}ms`, {
          filters,
          pagination,
          sorting,
          totalResults: total
        });
      }

      return {
        items: questionBanksWithMetadata,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: total > pagination.page * pagination.pageSize,
      };
    } catch (error) {
      console.error('Error getting question banks:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get question banks',
        cause: error,
      });
    }
  }

  /**
   * Delete a question bank (soft delete)
   */
  async deleteQuestionBank(id: string) {
    try {
      // Check if the question bank exists
      const questionBank = await this.prisma.questionBank.findUnique({
        where: { id },
      });

      if (!questionBank) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Question bank not found',
        });
      }

      // Soft delete the question bank
      const deletedQuestionBank = await this.prisma.questionBank.update({
        where: { id },
        data: {
          status: toPrismaSystemStatus(SystemStatus.DELETED),
        },
      });

      return deletedQuestionBank;
    } catch (error) {
      console.error('Error deleting question bank:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete question bank',
        cause: error,
      });
    }
  }

  /**
   * Grade a student's answer for a question
   */
  gradeAnswer(question: any, answer: any): boolean {
    try {
      switch (question.questionType) {
        case 'MULTIPLE_CHOICE':
          const correctOption = question.content?.options?.find((opt: any) => opt.isCorrect);
          return answer === correctOption?.id;

        case 'TRUE_FALSE':
          return answer === question.content?.isTrue;

        case 'FILL_IN_THE_BLANKS':
          // Simple text comparison - can be enhanced with fuzzy matching
          const correctAnswers = question.content?.correctAnswers || [];
          if (Array.isArray(correctAnswers)) {
            return correctAnswers.some((correct: string) =>
              answer?.toLowerCase().trim() === correct.toLowerCase().trim()
            );
          }
          return false;

        case 'SHORT_ANSWER':
          // For short answer, we'll need manual grading or AI assistance
          // For now, return false to indicate manual grading required
          return false;

        case 'ESSAY':
          // Essays require manual grading
          return false;

        default:
          console.warn(`Unknown question type: ${question.questionType}`);
          return false;
      }
    } catch (error) {
      console.error('Error grading answer:', error);
      return false;
    }
  }

  /**
   * Get questions by subject and topic (for Activities V2)
   */
  async getQuestionsBySubjectAndTopic(input: {
    subjectId: string;
    topicId?: string;
    filters?: {
      questionType?: QuestionType;
      difficulty?: DifficultyLevel;
      bloomsLevel?: BloomsTaxonomyLevel;
      search?: string;
      usageFilter?: 'used' | 'unused' | 'all';
    };
    pagination?: { page: number; pageSize: number };
    sorting?: { field: string; direction: 'asc' | 'desc' };
  }) {
    try {
      const {
        subjectId,
        topicId,
        filters = {},
        pagination = { page: 1, pageSize: 20 },
        sorting = { field: 'createdAt', direction: 'desc' }
      } = input;

      // Build where clause
      const where: any = {
        subjectId,
        status: 'ACTIVE', // Only get active questions
      };

      // Add topic filter if provided
      if (topicId) {
        where.topicId = topicId;
      }

      // Add other filters
      if (filters.questionType) {
        where.questionType = filters.questionType;
      }

      if (filters.difficulty) {
        where.difficulty = filters.difficulty;
      }

      if (filters.bloomsLevel) {
        where.bloomsLevel = filters.bloomsLevel;
      }

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { path: ['text'], string_contains: filters.search } },
        ];
      }

      // Handle usage filter
      if (filters.usageFilter === 'used') {
        where.usageStats = {
          usageCount: {
            gt: 0
          }
        };
      } else if (filters.usageFilter === 'unused') {
        where.OR = [
          { usageStats: null },
          { usageStats: { usageCount: 0 } }
        ];
      }

      // Include related data
      const include = {
        course: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        topic: {
          select: {
            id: true,
            title: true,
          }
        },
        questionBank: {
          select: {
            id: true,
            name: true,
          }
        },
        usageStats: {
          select: {
            usageCount: true,
            correctCount: true,
            incorrectCount: true,
            lastUsedAt: true,
          }
        }
      };

      // Get total count
      const total = await this.prisma.question.count({ where });

      // Get questions
      const questions = await this.prisma.question.findMany({
        where,
        include,
        orderBy: {
          [sorting.field]: sorting.direction,
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      });

      return {
        items: questions,
        total,
        page: pagination.page,
        pageSize: pagination.pageSize,
        hasMore: total > pagination.page * pagination.pageSize,
      };
    } catch (error) {
      console.error('Error getting questions by subject and topic:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get questions by subject and topic',
        cause: error,
      });
    }
  }

  // Additional methods would be implemented here...
}
