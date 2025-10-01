/**
 * Activities V2 Test Suite
 * 
 * Tests for Activities V2 core functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ActivityV2Service } from '../services/activity-v2.service';
import { CreateActivityV2Input, SubmitActivityV2Input, QuizV2Content } from '../types';

// Mock dependencies
jest.mock('@/server/db', () => ({
  db: {
    activity: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    },
    activitySubmission: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    question: {
      findMany: jest.fn()
    }
  }
}));

jest.mock('@/features/grading/services/grading.service', () => ({
  GradingService: {
    gradeActivity: jest.fn()
  }
}));

describe('ActivityV2Service', () => {
  let service: ActivityV2Service;
  let mockUserId: string;

  beforeEach(() => {
    service = new ActivityV2Service();
    mockUserId = 'user-123';
    jest.clearAllMocks();
  });

  describe('createActivity', () => {
    it('should create a quiz activity successfully', async () => {
      const input: CreateActivityV2Input = {
        title: 'Test Quiz',
        subjectId: 'subject-123',
        classId: 'class-123',
        content: {
          version: '2.0',
          type: 'quiz',
          title: 'Test Quiz',
          description: 'A test quiz',
          estimatedTimeMinutes: 30,
          questions: [
            {
              id: 'q1',
              order: 1,
              points: 2,
              shuffleOptions: false
            }
          ],
          settings: {
            shuffleQuestions: false,
            showFeedbackImmediately: false,
            showCorrectAnswers: true,
            attemptsAllowed: 1,
            allowReview: true,
            showProgressBar: true
          },
          assessmentMode: 'standard',
          achievementConfig: {
            enabled: true,
            pointsAnimation: true,
            celebrationLevel: 'standard',
            points: { base: 20 },
            triggers: {
              completion: true,
              perfectScore: true,
              speedBonus: false,
              firstAttempt: true,
              improvement: false
            }
          }
        } as QuizV2Content,
        isGradable: true,
        maxScore: 2,
        passingScore: 1
      };

      const mockActivity = {
        id: 'activity-123',
        title: input.title,
        content: input.content,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockDb = require('@/server/db').db;
      mockDb.activity.create.mockResolvedValue(mockActivity);

      const result = await service.createActivity(input, mockUserId);

      expect(result).toEqual(mockActivity);
      expect(mockDb.activity.create).toHaveBeenCalledWith({
        data: {
          title: input.title,
          description: input.content.description,
          subjectId: input.subjectId,
          topicId: input.topicId,
          classId: input.classId,
          createdById: mockUserId,
          activityType: 'ACTIVITIES_V2',
          content: input.content,
          isGradable: input.isGradable,
          maxScore: input.maxScore,
          passingScore: input.passingScore,
          estimatedTimeMinutes: input.content.estimatedTimeMinutes
        }
      });
    });

    it('should create a reading activity successfully', async () => {
      const input: CreateActivityV2Input = {
        title: 'Test Reading',
        subjectId: 'subject-123',
        classId: 'class-123',
        content: {
          version: '2.0',
          type: 'reading',
          title: 'Test Reading',
          description: 'A test reading',
          estimatedTimeMinutes: 15,
          content: {
            type: 'rich_text',
            data: 'This is test reading content.',
            metadata: {
              wordCount: 5,
              estimatedReadingTime: 1
            }
          },
          completionCriteria: {
            minTimeSeconds: 300,
            scrollPercentage: 80,
            interactionRequired: false
          },
          features: {
            allowBookmarking: true,
            allowHighlighting: true,
            allowNotes: true,
            showProgress: true
          },
          achievementConfig: {
            enabled: true,
            pointsAnimation: true,
            celebrationLevel: 'standard',
            points: { base: 15 },
            triggers: {
              completion: true,
              perfectScore: false,
              speedBonus: false,
              firstAttempt: true,
              improvement: false
            }
          }
        },
        isGradable: true,
        maxScore: 100,
        passingScore: 60
      };

      const mockActivity = {
        id: 'activity-456',
        title: input.title,
        content: input.content,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockDb = require('@/server/db').db;
      mockDb.activity.create.mockResolvedValue(mockActivity);

      const result = await service.createActivity(input, mockUserId);

      expect(result).toEqual(mockActivity);
      expect(mockDb.activity.create).toHaveBeenCalledWith({
        data: {
          title: input.title,
          description: input.content.description,
          subjectId: input.subjectId,
          topicId: input.topicId,
          classId: input.classId,
          createdById: mockUserId,
          activityType: 'ACTIVITIES_V2',
          content: input.content,
          isGradable: input.isGradable,
          maxScore: input.maxScore,
          passingScore: input.passingScore,
          estimatedTimeMinutes: input.content.estimatedTimeMinutes
        }
      });
    });
  });

  describe('submitActivity', () => {
    it('should submit a quiz activity and calculate grade', async () => {
      const mockActivity = {
        id: 'activity-123',
        content: {
          version: '2.0',
          type: 'quiz',
          questions: [
            { id: 'q1', points: 2 },
            { id: 'q2', points: 3 }
          ]
        } as QuizV2Content,
        maxScore: 5,
        passingScore: 3
      };

      const input: SubmitActivityV2Input = {
        activityId: 'activity-123',
        answers: {
          'q1': 'correct-answer',
          'q2': 'wrong-answer'
        },
        timeSpent: 1800 // 30 minutes
      };

      const mockDb = require('@/server/db').db;
      mockDb.activity.findUnique.mockResolvedValue(mockActivity);
      
      const mockGradingService = require('@/features/grading/services/grading.service').GradingService;
      mockGradingService.gradeActivity.mockResolvedValue({
        score: 2,
        maxScore: 5,
        percentage: 40,
        passed: false,
        feedback: 'Good effort, but needs improvement'
      });

      const mockSubmission = {
        id: 'submission-123',
        score: 2,
        passed: false,
        createdAt: new Date()
      };

      mockDb.activitySubmission.create.mockResolvedValue(mockSubmission);

      const result = await service.submitActivity(input, mockUserId);

      expect(result.result.score).toBe(40); // percentage
      expect(result.result.passed).toBe(false);
      expect(result.result.pointsEarned).toBeGreaterThan(0);
      expect(mockDb.activitySubmission.create).toHaveBeenCalled();
    });

    it('should handle reading activity submission', async () => {
      const mockActivity = {
        id: 'activity-456',
        content: {
          version: '2.0',
          type: 'reading',
          completionCriteria: {
            minTimeSeconds: 300,
            scrollPercentage: 80
          }
        },
        maxScore: 100,
        passingScore: 60
      };

      const input: SubmitActivityV2Input = {
        activityId: 'activity-456',
        progress: {
          scrollPercentage: 85,
          timeSpent: 400,
          bookmarks: [],
          highlights: [],
          notes: []
        },
        timeSpent: 400
      };

      const mockDb = require('@/server/db').db;
      mockDb.activity.findUnique.mockResolvedValue(mockActivity);

      const mockSubmission = {
        id: 'submission-456',
        score: 100,
        passed: true,
        createdAt: new Date()
      };

      mockDb.activitySubmission.create.mockResolvedValue(mockSubmission);

      const result = await service.submitActivity(input, mockUserId);

      expect(result.result.score).toBe(100);
      expect(result.result.passed).toBe(true);
      expect(result.result.pointsEarned).toBeGreaterThan(0);
    });
  });

  describe('getActivity', () => {
    it('should retrieve activity by ID', async () => {
      const mockActivity = {
        id: 'activity-123',
        title: 'Test Activity',
        content: {
          version: '2.0',
          type: 'quiz'
        }
      };

      const mockDb = require('@/server/db').db;
      mockDb.activity.findUnique.mockResolvedValue(mockActivity);

      const result = await service.getActivity('activity-123');

      expect(result).toEqual(mockActivity);
      expect(mockDb.activity.findUnique).toHaveBeenCalledWith({
        where: { id: 'activity-123' },
        include: {
          subject: true,
          topic: true,
          class: true,
          createdBy: true
        }
      });
    });

    it('should return null for non-existent activity', async () => {
      const mockDb = require('@/server/db').db;
      mockDb.activity.findUnique.mockResolvedValue(null);

      const result = await service.getActivity('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getStudentAttempts', () => {
    it('should retrieve student attempts for an activity', async () => {
      const mockAttempts = [
        {
          id: 'attempt-1',
          score: 80,
          passed: true,
          createdAt: new Date('2024-01-01')
        },
        {
          id: 'attempt-2',
          score: 60,
          passed: false,
          createdAt: new Date('2023-12-31')
        }
      ];

      const mockDb = require('@/server/db').db;
      mockDb.activitySubmission.findMany.mockResolvedValue(mockAttempts);

      const result = await service.getStudentAttempts('activity-123', 'student-123');

      expect(result).toEqual(mockAttempts);
      expect(mockDb.activitySubmission.findMany).toHaveBeenCalledWith({
        where: {
          activityId: 'activity-123',
          studentId: 'student-123'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
  });
});
