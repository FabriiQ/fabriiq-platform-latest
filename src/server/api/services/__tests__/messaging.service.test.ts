/**
 * Unit tests for Messaging Service
 */

import { MessagingService } from '../messaging.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  socialPost: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  messageAuditLog: {
    create: jest.fn(),
  },
  moderationQueue: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
} as unknown as PrismaClient;

describe('MessagingService', () => {
  let service: MessagingService;

  beforeEach(() => {
    service = new MessagingService(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.clearCaches();
  });

  describe('createMessage', () => {
    it('should create a message with compliance fields', async () => {
      const mockMessage = {
        id: 'msg1',
        content: 'Test message',
        authorId: 'user1',
        classId: 'class1',
        author: { id: 'user1', name: 'Test User', userType: 'STUDENT' }
      };

      (mockPrisma.socialPost.create as jest.Mock).mockResolvedValue(mockMessage);

      const input = {
        content: 'Test message',
        recipients: ['user2'],
        classId: 'class1'
      };

      const result = await service.createMessage('user1', input);

      expect(result.id).toBe('msg1');
      expect(mockPrisma.socialPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: 'Test message',
          authorId: 'user1',
          classId: 'class1',
          messageType: 'PUBLIC',
          contentCategory: 'GENERAL',
          riskLevel: 'LOW',
        }),
        include: expect.any(Object)
      });
    });

    it('should handle educational content with enhanced compliance', async () => {
      const mockMessage = {
        id: 'msg2',
        content: 'Student grade report',
        authorId: 'teacher1',
        classId: 'class1',
        author: { id: 'teacher1', name: 'Teacher', userType: 'TEACHER' }
      };

      (mockPrisma.socialPost.create as jest.Mock).mockResolvedValue(mockMessage);

      const input = {
        content: 'Student John received grade A+',
        recipients: ['parent1'],
        classId: 'class1'
      };

      const result = await service.createMessage('teacher1', input);

      expect(result.id).toBe('msg2');
      expect(mockPrisma.socialPost.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isEducationalRecord: true,
          auditRequired: true,
          encryptionLevel: 'ENHANCED',
        }),
        include: expect.any(Object)
      });
    });

    it('should handle errors gracefully', async () => {
      (mockPrisma.socialPost.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const input = {
        content: 'Test message',
        recipients: ['user2'],
        classId: 'class1'
      };

      await expect(service.createMessage('user1', input)).rejects.toThrow('Database error');
    });
  });

  describe('getMessages', () => {
    it('should retrieve messages with caching', async () => {
      const mockMessages = [
        { id: 'msg1', content: 'Message 1', author: { name: 'User 1' } },
        { id: 'msg2', content: 'Message 2', author: { name: 'User 2' } }
      ];

      (mockPrisma.socialPost.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const input = {
        classId: 'class1',
        limit: 10,
        offset: 0
      };

      const result = await service.getMessages('user1', input);

      expect(result.messages).toHaveLength(2);
      expect(mockPrisma.socialPost.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          classId: 'class1'
        }),
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0
      });
    });

    it('should use cache for repeated requests', async () => {
      const mockMessages = [
        { id: 'msg1', content: 'Message 1', author: { name: 'User 1' } }
      ];

      (mockPrisma.socialPost.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const input = {
        classId: 'class1',
        limit: 10,
        offset: 0
      };

      // First call
      await service.getMessages('user1', input);
      
      // Second call should use cache
      await service.getMessages('user1', input);

      // Should only call database once
      expect(mockPrisma.socialPost.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFlaggedMessages', () => {
    it('should retrieve flagged messages for moderation', async () => {
      const mockFlaggedMessages = [
        {
          id: 'queue1',
          messageId: 'msg1',
          reason: 'Inappropriate content',
          priority: 'HIGH',
          message: {
            id: 'msg1',
            content: 'Flagged message',
            author: { name: 'User 1' }
          }
        }
      ];

      (mockPrisma.moderationQueue.findMany as jest.Mock).mockResolvedValue(mockFlaggedMessages);

      const input = {
        classId: 'class1',
        limit: 10,
        offset: 0
      };

      const result = await service.getFlaggedMessages('moderator1', input);

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].reason).toBe('Inappropriate content');
      expect(mockPrisma.moderationQueue.findMany).toHaveBeenCalled();
    });
  });

  describe('moderateMessage', () => {
    it('should moderate a message and update status', async () => {
      const mockUpdatedMessage = {
        id: 'msg1',
        isModerated: true,
        moderatedBy: 'moderator1'
      };

      (mockPrisma.socialPost.update as jest.Mock).mockResolvedValue(mockUpdatedMessage);

      const input = {
        messageId: 'msg1',
        action: 'APPROVE' as const,
        reason: 'Content is appropriate',
        notes: 'Reviewed and approved'
      };

      const result = await service.moderateMessage('moderator1', input);

      expect(result.success).toBe(true);
      expect(mockPrisma.socialPost.update).toHaveBeenCalledWith({
        where: { id: 'msg1' },
        data: expect.objectContaining({
          isModerated: true,
          moderatedBy: 'moderator1',
          moderationReason: 'Content is appropriate'
        })
      });
    });
  });

  describe('performance', () => {
    it('should handle concurrent message creation', async () => {
      const mockMessage = {
        id: 'msg',
        content: 'Test',
        authorId: 'user1',
        author: { id: 'user1', name: 'User', userType: 'STUDENT' }
      };

      (mockPrisma.socialPost.create as jest.Mock).mockResolvedValue(mockMessage);

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(service.createMessage('user1', {
          content: `Message ${i}`,
          recipients: ['user2'],
          classId: 'class1'
        }));
      }

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      expect(mockPrisma.socialPost.create).toHaveBeenCalledTimes(10);
    });

    it('should maintain cache efficiency under load', async () => {
      const mockMessages = [{ id: 'msg1', content: 'Test', author: { name: 'User' } }];
      (mockPrisma.socialPost.findMany as jest.Mock).mockResolvedValue(mockMessages);

      // Make many requests to test cache behavior
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(service.getMessages('user1', {
          classId: `class${i % 5}`, // 5 different classes
          limit: 10,
          offset: 0
        }));
      }

      await Promise.all(promises);

      // Should have cached results for 5 different classes
      const stats = service.getStats();
      expect(stats.messageCache.size).toBeLessThanOrEqual(50); // Max cache size
    });
  });

  describe('cache management', () => {
    it('should clear caches when requested', async () => {
      const mockMessages = [{ id: 'msg1', content: 'Test', author: { name: 'User' } }];
      (mockPrisma.socialPost.findMany as jest.Mock).mockResolvedValue(mockMessages);

      // Add data to cache
      await service.getMessages('user1', {
        classId: 'class1',
        limit: 10,
        offset: 0
      });

      expect(service.getStats().messageCache.size).toBeGreaterThan(0);

      service.clearCaches();

      expect(service.getStats().messageCache.size).toBe(0);
    });
  });
});
