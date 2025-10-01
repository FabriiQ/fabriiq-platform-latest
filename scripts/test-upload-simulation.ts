#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { parse } from 'papaparse';
import { QuestionType, DifficultyLevel, BloomsTaxonomyLevel } from '@prisma/client';

// Simulate the exact validation that happens in the actual upload
interface CreateQuestionInput {
  questionBankId: string;
  title: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  content: any;
  subjectId: string;
  courseId?: string;
  topicId?: string;
  gradeLevel?: number;
  sourceId?: string;
  sourceReference?: string;
  year?: number;
  metadata?: Record<string, any>;
  bloomsLevel?: BloomsTaxonomyLevel;
  learningOutcomeIds?: string[];
  actionVerbs?: string[];
  categoryIds?: string[];
}

/**
 * Test the CSV upload simulation
 */
async function testUploadSimulation(filePath: string) {
  console.log(`🧪 Testing upload simulation for: ${filePath}`);
  
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    
    // Parse CSV exactly like the actual parser
    const parseResult = parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep all values as strings
    });

    const questions: CreateQuestionInput[] = [];
    const errors: { row: number; message: string }[] = [];
    let totalRows = parseResult.data.length;

    // Process each row exactly like the actual converter
    parseResult.data.forEach((row: any, index: number) => {
      try {
        const question = convertRowToQuestionSimulation(row, 'test-question-bank-id', index + 1);
        if (question) {
          questions.push(question);
        }
      } catch (error) {
        errors.push({
          row: index + 1,
          message: (error as Error).message
        });
      }
    });

    // Print results
    console.log(`\n📊 Upload Simulation Results:`);
    console.log(`Total rows: ${totalRows}`);
    console.log(`Valid questions: ${questions.length}`);
    console.log(`Error rows: ${errors.length}`);

    if (errors.length > 0) {
      console.log(`\n❌ Upload would fail with ${errors.length} errors:`);
      errors.slice(0, 10).forEach(error => {
        console.log(`Row ${error.row}: ${error.message}`);
      });
    } else {
      console.log(`\n✅ Upload simulation successful!`);
      console.log(`All ${totalRows} questions would be uploaded successfully.`);
      
      // Show sample questions
      console.log(`\n📝 Sample questions:`);
      questions.slice(0, 3).forEach((q, i) => {
        console.log(`${i + 1}. ${q.title} (${q.questionType})`);
      });
    }

  } catch (error) {
    console.error(`❌ Error in upload simulation:`, error);
  }
}

/**
 * Convert CSV row to question object (simulation of actual converter)
 */
function convertRowToQuestionSimulation(row: any, questionBankId: string, rowIndex: number): CreateQuestionInput | null {
  // Validate required fields
  const requiredFields = ['title', 'questionType', 'difficulty', 'subjectId'];
  const missingFields = requiredFields.filter(field => !row[field]);

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Validate question type
  const questionType = row.questionType as QuestionType;
  if (!Object.values(QuestionType).includes(questionType)) {
    throw new Error(`Invalid question type: ${questionType}`);
  }

  // Validate difficulty
  const difficulty = row.difficulty as DifficultyLevel;
  if (!Object.values(DifficultyLevel).includes(difficulty)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }

  // Create content based on question type
  let content: any;
  try {
    content = createQuestionContentSimulation(row, questionType, rowIndex);
  } catch (error) {
    throw new Error(`Content validation failed: ${(error as Error).message}`);
  }

  // Create the question object
  const question: CreateQuestionInput = {
    questionBankId,
    title: row.title,
    questionType,
    difficulty,
    content,
    subjectId: row.subjectId,
    courseId: row.courseId || undefined,
    topicId: row.topicId || undefined,
    gradeLevel: row.gradeLevel ? Number(row.gradeLevel) : undefined,
    sourceId: row.sourceId || undefined,
    sourceReference: row.sourceReference || undefined,
    year: row.year ? Number(row.year) : undefined,
    metadata: {},
    bloomsLevel: row.bloomsLevel as BloomsTaxonomyLevel || undefined,
    learningOutcomeIds: [],
    actionVerbs: [],
    categoryIds: []
  };

  return question;
}

