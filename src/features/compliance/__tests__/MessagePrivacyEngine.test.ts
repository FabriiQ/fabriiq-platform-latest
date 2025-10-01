/**
 * Unit tests for Message Privacy Engine
 */

import { MessagePrivacyEngine } from '../MessagePrivacyEngine';

describe('MessagePrivacyEngine', () => {
  let engine: MessagePrivacyEngine;

  beforeEach(() => {
    engine = new MessagePrivacyEngine();
  });

  afterEach(() => {
    engine.clearCaches();
  });

  describe('processMessage', () => {
    it('should process message with basic privacy requirements', async () => {
      const message = {
        id: 'msg1',
        content: 'Hello, how are you?',
        sender: 'user1',
        recipients: ['user2'],
        classId: 'class1'
      };

      const result = await engine.processMessage(message);

      expect(result.messageId).toBe('msg1');
      expect(result.privacyLevel).toBe('STANDARD');
      expect(result.encryptionApplied).toBe(false);
      expect(result.complianceFootprint.riskLevel).toBe('LOW');
    });

    it('should apply encryption for sensitive content', async () => {
      const message = {
        id: 'msg2',
        content: 'Student John received grade A+ on the test',
        sender: 'teacher1',
        recipients: ['parent1'],
        classId: 'class1'
      };

      const result = await engine.processMessage(message);

      expect(result.privacyLevel).toBe('ENHANCED');
      expect(result.encryptionApplied).toBe(true);
      expect(result.complianceFootprint.riskLevel).toBe('HIGH');
      expect(result.complianceFootprint.ferpaCompliance).toBe(true);
    });

    it('should handle multiple recipients', async () => {
      const message = {
        id: 'msg3',
        content: 'Class announcement',
        sender: 'teacher1',
        recipients: ['student1', 'student2', 'student3'],
        classId: 'class1'
      };

      const result = await engine.processMessage(message);

      expect(result.messageId).toBe('msg3');
      expect(result.recipientCount).toBe(3);
      expect(result.privacyLevel).toBe('STANDARD');
    });

    it('should use cache for repeated processing', async () => {
      const message = {
        id: 'msg4',
        content: 'Cached message',
        sender: 'user1',
        recipients: ['user2'],
        classId: 'class1'
      };

      // First processing
      const result1 = await engine.processMessage(message);
      
      // Second processing should use cache
      const result2 = await engine.processMessage(message);

      expect(result1.messageId).toBe(result2.messageId);
      expect(result1.privacyLevel).toBe(result2.privacyLevel);
      
      const stats = engine.getStats();
      expect(stats.encryptionKeyCache.size).toBeGreaterThan(0);
    });
  });

  describe('classifyMessage', () => {
    it('should classify educational content', () => {
      const content = 'Student performance report';
      const context = {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'parent1', userType: 'PARENT' }],
        classId: 'class1'
      };

      const result = engine.classifyMessage(content, context);

      expect(result.contentCategory).toBe('EDUCATIONAL');
      expect(result.riskLevel).toBe('HIGH');
      expect(result.isEducationalRecord).toBe(true);
    });

    it('should classify general communication', () => {
      const content = 'Hello everyone!';
      const context = {
        sender: { id: 'student1', userType: 'STUDENT' },
        recipients: [{ id: 'student2', userType: 'STUDENT' }],
        classId: 'class1'
      };

      const result = engine.classifyMessage(content, context);

      expect(result.contentCategory).toBe('GENERAL');
      expect(result.riskLevel).toBe('LOW');
      expect(result.isEducationalRecord).toBe(false);
    });
  });

  describe('encryption', () => {
    it('should generate encryption keys for sensitive messages', () => {
      const messageId = 'sensitive-msg';
      const classification = {
        contentCategory: 'EDUCATIONAL' as const,
        riskLevel: 'HIGH' as const,
        isEducationalRecord: true,
        encryptionLevel: 'ENHANCED' as const,
        auditRequired: true,
        moderationRequired: false,
        legalBasis: 'LEGITIMATE_INTEREST' as const,
        flaggedKeywords: []
      };

      const key = engine.generateEncryptionKey(messageId, classification);

      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
      
      // Should cache the key
      const cachedKey = engine.generateEncryptionKey(messageId, classification);
      expect(key).toBe(cachedKey);
    });

    it('should not generate keys for standard messages', () => {
      const messageId = 'standard-msg';
      const classification = {
        contentCategory: 'GENERAL' as const,
        riskLevel: 'LOW' as const,
        isEducationalRecord: false,
        encryptionLevel: 'STANDARD' as const,
        auditRequired: false,
        moderationRequired: false,
        legalBasis: 'LEGITIMATE_INTEREST' as const,
        flaggedKeywords: []
      };

      const key = engine.generateEncryptionKey(messageId, classification);

      expect(key).toBeNull();
    });
  });

  describe('performance', () => {
    it('should handle high-volume message processing', async () => {
      const startTime = Date.now();
      
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(engine.processMessage({
          id: `msg-${i}`,
          content: `Test message ${i}`,
          sender: 'user1',
          recipients: ['user2'],
          classId: 'class1'
        }));
      }
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000); // 2 seconds
    });

    it('should maintain cache efficiency', async () => {
      // Process many messages to test cache behavior
      for (let i = 0; i < 500; i++) {
        await engine.processMessage({
          id: `msg-${i}`,
          content: `Message ${i}`,
          sender: 'user1',
          recipients: ['user2'],
          classId: 'class1'
        });
      }
      
      const stats = engine.getStats();
      expect(stats.encryptionKeyCache.size).toBeLessThanOrEqual(100); // Max cache size
    });
  });

  describe('cache management', () => {
    it('should clear all caches', async () => {
      // Add some data to caches
      await engine.processMessage({
        id: 'test-msg',
        content: 'Test content',
        sender: 'user1',
        recipients: ['user2'],
        classId: 'class1'
      });
      
      expect(engine.getStats().encryptionKeyCache.size).toBeGreaterThan(0);
      
      engine.clearCaches();
      
      const stats = engine.getStats();
      expect(stats.encryptionKeyCache.size).toBe(0);
    });
  });
});
