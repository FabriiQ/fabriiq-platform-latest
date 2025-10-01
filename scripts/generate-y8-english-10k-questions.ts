/**
 * Generate 10,000 High-Quality Y8 English Questions
 * 
 * Creates a comprehensive CSV file with 10,000 questions for Y8 English
 * with proper associations: Subject → Topic → Learning Outcome → Bloom's Taxonomy → Question
 * Includes all question types with realistic, educational content
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

// Enhanced question type distribution for Y8 English
const QUESTION_TYPE_DISTRIBUTION = {
  [BloomsTaxonomyLevel.REMEMBER]: [
    { type: QuestionType.MULTIPLE_CHOICE, weight: 35 },
    { type: QuestionType.TRUE_FALSE, weight: 25 },
    { type: QuestionType.FILL_IN_THE_BLANKS, weight: 25 },
    { type: QuestionType.SHORT_ANSWER, weight: 15 }
  ],
  [BloomsTaxonomyLevel.UNDERSTAND]: [
    { type: QuestionType.MULTIPLE_CHOICE, weight: 30 },
    { type: QuestionType.SHORT_ANSWER, weight: 25 },
    { type: QuestionType.MATCHING, weight: 25 },
    { type: QuestionType.TRUE_FALSE, weight: 20 }
  ],
  [BloomsTaxonomyLevel.APPLY]: [
    { type: QuestionType.SHORT_ANSWER, weight: 35 },
    { type: QuestionType.MULTIPLE_CHOICE, weight: 25 },
    { type: QuestionType.FILL_IN_THE_BLANKS, weight: 20 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 20 }
  ],
  [BloomsTaxonomyLevel.ANALYZE]: [
    { type: QuestionType.ESSAY, weight: 40 },
    { type: QuestionType.SHORT_ANSWER, weight: 30 },
    { type: QuestionType.MULTIPLE_CHOICE, weight: 20 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 10 }
  ],
  [BloomsTaxonomyLevel.EVALUATE]: [
    { type: QuestionType.ESSAY, weight: 45 },
    { type: QuestionType.SHORT_ANSWER, weight: 30 },
    { type: QuestionType.MULTIPLE_RESPONSE, weight: 15 },
    { type: QuestionType.MULTIPLE_CHOICE, weight: 10 }
  ],
  [BloomsTaxonomyLevel.CREATE]: [
    { type: QuestionType.ESSAY, weight: 60 },
    { type: QuestionType.SHORT_ANSWER, weight: 40 }
  ]
};

// English-specific content templates
const ENGLISH_CONTENT_TEMPLATES = {
  'Reading Comprehension': {
    passages: [
      'The old lighthouse stood majestically on the rocky cliff, its beacon cutting through the foggy night...',
      'Sarah discovered an ancient diary hidden in her grandmother\'s attic, filled with stories of adventure...',
      'The bustling marketplace was alive with vendors calling out their wares and customers bargaining...',
      'In the heart of the Amazon rainforest, Dr. Martinez made a discovery that would change everything...',
      'The small village had a tradition that dated back centuries, one that brought the community together...'
    ],
    vocabulary: ['metaphor', 'simile', 'alliteration', 'personification', 'imagery', 'symbolism', 'irony', 'foreshadowing'],
    themes: ['friendship', 'courage', 'identity', 'family', 'nature', 'adventure', 'mystery', 'growth']
  },
  'Writing Skills': {
    genres: ['narrative', 'descriptive', 'persuasive', 'expository', 'creative'],
    techniques: ['dialogue', 'character development', 'setting description', 'plot structure', 'point of view'],
    elements: ['introduction', 'body paragraphs', 'conclusion', 'thesis statement', 'topic sentences']
  },
  'Grammar & Language': {
    parts_of_speech: ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'interjection'],
    tenses: ['present simple', 'past simple', 'future simple', 'present continuous', 'past continuous', 'present perfect'],
    punctuation: ['comma', 'semicolon', 'apostrophe', 'quotation marks', 'colon', 'dash', 'parentheses']
  },
  'Literature': {
    genres: ['poetry', 'drama', 'fiction', 'non-fiction', 'biography', 'autobiography'],
    elements: ['character', 'setting', 'plot', 'theme', 'conflict', 'resolution', 'climax', 'exposition'],
    devices: ['metaphor', 'simile', 'alliteration', 'rhyme scheme', 'meter', 'symbolism', 'irony']
  },
  'Speaking & Listening': {
    skills: ['active listening', 'clear pronunciation', 'eye contact', 'body language', 'voice modulation'],
    formats: ['presentation', 'debate', 'discussion', 'interview', 'storytelling', 'poetry recitation'],
    techniques: ['pausing', 'emphasis', 'tone variation', 'gesture use', 'audience engagement']
  }
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
 * Get random element from array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generate realistic English question content
 */