/**
 * Create question content simulation
 */
function createQuestionContentSimulation(row: any, questionType: QuestionType, rowIndex: number): any {
  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      return createMultipleChoiceContentSimulation(row, rowIndex);
    case QuestionType.TRUE_FALSE:
      return createTrueFalseContentSimulation(row, rowIndex);
    case QuestionType.SHORT_ANSWER:
      return createShortAnswerContentSimulation(row, rowIndex);
    case QuestionType.ESSAY:
      return createEssayContentSimulation(row, rowIndex);
    default:
      throw new Error(`Question type ${questionType} is not supported for CSV import`);
  }
}

function createMultipleChoiceContentSimulation(row: any, rowIndex: number): any {
  if (!row.text) {
    throw new Error(`Missing required field 'text' for multiple choice question`);
  }

  const options = [];
  for (let i = 1; i <= 4; i++) {
    const optionText = row[`option${i}`];
    if (optionText) {
      const isCorrect = row[`option${i}Correct`] === 'true';
      options.push({
        id: `option-${i}`,
        text: optionText,
        isCorrect,
        feedback: row[`option${i}Feedback`] || undefined
      });
    }
  }

  if (options.length === 0) {
    throw new Error(`At least one option must be provided`);
  }

  const hasCorrectOption = options.some(option => option.isCorrect);
  if (!hasCorrectOption) {
    throw new Error(`At least one option must be marked as correct`);
  }

  return {
    text: row.text,
    options,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined
  };
}

function createTrueFalseContentSimulation(row: any, rowIndex: number): any {
  if (!row.text) {
    throw new Error(`Missing required field 'text' for true/false question`);
  }

  if (row.correctAnswer === undefined || row.correctAnswer === '') {
    throw new Error(`Missing required field 'correctAnswer' for true/false question`);
  }

  const correctAnswer = row.correctAnswer.toLowerCase() === 'true';

  return {
    text: row.text,
    correctAnswer,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined
  };
}

function createShortAnswerContentSimulation(row: any, rowIndex: number): any {
  if (!row.text) {
    throw new Error(`Missing required field 'text' for short answer question`);
  }

  let keywords: string[] = [];
  if (row.keywords) {
    try {
      keywords = JSON.parse(row.keywords);
      if (!Array.isArray(keywords)) {
        throw new Error(`'keywords' must be an array for short answer question`);
      }
    } catch (error) {
      throw new Error(`Invalid JSON format for keywords`);
    }
  }

  return {
    text: row.text,
    correctAnswers: keywords,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined
  };
}

function createEssayContentSimulation(row: any, rowIndex: number): any {
  if (!row.text) {
    throw new Error(`Missing required field 'text' for essay question`);
  }

  let rubric: any[] = [];
  if (row.rubric) {
    try {
      rubric = JSON.parse(row.rubric);
      if (!Array.isArray(rubric)) {
        throw new Error(`'rubric' must be an array for essay question`);
      }
    } catch (error) {
      throw new Error(`Invalid JSON format for rubric`);
    }
  }

  return {
    text: row.text,
    rubric: rubric.length > 0 ? {
      criteria: rubric.map(r => ({
        id: r.id || `criterion-${Math.random().toString(36).substring(2, 9)}`,
        name: r.name || r.criteria || 'Criterion',
        description: r.description || '',
        points: r.points || 0,
        levels: r.levels || []
      })),
      totalPoints: rubric.reduce((sum, r) => sum + (r.points || 0), 0)
    } : undefined,
    wordCountMax: row.wordLimit ? Number(row.wordLimit) : undefined,
    explanation: row.explanation || undefined,
    hint: row.hint || undefined
  };
}

// Run the test
const csvPath = process.argv[2] || 'data/question-bank-1000-questions.csv';
testUploadSimulation(csvPath);
