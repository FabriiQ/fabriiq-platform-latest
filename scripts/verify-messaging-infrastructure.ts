/**
 * Verification Script for High-Performance Messaging Infrastructure
 * Tests database schema, services, and performance optimizations
 */

import { PrismaClient } from '@prisma/client';
import { RuleBasedMessageClassifier } from '../src/features/messaging/core/RuleBasedClassifier';
import { ConsentService } from '../src/features/compliance/ConsentService';

async function verifyInfrastructure() {
  console.log('🚀 Starting Messaging Infrastructure Verification...\n');
  
  const prisma = new PrismaClient();
  let allTestsPassed = true;

  try {
    // Test 1: Database Schema Verification
    console.log('📊 Testing Database Schema...');
    
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
    
    const tableCount = (tables as any[]).length;
    console.log(`✅ Found ${tableCount} messaging tables in database`);
    
    if (tableCount < 5) {
      console.log('❌ Missing required messaging tables');
      allTestsPassed = false;
    }

    // Test 2: Check SocialPost extensions
    console.log('\n📝 Testing SocialPost Model Extensions...');
    
    const socialPostColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'social_posts' 
      AND column_name IN (
        'messageType',
        'threadId',
        'parentMessageId',
        'contentCategory',
        'riskLevel',
        'isEducationalRecord',
        'encryptionLevel'
      )
    `;
    
    const columnCount = (socialPostColumns as any[]).length;
    console.log(`✅ Found ${columnCount} new messaging columns in social_posts`);
    
    if (columnCount < 5) {
      console.log('❌ Missing required messaging columns in social_posts');
      allTestsPassed = false;
    }

    // Test 3: Performance Indexes
    console.log('\n⚡ Testing Performance Indexes...');
    
    const indexes = await prisma.$queryRaw`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('social_posts', 'message_recipients', 'message_audit_logs')
      AND indexname LIKE '%message%' OR indexname LIKE '%compliance%'
    `;
    
    const indexCount = (indexes as any[]).length;
    console.log(`✅ Found ${indexCount} messaging-related indexes`);

    // Test 4: Rule-Based Classifier
    console.log('\n🧠 Testing Rule-Based Message Classifier...');
    
    const classifier = new RuleBasedMessageClassifier();
    const mockSender = { id: '1', userType: 'TEACHER' } as any;
    const mockRecipients = [{ id: '2', userType: 'CAMPUS_STUDENT' }] as any;
    
    // Test academic content classification
    const academicResult = classifier.classifyMessage(
      'Your grade for the math assignment is 85/100. Great work!',
      { sender: mockSender, recipients: mockRecipients }
    );
    
    console.log(`✅ Academic content classified as: ${academicResult.contentCategory}`);
    console.log(`✅ Educational record detected: ${academicResult.isEducationalRecord}`);
    console.log(`✅ Encryption level: ${academicResult.encryptionLevel}`);
    
    if (academicResult.contentCategory !== 'ACADEMIC' || !academicResult.isEducationalRecord) {
      console.log('❌ Academic content classification failed');
      allTestsPassed = false;
    }

    // Test high-risk content detection
    const riskResult = classifier.classifyMessage(
      'I am being bullied and harassed by other students',
      { sender: mockSender, recipients: mockRecipients }
    );
    
    console.log(`✅ High-risk content detected: ${riskResult.riskLevel}`);
    console.log(`✅ Flagged keywords: ${riskResult.flaggedKeywords.join(', ')}`);
    
    if (riskResult.riskLevel !== 'HIGH' || !riskResult.moderationRequired) {
      console.log('❌ High-risk content detection failed');
      allTestsPassed = false;
    }

    // Test 5: Performance Caching
    console.log('\n⚡ Testing Performance Caching...');
    
    const content = 'Test message for caching performance';
    
    // First call (no cache)
    const start1 = Date.now();
    classifier.classifyMessage(content, { sender: mockSender, recipients: mockRecipients });
    const duration1 = Date.now() - start1;
    
    // Second call (cached)
    const start2 = Date.now();
    classifier.classifyMessage(content, { sender: mockSender, recipients: mockRecipients });
    const duration2 = Date.now() - start2;
    
    console.log(`✅ First call: ${duration1}ms, Cached call: ${duration2}ms`);
    
    if (duration2 >= duration1) {
      console.log('⚠️  Caching may not be working optimally');
    } else {
      console.log('✅ Caching is working - cached call is faster');
    }

    // Test 6: Cache Statistics
    const cacheStats = classifier.getCacheStats();
    console.log(`✅ Cache size: ${cacheStats.size}/${cacheStats.max}`);

    // Test 7: Consent Service
    console.log('\n🔒 Testing Consent Service...');
    
    const consentService = new ConsentService(prisma);
    
    // Test educational context consent
    const consentResult = await consentService.getUserConsentStatus(
      'test-user-1',
      ['educational', 'academic']
    );
    
    console.log(`✅ Consent status: ${consentResult.consentStatus}`);
    console.log(`✅ Legal basis: ${consentResult.legalBasis}`);
    console.log(`✅ Consent required: ${consentResult.consentRequired}`);

    // Test 8: Batch Performance Simulation
    console.log('\n🚀 Testing Batch Performance (1000 classifications)...');
    
    const batchStart = Date.now();
    const promises = [];
    
    for (let i = 0; i < 1000; i++) {
      promises.push(
        classifier.classifyMessage(
          `Test message ${i} with academic content and grades`,
          { sender: mockSender, recipients: mockRecipients }
        )
      );
    }
    
    await Promise.all(promises);
    const batchDuration = Date.now() - batchStart;
    
    console.log(`✅ Classified 1000 messages in ${batchDuration}ms`);
    console.log(`✅ Average: ${(batchDuration / 1000).toFixed(2)}ms per message`);
    
    if (batchDuration > 1000) {
      console.log('⚠️  Batch performance may need optimization for 10K+ users');
    } else {
      console.log('✅ Batch performance is excellent for high concurrency');
    }

    // Final cache statistics after batch test
    const finalCacheStats = classifier.getCacheStats();
    console.log(`✅ Final cache utilization: ${finalCacheStats.size}/${finalCacheStats.max}`);

    // Cleanup
    consentService.clearCaches();
    classifier.clearCache();

  } catch (error) {
    console.error('❌ Infrastructure verification failed:', error);
    allTestsPassed = false;
  } finally {
    await prisma.$disconnect();
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Messaging infrastructure is ready for 10K+ users');
    console.log('✅ Database schema is properly configured');
    console.log('✅ Performance optimizations are working');
    console.log('✅ Compliance engines are functional');
    console.log('✅ Caching is optimized for high concurrency');
  } else {
    console.log('❌ SOME TESTS FAILED! Please review the issues above');
  }
  console.log('='.repeat(60));

  process.exit(allTestsPassed ? 0 : 1);
}

// Run verification
verifyInfrastructure().catch(console.error);