function generateEnglishQuestionContent(
  questionType: QuestionType,
  learningOutcome: LearningOutcomeData,
  topic: TopicData,
  subject: SubjectData,
  questionIndex: number
): Partial<QuestionData> {
  const topicKey = topic.title as keyof typeof ENGLISH_CONTENT_TEMPLATES;
  const templates = ENGLISH_CONTENT_TEMPLATES[topicKey] || ENGLISH_CONTENT_TEMPLATES['Reading Comprehension'];
  
  switch (questionType) {
    case QuestionType.MULTIPLE_CHOICE:
      return generateMultipleChoiceContent(topic, learningOutcome, templates, questionIndex);
    
    case QuestionType.TRUE_FALSE:
      return generateTrueFalseContent(topic, learningOutcome, templates, questionIndex);
    
    case QuestionType.FILL_IN_THE_BLANKS:
      return generateFillBlanksContent(topic, learningOutcome, templates, questionIndex);
    
    case QuestionType.MATCHING:
      return generateMatchingContent(topic, learningOutcome, templates, questionIndex);
    
    case QuestionType.MULTIPLE_RESPONSE:
      return generateMultipleResponseContent(topic, learningOutcome, templates, questionIndex);
    
    case QuestionType.SHORT_ANSWER:
      return generateShortAnswerContent(topic, learningOutcome, templates, questionIndex);
    
    case QuestionType.ESSAY:
      return generateEssayContent(topic, learningOutcome, templates, questionIndex);
    
    default:
      return {
        text: `Demonstrate your understanding of ${topic.title} concepts.`,
        explanation: `This question assesses ${learningOutcome.bloomsLevel} level understanding of ${topic.title}.`
      };
  }
}

/**
 * Generate multiple choice question content
 */
function generateMultipleChoiceContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const topicTitle = topic.title;
  
  if (topicTitle.includes('Reading')) {
    const passage = getRandomElement(templates.passages || ['A sample passage about literature and reading comprehension.']);
    return {
      text: `Read the following passage and answer the question:\n\n"${passage}"\n\nWhat is the main theme of this passage?`,
      options: JSON.stringify([
        { text: "Adventure and discovery", isCorrect: true },
        { text: "Historical events", isCorrect: false },
        { text: "Scientific research", isCorrect: false },
        { text: "Political commentary", isCorrect: false }
      ]),
      explanation: `This question tests reading comprehension skills at the ${learningOutcome.bloomsLevel} level.`
    };
  } else if (topicTitle.includes('Grammar')) {
    const partOfSpeech = getRandomElement(templates.parts_of_speech || ['noun', 'verb', 'adjective']);
    return {
      text: `Identify the ${partOfSpeech} in the following sentence: "The brilliant student quickly solved the challenging problem."`,
      options: JSON.stringify([
        { text: "brilliant", isCorrect: partOfSpeech === 'adjective' },
        { text: "student", isCorrect: partOfSpeech === 'noun' },
        { text: "quickly", isCorrect: partOfSpeech === 'adverb' },
        { text: "solved", isCorrect: partOfSpeech === 'verb' }
      ]),
      explanation: `This question assesses grammar knowledge at the ${learningOutcome.bloomsLevel} level.`
    };
  } else {
    return {
      text: `Which of the following best describes the key concept in ${topicTitle}?`,
      options: JSON.stringify([
        { text: `Primary concept of ${topicTitle}`, isCorrect: true },
        { text: `Secondary aspect of ${topicTitle}`, isCorrect: false },
        { text: `Related but different concept`, isCorrect: false },
        { text: `Unrelated concept`, isCorrect: false }
      ]),
      explanation: `This question assesses understanding of ${topicTitle} at the ${learningOutcome.bloomsLevel} level.`
    };
  }
}

/**
 * Generate true/false question content
 */
function generateTrueFalseContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const isTrue = Math.random() > 0.5;
  const topicTitle = topic.title;

  if (topicTitle.includes('Literature')) {
    const device = getRandomElement(templates.devices || ['metaphor', 'simile', 'symbolism']);
    return {
      text: `True or False: A ${device} is a literary device that compares two unlike things using "like" or "as".`,
      correctAnswer: (device === 'simile').toString(),
      explanation: `This statement is ${device === 'simile' ? 'true' : 'false'}. ${device === 'simile' ? 'Similes use "like" or "as" for comparison.' : `A ${device} is different from a simile.`}`
    };
  } else {
    return {
      text: `True or False: ${topicTitle} is an essential component of English language learning.`,
      correctAnswer: 'true',
      explanation: `This statement is true. ${topicTitle} plays a crucial role in developing English language skills.`
    };
  }
}

