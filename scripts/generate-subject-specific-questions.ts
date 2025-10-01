/**
 * Generate Subject-Specific Question Files
 * 
 * Creates 100,000 questions for each subject with proper associations:
 * Subject → Topic → Learning Outcome → Bloom's Taxonomy → Question
 */

import { PrismaClient, QuestionType, DifficultyLevel, BloomsTaxonomyLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface SubjectData {
  id: string;
  name: string;
  code: string;
  topics: TopicData[];
}

interface TopicData {
  id: string;
  title: string;
  code: string;
  learningOutcomes: LearningOutcomeData[];
}

interface LearningOutcomeData {
  id: string;
  statement: string;
  bloomsLevel: BloomsTaxonomyLevel;
}

interface QuestionData {
  questionBankId: string;
  title: string;
  questionType: QuestionType;
  difficulty: DifficultyLevel;
  text: string;
  options?: string;
  correctAnswer?: string;
  blanks?: string;
  pairs?: string;
  explanation?: string;
  hint?: string;
  tolerance?: string;
  unit?: string;
  bloomsLevel: BloomsTaxonomyLevel;
  learningOutcomeIds: string[];
  subjectId: string;
  topicId: string;
  gradeLevel: number;
  year: number;
  createdById: string;
  partitionKey: string;
}

// Question type distribution based on Bloom's levels
const QUESTION_TYPE_DISTRIBUTION = {
  [BloomsTaxonomyLevel.REMEMBER]: [
    { type: QuestionType.MULTIPLE_CHOICE, weight: 40 },
    { type: QuestionType.TRUE_FALSE, weight: 30 },
    { type: QuestionType.FILL_IN_THE_BLANKS, weight: 20 },
    { type: QuestionType.SHORT_ANSWER, weight: 10 }
  ],
  [BloomsTaxonomyLevel.UNDERSTAND]: [
    { type: QuestionType.MULTIPLE_CHOICE, weight: 35 },
    { type: QuestionType.SHORT_ANSWER, weight: 25 },
    { type: QuestionType.MATCHING, weight: 20 },
    { type: QuestionType.TRUE_FALSE, weight: 20 }
  ],
  [BloomsTaxonomyLevel.APPLY]: [
    { type: QuestionType.NUMERIC, weight: 30 },
    { type: QuestionType.SHORT_ANSWER, weight: 25 },
    { type: QuestionType.MULTIPLE_CHOICE, weight: 25 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 20 }
  ],
  [BloomsTaxonomyLevel.ANALYZE]: [
    { type: QuestionType.ESSAY, weight: 35 },
    { type: QuestionType.SHORT_ANSWER, weight: 30 },
    { type: QuestionType.MULTIPLE_CHOICE, weight: 20 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 15 }
  ],
  [BloomsTaxonomyLevel.EVALUATE]: [
    { type: QuestionType.ESSAY, weight: 40 },
    { type: QuestionType.SHORT_ANSWER, weight: 25 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 20 },
    { type: QuestionType.MULTIPLE_CHOICE, weight: 15 }
  ],
  [BloomsTaxonomyLevel.CREATE]: [
    { type: QuestionType.ESSAY, weight: 50 },
    { type: QuestionType.SHORT_ANSWER, weight: 30 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 20 }
  ]
};

/**
 * Select question type based on Bloom's level
 */
function selectQuestionType(bloomsLevel: BloomsTaxonomyLevel): QuestionType {
  const distribution = QUESTION_TYPE_DISTRIBUTION[bloomsLevel];
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const item of distribution) {
    cumulative += item.weight;
    if (random <= cumulative) {
      return item.type;
    }
  }
  
  return distribution[0].type; // Fallback
}

/**
 * Generate question data in CSV format expected by bulk upload
 */
