/**
 * Upload all sample CSV files to their respective subjects
 * This script processes all generated sample data files and uploads them to the database
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { QuestionBankService } from '../src/features/question-bank/services/question-bank.service';
import { QuestionType, DifficultyLevel } from '../src/features/question-bank/models/types';

const prisma = new PrismaClient();

interface CSVQuestion {
  title: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  subjectId: string;
  text: string;
  gradeLevel?: number;
  option1?: string;
  option1Correct?: string;
  option1Feedback?: string;
  option2?: string;
  option2Correct?: string;
  option2Feedback?: string;
  option3?: string;
  option3Correct?: string;
  option3Feedback?: string;
  option4?: string;
  option4Correct?: string;
  option4Feedback?: string;
  correctAnswer?: string;
  tolerance?: string;
  explanation?: string;
  hint?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseCSVContent(csvContent: string): CSVQuestion[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = parseCSVLine(lines[0]);
  const questions: CSVQuestion[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const question: any = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Remove surrounding quotes if present
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      question[header] = value;
    });
    
    // Convert to proper types
    const csvQuestion: CSVQuestion = {
      title: question.title || '',
      questionType: question.questionType as QuestionType,
      difficulty: question.difficulty as DifficultyLevel,
      subjectId: question.subjectId || '',
      text: question.text || '',
      gradeLevel: question.gradeLevel ? parseInt(question.gradeLevel) : undefined,
      option1: question.option1,
      option1Correct: question.option1Correct,
      option1Feedback: question.option1Feedback,
      option2: question.option2,
      option2Correct: question.option2Correct,
      option2Feedback: question.option2Feedback,
      option3: question.option3,
      option3Correct: question.option3Correct,
      option3Feedback: question.option3Feedback,
      option4: question.option4,
      option4Correct: question.option4Correct,
      option4Feedback: question.option4Feedback,
      correctAnswer: question.correctAnswer,
      tolerance: question.tolerance,
      explanation: question.explanation,
      hint: question.hint
    };
    
    questions.push(csvQuestion);
  }
  
  return questions;
}

function convertCSVQuestionToCreateInput(csvQuestion: CSVQuestion, questionBankId: string): any {
  let content: any = {
    text: csvQuestion.text,
    explanation: csvQuestion.explanation || '',
    hint: csvQuestion.hint || ''
  };

  // Build content based on question type
  if (csvQuestion.questionType === 'MULTIPLE_CHOICE') {
    content.options = [];
    
    if (csvQuestion.option1) {
      content.options.push({
        text: csvQuestion.option1,
        isCorrect: csvQuestion.option1Correct === 'true',
        feedback: csvQuestion.option1Feedback || ''
      });
    }
    if (csvQuestion.option2) {
      content.options.push({
        text: csvQuestion.option2,
        isCorrect: csvQuestion.option2Correct === 'true',
        feedback: csvQuestion.option2Feedback || ''
      });
    }
    if (csvQuestion.option3) {
      content.options.push({
        text: csvQuestion.option3,
        isCorrect: csvQuestion.option3Correct === 'true',
        feedback: csvQuestion.option3Feedback || ''
      });
    }
    if (csvQuestion.option4) {
      content.options.push({
        text: csvQuestion.option4,
        isCorrect: csvQuestion.option4Correct === 'true',
        feedback: csvQuestion.option4Feedback || ''
      });
    }
  } else if (csvQuestion.questionType === 'TRUE_FALSE') {
    content.correctAnswer = csvQuestion.correctAnswer === 'true';
  } else if (csvQuestion.questionType === 'NUMERIC') {
    content.correctAnswer = parseFloat(csvQuestion.correctAnswer || '0');
    content.tolerance = parseFloat(csvQuestion.tolerance || '0.1');
  }

  return {
    questionBankId,
    title: csvQuestion.title,
    questionType: csvQuestion.questionType,
    difficulty: csvQuestion.difficulty,
    subjectId: csvQuestion.subjectId,
    content,
    metadata: {},
    gradeLevel: csvQuestion.gradeLevel
  };
}

async function uploadAllSampleData() {
  try {
    console.log('🚀 Starting bulk upload of all sample data files\n');

    // Get the first question bank
    const questionBank = await prisma.questionBank.findFirst({
      where: {
        status: 'ACTIVE'
      }
    });

    if (!questionBank) {
      console.log('❌ No active question bank found. Please create one first.');
      return;
    }

    console.log(`📚 Using Question Bank: ${questionBank.name} (${questionBank.id})\n`);

    // Get a real user ID
    const user = await prisma.user.findFirst({
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      console.log('❌ No user found in database. Please create a user first.');
      return;
    }

    console.log(`👤 Using User: ${user.name || user.email} (${user.id})\n`);

    // Get all subjects
    const subjects = await prisma.subject.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        code: true
      }
    });

    console.log(`📖 Found ${subjects.length} subjects to process\n`);

    // Read sample data directory
    const sampleDataDir = join(process.cwd(), 'sample-data');
    let csvFiles: string[];
    
    try {
      csvFiles = readdirSync(sampleDataDir).filter(file => file.endsWith('.csv'));
    } catch (error) {
      console.log('❌ Sample data directory not found. Please run generate-subject-sample-data.ts first.');
      return;
    }

    console.log(`📄 Found ${csvFiles.length} CSV files to process\n`);

    const service = new QuestionBankService(prisma);
    let totalUploaded = 0;
    let totalErrors = 0;

    // Process each CSV file
    for (const csvFile of csvFiles) {
      console.log(`📝 Processing: ${csvFile}`);
      
      // Extract subject code from filename
      const subjectCode = csvFile.replace('-sample-questions.csv', '');
      const subject = subjects.find(s => s.code === subjectCode);
      
      if (!subject) {
        console.log(`   ⚠️  Subject not found for code: ${subjectCode}`);
        continue;
      }

      console.log(`   📖 Subject: ${subject.name} (${subject.code})`);

      // Read and parse CSV file
      const csvFilePath = join(sampleDataDir, csvFile);
      const csvContent = readFileSync(csvFilePath, 'utf8');
      const csvQuestions = parseCSVContent(csvContent);

      console.log(`   📊 Parsed ${csvQuestions.length} questions from CSV`);

      // Convert to create input format
      const questions = csvQuestions.map(csvQ => 
        convertCSVQuestionToCreateInput(csvQ, questionBank.id)
      );

      // Upload in batches of 50 to avoid overwhelming the database
      const batchSize = 50;
      let uploaded = 0;
      let errors = 0;

      for (let i = 0; i < questions.length; i += batchSize) {
        const batch = questions.slice(i, i + batchSize);
        console.log(`   📤 Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(questions.length / batchSize)} (${batch.length} questions)`);

        try {
          const result = await service.bulkUploadQuestions({
            questionBankId: questionBank.id,
            questions: batch,
            validateOnly: false
          }, user.id);

          uploaded += batch.length;
          console.log(`   ✅ Batch uploaded successfully`);
        } catch (error) {
          errors += batch.length;
          console.log(`   ❌ Batch failed: ${error}`);
        }

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`   📊 Subject Summary: ${uploaded} uploaded, ${errors} errors\n`);
      totalUploaded += uploaded;
      totalErrors += errors;
    }

    // Final verification
    console.log('🔍 Final verification...');
    const finalCount = await prisma.question.count();
    console.log(`📊 Total questions in database: ${finalCount}`);

    console.log('\n🎉 Bulk upload completed!');
    console.log(`✅ Total uploaded: ${totalUploaded}`);
    console.log(`❌ Total errors: ${totalErrors}`);
    console.log(`📊 Success rate: ${((totalUploaded / (totalUploaded + totalErrors)) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Error during bulk upload:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the upload
uploadAllSampleData();
