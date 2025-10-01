/**
 * Performance testing and validation script for bulk upload functionality
 * Tests upload performance with large datasets and validates data integrity
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { QuestionBankService } from '../src/features/question-bank/services/question-bank.service';
import { OptimizedBulkUploadService } from '../src/features/question-bank/services/optimized-bulk-upload.service';
import { QuestionType, DifficultyLevel } from '../src/features/question-bank/models/types';

const prisma = new PrismaClient();

interface PerformanceTestResult {
  filename: string;
  questionCount: number;
  uploadTime: number;
  questionsPerSecond: number;
  memoryUsage: {
    before: number;
    peak: number;
    after: number;
  };
  successful: number;
  failed: number;
  errors: any[];
}

interface ValidationResult {
  totalQuestions: number;
  validQuestions: number;
  invalidQuestions: number;
  validationErrors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

/**
 * Parse CSV file and convert to question objects
 */
function parseCSVFile(filePath: string): any[] {
  console.log(`📄 Parsing CSV file: ${filePath}`);
  
  const csvContent = readFileSync(filePath, 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const questions = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple CSV parsing (handles basic cases)
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length !== headers.length) {
      console.warn(`⚠️  Row ${i + 1} has ${values.length} values but expected ${headers.length}`);
      continue;
    }
    
    const question: any = {};
    headers.forEach((header, index) => {
      let value = values[index];
      
      // Handle special fields
      if (header === 'keywords' && value) {
        try {
          question[header] = JSON.parse(value);
        } catch {
          question[header] = [value];
        }
      } else if (header === 'rubric' && value) {
        try {
          question[header] = JSON.parse(value);
        } catch {
          question[header] = value;
        }
      } else if (header === 'wordLimit' && value) {
        question[header] = parseInt(value) || null;
      } else if (header === 'gradeLevel' && value) {
        question[header] = parseInt(value) || null;
      } else if (header === 'year' && value) {
        question[header] = parseInt(value) || null;
      } else if (header.includes('Correct') && value) {
        question[header] = value.toLowerCase() === 'true';
      } else {
        question[header] = value || null;
      }
    });
    
    // Convert to proper question format
    const formattedQuestion = formatQuestionForUpload(question);
    if (formattedQuestion) {
      questions.push(formattedQuestion);
    }
  }
  
  console.log(`   ✅ Parsed ${questions.length} questions from ${lines.length - 1} rows`);
  return questions;
}

/**
 * Format question data for upload
 */
function formatQuestionForUpload(csvQuestion: any): any {
  try {
    // Build content object based on question type
    const content: any = {
      text: csvQuestion.text || csvQuestion.title
    };
    
    const questionType = csvQuestion.questionType as QuestionType;
    
    switch (questionType) {
      case QuestionType.MULTIPLE_CHOICE:
        content.options = [
          {
            text: csvQuestion.option1 || 'Option A',
            isCorrect: csvQuestion.option1Correct === true,
            feedback: csvQuestion.option1Feedback || ''
          },
          {
            text: csvQuestion.option2 || 'Option B',
            isCorrect: csvQuestion.option2Correct === true,
            feedback: csvQuestion.option2Feedback || ''
          },
          {
            text: csvQuestion.option3 || 'Option C',
            isCorrect: csvQuestion.option3Correct === true,
            feedback: csvQuestion.option3Feedback || ''
          },
          {
            text: csvQuestion.option4 || 'Option D',
            isCorrect: csvQuestion.option4Correct === true,
            feedback: csvQuestion.option4Feedback || ''
          }
        ];
        break;
        
      case QuestionType.TRUE_FALSE:
        content.correctAnswer = csvQuestion.correctAnswer === 'true';
        break;
        
      case QuestionType.SHORT_ANSWER:
        content.sampleAnswer = csvQuestion.sampleAnswer || '';
        content.keywords = csvQuestion.keywords || [];
        break;
        
      case QuestionType.ESSAY:
        content.rubric = csvQuestion.rubric ? 
          (typeof csvQuestion.rubric === 'string' ? JSON.parse(csvQuestion.rubric) : csvQuestion.rubric) : 
          [];
        content.wordLimit = csvQuestion.wordLimit || null;
        break;
        
      case QuestionType.NUMERIC:
        content.correctAnswer = parseFloat(csvQuestion.correctAnswer) || 0;
        content.tolerance = parseFloat(csvQuestion.tolerance) || 0;
        break;
    }
    
    return {
      title: csvQuestion.title,
      questionType,
      difficulty: csvQuestion.difficulty as DifficultyLevel || DifficultyLevel.MEDIUM,
      content,
      subjectId: csvQuestion.subjectId,
      courseId: csvQuestion.courseId,
      topicId: csvQuestion.topicId,
      gradeLevel: csvQuestion.gradeLevel,
      sourceReference: csvQuestion.sourceReference,
      year: csvQuestion.year,
      bloomsLevel: csvQuestion.bloomsLevel,
      learningOutcomeIds: [],
      metadata: {
        explanation: csvQuestion.explanation,
        hint: csvQuestion.hint,
        keywords: csvQuestion.keywords || []
      }
    };
  } catch (error) {
    console.error('Error formatting question:', error);
    return null;
  }
}

