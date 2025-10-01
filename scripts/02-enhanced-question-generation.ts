/**
 * Enhanced Question Generation Script
 * 
 * This script:
 * 1. Uses the newly created learning outcomes for question generation
 * 2. Ensures questions are properly aligned with Bloom's taxonomy levels
 * 3. Generates complete, validated question data with all required relationships
 * 4. Creates realistic, educationally-appropriate questions
 */

import { PrismaClient } from '@prisma/client';
import { BloomsTaxonomyLevel } from '@/features/bloom/types';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Question types and their distributions
const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'NUMERIC'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Question type distribution
const QUESTION_TYPE_DISTRIBUTION = {
  MULTIPLE_CHOICE: 0.4,  // 40%
  TRUE_FALSE: 0.25,      // 25%
  SHORT_ANSWER: 0.2,     // 20%
  ESSAY: 0.1,            // 10%
  NUMERIC: 0.05          // 5%
};

// Bloom's taxonomy question stems
const BLOOMS_QUESTION_STEMS = {
  [BloomsTaxonomyLevel.REMEMBER]: [
    'What is the definition of {concept}?',
    'List the main {items} in {context}.',
    'Identify the {element} in {situation}.',
    'Name the {components} of {system}.',
    'Recall the {facts} about {topic}.',
    'State the {rule} for {process}.',
    'Which of the following is {description}?',
    'What are the {characteristics} of {subject}?'
  ],
  [BloomsTaxonomyLevel.UNDERSTAND]: [
    'Explain why {phenomenon} occurs.',
    'Summarize the main points of {content}.',
    'What does {concept} mean in the context of {situation}?',
    'How would you describe {process} in your own words?',
    'What is the relationship between {element1} and {element2}?',
    'Interpret the meaning of {data} in {context}.',
    'Compare {item1} and {item2} in terms of {criteria}.',
    'What can you infer from {information}?'
  ],
  [BloomsTaxonomyLevel.APPLY]: [
    'How would you use {concept} to solve {problem}?',
    'Apply {principle} to {new_situation}.',
    'What would happen if you {action} in {scenario}?',
    'Demonstrate how to {process} using {method}.',
    'Calculate the {value} when {conditions}.',
    'Show how {technique} can be used to {objective}.',
    'Implement {strategy} to achieve {goal}.',
    'Use {tool} to {accomplish_task}.'
  ],
  [BloomsTaxonomyLevel.ANALYZE]: [
    'What are the key components of {system}?',
    'How do {factor1} and {factor2} interact in {context}?',
    'What patterns can you identify in {data}?',
    'Break down {complex_concept} into its main parts.',
    'What assumptions underlie {argument}?',
    'Analyze the relationship between {cause} and {effect}.',
    'What evidence supports {conclusion}?',
    'How does {element} contribute to {outcome}?'
  ],
  [BloomsTaxonomyLevel.EVALUATE]: [
    'What is your opinion on {issue} and why?',
    'Evaluate the effectiveness of {approach} for {purpose}.',
    'What are the strengths and weaknesses of {solution}?',
    'Judge the value of {method} in {context}.',
    'Which {option} would be most appropriate for {situation}?',
    'Assess the impact of {factor} on {outcome}.',
    'What criteria would you use to evaluate {subject}?',
    'Defend your position on {controversial_topic}.'
  ],
  [BloomsTaxonomyLevel.CREATE]: [
    'Design a {solution} for {problem}.',
    'Create a plan to {achieve_goal}.',
    'Develop a new {approach} to {challenge}.',
    'Construct a {model} that demonstrates {concept}.',
    'Formulate a hypothesis about {phenomenon}.',
    'Generate alternative {solutions} for {issue}.',
    'Compose a {product} that incorporates {elements}.',
    'Synthesize {information} to create {new_understanding}.'
  ]
};

interface EnhancedSubjectData {
  id: string;
  code: string;
  name: string;
  topics: TopicData[];
  learningOutcomes: LearningOutcomeData[];
}

interface TopicData {
  id: string;
  code: string;
  title: string;
  keywords: string[];
  subjectId: string;
}

interface LearningOutcomeData {
  id: string;
  statement: string;
  bloomsLevel: BloomsTaxonomyLevel;
  subjectId: string;
  topicId?: string;
}

/**
 * Fetch subjects with their topics and learning outcomes
 */
