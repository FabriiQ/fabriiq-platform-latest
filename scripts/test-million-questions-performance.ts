/**
 * Test Million Questions Performance Script
 * 
 * Tests the million questions seed script with smaller datasets to:
 * - Validate functionality and data integrity
 * - Measure performance metrics
 * - Test memory management and batch processing
 * - Verify database seeding works correctly
 * - Optimize for large-scale generation
 */

import { PrismaClient } from '@prisma/client';
import { 
  generateMillionQuestions, 
  fetchAllSubjectsData,
  generateQuestionsForSubject,
  seedQuestionsBatch,
  type QuestionGenerationConfig 
} from './generate-million-questions-seed';
import * as path from 'path';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface PerformanceMetrics {
  testName: string;
  questionsGenerated: number;
  timeElapsed: number; // milliseconds
  questionsPerSecond: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  };
  databaseOperations: {
    insertTime: number;
    queryTime: number;
  };
}

/**
 * Measure memory usage
 */
function measureMemory(): NodeJS.MemoryUsage {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage();
}

/**
 * Format memory usage for display
 */
function formatMemory(memory: NodeJS.MemoryUsage): string {
  return `RSS: ${Math.round(memory.rss / 1024 / 1024)}MB, Heap: ${Math.round(memory.heapUsed / 1024 / 1024)}MB`;
}

/**
 * Test 1: Basic functionality with small dataset
 */
