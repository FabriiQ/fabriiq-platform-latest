/**
 * Generate comprehensive question bank test data files
 * Creates CSV files with 10,000, 50,000, and 100,000 questions
 * Uses real subject IDs, topics, learning outcomes, and Bloom's taxonomy
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { BloomsTaxonomyLevel } from '@/features/bloom/types';

const prisma = new PrismaClient();

// Question types and difficulties
const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'NUMERIC'] as const;
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const BLOOMS_LEVELS = Object.values(BloomsTaxonomyLevel);
const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Subject-specific question templates
const SUBJECT_QUESTION_TEMPLATES = {
  'Mathematics': {
    stems: [
      'What is the value of {expression}?',
      'Solve for x: {equation}',
      'Calculate the area of a {shape} with {dimensions}',
      'Find the derivative of {function}',
      'What is the probability of {event}?',
      'Simplify the expression: {expression}',
      'Factor the polynomial: {polynomial}',
      'Graph the function: {function}',
      'Find the limit of {limit_expression}',
      'Solve the system of equations: {system}'
    ],
    variables: {
      expression: ['2x + 5', '3x² - 4x + 1', 'sin(x) + cos(x)', '√(x² + 1)', 'log(x) + 2'],
      equation: ['2x + 3 = 11', 'x² - 5x + 6 = 0', '3x - 7 = 2x + 5', '4x + 1 = 3x - 2'],
      shape: ['rectangle', 'circle', 'triangle', 'square', 'trapezoid', 'parallelogram'],
      function: ['x²', 'sin(x)', 'e^x', 'ln(x)', '3x + 2', 'x³ - 2x', 'cos(2x)'],
      polynomial: ['x² + 5x + 6', 'x² - 9', '2x² + 7x + 3', 'x³ - 8'],
      event: ['rolling a 6 on a die', 'drawing a red card', 'getting heads twice', 'selecting a vowel']
    }
  },
  'English': {
    stems: [
      'Which of the following is a {grammar_concept}?',
      'In the novel "{book}", the main theme is:',
      'The correct spelling is:',
      'What is the meaning of the word "{word}"?',
      'Identify the literary device used in: "{quote}"',
      'Which sentence is grammatically correct?',
      'The author\'s tone in this passage is:',
      'What type of figurative language is used in "{phrase}"?',
      'The main idea of the paragraph is:',
      'Which punctuation mark is needed in this sentence?'
    ],
    variables: {
      grammar_concept: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction'],
      book: ['To Kill a Mockingbird', 'Romeo and Juliet', 'The Great Gatsby', 'Pride and Prejudice'],
      word: ['ubiquitous', 'ephemeral', 'serendipity', 'mellifluous', 'perspicacious'],
      quote: ['The stars danced in the night sky', 'Time is money', 'Her voice was music to his ears'],
      phrase: ['busy as a bee', 'quiet as a mouse', 'brave as a lion', 'sly as a fox']
    }
  },
  'Science': {
    stems: [
      'What is the chemical formula for {compound}?',
      'Which organ is responsible for {function}?',
      'The force of gravity on Earth is approximately:',
      'What type of rock is formed by {process}?',
      'Which planet is known as {description}?',
      'What is the process called when {biological_process}?',
      'The atomic number of {element} is:',
      'Which law states that {physics_law}?',
      'What happens during {biological_event}?',
      'The pH of {substance} is approximately:'
    ],
    variables: {
      compound: ['water', 'carbon dioxide', 'sodium chloride', 'methane', 'ammonia'],
      function: ['pumping blood', 'filtering waste', 'producing insulin', 'storing bile'],
      process: ['cooling and solidification', 'heat and pressure', 'weathering and erosion'],
      description: ['the red planet', 'the gas giant', 'the morning star', 'the ringed planet'],
      element: ['hydrogen', 'carbon', 'oxygen', 'nitrogen', 'iron'],
      biological_process: ['plants make food using sunlight', 'cells divide', 'DNA replicates']
    }
  }
};

// Learning outcome templates by Bloom's level
const LEARNING_OUTCOME_TEMPLATES = {
  [BloomsTaxonomyLevel.REMEMBER]: [
    'Students will recall {concept}',
    'Students will identify {element}',
    'Students will list {items}',
    'Students will define {term}'
  ],
  [BloomsTaxonomyLevel.UNDERSTAND]: [
    'Students will explain {concept}',
    'Students will describe {process}',
    'Students will summarize {content}',
    'Students will interpret {data}'
  ],
  [BloomsTaxonomyLevel.APPLY]: [
    'Students will solve {problem}',
    'Students will demonstrate {skill}',
    'Students will use {method}',
    'Students will implement {strategy}'
  ],
  [BloomsTaxonomyLevel.ANALYZE]: [
    'Students will compare {elements}',
    'Students will analyze {data}',
    'Students will examine {relationship}',
    'Students will categorize {items}'
  ],
  [BloomsTaxonomyLevel.EVALUATE]: [
    'Students will assess {quality}',
    'Students will critique {work}',
    'Students will judge {effectiveness}',
    'Students will evaluate {solution}'
  ],
  [BloomsTaxonomyLevel.CREATE]: [
    'Students will design {product}',
    'Students will create {solution}',
    'Students will develop {plan}',
    'Students will construct {model}'
  ]
};

interface SubjectData {
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
 * Fetch subjects, topics, and learning outcomes from database
 */