/**
 * Validate question data
 */
function validateQuestions(questions: any[]): ValidationResult {
  console.log(`🔍 Validating ${questions.length} questions...`);
  
  const result: ValidationResult = {
    totalQuestions: questions.length,
    validQuestions: 0,
    invalidQuestions: 0,
    validationErrors: []
  };
  
  questions.forEach((question, index) => {
    const row = index + 2; // +2 for header and 1-based indexing
    let isValid = true;
    
    // Required field validation
    if (!question.title) {
      result.validationErrors.push({
        row,
        field: 'title',
        message: 'Title is required'
      });
      isValid = false;
    }
    
    if (!question.questionType) {
      result.validationErrors.push({
        row,
        field: 'questionType',
        message: 'Question type is required'
      });
      isValid = false;
    }
    
    if (!question.subjectId) {
      result.validationErrors.push({
        row,
        field: 'subjectId',
        message: 'Subject ID is required'
      });
      isValid = false;
    }
    
    // Question type specific validation
    if (question.questionType === QuestionType.MULTIPLE_CHOICE) {
      const options = question.content?.options || [];
      if (options.length < 2) {
        result.validationErrors.push({
          row,
          field: 'options',
          message: 'Multiple choice questions need at least 2 options'
        });
        isValid = false;
      }
      
      const correctOptions = options.filter((opt: any) => opt.isCorrect);
      if (correctOptions.length === 0) {
        result.validationErrors.push({
          row,
          field: 'options',
          message: 'Multiple choice questions need at least one correct option'
        });
        isValid = false;
      }
    }
    
    if (isValid) {
      result.validQuestions++;
    } else {
      result.invalidQuestions++;
    }
  });
  
  console.log(`   ✅ Validation complete: ${result.validQuestions} valid, ${result.invalidQuestions} invalid`);
  return result;
}

/**
 * Get memory usage in MB
 */
function getMemoryUsage(): number {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    return Math.round(usage.heapUsed / 1024 / 1024);
  }
  return 0;
}

/**
 * Test bulk upload performance
 */
async function testBulkUploadPerformance(
  filename: string,
  questions: any[],
  questionBankId: string,
  userId: string,
  useOptimized: boolean = false
): Promise<PerformanceTestResult> {
  console.log(`\n🚀 Testing bulk upload performance for ${filename}`);
  console.log(`   📊 Questions: ${questions.length.toLocaleString()}`);
  console.log(`   ⚡ Using ${useOptimized ? 'optimized' : 'standard'} service`);
  
  const memoryBefore = getMemoryUsage();
  let memoryPeak = memoryBefore;
  
  // Monitor memory usage during upload
  const memoryMonitor = setInterval(() => {
    const current = getMemoryUsage();
    if (current > memoryPeak) {
      memoryPeak = current;
    }
  }, 1000);
  
  const startTime = Date.now();
  let result;
  
  try {
    if (useOptimized) {
      const optimizedService = new OptimizedBulkUploadService(prisma);
      result = await optimizedService.bulkUploadQuestions(
        {
          questionBankId,
          questions,
          validateOnly: false,
          batchSize: 100,
          maxConcurrency: 5
        },
        userId,
        (progress) => {
          console.log(`   📈 Progress: ${progress.processed}/${progress.total} (${Math.round(progress.processed / progress.total * 100)}%)`);
        }
      );
    } else {
      const standardService = new QuestionBankService(prisma);
      result = await standardService.bulkUploadQuestions(
        {
          questionBankId,
          questions,
          validateOnly: false
        },
        userId
      );
    }
  } catch (error) {
    console.error(`❌ Upload failed:`, error);
    result = {
      total: questions.length,
      successful: 0,
      failed: questions.length,
      errors: [{ index: -1, message: String(error) }]
    };
  }
  
  clearInterval(memoryMonitor);
  
  const uploadTime = Date.now() - startTime;
  const memoryAfter = getMemoryUsage();
  
  const performanceResult: PerformanceTestResult = {
    filename,
    questionCount: questions.length,
    uploadTime,
    questionsPerSecond: Math.round((result.successful / uploadTime) * 1000),
    memoryUsage: {
      before: memoryBefore,
      peak: memoryPeak,
      after: memoryAfter
    },
    successful: result.successful,
    failed: result.failed,
    errors: result.errors
  };
  
  console.log(`   ✅ Upload completed in ${(uploadTime / 1000).toFixed(2)}s`);
  console.log(`   📊 Success rate: ${Math.round(result.successful / questions.length * 100)}%`);
  console.log(`   ⚡ Speed: ${performanceResult.questionsPerSecond.toLocaleString()} questions/second`);
  console.log(`   💾 Memory: ${memoryBefore}MB → ${memoryPeak}MB → ${memoryAfter}MB`);
  
  return performanceResult;
}

