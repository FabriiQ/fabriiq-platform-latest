/**
 * Unit tests for FERPA Compliance Engine
 */

import { FERPAComplianceEngine } from '../FERPAComplianceEngine';

describe('FERPAComplianceEngine', () => {
  let engine: FERPAComplianceEngine;

  beforeEach(() => {
    engine = new FERPAComplianceEngine();
  });

  afterEach(() => {
    engine.clearCaches();
  });

  describe('classifyMessage', () => {
    it('should classify educational record content', () => {
      const content = 'Student John Doe received a grade of A+ on the math test';
      const context = {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'parent1', userType: 'PARENT' }],
        classId: 'class1'
      };

      const result = engine.classifyMessage(content, context);

      expect(result.isEducationalRecord).toBe(true);
      expect(result.requiresConsent).toBe(true);
      expect(result.disclosureLoggingRequired).toBe(true);
      expect(result.riskLevel).toBe('HIGH');
    });

    it('should classify directory information', () => {
      const content = 'Student John Doe is in Grade 5';
      const context = {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'student1', userType: 'STUDENT' }],
        classId: 'class1'
      };

      const result = engine.classifyMessage(content, context);

      expect(result.isEducationalRecord).toBe(false);
      expect(result.directoryInformationLevel).toBe('PUBLIC');
      expect(result.requiresConsent).toBe(false);
      expect(result.riskLevel).toBe('LOW');
    });

    it('should classify general communication', () => {
      const content = 'Remember to bring your homework tomorrow';
      const context = {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'student1', userType: 'STUDENT' }],
        classId: 'class1'
      };

      const result = engine.classifyMessage(content, context);

      expect(result.isEducationalRecord).toBe(false);
      expect(result.requiresConsent).toBe(false);
      expect(result.disclosureLoggingRequired).toBe(false);
      expect(result.riskLevel).toBe('LOW');
    });

    it('should handle sensitive information', () => {
      const content = 'Student has special needs accommodation for extra time';
      const context = {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'parent1', userType: 'PARENT' }],
        classId: 'class1'
      };

      const result = engine.classifyMessage(content, context);

      expect(result.isEducationalRecord).toBe(true);
      expect(result.requiresConsent).toBe(true);
      expect(result.riskLevel).toBe('CRITICAL');
      expect(result.specialCategories).toContain('disability');
    });

    it('should use cache for repeated classifications', () => {
      const content = 'Test message';
      const context = {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'student1', userType: 'STUDENT' }],
        classId: 'class1'
      };

      // First call
      const result1 = engine.classifyMessage(content, context);
      
      // Second call should use cache
      const result2 = engine.classifyMessage(content, context);

      expect(result1).toEqual(result2);
      
      const stats = engine.getStats();
      expect(stats.classificationCache.size).toBe(1);
    });
  });

  describe('validateDisclosure', () => {
    it('should validate legitimate educational disclosure', () => {
      const disclosure = {
        studentId: 'student1',
        recipientType: 'PARENT' as const,
        purpose: 'Educational progress update',
        dataTypes: ['grades', 'attendance']
      };

      const result = engine.validateDisclosure(disclosure);

      expect(result.isValid).toBe(true);
      expect(result.requiresConsent).toBe(false); // Parent disclosure
      expect(result.legalBasis).toBe('LEGITIMATE_INTEREST');
    });

    it('should require consent for third-party disclosure', () => {
      const disclosure = {
        studentId: 'student1',
        recipientType: 'EXTERNAL' as const,
        purpose: 'Research study',
        dataTypes: ['grades', 'behavior']
      };

      const result = engine.validateDisclosure(disclosure);

      expect(result.isValid).toBe(false);
      expect(result.requiresConsent).toBe(true);
      expect(result.violations).toContain('Third-party disclosure requires explicit consent');
    });
  });

  describe('performance', () => {
    it('should handle high-volume classifications efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 1000 classifications
      for (let i = 0; i < 1000; i++) {
        engine.classifyMessage(`Test message ${i}`, {
          sender: { id: 'teacher1', userType: 'TEACHER' },
          recipients: [{ id: 'student1', userType: 'STUDENT' }],
          classId: 'class1'
        });
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(1000); // 1 second
      
      const stats = engine.getStats();
      expect(stats.classificationCache.size).toBeGreaterThan(0);
    });
  });

  describe('cache management', () => {
    it('should respect cache size limits', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 1500; i++) {
        engine.classifyMessage(`Message ${i}`, {
          sender: { id: 'teacher1', userType: 'TEACHER' },
          recipients: [{ id: 'student1', userType: 'STUDENT' }],
          classId: 'class1'
        });
      }
      
      const stats = engine.getStats();
      expect(stats.classificationCache.size).toBeLessThanOrEqual(1000); // Max cache size
    });

    it('should clear caches when requested', () => {
      engine.classifyMessage('Test', {
        sender: { id: 'teacher1', userType: 'TEACHER' },
        recipients: [{ id: 'student1', userType: 'STUDENT' }],
        classId: 'class1'
      });
      
      expect(engine.getStats().classificationCache.size).toBeGreaterThan(0);
      
      engine.clearCaches();
      
      expect(engine.getStats().classificationCache.size).toBe(0);
    });
  });
});