function generateQuestionData(
  questionType: QuestionType,
  learningOutcome: LearningOutcomeData,
  topic: TopicData,
  subject: SubjectData
): Partial<QuestionData> {
  const baseText = `Based on the learning outcome "${learningOutcome.statement}" in ${topic.title}, `;

  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      return {
        text: baseText + `which of the following best demonstrates understanding of ${topic.title}?`,
        options: JSON.stringify([
          { text: `Correct answer related to ${topic.title}`, isCorrect: true },
          { text: `Distractor option 1 for ${topic.title}`, isCorrect: false },
          { text: `Distractor option 2 for ${topic.title}`, isCorrect: false },
          { text: `Distractor option 3 for ${topic.title}`, isCorrect: false }
        ]),
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };

    case QuestionType.TRUE_FALSE:
      const isTrue = Math.random() > 0.5;
      return {
        text: baseText + `the following statement about ${topic.title} is accurate: "${topic.title} concepts are fundamental to understanding this subject."`,
        correctAnswer: isTrue ? 'true' : 'false',
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };

    case QuestionType.FILL_IN_THE_BLANKS:
      return {
        text: `Complete the following statement about ${topic.title}: "The key concept in ${topic.title} is _____ which helps students understand the subject better."`,
        blanks: JSON.stringify([
          { id: 'blank-1', correctAnswers: [`concept related to ${topic.title}`, `principle of ${topic.title}`] }
        ]),
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };

    case QuestionType.MATCHING:
      return {
        text: baseText + `match the following items related to ${topic.title}.`,
        pairs: JSON.stringify([
          { id: 'pair-1', left: `Concept 1 in ${topic.title}`, right: `Definition 1 for ${topic.title}` },
          { id: 'pair-2', left: `Concept 2 in ${topic.title}`, right: `Definition 2 for ${topic.title}` }
        ]),
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };

    case QuestionType.MULTIPLE_RESPONSE:
      return {
        text: baseText + `select all correct answers about ${topic.title}.`,
        options: JSON.stringify([
          { text: `Correct statement 1 about ${topic.title}`, isCorrect: true },
          { text: `Correct statement 2 about ${topic.title}`, isCorrect: true },
          { text: `Incorrect statement 1 about ${topic.title}`, isCorrect: false },
          { text: `Incorrect statement 2 about ${topic.title}`, isCorrect: false }
        ]),
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };

    case QuestionType.NUMERIC:
      const answer = Math.floor(Math.random() * 100) + 1;
      return {
        text: baseText + `calculate the result for this ${topic.title} problem. If the value is ${answer + 5}, what is the result when reduced by 5?`,
        correctAnswer: answer.toString(),
        tolerance: '0.1',
        unit: 'units',
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };

    case QuestionType.SHORT_ANSWER:
      return {
        text: baseText + `explain the key concepts of ${topic.title} in 2-3 sentences.`,
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`,
        hint: `Consider the main principles and applications of ${topic.title}.`
      };

    case QuestionType.ESSAY:
      return {
        text: baseText + `analyze and evaluate the concepts in ${topic.title}. Provide a comprehensive discussion with examples.`,
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`,
        hint: `Structure your response with introduction, analysis, examples, and conclusion.`
      };

    default:
      return {
        text: baseText + `demonstrate your understanding of ${topic.title}.`,
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };
  }
}

/**
 * Generate metadata for question
 */
function generateQuestionMetadata(
  subject: SubjectData,
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  questionType: QuestionType
): any {
  return {
    subject: subject.name,
    subjectCode: subject.code,
    topic: topic.title,
    topicCode: topic.code,
    learningOutcome: learningOutcome.statement,
    bloomsLevel: learningOutcome.bloomsLevel,
    questionType: questionType,
    estimatedTime: getEstimatedTime(questionType),
    tags: [subject.name, topic.title, learningOutcome.bloomsLevel],
    difficulty: getDifficultyFromBlooms(learningOutcome.bloomsLevel),
    cognitiveLoad: getCognitiveLoad(learningOutcome.bloomsLevel)
  };
}