async function fetchSubjectData(): Promise<SubjectData[]> {
  console.log('📊 Fetching subjects, topics, and learning outcomes...');
  
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

  return subjects.map(subject => ({
    id: subject.id,
    code: subject.code,
    name: subject.name,
    topics: subject.topics,
    learningOutcomes: subject.learningOutcomes as LearningOutcomeData[]
  }));
}

/**
 * Generate question content based on subject and type
 */
function generateQuestionContent(
  subject: SubjectData,
  topic: TopicData | null,
  questionType: typeof QUESTION_TYPES[number],
  bloomsLevel: BloomsTaxonomyLevel,
  questionIndex: number
): any {
  const subjectName = subject.name.split(' ')[0]; // Get first word (Mathematics, English, Science, etc.)
  const templates = SUBJECT_QUESTION_TEMPLATES[subjectName as keyof typeof SUBJECT_QUESTION_TEMPLATES];
  
  let questionText = '';
  let title = '';
  
  if (templates) {
    const stem = templates.stems[questionIndex % templates.stems.length];
    questionText = replaceVariables(stem, templates.variables);
    title = `${subject.name} - ${topic?.title || 'General'} Question ${questionIndex + 1}`;
  } else {
    // Generic question for subjects not in templates
    title = `${subject.name} - ${topic?.title || 'General'} Question ${questionIndex + 1}`;
    questionText = `This is a ${bloomsLevel.toLowerCase()} level question for ${subject.name}${topic ? ` on ${topic.title}` : ''}.`;
  }

  const difficulty = DIFFICULTIES[questionIndex % DIFFICULTIES.length];
  const gradeLevel = GRADE_LEVELS[questionIndex % GRADE_LEVELS.length];
  
  const baseQuestion = {
    title,
    questionType,
    difficulty,
    subjectId: subject.id,
    subjectName: subject.name,
    courseId: `course-${subject.code.toLowerCase()}`,
    courseName: `${subject.name} Course`,
    topicId: topic?.id || '',
    topicName: topic?.title || '',
    bloomsLevel,
    gradeLevel,
    year: 2024,
    sourceReference: 'Generated Test Data',
    text: questionText,
    keywords: topic?.keywords || [subject.name.toLowerCase()],
    explanation: `This question tests ${bloomsLevel.toLowerCase()} level understanding of ${topic?.title || subject.name}.`,
    hint: `Consider the key concepts of ${topic?.title || subject.name} when answering.`
  };

  // Add question-type specific fields
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
      return {
        ...baseQuestion,
        option1: 'Option A',
        option1Correct: true,
        option1Feedback: 'Correct! This is the right answer.',
        option2: 'Option B',
        option2Correct: false,
        option2Feedback: 'Incorrect. Try again.',
        option3: 'Option C',
        option3Correct: false,
        option3Feedback: 'Incorrect. Try again.',
        option4: 'Option D',
        option4Correct: false,
        option4Feedback: 'Incorrect. Try again.',
        correctAnswer: '',
        sampleAnswer: '',
        rubric: '',
        wordLimit: ''
      };
      
    case 'TRUE_FALSE':
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
        correctAnswer: Math.random() > 0.5 ? 'true' : 'false',
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
        sampleAnswer: 'Sample answer for this question.',
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
        rubric: JSON.stringify([
          { criteria: 'Content', points: 4, description: 'Demonstrates understanding of key concepts' },
          { criteria: 'Organization', points: 3, description: 'Well-structured response' },
          { criteria: 'Language', points: 3, description: 'Clear and appropriate language use' }
        ]),
        wordLimit: Math.floor(Math.random() * 300) + 200
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
        correctAnswer: (Math.random() * 100).toFixed(2),
        sampleAnswer: '',
        rubric: '',
        wordLimit: ''
      };
      
    default:
      return baseQuestion;
  }
}