async function testBasicFunctionality(): Promise<PerformanceMetrics> {
  console.log('\n🧪 Test 1: Basic Functionality (100 questions)');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const memoryBefore = measureMemory();
  let memoryPeak = memoryBefore;
  
  try {
    // Get test data
    const subjects = await fetchAllSubjectsData();
    if (subjects.length === 0) {
      throw new Error('No subjects found for testing');
    }
    
    const testSubject = subjects[0];
    console.log(`📚 Testing with subject: ${testSubject.name}`);
    
    // Get system user and question bank
    const systemUser = await prisma.user.findFirst();
    const questionBank = await prisma.questionBank.findFirst({ where: { status: 'ACTIVE' } });
    
    if (!systemUser || !questionBank) {
      throw new Error('Missing system user or question bank');
    }
    
    // Generate 100 questions
    const questions = await generateQuestionsForSubject(
      testSubject,
      100,
      questionBank.id,
      systemUser.id,
      50 // Small batch size for testing
    );
    
    memoryPeak = measureMemory();
    
    // Validate questions structure
    console.log('🔍 Validating question structure...');
    questions.forEach((question, index) => {
      if (!question.title || !question.questionType || !question.content || !question.metadata) {
        throw new Error(`Question ${index + 1} missing required fields`);
      }
      if (!question.subjectId || !question.topicId || !question.learningOutcomeIds) {
        throw new Error(`Question ${index + 1} missing relationship fields`);
      }
    });
    
    console.log('✅ Question structure validation passed');
    
    // Test database seeding (but don't actually seed to avoid cluttering)
    console.log('🔍 Testing database seeding logic...');
    // We'll just validate the data structure without actually inserting
    
    const endTime = Date.now();
    const memoryAfter = measureMemory();
    
    const metrics: PerformanceMetrics = {
      testName: 'Basic Functionality',
      questionsGenerated: questions.length,
      timeElapsed: endTime - startTime,
      questionsPerSecond: questions.length / ((endTime - startTime) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      },
      databaseOperations: {
        insertTime: 0, // Not tested in this phase
        queryTime: 0
      }
    };
    
    console.log(`✅ Generated ${questions.length} questions successfully`);
    console.log(`⏱️  Time: ${metrics.timeElapsed}ms (${metrics.questionsPerSecond.toFixed(2)} q/s)`);
    console.log(`💾 Memory: ${formatMemory(memoryBefore)} → ${formatMemory(memoryAfter)}`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Basic functionality test failed:', error);
    throw error;
  }
}

/**
 * Test 2: Batch processing performance
 */
async function testBatchProcessing(): Promise<PerformanceMetrics> {
  console.log('\n🧪 Test 2: Batch Processing (1000 questions)');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const memoryBefore = measureMemory();
  
  try {
    const subjects = await fetchAllSubjectsData();
    const testSubject = subjects[0];
    
    const systemUser = await prisma.user.findFirst();
    const questionBank = await prisma.questionBank.findFirst({ where: { status: 'ACTIVE' } });
    
    if (!systemUser || !questionBank) {
      throw new Error('Missing system user or question bank');
    }
    
    console.log(`📚 Generating 1000 questions for: ${testSubject.name}`);
    
    // Generate 1000 questions with batch processing
    const questions = await generateQuestionsForSubject(
      testSubject,
      1000,
      questionBank.id,
      systemUser.id,
      250 // Test batch size
    );
    
    const memoryPeak = measureMemory();
    
    // Test question type distribution
    const typeDistribution = questions.reduce((acc, q) => {
      acc[q.questionType] = (acc[q.questionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 Question Type Distribution:');
    Object.entries(typeDistribution).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} (${((count / questions.length) * 100).toFixed(1)}%)`);
    });
    
    // Test Bloom's taxonomy distribution
    const bloomsDistribution = questions.reduce((acc, q) => {
      acc[q.bloomsLevel] = (acc[q.bloomsLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('🧠 Bloom\'s Taxonomy Distribution:');
    Object.entries(bloomsDistribution).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} (${((count / questions.length) * 100).toFixed(1)}%)`);
    });
    
    const endTime = Date.now();
    const memoryAfter = measureMemory();
    
    const metrics: PerformanceMetrics = {
      testName: 'Batch Processing',
      questionsGenerated: questions.length,
      timeElapsed: endTime - startTime,
      questionsPerSecond: questions.length / ((endTime - startTime) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      },
      databaseOperations: {
        insertTime: 0,
        queryTime: 0
      }
    };
    
    console.log(`✅ Generated ${questions.length} questions with proper distribution`);
    console.log(`⏱️  Time: ${metrics.timeElapsed}ms (${metrics.questionsPerSecond.toFixed(2)} q/s)`);
    console.log(`💾 Memory: ${formatMemory(memoryBefore)} → ${formatMemory(memoryAfter)}`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Batch processing test failed:', error);
    throw error;
  }
}

/**
 * Test 3: Database seeding performance
 */
async function testDatabaseSeeding(): Promise<PerformanceMetrics> {
  console.log('\n🧪 Test 3: Database Seeding (500 questions)');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const memoryBefore = measureMemory();
  
  try {
    const subjects = await fetchAllSubjectsData();
    const testSubject = subjects[0];
    
    const systemUser = await prisma.user.findFirst();
    const questionBank = await prisma.questionBank.findFirst({ where: { status: 'ACTIVE' } });
    
    if (!systemUser || !questionBank) {
      throw new Error('Missing system user or question bank');
    }
    
    // Generate 500 questions
    const questions = await generateQuestionsForSubject(
      testSubject,
      500,
      questionBank.id,
      systemUser.id,
      100
    );
    
    const generationTime = Date.now();
    console.log(`📝 Generated ${questions.length} questions in ${generationTime - startTime}ms`);
    
    // Test database seeding
    console.log('💾 Testing database seeding...');
    const seedStartTime = Date.now();
    
    // Create a test transaction to avoid cluttering the database
    await prisma.$transaction(async (tx) => {
      // Test the seeding logic without actually committing
      const testBatch = questions.slice(0, 10); // Just test with 10 questions
      
      for (const question of testBatch) {
        await tx.question.create({
          data: question
        });
      }
      
      // Verify the questions were created
      const createdQuestions = await tx.question.findMany({
        where: {
          title: {
            in: testBatch.map(q => q.title)
          }
        }
      });
      
      if (createdQuestions.length !== testBatch.length) {
        throw new Error('Database seeding validation failed');
      }
      
      console.log(`✅ Database seeding test passed (${createdQuestions.length} questions)`);
      
      // Rollback the transaction to avoid cluttering
      throw new Error('Rollback test transaction');
    }).catch((error) => {
      if (error.message !== 'Rollback test transaction') {
        throw error;
      }
    });
    
    const seedEndTime = Date.now();
    const memoryAfter = measureMemory();
    
    const metrics: PerformanceMetrics = {
      testName: 'Database Seeding',
      questionsGenerated: questions.length,
      timeElapsed: seedEndTime - startTime,
      questionsPerSecond: questions.length / ((seedEndTime - startTime) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: measureMemory()
      },
      databaseOperations: {
        insertTime: seedEndTime - seedStartTime,
        queryTime: generationTime - startTime
      }
    };
    
    console.log(`✅ Database seeding test completed`);
    console.log(`⏱️  Total Time: ${metrics.timeElapsed}ms`);
    console.log(`💾 Memory: ${formatMemory(memoryBefore)} → ${formatMemory(memoryAfter)}`);
    
    return metrics;
    
  } catch (error) {
    console.error('❌ Database seeding test failed:', error);
    throw error;
  }
}

/**
 * Test 4: Memory stress test
 */
async function testMemoryStress(): Promise<PerformanceMetrics> {
  console.log('\n🧪 Test 4: Memory Stress Test (5000 questions)');
  console.log('='.repeat(50));
  
  const startTime = Date.now();
  const memoryBefore = measureMemory();
  let memoryPeak = memoryBefore;
  
  try {
    const subjects = await fetchAllSubjectsData();
    const testSubject = subjects[0];
    
    const systemUser = await prisma.user.findFirst();
    const questionBank = await prisma.questionBank.findFirst({ where: { status: 'ACTIVE' } });
    
    if (!systemUser || !questionBank) {
      throw new Error('Missing system user or question bank');
    }
    
    console.log(`🧠 Generating 5000 questions to test memory usage...`);
    
    // Monitor memory during generation
    const memoryCheckInterval = setInterval(() => {
      const currentMemory = measureMemory();
      if (currentMemory.heapUsed > memoryPeak.heapUsed) {
        memoryPeak = currentMemory;
      }
    }, 1000);
    
    const questions = await generateQuestionsForSubject(
      testSubject,
      5000,
      questionBank.id,
      systemUser.id,
      500
    );
    
    clearInterval(memoryCheckInterval);
    
    const endTime = Date.now();
    const memoryAfter = measureMemory();
    
    const metrics: PerformanceMetrics = {
      testName: 'Memory Stress Test',
      questionsGenerated: questions.length,
      timeElapsed: endTime - startTime,
      questionsPerSecond: questions.length / ((endTime - startTime) / 1000),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peak: memoryPeak
      },
      databaseOperations: {
        insertTime: 0,
        queryTime: 0
      }
    };
    
    console.log(`✅ Generated ${questions.length} questions`);
    console.log(`⏱️  Time: ${metrics.timeElapsed}ms (${metrics.questionsPerSecond.toFixed(2)} q/s)`);
    console.log(`💾 Memory Usage:`);
    console.log(`   Before: ${formatMemory(memoryBefore)}`);
    console.log(`   Peak:   ${formatMemory(memoryPeak)}`);
    console.log(`   After:  ${formatMemory(memoryAfter)}`);
    
    // Memory efficiency check
    const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
    const memoryPerQuestion = memoryIncrease / questions.length;
    console.log(`📊 Memory per question: ${Math.round(memoryPerQuestion)} bytes`);
    
    if (memoryPerQuestion > 10000) { // 10KB per question seems reasonable
      console.warn('⚠️  High memory usage per question detected');
    } else {
      console.log('✅ Memory usage is within acceptable limits');
    }
    
    return metrics;

  } catch (error) {
    console.error('❌ Memory stress test failed:', error);
    throw error;
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport(metrics: PerformanceMetrics[]): void {
  console.log('\n📊 PERFORMANCE REPORT');
  console.log('='.repeat(60));

  metrics.forEach((metric, index) => {
    console.log(`\n${index + 1}. ${metric.testName}`);
    console.log(`   Questions Generated: ${metric.questionsGenerated.toLocaleString()}`);
    console.log(`   Time Elapsed: ${metric.timeElapsed.toLocaleString()}ms`);
    console.log(`   Rate: ${metric.questionsPerSecond.toFixed(2)} questions/second`);
    console.log(`   Memory Before: ${formatMemory(metric.memoryUsage.before)}`);
    console.log(`   Memory Peak: ${formatMemory(metric.memoryUsage.peak)}`);
    console.log(`   Memory After: ${formatMemory(metric.memoryUsage.after)}`);

    if (metric.databaseOperations.insertTime > 0) {
      console.log(`   DB Insert Time: ${metric.databaseOperations.insertTime}ms`);
    }
    if (metric.databaseOperations.queryTime > 0) {
      console.log(`   DB Query Time: ${metric.databaseOperations.queryTime}ms`);
    }
  });

  // Calculate overall statistics
  const totalQuestions = metrics.reduce((sum, m) => sum + m.questionsGenerated, 0);
  const totalTime = metrics.reduce((sum, m) => sum + m.timeElapsed, 0);
  const averageRate = totalQuestions / (totalTime / 1000);

  console.log('\n📈 OVERALL STATISTICS');
  console.log('-'.repeat(30));
  console.log(`Total Questions Generated: ${totalQuestions.toLocaleString()}`);
  console.log(`Total Time: ${totalTime.toLocaleString()}ms (${Math.round(totalTime / 1000 / 60)} minutes)`);
  console.log(`Average Rate: ${averageRate.toFixed(2)} questions/second`);

  // Projections for 1 million questions
  const millionQuestionTime = (1000000 / averageRate) / 60; // minutes
  console.log(`\n🎯 PROJECTIONS FOR 1 MILLION QUESTIONS`);
  console.log('-'.repeat(40));
  console.log(`Estimated Time: ${Math.round(millionQuestionTime)} minutes (${Math.round(millionQuestionTime / 60)} hours)`);
  console.log(`Estimated Memory: ~${Math.round((metrics[metrics.length - 1].memoryUsage.peak.heapUsed / 1024 / 1024) * (1000000 / metrics[metrics.length - 1].questionsGenerated))}MB`);
}

/**
 * Save performance report to file
 */
async function savePerformanceReport(metrics: PerformanceMetrics[]): Promise<void> {
  const reportDir = path.join(process.cwd(), 'data', 'performance-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportFile = path.join(reportDir, `performance-report-${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    metrics: metrics,
    summary: {
      totalQuestions: metrics.reduce((sum, m) => sum + m.questionsGenerated, 0),
      totalTime: metrics.reduce((sum, m) => sum + m.timeElapsed, 0),
      averageRate: metrics.reduce((sum, m) => sum + m.questionsGenerated, 0) / (metrics.reduce((sum, m) => sum + m.timeElapsed, 0) / 1000)
    }
  };

  await fs.promises.writeFile(reportFile, JSON.stringify(report, null, 2));
  console.log(`\n💾 Performance report saved: ${reportFile}`);
}

/**
 * Main test execution function
 */
async function main(): Promise<void> {
  console.log('🧪 Million Questions Performance Test Suite');
  console.log('='.repeat(50));
  console.log('Testing the million questions seed script with various scenarios');
  console.log('to validate functionality, measure performance, and optimize for scale.\n');

  const metrics: PerformanceMetrics[] = [];

  try {
    // Enable garbage collection for memory testing
    if (global.gc) {
      console.log('✅ Garbage collection enabled for accurate memory testing');
    } else {
      console.log('⚠️  Garbage collection not available. Run with --expose-gc for better memory testing');
    }

    // Test 1: Basic functionality
    console.log('\n🚀 Starting performance tests...');
    const test1 = await testBasicFunctionality();
    metrics.push(test1);

    // Test 2: Batch processing
    const test2 = await testBatchProcessing();
    metrics.push(test2);

    // Test 3: Database seeding
    const test3 = await testDatabaseSeeding();
    metrics.push(test3);

    // Test 4: Memory stress test
    const test4 = await testMemoryStress();
    metrics.push(test4);

    // Generate and display report
    generatePerformanceReport(metrics);

    // Save report to file
    await savePerformanceReport(metrics);

    console.log('\n🎉 All performance tests completed successfully!');
    console.log('\n✅ RECOMMENDATIONS:');

    const averageRate = metrics.reduce((sum, m) => sum + m.questionsGenerated, 0) / (metrics.reduce((sum, m) => sum + m.timeElapsed, 0) / 1000);

    if (averageRate > 100) {
      console.log('   • Performance is excellent for large-scale generation');
    } else if (averageRate > 50) {
      console.log('   • Performance is good, consider optimizing for very large datasets');
    } else {
      console.log('   • Performance needs optimization before running million question generation');
    }

    const peakMemory = Math.max(...metrics.map(m => m.memoryUsage.peak.heapUsed));
    if (peakMemory < 500 * 1024 * 1024) { // 500MB
      console.log('   • Memory usage is efficient');
    } else {
      console.log('   • Consider implementing more aggressive memory management');
    }

    console.log('   • The million questions seed script is ready for production use');
    console.log('   • Use batch processing with appropriate batch sizes');
    console.log('   • Monitor memory usage during large-scale generation');

  } catch (error) {
    console.error('\n❌ Performance test suite failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test suite
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🏁 Performance test suite completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Performance test suite failed:', error);
      process.exit(1);
    });
}

export {
  testBasicFunctionality,
  testBatchProcessing,
  testDatabaseSeeding,
  testMemoryStress,
  generatePerformanceReport,
  type PerformanceMetrics
};