/**
 * Get estimated time based on question type
 */
function getEstimatedTime(questionType: QuestionType): number {
  const timeMap = {
    [QuestionType.MULTIPLE_CHOICE]: 2,
    [QuestionType.TRUE_FALSE]: 1,
    [QuestionType.SHORT_ANSWER]: 5,
    [QuestionType.ESSAY]: 15,
    [QuestionType.NUMERIC]: 3,
    [QuestionType.FILL_IN_THE_BLANKS]: 2,
    [QuestionType.MATCHING]: 3,
    [QuestionType.MULTIPLE_RESPONSE]: 3,
    [QuestionType.DRAG_AND_DROP]: 4,
    [QuestionType.DRAG_THE_WORDS]: 3,
    [QuestionType.SEQUENCE]: 4,
    [QuestionType.FLASH_CARDS]: 2,
    [QuestionType.READING]: 10,
    [QuestionType.VIDEO]: 15,
    [QuestionType.HOTSPOT]: 3,
    [QuestionType.LIKERT_SCALE]: 2
  };
  return timeMap[questionType] || 5;
}

/**
 * Get difficulty level from Bloom's taxonomy
 */
function getDifficultyFromBlooms(bloomsLevel: BloomsTaxonomyLevel): DifficultyLevel {
  const difficultyMap = {
    [BloomsTaxonomyLevel.REMEMBER]: DifficultyLevel.EASY,
    [BloomsTaxonomyLevel.UNDERSTAND]: DifficultyLevel.EASY,
    [BloomsTaxonomyLevel.APPLY]: DifficultyLevel.MEDIUM,
    [BloomsTaxonomyLevel.ANALYZE]: DifficultyLevel.MEDIUM,
    [BloomsTaxonomyLevel.EVALUATE]: DifficultyLevel.HARD,
    [BloomsTaxonomyLevel.CREATE]: DifficultyLevel.HARD
  };
  return difficultyMap[bloomsLevel];
}

/**
 * Get cognitive load level
 */
function getCognitiveLoad(bloomsLevel: BloomsTaxonomyLevel): string {
  const loadMap = {
    [BloomsTaxonomyLevel.REMEMBER]: 'Low',
    [BloomsTaxonomyLevel.UNDERSTAND]: 'Low',
    [BloomsTaxonomyLevel.APPLY]: 'Medium',
    [BloomsTaxonomyLevel.ANALYZE]: 'Medium',
    [BloomsTaxonomyLevel.EVALUATE]: 'High',
    [BloomsTaxonomyLevel.CREATE]: 'High'
  };
  return loadMap[bloomsLevel];
}

/**
 * Generate questions for a subject
 */
