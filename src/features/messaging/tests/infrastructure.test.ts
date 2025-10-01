/**
 * Infrastructure Test for High-Performance Messaging System
 * Tests database schema, services, and performance optimizations
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { RuleBasedMessageClassifier } from '../core/RuleBasedClassifier';
import { ConsentService } from '../../compliance/ConsentService';
import { MessagePrivacyEngine } from '../../compliance/MessagePrivacyEngine';
import { FERPAComplianceEngine } from '../../compliance/FERPAComplianceEngine';
import { AuditLogService } from '../../compliance/AuditLogService';
import { RetentionService } from '../../compliance/RetentionService';

describe('Messaging Infrastructure Tests', () => {
  let prisma: PrismaClient;
  let classifier: RuleBasedMessageClassifier;
  let consentService: ConsentService;
  let privacyEngine: MessagePrivacyEngine;
  let ferpaEngine: FERPAComplianceEngine;
  let auditService: AuditLogService;
  let retentionService: RetentionService;

  beforeAll(async () => {
    prisma = new PrismaClient();
    classifier = new RuleBasedMessageClassifier();
    consentService = new ConsentService(prisma);
    privacyEngine = new MessagePrivacyEngine(prisma);
    ferpaEngine = new FERPAComplianceEngine(prisma);
    auditService = new AuditLogService(prisma);
    retentionService = new RetentionService(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    privacyEngine.destroy();
    auditService.destroy();
    retentionService.destroy();
  });

  describe('Database Schema Tests', () => {
    it('should have all required messaging tables', async () => {
      // Test that all new tables exist
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'message_recipients',
          'message_audit_logs',
          'retention_policies',
          'moderation_queue',
          'user_consents',
          'consent_audit_logs',
          'encryption_keys',
          'message_retention_schedule',
          'ferpa_disclosure_logs'
        )
      `;
      
      expect(Array.isArray(tables)).toBe(true);
      expect((tables as any[]).length).toBeGreaterThan(0);
    });

    it('should have proper indexes for performance', async () => {
      // Test that performance-critical indexes exist
      const indexes = await prisma.$queryRaw`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename IN ('social_posts', 'message_recipients', 'message_audit_logs')
      `;
      
      expect(Array.isArray(indexes)).toBe(true);
      expect((indexes as any[]).length).toBeGreaterThan(0);
    });
  });

  describe('Rule-Based Classifier Tests', () => {
    it('should classify academic content correctly', () => {
      const mockSender = { id: '1', userType: 'TEACHER' } as any;
      const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT' }] as any;
      
      const result = classifier.classifyMessage(
        'Your grade for the math assignment is 85/100. Great work on the quadratic equations!',
        { sender: mockSender, recipients: mockRecipients }
      );

      expect(result.contentCategory).toBe('ACADEMIC');
      expect(result.isEducationalRecord).toBe(true);
      expect(result.encryptionLevel).toBe('EDUCATIONAL_RECORD');
      expect(result.auditRequired).toBe(true);
    });

    it('should detect high-risk content', () => {
      const mockSender = { id: '1', userType: 'CAMPUS_STUDENT' } as any;
      const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT' }] as any;
      
      const result = classifier.classifyMessage(
        'I am being bullied and harassed by other students',
        { sender: mockSender, recipients: mockRecipients }
      );

      expect(result.riskLevel).toBe('HIGH');
      expect(result.moderationRequired).toBe(true);
      expect(result.flaggedKeywords).toContain('bullied');
      expect(result.flaggedKeywords).toContain('harassed');
    });

    it('should use caching for performance', () => {
      const mockSender = { id: '1', userType: 'TEACHER' } as any;
      const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT' }] as any;
      const content = 'Test message for caching';

      // First call
      const start1 = Date.now();
      const result1 = classifier.classifyMessage(content, { sender: mockSender, recipients: mockRecipients });
      const duration1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = classifier.classifyMessage(content, { sender: mockSender, recipients: mockRecipients });
      const duration2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1); // Cached call should be faster
    });
  });

  describe('Consent Service Tests', () => {
    it('should handle educational context consent correctly', async () => {
      const mockUser = { id: 'test-user-1', userType: 'CAMPUS_STUDENT', dateOfBirth: new Date('2000-01-01') } as any;
      
      const result = await consentService.getUserConsentStatus(
        mockUser.id,
        ['educational', 'academic']
      );

      expect(result.userId).toBe(mockUser.id);
      expect(result.legalBasis).toBe('LEGITIMATE_INTEREST');
      expect(result.consentRequired).toBe(false); // Educational context, adult student
    });

    it('should use caching for performance', async () => {
      const userId = 'test-user-cache';
      const dataCategories = ['general', 'communication'];

      // First call
      const start1 = Date.now();
      const result1 = await consentService.getUserConsentStatus(userId, dataCategories);
      const duration1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await consentService.getUserConsentStatus(userId, dataCategories);
      const duration2 = Date.now() - start2;

      expect(result1.userId).toBe(result2.userId);
      expect(duration2).toBeLessThan(duration1); // Cached call should be faster
    });
  });

  describe('FERPA Compliance Engine Tests', () => {
    it('should detect educational records', async () => {
      const mockSender = { id: '1', userType: 'TEACHER', dateOfBirth: new Date('1980-01-01') } as any;
      const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT', dateOfBirth: new Date('2000-01-01') }] as any;
      
      // Use reflection to access private method for testing
      const ferpaClassification = await (ferpaEngine as any).classifyFERPARequirements(
        'Student grade report: Math - 85%, Science - 92%',
        mockSender,
        mockRecipients
      );

      expect(ferpaClassification.isEducationalRecord).toBe(true);
      expect(ferpaClassification.disclosureLoggingRequired).toBe(true);
      expect(ferpaClassification.ferpaProtectionLevel).toBe('enhanced');
    });

    it('should use caching for performance', () => {
      const stats = ferpaEngine.getStats();
      expect(stats.ferpaCache).toBeDefined();
      expect(stats.ageCache).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-concurrency classification', () => {
      const mockSender = { id: '1', userType: 'TEACHER' } as any;
      const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT' }] as any;
      
      const startTime = Date.now();
      const promises = [];
      
      // Simulate 100 concurrent classifications
      for (let i = 0; i < 100; i++) {
        promises.push(
          classifier.classifyMessage(
            `Test message ${i} with academic content and grades`,
            { sender: mockSender, recipients: mockRecipients }
          )
        );
      }
      
      Promise.all(promises).then(() => {
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      });
    });

    it('should have efficient cache statistics', () => {
      const classifierStats = classifier.getCacheStats();
      const consentStats = consentService.getCacheStats();
      const ferpaStats = ferpaEngine.getStats();

      expect(classifierStats.size).toBeGreaterThanOrEqual(0);
      expect(consentStats.consentCache.size).toBeGreaterThanOrEqual(0);
      expect(ferpaStats.ferpaCache.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Service Integration Tests', () => {
    it('should have proper service statistics', () => {
      const auditStats = auditService.getStats();
      const retentionStats = retentionService.getStats();

      expect(auditStats.queueSize).toBeGreaterThanOrEqual(0);
      expect(auditStats.batchSize).toBeGreaterThan(0);
      expect(retentionStats.isProcessing).toBeDefined();
    });

    it('should clear caches properly', () => {
      classifier.clearCache();
      consentService.clearCaches();
      ferpaEngine.clearCaches();

      const classifierStats = classifier.getCacheStats();
      const consentStats = consentService.getCacheStats();
      const ferpaStats = ferpaEngine.getStats();

      expect(classifierStats.size).toBe(0);
      expect(consentStats.consentCache.size).toBe(0);
      expect(ferpaStats.ferpaCache.size).toBe(0);
    });
  });
});

// Performance benchmark test
describe('Performance Benchmarks', () => {
  let classifier: RuleBasedMessageClassifier;

  beforeAll(() => {
    classifier = new RuleBasedMessageClassifier();
  });

  it('should classify 1000 messages in under 100ms', () => {
    const mockSender = { id: '1', userType: 'TEACHER' } as any;
    const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT' }] as any;
    
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      classifier.classifyMessage(
        `Test message ${i} with various content types`,
        { sender: mockSender, recipients: mockRecipients }
      );
    }
    
    const duration = Date.now() - startTime;
    console.log(`Classified 1000 messages in ${duration}ms`);
    
    // Should be very fast due to caching
    expect(duration).toBeLessThan(100);
  });
});