async function fetchEnhancedSubjectData(): Promise<EnhancedSubjectData[]> {
  console.log('📊 Fetching subjects with topics and learning outcomes...');
  
  const subjects = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    include: {
      topics: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          code: true,
          title: true,
          keywords: true,
          subjectId: true
        }
      },
      learningOutcomes: {
        select: {
          id: true,
          statement: true,
          bloomsLevel: true,
          subjectId: true,
          topicId: true
        }
      }
    }
  });

  const enhancedData = subjects.map(subject => ({
    id: subject.id,
    code: subject.code,
    name: subject.name,
    topics: subject.topics,
    learningOutcomes: subject.learningOutcomes as LearningOutcomeData[]
  }));

  console.log(`✅ Found ${subjects.length} subjects:`);
  enhancedData.forEach(subject => {
    console.log(`  - ${subject.name}: ${subject.topics.length} topics, ${subject.learningOutcomes.length} learning outcomes`);
  });

  return enhancedData;
}

/**
 * Select appropriate question type based on Bloom's level
 */
function selectQuestionType(bloomsLevel: BloomsTaxonomyLevel, randomFactor: number): typeof QUESTION_TYPES[number] {
  // Adjust question type probability based on Bloom's level
  switch (bloomsLevel) {
    case BloomsTaxonomyLevel.REMEMBER:
    case BloomsTaxonomyLevel.UNDERSTAND:
      // Lower levels favor multiple choice and true/false
      if (randomFactor < 0.5) return 'MULTIPLE_CHOICE';
      if (randomFactor < 0.8) return 'TRUE_FALSE';
      if (randomFactor < 0.95) return 'SHORT_ANSWER';
      return 'ESSAY';
      
    case BloomsTaxonomyLevel.APPLY:
      // Application level favors problem-solving types
      if (randomFactor < 0.3) return 'MULTIPLE_CHOICE';
      if (randomFactor < 0.4) return 'TRUE_FALSE';
      if (randomFactor < 0.7) return 'SHORT_ANSWER';
      if (randomFactor < 0.9) return 'NUMERIC';
      return 'ESSAY';
      
    case BloomsTaxonomyLevel.ANALYZE:
    case BloomsTaxonomyLevel.EVALUATE:
      // Higher levels favor open-ended questions
      if (randomFactor < 0.2) return 'MULTIPLE_CHOICE';
      if (randomFactor < 0.3) return 'TRUE_FALSE';
      if (randomFactor < 0.6) return 'SHORT_ANSWER';
      return 'ESSAY';
      
    case BloomsTaxonomyLevel.CREATE:
      // Creation level heavily favors essays and projects
      if (randomFactor < 0.1) return 'MULTIPLE_CHOICE';
      if (randomFactor < 0.2) return 'SHORT_ANSWER';
      return 'ESSAY';
      
    default:
      // Fallback to standard distribution
      if (randomFactor < 0.4) return 'MULTIPLE_CHOICE';
      if (randomFactor < 0.65) return 'TRUE_FALSE';
      if (randomFactor < 0.85) return 'SHORT_ANSWER';
      if (randomFactor < 0.95) return 'ESSAY';
      return 'NUMERIC';
  }
}

/**
 * Generate question stem based on learning outcome and Bloom's level
 */
function generateQuestionStem(learningOutcome: LearningOutcomeData, subject: EnhancedSubjectData, topic?: TopicData): string {
  const stems = BLOOMS_QUESTION_STEMS[learningOutcome.bloomsLevel];
  const baseStem = stems[Math.floor(Math.random() * stems.length)];
  
  // Extract key concepts from learning outcome
  const outcomeWords = learningOutcome.statement.toLowerCase().split(' ');
  const subjectName = subject.name.toLowerCase();
  const topicName = topic?.title.toLowerCase() || 'general concepts';
  
  // Replace placeholders with contextual information
  let questionStem = baseStem
    .replace('{concept}', topicName)
    .replace('{topic}', topicName)
    .replace('{subject}', subjectName)
    .replace('{context}', `${subjectName} ${topicName}`)
    .replace('{situation}', `${topicName} scenarios`)
    .replace('{system}', `${topicName} system`)
    .replace('{process}', `${topicName} process`)
    .replace('{content}', `${topicName} content`)
    .replace('{problem}', `${topicName} problem`)
    .replace('{method}', `${topicName} method`)
    .replace('{approach}', `${topicName} approach`)
    .replace('{solution}', `${topicName} solution`)
    .replace('{issue}', `${topicName} issue`)
    .replace('{phenomenon}', `${topicName} phenomenon`)
    .replace('{data}', `${topicName} data`)
    .replace('{information}', `${topicName} information`)
    .replace('{element}', `${topicName} element`)
    .replace('{components}', `${topicName} components`)
    .replace('{items}', `${topicName} items`)
    .replace('{facts}', `${topicName} facts`)
    .replace('{rule}', `${topicName} rule`)
    .replace('{characteristics}', `${topicName} characteristics`)
    .replace('{description}', `related to ${topicName}`)
    .replace('{element1}', `${topicName} concepts`)
    .replace('{element2}', `${subjectName} principles`)
    .replace('{item1}', `${topicName} approach A`)
    .replace('{item2}', `${topicName} approach B`)
    .replace('{criteria}', `${subjectName} standards`)
    .replace('{principle}', `${topicName} principle`)
    .replace('{new_situation}', `new ${topicName} scenario`)
    .replace('{action}', `apply ${topicName} concepts`)
    .replace('{scenario}', `${topicName} scenario`)
    .replace('{conditions}', `given ${topicName} conditions`)
    .replace('{technique}', `${topicName} technique`)
    .replace('{objective}', `${topicName} objective`)
    .replace('{strategy}', `${topicName} strategy`)
    .replace('{goal}', `${topicName} goal`)
    .replace('{tool}', `${topicName} tool`)
    .replace('{accomplish_task}', `solve ${topicName} problems`)
    .replace('{complex_concept}', `${topicName} concept`)
    .replace('{factor1}', `${topicName} factor A`)
    .replace('{factor2}', `${topicName} factor B`)
    .replace('{argument}', `${topicName} argument`)
    .replace('{cause}', `${topicName} cause`)
    .replace('{effect}', `${topicName} effect`)
    .replace('{conclusion}', `${topicName} conclusion`)
    .replace('{outcome}', `${topicName} outcome`)
    .replace('{factor}', `${topicName} factor`)
    .replace('{option}', `${topicName} option`)
    .replace('{purpose}', `${topicName} purpose`)
    .replace('{controversial_topic}', `${topicName} debate`)
    .replace('{challenge}', `${topicName} challenge`)
    .replace('{model}', `${topicName} model`)
    .replace('{product}', `${topicName} product`)
    .replace('{elements}', `${topicName} elements`)
    .replace('{new_understanding}', `new ${topicName} understanding`);
  
  return questionStem;
}