/**
 * Generate fill-in-the-blanks question content
 */
function generateFillBlanksContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const topicTitle = topic.title;

  if (topicTitle.includes('Grammar')) {
    return {
      text: `Complete the sentence with the correct verb tense: "Yesterday, she _____ to the library to study for her exam."`,
      blanks: JSON.stringify([
        { id: 'blank-1', correctAnswers: ['went', 'traveled', 'walked', 'drove'] }
      ]),
      explanation: `This question tests understanding of past tense verbs in context.`
    };
  } else if (topicTitle.includes('Writing')) {
    return {
      text: `Fill in the blank to complete this topic sentence: "The most important element of effective writing is _____ because it helps readers understand the main point."`,
      blanks: JSON.stringify([
        { id: 'blank-1', correctAnswers: ['clarity', 'organization', 'structure', 'coherence'] }
      ]),
      explanation: `This question assesses understanding of writing fundamentals.`
    };
  } else {
    return {
      text: `Complete this statement about ${topicTitle}: "The key to mastering _____ is consistent practice and understanding of fundamental concepts."`,
      blanks: JSON.stringify([
        { id: 'blank-1', correctAnswers: [topicTitle.toLowerCase(), 'this skill', 'these concepts'] }
      ]),
      explanation: `This question reinforces understanding of ${topicTitle} concepts.`
    };
  }
}

/**
 * Generate matching question content
 */
function generateMatchingContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const topicTitle = topic.title;

  if (topicTitle.includes('Literature')) {
    return {
      text: `Match each literary device with its correct definition:`,
      pairs: JSON.stringify([
        { id: 'pair-1', left: 'Metaphor', right: 'Direct comparison without using like or as' },
        { id: 'pair-2', left: 'Simile', right: 'Comparison using like or as' },
        { id: 'pair-3', left: 'Personification', right: 'Giving human qualities to non-human things' },
        { id: 'pair-4', left: 'Alliteration', right: 'Repetition of initial consonant sounds' }
      ]),
      explanation: `This question tests knowledge of literary devices and their definitions.`
    };
  } else if (topicTitle.includes('Grammar')) {
    return {
      text: `Match each part of speech with its function:`,
      pairs: JSON.stringify([
        { id: 'pair-1', left: 'Noun', right: 'Names a person, place, thing, or idea' },
        { id: 'pair-2', left: 'Verb', right: 'Shows action or state of being' },
        { id: 'pair-3', left: 'Adjective', right: 'Describes or modifies a noun' },
        { id: 'pair-4', left: 'Adverb', right: 'Modifies a verb, adjective, or another adverb' }
      ]),
      explanation: `This question assesses understanding of parts of speech and their functions.`
    };
  } else {
    return {
      text: `Match the ${topicTitle} concepts with their applications:`,
      pairs: JSON.stringify([
        { id: 'pair-1', left: `${topicTitle} Concept 1`, right: `Application in real-world context` },
        { id: 'pair-2', left: `${topicTitle} Concept 2`, right: `Practical use in communication` },
        { id: 'pair-3', left: `${topicTitle} Concept 3`, right: `Academic application` }
      ]),
      explanation: `This question connects ${topicTitle} concepts with their practical applications.`
    };
  }
}

/**
 * Generate multiple response question content
 */
function generateMultipleResponseContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const topicTitle = topic.title;

  if (topicTitle.includes('Writing')) {
    return {
      text: `Select all the elements that are essential for effective paragraph writing:`,
      options: JSON.stringify([
        { text: "Clear topic sentence", isCorrect: true },
        { text: "Supporting details", isCorrect: true },
        { text: "Concluding sentence", isCorrect: true },
        { text: "Complex vocabulary only", isCorrect: false },
        { text: "Multiple unrelated ideas", isCorrect: false }
      ]),
      explanation: `Effective paragraphs require topic sentences, supporting details, and conclusions.`
    };
  } else {
    return {
      text: `Which of the following are important aspects of ${topicTitle}? (Select all that apply)`,
      options: JSON.stringify([
        { text: `Understanding core ${topicTitle} principles`, isCorrect: true },
        { text: `Practicing ${topicTitle} skills regularly`, isCorrect: true },
        { text: `Applying ${topicTitle} in various contexts`, isCorrect: true },
        { text: `Memorizing without understanding`, isCorrect: false }
      ]),
      explanation: `Multiple aspects contribute to mastering ${topicTitle} effectively.`
    };
  }
}