/**
 * Verify data integrity after upload
 */
async function verifyDataIntegrity(questionBankId: string, expectedCount: number) {
  console.log(`\n🔍 Verifying data integrity...`);
  
  const actualCount = await prisma.question.count({
    where: { questionBankId }
  });
  
  console.log(`   📊 Expected: ${expectedCount.toLocaleString()}, Actual: ${actualCount.toLocaleString()}`);
  
  if (actualCount !== expectedCount) {
    console.log(`   ⚠️  Count mismatch! Expected ${expectedCount} but found ${actualCount}`);
  } else {
    console.log(`   ✅ Question count matches expected value`);
  }
  
  // Check for data consistency
  const stats = await prisma.question.groupBy({
    by: ['difficulty', 'questionType'],
    where: { questionBankId },
    _count: true
  });
  
  console.log(`   📈 Upload statistics:`);
  stats.forEach(stat => {
    console.log(`      ${stat.difficulty} ${stat.questionType}: ${stat._count}`);
  });
  
  return actualCount === expectedCount;
}

/**
 * Main performance testing function
 */
async function main() {
  try {
    console.log('🚀 Starting bulk upload performance testing...');
    
    // Get or create question bank
    let questionBank = await prisma.questionBank.findFirst({
      where: { name: 'Performance Test Bank' }
    });
    
    if (!questionBank) {
      const institution = await prisma.institution.findFirst();
      const user = await prisma.user.findFirst();
      
      if (!institution || !user) {
        console.log('❌ No institution or user found. Please run database seeding first.');
        return;
      }
      
      questionBank = await prisma.questionBank.create({
        data: {
          name: 'Performance Test Bank',
          description: 'Question bank for performance testing',
          institutionId: institution.id,
          createdById: user.id,
          partitionKey: `inst_${institution.id}_test`
        }
      });
      
      console.log(`✅ Created test question bank: ${questionBank.id}`);
    }
    
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('❌ No user found for testing');
      return;
    }
    
    // Test files to process
    const testFiles = [
      'question-bank-10k-questions.csv',
      'question-bank-50k-questions.csv',
      'question-bank-100k-questions.csv'
    ];
    
    const results: PerformanceTestResult[] = [];
    
    for (const filename of testFiles) {
      const filePath = join(process.cwd(), 'data', filename);
      
      if (!existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }
      
      // Clear previous test data
      await prisma.question.deleteMany({
        where: { questionBankId: questionBank.id }
      });
      
      // Parse and validate questions
      const questions = parseCSVFile(filePath);
      const validation = validateQuestions(questions);
      
      if (validation.invalidQuestions > 0) {
        console.log(`⚠️  Found ${validation.invalidQuestions} invalid questions in ${filename}`);
        console.log('   First 5 validation errors:');
        validation.validationErrors.slice(0, 5).forEach(error => {
          console.log(`      Row ${error.row}: ${error.field} - ${error.message}`);
        });
      }
      
      // Test with standard service
      console.log(`\n📊 Testing ${filename} with standard service...`);
      const standardResult = await testBulkUploadPerformance(
        filename,
        questions.slice(0, Math.min(1000, questions.length)), // Limit for standard service
        questionBank.id,
        user.id,
        false
      );
      
      // Clear data for optimized test
      await prisma.question.deleteMany({
        where: { questionBankId: questionBank.id }
      });
      
      // Test with optimized service
      console.log(`\n📊 Testing ${filename} with optimized service...`);
      const optimizedResult = await testBulkUploadPerformance(
        filename,
        questions,
        questionBank.id,
        user.id,
        true
      );
      
      // Verify data integrity
      await verifyDataIntegrity(questionBank.id, optimizedResult.successful);
      
      results.push(standardResult, optimizedResult);
    }
    
    // Print summary
    console.log('\n📊 Performance Test Summary:');
    console.log('=' .repeat(80));
    results.forEach(result => {
      console.log(`${result.filename} (${result.questionCount.toLocaleString()} questions):`);
      console.log(`  Upload Time: ${(result.uploadTime / 1000).toFixed(2)}s`);
      console.log(`  Speed: ${result.questionsPerSecond.toLocaleString()} questions/second`);
      console.log(`  Success Rate: ${Math.round(result.successful / result.questionCount * 100)}%`);
      console.log(`  Memory Usage: ${result.memoryUsage.before}MB → ${result.memoryUsage.peak}MB`);
      console.log('');
    });
    
    console.log('🎉 Performance testing completed!');
    
  } catch (error) {
    console.error('❌ Error in performance testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}