/**
 * Generate complete question data with all relationships
 */
function generateEnhancedQuestion(
  subject: EnhancedSubjectData,
  learningOutcome: LearningOutcomeData,
  topic: TopicData | null,
  questionIndex: number
): any {
  const randomFactor = Math.random();
  const questionType = selectQuestionType(learningOutcome.bloomsLevel, randomFactor);
  const difficulty = DIFFICULTIES[questionIndex % DIFFICULTIES.length];
  const gradeLevel = GRADE_LEVELS[questionIndex % GRADE_LEVELS.length];

  // Generate question stem based on learning outcome
  const questionText = generateQuestionStem(learningOutcome, subject, topic || undefined);

  const baseQuestion = {
    title: `${subject.name} - ${topic?.title || 'General'} - ${learningOutcome.bloomsLevel} Question ${questionIndex + 1}`,
    questionType,
    difficulty,
    subjectId: subject.id,
    subjectName: subject.name,
    courseId: `course-${subject.code.toLowerCase()}`,
    courseName: `${subject.name} Course`,
    topicId: topic?.id || '',
    topicName: topic?.title || '',
    learningOutcomeId: learningOutcome.id,
    learningOutcomeStatement: learningOutcome.statement,
    bloomsLevel: learningOutcome.bloomsLevel,
    gradeLevel,
    year: 2024,
    sourceReference: 'Enhanced Generated Test Data',
    text: questionText,
    keywords: topic?.keywords || [subject.name.toLowerCase()],
    explanation: `This ${learningOutcome.bloomsLevel.toLowerCase()} level question assesses: ${learningOutcome.statement}`,
    hint: `Consider the learning outcome: ${learningOutcome.statement.replace('Students will ', '')}`
  };

  // Add question-type specific fields
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
      return {
        ...baseQuestion,
        option1: generateOption(subject, topic, learningOutcome, 'A', true),
        option1Correct: true,
        option1Feedback: 'Correct! This answer aligns with the learning outcome.',
        option2: generateOption(subject, topic, learningOutcome, 'B', false),
        option2Correct: false,
        option2Feedback: 'Incorrect. Review the learning outcome and try again.',
        option3: generateOption(subject, topic, learningOutcome, 'C', false),
        option3Correct: false,
        option3Feedback: 'Incorrect. Consider the key concepts in the learning outcome.',
        option4: generateOption(subject, topic, learningOutcome, 'D', false),
        option4Correct: false,
        option4Feedback: 'Incorrect. Think about what the learning outcome requires.',
        correctAnswer: '',
        sampleAnswer: '',
        rubric: '',
        wordLimit: ''
      };

    case 'TRUE_FALSE':
      const isTrue = Math.random() > 0.5;
      return {
        ...baseQuestion,
        option1: '',
        option1Correct: '',
        option1Feedback: '',
        option2: '',
        option2Correct: '',
        option2Feedback: '',
        option3: '',
        option3Correct: '',
        option3Feedback: '',
        option4: '',
        option4Correct: '',
        option4Feedback: '',
        correctAnswer: isTrue ? 'true' : 'false',
        sampleAnswer: '',
        rubric: '',
        wordLimit: ''
      };

    case 'SHORT_ANSWER':
      return {
        ...baseQuestion,
        option1: '',
        option1Correct: '',
        option1Feedback: '',
        option2: '',
        option2Correct: '',
        option2Feedback: '',
        option3: '',
        option3Correct: '',
        option3Feedback: '',
        option4: '',
        option4Correct: '',
        option4Feedback: '',
        correctAnswer: '',
        sampleAnswer: generateSampleAnswer(subject, topic, learningOutcome),
        rubric: '',
        wordLimit: ''
      };

    case 'ESSAY':
      return {
        ...baseQuestion,
        option1: '',
        option1Correct: '',
        option1Feedback: '',
        option2: '',
        option2Correct: '',
        option2Feedback: '',
        option3: '',
        option3Correct: '',
        option3Feedback: '',
        option4: '',
        option4Correct: '',
        option4Feedback: '',
        correctAnswer: '',
        sampleAnswer: '',
        rubric: generateEssayRubric(learningOutcome),
        wordLimit: getWordLimit(learningOutcome.bloomsLevel)
      };

    case 'NUMERIC':
      return {
        ...baseQuestion,
        option1: '',
        option1Correct: '',
        option1Feedback: '',
        option2: '',
        option2Correct: '',
        option2Feedback: '',
        option3: '',
        option3Correct: '',
        option3Feedback: '',
        option4: '',
        option4Correct: '',
        option4Feedback: '',
        correctAnswer: generateNumericAnswer(subject, topic),
        sampleAnswer: '',
        rubric: '',
        wordLimit: ''
      };

    default:
      return baseQuestion;
  }
}