async function generateQuestionsForSubject(
  subject: SubjectData,
  questionCount: number,
  questionBankId: string,
  systemUserId: string
): Promise<QuestionData[]> {
  const questions: QuestionData[] = [];
  const currentYear = new Date().getFullYear();
  
  console.log(`\n📝 Generating ${questionCount} questions for ${subject.name}...`);
  
  // Distribute questions across topics and learning outcomes
  const questionsPerTopic = Math.floor(questionCount / subject.topics.length);
  let questionIndex = 0;
  
  for (const topic of subject.topics) {
    if (topic.learningOutcomes.length === 0) {
      console.warn(`   ⚠️  Topic ${topic.title} has no learning outcomes, skipping...`);
      continue;
    }
    
    const questionsPerOutcome = Math.floor(questionsPerTopic / topic.learningOutcomes.length);
    
    for (const learningOutcome of topic.learningOutcomes) {
      for (let i = 0; i < questionsPerOutcome; i++) {
        questionIndex++;
        
        const questionType = selectQuestionType(learningOutcome.bloomsLevel);
        const questionData = generateQuestionData(questionType, learningOutcome, topic, subject);

        const question: QuestionData = {
          questionBankId,
          title: `${subject.name} - ${topic.title} - Question ${questionIndex}`,
          questionType,
          difficulty: getDifficultyFromBlooms(learningOutcome.bloomsLevel),
          text: questionData.text || `Question about ${topic.title}`,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          blanks: questionData.blanks,
          pairs: questionData.pairs,
          explanation: questionData.explanation,
          hint: questionData.hint,
          tolerance: questionData.tolerance,
          unit: questionData.unit,
          bloomsLevel: learningOutcome.bloomsLevel,
          learningOutcomeIds: [learningOutcome.id],
          subjectId: subject.id,
          topicId: topic.id,
          gradeLevel: subject.name.includes('Y7') ? 7 : 8,
          year: currentYear,
          createdById: systemUserId,
          partitionKey: `${subject.code}_${currentYear}`
        };
        
        questions.push(question);
        
        if (questionIndex % 10000 === 0) {
          console.log(`   📊 Generated ${questionIndex} questions...`);
        }
      }
    }
  }
  
  // Fill remaining questions if needed
  while (questions.length < questionCount) {
    const randomTopic = subject.topics[Math.floor(Math.random() * subject.topics.length)];
    if (randomTopic.learningOutcomes.length === 0) continue;
    
    const randomOutcome = randomTopic.learningOutcomes[Math.floor(Math.random() * randomTopic.learningOutcomes.length)];
    questionIndex++;
    
    const questionType = selectQuestionType(randomOutcome.bloomsLevel);
    const questionData = generateQuestionData(questionType, randomOutcome, randomTopic, subject);

    const question: QuestionData = {
      questionBankId,
      title: `${subject.name} - ${randomTopic.title} - Question ${questionIndex}`,
      questionType,
      difficulty: getDifficultyFromBlooms(randomOutcome.bloomsLevel),
      text: questionData.text || `Question about ${randomTopic.title}`,
      options: questionData.options,
      correctAnswer: questionData.correctAnswer,
      blanks: questionData.blanks,
      pairs: questionData.pairs,
      explanation: questionData.explanation,
      hint: questionData.hint,
      tolerance: questionData.tolerance,
      unit: questionData.unit,
      bloomsLevel: randomOutcome.bloomsLevel,
      learningOutcomeIds: [randomOutcome.id],
      subjectId: subject.id,
      topicId: randomTopic.id,
      gradeLevel: subject.name.includes('Y7') ? 7 : 8,
      year: currentYear,
      createdById: systemUserId,
      partitionKey: `${subject.code}_${currentYear}`
    };
    
    questions.push(question);
  }
  
  console.log(`   ✅ Generated ${questions.length} questions for ${subject.name}`);
  return questions;
}

/**
 * Convert question to CSV row
 */