/**
 * Replace variables in question stems with actual values
 */
function replaceVariables(stem: string, variables: Record<string, string[]>): string {
  let result = stem;

  for (const [key, values] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      const randomValue = values[Math.floor(Math.random() * values.length)];
      result = result.replace(placeholder, randomValue);
    }
  }

  return result;
}

interface LearningOutcomeToCreate {
  statement: string;
  description: string;
  bloomsLevel: BloomsTaxonomyLevel;
  actionVerbs: string[];
  subjectId: string;
  topicId: string | null;
}

/**
 * Generate learning outcomes for a subject/topic
 */
async function generateLearningOutcomes(subject: SubjectData, topic: TopicData | null): Promise<void> {
  console.log(`📝 Generating learning outcomes for ${subject.name}${topic ? ` - ${topic.title}` : ''}`);

  const outcomesToCreate: LearningOutcomeToCreate[] = [];

  // Generate 2-3 learning outcomes per Bloom's level
  for (const bloomsLevel of BLOOMS_LEVELS) {
    const templates = LEARNING_OUTCOME_TEMPLATES[bloomsLevel];
    const numOutcomes = Math.floor(Math.random() * 2) + 2; // 2-3 outcomes

    for (let i = 0; i < numOutcomes; i++) {
      const template = templates[i % templates.length];
      const statement = template.replace('{concept}', topic?.title || subject.name)
                              .replace('{element}', 'key elements')
                              .replace('{items}', 'important concepts')
                              .replace('{term}', 'terminology')
                              .replace('{process}', 'the process')
                              .replace('{content}', 'the content')
                              .replace('{data}', 'the data')
                              .replace('{problem}', 'problems')
                              .replace('{skill}', 'skills')
                              .replace('{method}', 'methods')
                              .replace('{strategy}', 'strategies')
                              .replace('{elements}', 'different elements')
                              .replace('{relationship}', 'relationships')
                              .replace('{quality}', 'quality')
                              .replace('{work}', 'work')
                              .replace('{effectiveness}', 'effectiveness')
                              .replace('{solution}', 'solutions')
                              .replace('{product}', 'products')
                              .replace('{plan}', 'plans')
                              .replace('{model}', 'models');

      const outcomeData = {
        statement,
        description: `Learning outcome for ${bloomsLevel.toLowerCase()} level in ${topic?.title || subject.name}`,
        bloomsLevel,
        actionVerbs: getActionVerbsForBloomsLevel(bloomsLevel),
        subjectId: subject.id,
        topicId: topic?.id || null
      };

      outcomesToCreate.push(outcomeData);
    }
  }

  // Create learning outcomes in database
  for (const outcome of outcomesToCreate) {
    try {
      await prisma.learningOutcome.create({
        data: {
          statement: outcome.statement,
          description: outcome.description,
          bloomsLevel: outcome.bloomsLevel,
          actionVerbs: outcome.actionVerbs,
          subjectId: outcome.subjectId,
          topicId: outcome.topicId,
          createdById: 'system-generated' // You might want to use a real user ID
        }
      });
    } catch (error) {
      console.log(`   ⚠️  Learning outcome already exists or error: ${error}`);
    }
  }
}

/**
 * Get action verbs for a Bloom's taxonomy level
 */
function getActionVerbsForBloomsLevel(level: BloomsTaxonomyLevel): string[] {
  const verbMap = {
    [BloomsTaxonomyLevel.REMEMBER]: ['recall', 'identify', 'list', 'define', 'name', 'state'],
    [BloomsTaxonomyLevel.UNDERSTAND]: ['explain', 'describe', 'summarize', 'interpret', 'classify', 'compare'],
    [BloomsTaxonomyLevel.APPLY]: ['solve', 'demonstrate', 'use', 'implement', 'execute', 'apply'],
    [BloomsTaxonomyLevel.ANALYZE]: ['analyze', 'examine', 'compare', 'categorize', 'differentiate', 'organize'],
    [BloomsTaxonomyLevel.EVALUATE]: ['assess', 'critique', 'judge', 'evaluate', 'justify', 'argue'],
    [BloomsTaxonomyLevel.CREATE]: ['design', 'create', 'develop', 'construct', 'plan', 'produce']
  };

  return verbMap[level] || ['understand'];
}