/**
 * Helper functions for generating question components
 */
function generateOption(subject: EnhancedSubjectData, topic: TopicData | null, learningOutcome: LearningOutcomeData, optionLabel: string, isCorrect: boolean): string {
  const topicName = topic?.title || subject.name;
  if (isCorrect) {
    return `Correct answer related to ${topicName} and ${learningOutcome.bloomsLevel.toLowerCase()} level understanding`;
  } else {
    return `Incorrect option ${optionLabel} for ${topicName}`;
  }
}

function generateSampleAnswer(subject: EnhancedSubjectData, topic: TopicData | null, learningOutcome: LearningOutcomeData): string {
  const topicName = topic?.title || subject.name;
  return `A comprehensive answer should demonstrate ${learningOutcome.bloomsLevel.toLowerCase()} level understanding of ${topicName} concepts as outlined in the learning outcome: ${learningOutcome.statement}`;
}

function generateEssayRubric(learningOutcome: LearningOutcomeData): string {
  const rubric = [
    {
      criteria: 'Learning Outcome Alignment',
      points: 4,
      description: `Demonstrates mastery of: ${learningOutcome.statement}`
    },
    {
      criteria: `${learningOutcome.bloomsLevel} Level Thinking`,
      points: 4,
      description: `Shows appropriate ${learningOutcome.bloomsLevel.toLowerCase()} level cognitive skills`
    },
    {
      criteria: 'Content Knowledge',
      points: 3,
      description: 'Displays accurate understanding of subject matter'
    },
    {
      criteria: 'Organization and Clarity',
      points: 3,
      description: 'Well-structured response with clear communication'
    }
  ];

  return JSON.stringify(rubric);
}

function getWordLimit(bloomsLevel: BloomsTaxonomyLevel): number {
  switch (bloomsLevel) {
    case BloomsTaxonomyLevel.REMEMBER:
    case BloomsTaxonomyLevel.UNDERSTAND:
      return Math.floor(Math.random() * 100) + 50; // 50-150 words
    case BloomsTaxonomyLevel.APPLY:
    case BloomsTaxonomyLevel.ANALYZE:
      return Math.floor(Math.random() * 200) + 150; // 150-350 words
    case BloomsTaxonomyLevel.EVALUATE:
    case BloomsTaxonomyLevel.CREATE:
      return Math.floor(Math.random() * 300) + 300; // 300-600 words
    default:
      return 250;
  }
}

function generateNumericAnswer(subject: EnhancedSubjectData, topic: TopicData | null): string {
  // Generate realistic numeric answers based on subject
  if (subject.name.toLowerCase().includes('math')) {
    return (Math.random() * 1000).toFixed(2);
  } else if (subject.name.toLowerCase().includes('science')) {
    return (Math.random() * 100).toFixed(3);
  } else {
    return Math.floor(Math.random() * 100).toString();
  }
}