/**
 * Generate short answer question content
 */
function generateShortAnswerContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const topicTitle = topic.title;

  if (topicTitle.includes('Reading')) {
    return {
      text: `Explain in 2-3 sentences how context clues can help you understand unfamiliar words while reading.`,
      explanation: `Students should explain that context clues are hints in surrounding text that help determine word meaning.`,
      hint: `Think about how surrounding words and sentences provide hints about meaning.`
    };
  } else if (topicTitle.includes('Writing')) {
    return {
      text: `Describe the purpose of a thesis statement and where it should be placed in an essay.`,
      explanation: `A thesis statement presents the main argument and is typically placed at the end of the introduction.`,
      hint: `Consider what a thesis statement tells the reader and its position in essay structure.`
    };
  } else {
    return {
      text: `Explain the key concepts of ${topicTitle} and provide one example of how it's used in English communication.`,
      explanation: `Students should demonstrate understanding of ${topicTitle} concepts with practical examples.`,
      hint: `Think about the main principles of ${topicTitle} and how they apply in real situations.`
    };
  }
}

/**
 * Generate essay question content
 */
function generateEssayContent(
  topic: TopicData,
  learningOutcome: LearningOutcomeData,
  templates: any,
  questionIndex: number
): Partial<QuestionData> {
  const topicTitle = topic.title;

  if (topicTitle.includes('Literature')) {
    return {
      text: `Analyze how authors use literary devices to enhance their storytelling. Choose two specific devices and explain their effects on the reader with examples.`,
      explanation: `Students should analyze literary devices, provide examples, and explain their impact on readers.`,
      hint: `Structure your response with an introduction, analysis of each device with examples, and a conclusion.`
    };
  } else if (topicTitle.includes('Writing')) {
    return {
      text: `Evaluate the importance of the writing process (planning, drafting, revising, editing) in creating effective written communication. Provide specific examples of how each stage contributes to the final product.`,
      explanation: `Students should evaluate each stage of the writing process and explain its contribution to effective writing.`,
      hint: `Discuss each stage of the writing process and provide concrete examples of its benefits.`
    };
  } else {
    return {
      text: `Create a comprehensive analysis of ${topicTitle} and its role in developing English language proficiency. Include examples and explain connections to other language skills.`,
      explanation: `Students should analyze ${topicTitle}, provide examples, and connect it to broader language learning.`,
      hint: `Structure your analysis with clear examples and connections to other English language skills.`
    };
  }
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
 * Fetch Y8 English subject data from database
 */
async function fetchY8EnglishData(): Promise<SubjectData | null> {
  console.log('📊 Fetching Y8 English subject data...');

  const subject = await prisma.subject.findFirst({
    where: {
      code: 'MYP-Y8-ENGL',
      status: 'ACTIVE'
    },
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

  if (!subject) {
    console.error('❌ Y8 English subject not found');
    return null;
  }

  return {
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
}

/**
 * Generate 10,000 questions for Y8 English
 */
async function generate10KQuestions(
  subject: SubjectData,
  questionBankId: string,
  systemUserId: string
): Promise<QuestionData[]> {
  const questions: QuestionData[] = [];
  const currentYear = new Date().getFullYear();
  const targetCount = 10000;

  console.log(`\n📝 Generating ${targetCount} questions for ${subject.name}...`);

  // Calculate distribution across topics
  const totalTopics = subject.topics.length;
  const questionsPerTopic = Math.floor(targetCount / totalTopics);
  let questionIndex = 0;

  for (const topic of subject.topics) {
    if (topic.learningOutcomes.length === 0) {
      console.warn(`   ⚠️  Topic ${topic.title} has no learning outcomes, skipping...`);
      continue;
    }

    const questionsForThisTopic = Math.min(questionsPerTopic, targetCount - questions.length);
    const questionsPerOutcome = Math.floor(questionsForThisTopic / topic.learningOutcomes.length);

    console.log(`   📚 Processing ${topic.title} (${questionsForThisTopic} questions)...`);

    for (const learningOutcome of topic.learningOutcomes) {
      for (let i = 0; i < questionsPerOutcome && questions.length < targetCount; i++) {
        questionIndex++;

        const questionType = selectQuestionType(learningOutcome.bloomsLevel);
        const questionContent = generateEnglishQuestionContent(
          questionType,
          learningOutcome,
          topic,
          subject,
          questionIndex
        );

        const question: QuestionData = {
          questionBankId,
          title: `${subject.name} - ${topic.title} - Question ${questionIndex}`,
          questionType,
          difficulty: getDifficultyFromBlooms(learningOutcome.bloomsLevel),
          text: questionContent.text || `Question about ${topic.title}`,
          options: questionContent.options,
          correctAnswer: questionContent.correctAnswer,
          blanks: questionContent.blanks,
          pairs: questionContent.pairs,
          explanation: questionContent.explanation,
          hint: questionContent.hint,
          tolerance: questionContent.tolerance,
          unit: questionContent.unit,
          bloomsLevel: learningOutcome.bloomsLevel,
          learningOutcomeIds: [learningOutcome.id],
          subjectId: subject.id,
          topicId: topic.id,
          gradeLevel: 8,
          year: currentYear,
          createdById: systemUserId,
          partitionKey: `${subject.code}_${currentYear}`
        };

        questions.push(question);

        if (questionIndex % 1000 === 0) {
          console.log(`   📊 Generated ${questionIndex} questions...`);
        }
      }
    }
  }

  // Fill remaining questions if needed
  while (questions.length < targetCount) {
    const randomTopic = subject.topics[Math.floor(Math.random() * subject.topics.length)];
    if (randomTopic.learningOutcomes.length === 0) continue;

    const randomOutcome = randomTopic.learningOutcomes[Math.floor(Math.random() * randomTopic.learningOutcomes.length)];
    questionIndex++;

    const questionType = selectQuestionType(randomOutcome.bloomsLevel);
    const questionContent = generateEnglishQuestionContent(
      questionType,
      randomOutcome,
      randomTopic,
      subject,
      questionIndex
    );

    const question: QuestionData = {
      questionBankId,
      title: `${subject.name} - ${randomTopic.title} - Question ${questionIndex}`,
      questionType,
      difficulty: getDifficultyFromBlooms(randomOutcome.bloomsLevel),
      text: questionContent.text || `Question about ${randomTopic.title}`,
      options: questionContent.options,
      correctAnswer: questionContent.correctAnswer,
      blanks: questionContent.blanks,
      pairs: questionContent.pairs,
      explanation: questionContent.explanation,
      hint: questionContent.hint,
      tolerance: questionContent.tolerance,
      unit: questionContent.unit,
      bloomsLevel: randomOutcome.bloomsLevel,
      learningOutcomeIds: [randomOutcome.id],
      subjectId: subject.id,
      topicId: randomTopic.id,
      gradeLevel: 8,
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
 * Create CSV file with questions
 */
async function createCSVFile(questions: QuestionData[], outputPath: string): Promise<void> {
  console.log(`\n📄 Creating CSV file: ${outputPath}`);

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
  const fs = await import('fs');
  const writeStream = fs.createWriteStream(outputPath);
  writeStream.write(header + '\n');

  let processedCount = 0;
  for (const question of questions) {
    writeStream.write(questionToCSVRow(question) + '\n');
    processedCount++;

    if (processedCount % 1000 === 0) {
      console.log(`   📊 Written ${processedCount}/${questions.length} questions to CSV...`);
    }
  }

  writeStream.end();

  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => {
      console.log(`   ✅ CSV file created: ${outputPath} (${questions.length} questions)`);
      resolve();
    });
    writeStream.on('error', reject);
  });
}

/**
 * Main function to generate Y8 English 10K questions
 */
async function main() {
  try {
    console.log('🚀 Starting Y8 English 10K Question Generation...\n');

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

    // Fetch Y8 English subject data
    const subjectData = await fetchY8EnglishData();
    if (!subjectData) {
      throw new Error('Y8 English subject not found');
    }

    console.log(`📚 Found subject: ${subjectData.name}`);
    console.log(`   Topics: ${subjectData.topics.length}`);
    const totalOutcomes = subjectData.topics.reduce((sum, topic) => sum + topic.learningOutcomes.length, 0);
    console.log(`   Learning Outcomes: ${totalOutcomes}`);

    // Generate 10,000 questions
    const questions = await generate10KQuestions(
      subjectData,
      questionBank.id,
      systemUser.id
    );

    // Create output directory
    const path = await import('path');
    const outputDir = path.join(process.cwd(), 'data');
    const fs = await import('fs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create CSV file
    const fileName = `Y8_English_10000_questions_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = path.join(outputDir, fileName);
    await createCSVFile(questions, filePath);

    console.log('\n🎉 Y8 English 10K question generation completed successfully!');
    console.log(`📁 File saved: ${filePath}`);

    // Show statistics
    const stats = questions.reduce((acc, q) => {
      acc[q.questionType] = (acc[q.questionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Question Type Distribution:');
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} questions`);
    });

  } catch (error) {
    console.error('❌ Error generating Y8 English questions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { main as generateY8English10K };