function questionToCSVRow(question: QuestionData): string {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${str.replace(/"/g, '""')}"`;
  };

  return [
    escapeCSV(question.questionBankId),
    escapeCSV(question.title),
    escapeCSV(question.questionType),
    escapeCSV(question.difficulty),
    escapeCSV(question.text),
    escapeCSV(question.options || ''),
    escapeCSV(question.correctAnswer || ''),
    escapeCSV(question.blanks || ''),
    escapeCSV(question.pairs || ''),
    escapeCSV(question.explanation || ''),
    escapeCSV(question.hint || ''),
    escapeCSV(question.tolerance || ''),
    escapeCSV(question.unit || ''),
    escapeCSV(question.bloomsLevel),
    escapeCSV(question.learningOutcomeIds.join(',')),
    escapeCSV(question.subjectId),
    escapeCSV(question.topicId),
    escapeCSV(question.gradeLevel),
    escapeCSV(question.year),
    escapeCSV(question.createdById),
    escapeCSV(question.partitionKey)
  ].join(',');
}

/**
 * Generate CSV file for subject questions
 */
async function generateSubjectCSVFile(
  subject: SubjectData,
  questions: QuestionData[],
  outputDir: string
): Promise<void> {
  const fileName = `${subject.code.replace(/[^a-zA-Z0-9]/g, '_')}_100000_questions.csv`;
  const filePath = path.join(outputDir, fileName);

  console.log(`\n📄 Creating CSV file: ${fileName}`);

  // CSV Header
  const header = [
    'questionBankId',
    'title',
    'questionType',
    'difficulty',
    'text',
    'options',
    'correctAnswer',
    'blanks',
    'pairs',
    'explanation',
    'hint',
    'tolerance',
    'unit',
    'bloomsLevel',
    'learningOutcomeIds',
    'subjectId',
    'topicId',
    'gradeLevel',
    'year',
    'createdById',
    'partitionKey'
  ].join(',');

  // Write file in chunks to handle large datasets
  const writeStream = fs.createWriteStream(filePath);
  writeStream.write(header + '\n');

  let processedCount = 0;
  for (const question of questions) {
    writeStream.write(questionToCSVRow(question) + '\n');
    processedCount++;

    if (processedCount % 10000 === 0) {
      console.log(`   📊 Written ${processedCount}/${questions.length} questions to CSV...`);
    }
  }

  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`   ✅ CSV file created: ${fileName} (${questions.length} questions)`);
      resolve();
    });
    writeStream.on('error', reject);
  });
}

/**
 * Main function to generate all subject question files
 */
async function generateAllSubjectQuestionFiles() {
  try {
    console.log('🚀 Starting Subject-Specific Question Generation...\n');

    // Get system user
    const systemUser = await prisma.user.findFirst();
    if (!systemUser) {
      throw new Error('No users found - cannot create questions');
    }

    // Get default question bank
    const questionBank = await prisma.questionBank.findFirst({
      where: { status: 'ACTIVE' }
    });
    if (!questionBank) {
      throw new Error('No active question banks found');
    }

    // Get all subjects with their topics and learning outcomes
    const subjects = await prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      include: {
        topics: {
          where: { status: 'ACTIVE' },
          include: {
            learningOutcomes: {
              select: {
                id: true,
                statement: true,
                bloomsLevel: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${subjects.length} subjects to process`);

    // Create output directory
    const outputDir = path.join(process.cwd(), 'data', 'subject-question-files');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate questions for each subject
    for (const subject of subjects) {
      const subjectData: SubjectData = {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        topics: subject.topics.map(topic => ({
          id: topic.id,
          title: topic.title,
          code: topic.code,
          learningOutcomes: topic.learningOutcomes
        }))
      };

      // Skip subjects without topics or learning outcomes
      if (subjectData.topics.length === 0) {
        console.log(`⏭️  Skipping ${subject.name} - no topics found`);
        continue;
      }

      const totalOutcomes = subjectData.topics.reduce((sum, topic) => sum + topic.learningOutcomes.length, 0);
      if (totalOutcomes === 0) {
        console.log(`⏭️  Skipping ${subject.name} - no learning outcomes found`);
        continue;
      }

      console.log(`\n📚 Processing ${subject.name}:`);
      console.log(`   Topics: ${subjectData.topics.length}`);
      console.log(`   Learning Outcomes: ${totalOutcomes}`);

      // Generate questions for this subject (configurable amount)
      const questionCount = process.env.QUESTION_COUNT ? parseInt(process.env.QUESTION_COUNT) : 100000;
      const questions = await generateQuestionsForSubject(
        subjectData,
        questionCount,
        questionBank.id,
        systemUser.id
      );

      // Create CSV file
      await generateSubjectCSVFile(subjectData, questions, outputDir);
    }

    console.log('\n🎉 All subject question files generated successfully!');
    console.log(`📁 Files saved in: ${outputDir}`);

  } catch (error) {
    console.error('❌ Error generating subject question files:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  generateAllSubjectQuestionFiles()
    .then(() => {
      console.log('\n🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { generateAllSubjectQuestionFiles };
