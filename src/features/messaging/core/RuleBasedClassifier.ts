/**
 * High-Performance Rule-Based Message Classifier
 * Optimized for 10K+ concurrent users with caching and efficient algorithms
 */

import { User, ContentCategory, RiskLevel, LegalBasis, EncryptionLevel } from '@prisma/client';
import { logger } from '@/server/api/utils/logger';
import { LRUCache } from 'lru-cache';

export interface MessageClassification {
  contentCategory: ContentCategory;
  riskLevel: RiskLevel;
  complianceLevel: 'low' | 'medium' | 'high' | 'critical';
  isEducationalRecord: boolean;
  flaggedKeywords: string[];
  moderationRequired: boolean;
  auditRequired: boolean;
  encryptionLevel: EncryptionLevel;
  legalBasis: LegalBasis;
  retentionPeriod: number; // days
  crossBorderTransferRisk: boolean;
}

export interface ClassificationContext {
  sender: User;
  recipients: User[];
  classId?: string;
  threadId?: string;
}

/**
 * High-performance rule-based message classifier with caching
 */
export class RuleBasedMessageClassifier {
  // Performance optimization: Cache classification results
  private classificationCache = new LRUCache<string, MessageClassification>({
    max: 10000, // Cache 10K classifications
    ttl: 5 * 60 * 1000, // 5 minutes TTL
  });

  // Optimized keyword dictionaries with performance considerations
  private static readonly KEYWORD_CATEGORIES = {
    academic: new Set([
      'assignment', 'homework', 'quiz', 'test', 'grade', 'exam', 'study', 'lesson',
      'project', 'research', 'thesis', 'dissertation', 'coursework', 'syllabus',
      'curriculum', 'learning', 'education', 'academic', 'scholarship', 'transcript'
    ]),
    administrative: new Set([
      'fee', 'payment', 'enrollment', 'schedule', 'policy', 'meeting', 'registration',
      'admission', 'tuition', 'invoice', 'billing', 'deadline', 'form', 'document',
      'certificate', 'verification', 'official', 'administration', 'office'
    ]),
    support: new Set([
      'help', 'problem', 'issue', 'struggling', 'difficulty', 'confused', 'support',
      'assistance', 'guidance', 'clarification', 'question', 'doubt', 'concern',
      'trouble', 'stuck', 'error', 'bug', 'technical', 'access'
    ]),
    emergency: new Set([
      'urgent', 'emergency', 'immediate', 'crisis', 'safety', 'danger', 'threat',
      'critical', 'serious', 'important', 'asap', 'now', 'quickly', 'rush'
    ]),
    behavioral: new Set([
      'behavior', 'discipline', 'concern', 'incident', 'report', 'misconduct',
      'violation', 'inappropriate', 'bullying', 'harassment', 'conflict', 'dispute'
    ]),
    achievement: new Set([
      'congratulations', 'excellent', 'outstanding', 'achievement', 'success',
      'award', 'recognition', 'praise', 'good job', 'well done', 'proud', 'honor'
    ])
  };

  private static readonly RISK_KEYWORDS = {
    critical: new Set([
      'threat', 'violence', 'harm', 'kill', 'die', 'suicide', 'weapon', 'bomb',
      'attack', 'hurt', 'abuse', 'assault', 'rape', 'sexual', 'drug', 'illegal'
    ]),
    high: new Set([
      'bullying', 'harassment', 'inappropriate', 'discrimination', 'hate',
      'offensive', 'disturbing', 'concerning', 'serious', 'violation',
      'bullied', 'harassed', 'discriminated', 'threatened', 'intimidated'
    ]),
    medium: new Set([
      'concern', 'worried', 'problem', 'struggling', 'difficulty', 'upset',
      'frustrated', 'angry', 'sad', 'depressed', 'anxious'
    ]),
    low: new Set([
      'question', 'clarification', 'information', 'update', 'reminder',
      'notification', 'announcement', 'general', 'casual'
    ])
  };

  private static readonly EDUCATIONAL_RECORD_KEYWORDS = new Set([
    'grade', 'score', 'mark', 'result', 'assessment', 'evaluation', 'performance',
    'progress', 'report', 'transcript', 'record', 'attendance', 'absence',
    'behavior', 'discipline', 'special needs', 'accommodation', 'iep', '504'
  ]);

