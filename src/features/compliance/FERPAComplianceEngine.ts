/**
 * High-Performance FERPA Compliance Engine
 * Simplified to work with existing system patterns and tRPC APIs
 */

import { logger } from '@/server/api/utils/logger';
import { LRUCache } from 'lru-cache';

// Define types that match our schema enums
type EncryptionLevel = 'STANDARD' | 'ENHANCED' | 'EDUCATIONAL_RECORD';
type DirectoryLevel = 'PUBLIC' | 'RESTRICTED' | 'CONFIDENTIAL';

// Simplified interfaces
interface User {
  id: string;
  userType: string;
  dateOfBirth?: Date;
}

export interface FERPAClassification {
  isEducationalRecord: boolean;
  directoryInformationLevel: DirectoryLevel;
  parentalConsentRequired: boolean;
  disclosureLoggingRequired: boolean;
  ferpaProtectionLevel: 'none' | 'basic' | 'enhanced' | 'strict';
}

/**
 * High-performance FERPA compliance engine with caching
 * Simplified to work with existing system patterns
 */
export class FERPAComplianceEngine {
  // Performance optimization: Cache FERPA classifications
  private ferpaCache = new LRUCache<string, FERPAClassification>({
    max: 20000, // Cache 20K FERPA classifications
    ttl: 15 * 60 * 1000, // 15 minutes TTL
  });

  // Educational record keywords (optimized Set for fast lookups)
  private static readonly EDUCATIONAL_RECORD_KEYWORDS = new Set([
    'grade', 'score', 'mark', 'result', 'assessment', 'evaluation', 'performance',
    'progress', 'report', 'transcript', 'record', 'attendance', 'absence',
    'behavior', 'discipline', 'special needs', 'accommodation', 'iep', '504',
    'gpa', 'credit', 'course', 'class', 'assignment', 'homework', 'test',
    'quiz', 'exam', 'project', 'submission', 'feedback', 'comment'
  ]);

  // Directory information keywords
  private static readonly DIRECTORY_INFO_KEYWORDS = new Set([
    'name', 'address', 'phone', 'email', 'photo', 'birth', 'enrollment',
    'major', 'degree', 'award', 'honor', 'activity', 'sport', 'height', 'weight'
  ]);

  constructor() {}

  /**
   * Classify FERPA requirements with caching
   */
  classifyFERPARequirements(
    content: string,
    sender: User,
    recipients: User[]
  ): FERPAClassification {
    // Create cache key
    const cacheKey = this.createFERPACacheKey(content, sender, recipients);
    const cached = this.ferpaCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Perform classification
    const classification = this.performFERPAClassification(content, sender, recipients);
    
    // Cache result
    this.ferpaCache.set(cacheKey, classification);
    
    return classification;
  }

  /**
   * Perform actual FERPA classification
   */
  private performFERPAClassification(
    content: string,
    sender: User,
    recipients: User[]
  ): FERPAClassification {
    const lowerContent = content.toLowerCase();
    const words = new Set(lowerContent.split(/\s+/));
    
    // Check if content contains educational records
    const hasEducationalRecords = this.detectEducationalRecords(words);
    
    // Check if this is directory information
    const isDirectoryInfo = this.detectDirectoryInformation(words);
    
    // Determine if participants are in educational context
    const isEducationalContext = this.isEducationalContext(sender, recipients);
    
    // Check if any recipients are minors (simplified - would need actual age data)
    const hasMinorRecipients = false; // Simplified for now
    
    // Determine protection level
    let ferpaProtectionLevel: 'none' | 'basic' | 'enhanced' | 'strict' = 'none';
    let directoryInformationLevel: DirectoryLevel = 'PUBLIC';
    
    if (hasEducationalRecords && isEducationalContext) {
      ferpaProtectionLevel = hasMinorRecipients ? 'strict' : 'enhanced';
      directoryInformationLevel = 'CONFIDENTIAL';
    } else if (isDirectoryInfo && isEducationalContext) {
      ferpaProtectionLevel = 'basic';
      directoryInformationLevel = 'RESTRICTED';
    } else if (isEducationalContext) {
      ferpaProtectionLevel = 'basic';
      directoryInformationLevel = 'PUBLIC';
    }

    return {
      isEducationalRecord: hasEducationalRecords && isEducationalContext,
      directoryInformationLevel,
      parentalConsentRequired: hasMinorRecipients && (hasEducationalRecords || isDirectoryInfo),
      disclosureLoggingRequired: hasEducationalRecords && isEducationalContext,
      ferpaProtectionLevel
    };
  }

  /**
   * Detect educational records in content
   */
  private detectEducationalRecords(words: Set<string>): boolean {
    for (const word of words) {
      if (FERPAComplianceEngine.EDUCATIONAL_RECORD_KEYWORDS.has(word)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect directory information in content
   */
  private detectDirectoryInformation(words: Set<string>): boolean {
    for (const word of words) {
      if (FERPAComplianceEngine.DIRECTORY_INFO_KEYWORDS.has(word)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if communication is in educational context
   */
  private isEducationalContext(sender: User, recipients: User[]): boolean {
    const educationalRoles = ['TEACHER', 'CAMPUS_STUDENT', 'CAMPUS_ADMIN', 'COORDINATOR'];
    
    const senderIsEducational = educationalRoles.includes(sender.userType);
    const hasEducationalRecipient = recipients.some(r => educationalRoles.includes(r.userType));
    
    return senderIsEducational || hasEducationalRecipient;
  }

  /**
   * Create cache key for FERPA classification
   */
  private createFERPACacheKey(content: string, sender: User, recipients: User[]): string {
    const contentHash = this.simpleHash(content.substring(0, 100)); // First 100 chars
    const participantHash = this.simpleHash(
      `${sender.userType}-${recipients.map(r => r.userType).sort().join(',')}`
    );
    return `ferpa-${contentHash}-${participantHash}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get FERPA engine statistics
   */
  getStats() {
    return {
      ferpaCache: {
        size: this.ferpaCache.size,
        max: this.ferpaCache.max,
        calculatedSize: this.ferpaCache.calculatedSize,
      }
    };
  }

  /**
   * Clear caches (for testing or maintenance)
   */
  clearCaches(): void {
    this.ferpaCache.clear();
  }
}