/**
 * Generate CSV content for questions
 */
function generateCSVContent(questions: any[]): string {
  const headers = [
    'title', 'questionType', 'difficulty', 'subjectId', 'subjectName', 'courseId', 'courseName',
    'topicId', 'topicName', 'bloomsLevel', 'gradeLevel', 'year', 'sourceReference', 'text',
    'option1', 'option1Correct', 'option1Feedback', 'option2', 'option2Correct', 'option2Feedback',
    'option3', 'option3Correct', 'option3Feedback', 'option4', 'option4Correct', 'option4Feedback',
    'correctAnswer', 'sampleAnswer', 'keywords', 'rubric', 'wordLimit', 'explanation', 'hint'
  ];

  const csvRows = [headers.join(',')];

  for (const question of questions) {
    const row = headers.map(header => {
      let value = question[header] || '';

      // Handle arrays and objects
      if (Array.isArray(value)) {
        value = JSON.stringify(value);
      } else if (typeof value === 'object' && value !== null) {
        value = JSON.stringify(value);
      }

      // Escape quotes and wrap in quotes if contains comma or quote
      value = String(value);
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }

      return value;
    });

    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

/**
 * Main function to generate comprehensive question data
 */
async function main() {
  try {
    console.log('🚀 Starting comprehensive question data generation...');

    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Fetch subject data
    const subjects = await fetchSubjectData();
    console.log(`📚 Found ${subjects.length} subjects`);

    if (subjects.length === 0) {
      console.log('❌ No subjects found. Please run database seeding first.');
      return;
    }

    // Generate learning outcomes for subjects that don't have them
    for (const subject of subjects) {
      if (subject.learningOutcomes.length === 0) {
        await generateLearningOutcomes(subject, null);

        // Generate for each topic
        for (const topic of subject.topics) {
          await generateLearningOutcomes(subject, topic);
        }
      }
    }

    // Re-fetch subjects with new learning outcomes
    const updatedSubjects = await fetchSubjectData();

    // Generate different sized datasets
    const datasets = [
      { size: 10000, filename: 'question-bank-10k-questions.csv' },
      { size: 50000, filename: 'question-bank-50k-questions.csv' },
      { size: 100000, filename: 'question-bank-100k-questions.csv' }
    ];

    for (const dataset of datasets) {
      console.log(`\n📊 Generating ${dataset.size.toLocaleString()} questions...`);

      const questions: any[] = [];
      const questionsPerSubject = Math.ceil(dataset.size / updatedSubjects.length);

      for (const subject of updatedSubjects) {
        console.log(`   📝 Generating questions for ${subject.name}...`);

        const subjectQuestions = Math.min(questionsPerSubject, dataset.size - questions.length);
        const topicsToUse = subject.topics.length > 0 ? subject.topics : [null];
        const questionsPerTopic = Math.ceil(subjectQuestions / topicsToUse.length);

        for (const topic of topicsToUse) {
          const topicQuestions = Math.min(questionsPerTopic, dataset.size - questions.length);

          for (let i = 0; i < topicQuestions; i++) {
            if (questions.length >= dataset.size) break;

            const questionType = QUESTION_TYPES[i % QUESTION_TYPES.length];
            const bloomsLevel = BLOOMS_LEVELS[i % BLOOMS_LEVELS.length];

            const question = generateQuestionContent(
              subject,
              topic,
              questionType,
              bloomsLevel,
              questions.length
            );

            questions.push(question);
          }

          if (questions.length >= dataset.size) break;
        }

        if (questions.length >= dataset.size) break;
      }

      console.log(`   ✅ Generated ${questions.length} questions`);

      // Generate CSV content
      const csvContent = generateCSVContent(questions);

      // Write to file
      const filePath = join(dataDir, dataset.filename);
      writeFileSync(filePath, csvContent, 'utf8');

      console.log(`   💾 Saved to: ${filePath}`);
      console.log(`   📊 File size: ${(csvContent.length / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log('\n🎉 Comprehensive question data generation completed!');
    console.log('\n📁 Generated files:');
    datasets.forEach(dataset => {
      console.log(`   - data/${dataset.filename} (${dataset.size.toLocaleString()} questions)`);
    });

  } catch (error) {
    console.error('❌ Error generating question data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}