  /**
   * Classify message with high-performance caching
   */
  classifyMessage(content: string, context: ClassificationContext): MessageClassification {
    const startTime = Date.now();
    
    try {
      // Create cache key for performance optimization
      const cacheKey = this.createCacheKey(content, context);
      const cached = this.classificationCache.get(cacheKey);
      
      if (cached) {
        logger.debug('Classification cache hit', { cacheKey, duration: Date.now() - startTime });
        return cached;
      }

      // Perform classification
      const classification = this.performClassification(content, context);
      
      // Cache result for future use
      this.classificationCache.set(cacheKey, classification);
      
      logger.debug('Message classified', { 
        classification, 
        duration: Date.now() - startTime,
        contentLength: content.length,
        recipientCount: context.recipients.length
      });

      return classification;
    } catch (error) {
      logger.error('Classification error', { error, contentLength: content.length });
      
      // Return safe default classification on error
      return this.getDefaultClassification();
    }
  }

  /**
   * Perform actual classification logic
   */
  private performClassification(content: string, context: ClassificationContext): MessageClassification {
    const lowerContent = content.toLowerCase();
    const words = new Set(lowerContent.split(/\s+/));
    
    // Classify content category (optimized with Set operations)
    const contentCategory = this.classifyContentCategory(words);
    
    // Assess risk level
    const { riskLevel, flaggedKeywords } = this.assessRiskLevel(words);
    
    // Determine if educational record
    const isEducationalRecord = this.detectEducationalContent(words, contentCategory, context);
    
    // Determine compliance requirements
    const complianceLevel = this.determineComplianceLevel(contentCategory, riskLevel, isEducationalRecord, context);
    
    // Determine encryption level
    const encryptionLevel = this.determineEncryptionLevel(riskLevel, isEducationalRecord, complianceLevel);
    
    // Determine legal basis
    const legalBasis = this.determineLegalBasis(contentCategory, isEducationalRecord, context);
    
    // Determine retention period
    const retentionPeriod = this.determineRetentionPeriod(isEducationalRecord, contentCategory);
    
    // Check cross-border transfer risk
    const crossBorderTransferRisk = this.assessCrossBorderRisk(context);

    return {
      contentCategory,
      riskLevel,
      complianceLevel,
      isEducationalRecord,
      flaggedKeywords,
      moderationRequired: riskLevel === 'HIGH' || riskLevel === 'CRITICAL',
      auditRequired: isEducationalRecord || complianceLevel === 'high' || complianceLevel === 'critical',
      encryptionLevel,
      legalBasis,
      retentionPeriod,
      crossBorderTransferRisk
    };
  }

  /**
   * Optimized content category classification using Set operations
   */
  private classifyContentCategory(words: Set<string>): ContentCategory {
    let maxScore = 0;
    let category: ContentCategory = 'GENERAL';

    for (const [categoryName, keywords] of Object.entries(RuleBasedMessageClassifier.KEYWORD_CATEGORIES)) {
      const intersection = new Set([...words].filter(word => keywords.has(word)));
      const score = intersection.size;
      
      if (score > maxScore) {
        maxScore = score;
        category = categoryName.toUpperCase() as ContentCategory;
      }
    }

    return category;
  }

  /**
   * Optimized risk assessment with keyword flagging
   */
  private assessRiskLevel(words: Set<string>): { riskLevel: RiskLevel; flaggedKeywords: string[] } {
    const flaggedKeywords: string[] = [];
    
    // Check critical risk first (highest priority)
    for (const word of words) {
      if (RuleBasedMessageClassifier.RISK_KEYWORDS.critical.has(word)) {
        flaggedKeywords.push(word);
      }
    }
    if (flaggedKeywords.length > 0) {
      return { riskLevel: 'CRITICAL', flaggedKeywords };
    }

    // Check high risk
    for (const word of words) {
      if (RuleBasedMessageClassifier.RISK_KEYWORDS.high.has(word)) {
        flaggedKeywords.push(word);
      }
    }
    if (flaggedKeywords.length > 0) {
      return { riskLevel: 'HIGH', flaggedKeywords };
    }

    // Check medium risk
    for (const word of words) {
      if (RuleBasedMessageClassifier.RISK_KEYWORDS.medium.has(word)) {
        flaggedKeywords.push(word);
      }
    }
    if (flaggedKeywords.length > 0) {
      return { riskLevel: 'MEDIUM', flaggedKeywords };
    }

    return { riskLevel: 'LOW', flaggedKeywords: [] };
  }

