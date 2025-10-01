/**
 * Performance test for QuestionBankService.getQuestionBanks
 * This test ensures the query completes within acceptable time limits
 */

import { QuestionBankService } from '../question-bank.service';
import { prisma } from '@/server/db';

// Mock the prisma client
jest.mock('@/server/db', () => ({
  prisma: {
    questionBank: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
  },
}));

describe('QuestionBankService Performance Tests', () => {
  let service: QuestionBankService;
  const mockPrisma = prisma as jest.Mocked<typeof prisma>;

  beforeEach(() => {
    service = new QuestionBankService();
    jest.clearAllMocks();
  });

  it('should complete getQuestionBanks within 5 seconds', async () => {
    // Mock data
    const mockQuestionBanks = [
      {
        id: 'bank1',
        name: 'Test Bank 1',
        institutionId: 'inst1',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { questions: 10 },
        createdBy: { id: 'user1', name: 'User 1' },
        updatedBy: null,
      },
    ];

    const mockSampleQuestions = [
      {
        id: 'q1',
        questionBankId: 'bank1',
        courseId: 'course1',
        subjectId: 'subject1',
        course: { id: 'course1', name: 'Math', code: 'MATH101' },
        subject: { id: 'subject1', name: 'Algebra', code: 'ALG' },
      },
    ];

    mockPrisma.questionBank.count.mockResolvedValue(1);
    mockPrisma.questionBank.findMany.mockResolvedValue(mockQuestionBanks as any);
    mockPrisma.question.findMany.mockResolvedValue(mockSampleQuestions as any);

    const startTime = Date.now();
    
    const result = await service.getQuestionBanks({
      filters: { institutionId: 'inst1', status: 'ACTIVE' },
      pagination: { page: 1, pageSize: 10 },
      sorting: { field: 'createdAt', direction: 'desc' },
    });

    const executionTime = Date.now() - startTime;

    // Should complete within 5 seconds (generous limit for test environment)
    expect(executionTime).toBeLessThan(5000);
    
    // Should return expected structure
    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toHaveProperty('questionCount', 10);
    expect(result.items[0].questions).toHaveLength(1);
  });

  it('should handle empty question banks gracefully', async () => {
    mockPrisma.questionBank.count.mockResolvedValue(0);
    mockPrisma.questionBank.findMany.mockResolvedValue([]);
    mockPrisma.question.findMany.mockResolvedValue([]);

    const result = await service.getQuestionBanks({
      filters: { institutionId: 'inst1' },
      pagination: { page: 1, pageSize: 10 },
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should handle sample question fetch errors gracefully', async () => {
    const mockQuestionBanks = [
      {
        id: 'bank1',
        name: 'Test Bank 1',
        institutionId: 'inst1',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { questions: 10 },
        createdBy: { id: 'user1', name: 'User 1' },
        updatedBy: null,
      },
    ];

    mockPrisma.questionBank.count.mockResolvedValue(1);
    mockPrisma.questionBank.findMany.mockResolvedValue(mockQuestionBanks as any);
    mockPrisma.question.findMany.mockRejectedValue(new Error('Sample question fetch failed'));

    // Should not throw error, should continue without sample questions
    const result = await service.getQuestionBanks({
      filters: { institutionId: 'inst1' },
      pagination: { page: 1, pageSize: 10 },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].questions).toHaveLength(0);
    expect(result.items[0]).toHaveProperty('questionCount', 10);
  });
});