  /**
   * Detect educational records (FERPA compliance)
   */
  private detectEducationalContent(
    words: Set<string>, 
    category: ContentCategory, 
    context: ClassificationContext
  ): boolean {
    // Academic category is likely educational
    if (category === 'ACADEMIC') return true;
    
    // Check for educational record keywords
    for (const word of words) {
      if (RuleBasedMessageClassifier.EDUCATIONAL_RECORD_KEYWORDS.has(word)) {
        return true;
      }
    }
    
    // Check context - teacher to student/parent communication
    const hasTeacher = context.sender.userType === 'TEACHER' || 
                      context.recipients.some(r => r.userType === 'TEACHER');
    const hasStudent = context.sender.userType === 'CAMPUS_STUDENT' || 
                      context.recipients.some(r => r.userType === 'CAMPUS_STUDENT');
    
    return hasTeacher && hasStudent;
  }

  /**
   * Performance-optimized cache key generation
   */
  private createCacheKey(content: string, context: ClassificationContext): string {
    const contentHash = this.simpleHash(content);
    const contextHash = this.simpleHash(
      `${context.sender.userType}-${context.recipients.map(r => r.userType).sort().join(',')}-${context.classId || ''}`
    );
    return `${contentHash}-${contextHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Determine compliance level based on classification
   */
  private determineComplianceLevel(
    category: ContentCategory,
    risk: RiskLevel,
    isEducational: boolean,
    context: ClassificationContext
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (risk === 'CRITICAL') return 'critical';
    if (isEducational || risk === 'HIGH') return 'high';
    if (category === 'ADMINISTRATIVE' || risk === 'MEDIUM') return 'medium';
    return 'low';
  }

  /**
   * Determine encryption level
   */
  private determineEncryptionLevel(
    risk: RiskLevel,
    isEducational: boolean,
    compliance: string
  ): EncryptionLevel {
    if (isEducational) return 'EDUCATIONAL_RECORD';
    if (risk === 'CRITICAL' || risk === 'HIGH') return 'ENHANCED';
    return 'STANDARD';
  }

  /**
   * Determine legal basis for processing
   */
  private determineLegalBasis(
    category: ContentCategory,
    isEducational: boolean,
    context: ClassificationContext
  ): LegalBasis {
    if (isEducational) return 'LEGITIMATE_INTEREST';
    if (category === 'ADMINISTRATIVE') return 'CONTRACT';
    return 'LEGITIMATE_INTEREST';
  }

  /**
   * Determine retention period in days
   */
  private determineRetentionPeriod(isEducational: boolean, category: ContentCategory): number {
    if (isEducational) return 2555; // 7 years for educational records
    if (category === 'ADMINISTRATIVE') return 1095; // 3 years for admin
    return 365; // 1 year for general messages
  }

  /**
   * Assess cross-border transfer risk
   */
  private assessCrossBorderRisk(context: ClassificationContext): boolean {
    // Simplified implementation - would need actual user location data
    return false;
  }

  /**
   * Get default safe classification
   */
  private getDefaultClassification(): MessageClassification {
    return {
      contentCategory: 'GENERAL',
      riskLevel: 'LOW',
      complianceLevel: 'low',
      isEducationalRecord: false,
      flaggedKeywords: [],
      moderationRequired: false,
      auditRequired: false,
      encryptionLevel: 'STANDARD',
      legalBasis: 'LEGITIMATE_INTEREST',
      retentionPeriod: 365,
      crossBorderTransferRisk: false
    };
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return {
      size: this.classificationCache.size,
      max: this.classificationCache.max,
      calculatedSize: this.classificationCache.calculatedSize,
    };
  }

  /**
   * Clear cache (for testing or maintenance)
   */
  clearCache() {
    this.classificationCache.clear();
  }
}
