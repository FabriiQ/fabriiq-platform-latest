/**
 * Generate subject-wise question datasets
 * Creates separate 100,000 question files for each subject to avoid upload errors
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
      'Solve the system of equations: {system}',
      'What is the slope of the line passing through points {point1} and {point2}?',
      'Calculate the volume of a {3d_shape} with {dimensions}',
      'Find the roots of the quadratic equation: {quadratic}',
      'What is the sum of the arithmetic series: {series}?',
      'Determine if the triangle with sides {side1}, {side2}, {side3} is {triangle_type}'
    ],
    variables: {
      expression: ['2x + 5', '3x² - 4x + 1', 'sin(x) + cos(x)', '√(x² + 1)', 'log(x) + 2', '4x³ - 2x + 7'],
      equation: ['2x + 3 = 11', 'x² - 5x + 6 = 0', '3x - 7 = 2x + 5', '4x + 1 = 3x - 2', '5x - 3 = 2x + 9'],
      shape: ['rectangle', 'circle', 'triangle', 'square', 'trapezoid', 'parallelogram', 'rhombus'],
      function: ['x²', 'sin(x)', 'e^x', 'ln(x)', '3x + 2', 'x³ - 2x', 'cos(2x)', '2x² + 3x - 1'],
      polynomial: ['x² + 5x + 6', 'x² - 9', '2x² + 7x + 3', 'x³ - 8', '3x² - 12x + 9'],
      event: ['rolling a 6 on a die', 'drawing a red card', 'getting heads twice', 'selecting a vowel'],
      '3d_shape': ['cube', 'cylinder', 'sphere', 'cone', 'rectangular prism'],
      quadratic: ['x² - 4x + 3 = 0', '2x² + 5x - 3 = 0', 'x² - 6x + 8 = 0'],
      triangle_type: ['right', 'acute', 'obtuse', 'equilateral', 'isosceles']
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
      'Which punctuation mark is needed in this sentence?',
      'What is the past tense of the verb "{verb}"?',
      'Identify the subject in the sentence: "{sentence}"',
      'What type of poem has 14 lines and follows a specific rhyme scheme?',
      'Which word is a synonym for "{word}"?',
      'What is the purpose of the introduction in an essay?'
    ],
    variables: {
      grammar_concept: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun'],
      book: ['To Kill a Mockingbird', 'Romeo and Juliet', 'The Great Gatsby', 'Pride and Prejudice', 'Of Mice and Men'],
      word: ['ubiquitous', 'ephemeral', 'serendipity', 'mellifluous', 'perspicacious', 'eloquent', 'benevolent'],
      quote: ['The stars danced in the night sky', 'Time is money', 'Her voice was music to his ears', 'The wind whispered'],
      phrase: ['busy as a bee', 'quiet as a mouse', 'brave as a lion', 'sly as a fox', 'wise as an owl'],
      verb: ['run', 'sing', 'write', 'think', 'bring', 'catch', 'teach'],
      sentence: ['The cat sat on the mat', 'Students study hard for exams', 'Birds fly south in winter']
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
      'The pH of {substance} is approximately:',
      'What is the speed of light in a vacuum?',
      'Which gas makes up the largest percentage of Earth\'s atmosphere?',
      'What is the powerhouse of the cell?',
      'Which scientist developed the theory of evolution?',
      'What is the chemical symbol for {element}?'
    ],
    variables: {
      compound: ['water', 'carbon dioxide', 'sodium chloride', 'methane', 'ammonia', 'glucose', 'sulfuric acid'],
      function: ['pumping blood', 'filtering waste', 'producing insulin', 'storing bile', 'digesting food'],
      process: ['cooling and solidification', 'heat and pressure', 'weathering and erosion', 'volcanic activity'],
      description: ['the red planet', 'the gas giant', 'the morning star', 'the ringed planet', 'the blue planet'],
      element: ['hydrogen', 'carbon', 'oxygen', 'nitrogen', 'iron', 'gold', 'silver'],
      biological_process: ['plants make food using sunlight', 'cells divide', 'DNA replicates', 'proteins are synthesized'],
      biological_event: ['mitosis', 'meiosis', 'photosynthesis', 'cellular respiration', 'protein synthesis'],
      substance: ['pure water', 'lemon juice', 'baking soda', 'vinegar', 'soap']
    }
  },
  'Physical Education': {
    stems: [
      'How many players are on a {sport} team?',
      'What is the recommended daily amount of {nutrient}?',
      'Which exercise primarily targets the {muscle_group}?',
      'What is the proper technique for {activity}?',
      'Which safety equipment is required for {sport}?',
      'What is the duration of a {sport} game?',
      'What is the normal resting heart rate for adults?',
      'Which component of fitness does {exercise} improve?',
      'What is the recommended frequency for {activity_type}?',
      'Which food group provides the most energy?',
      'What is the proper warm-up sequence before exercise?',
      'Which injury is most common in {sport}?',
      'What is the target heart rate zone for moderate exercise?',
      'Which principle of training involves gradually increasing intensity?',
      'What is the importance of hydration during exercise?'
    ],
    variables: {
      sport: ['basketball', 'soccer', 'volleyball', 'tennis', 'baseball', 'hockey', 'football'],
      nutrient: ['protein', 'carbohydrates', 'water', 'vitamins', 'fiber', 'calcium'],
      muscle_group: ['quadriceps', 'biceps', 'core muscles', 'hamstrings', 'deltoids', 'triceps'],
      activity: ['push-ups', 'squats', 'running', 'swimming', 'jumping', 'stretching'],
      exercise: ['running', 'weightlifting', 'yoga', 'cycling', 'swimming'],
      activity_type: ['cardiovascular exercise', 'strength training', 'flexibility training', 'balance training']
    }
  },
  'Life Skills': {
    stems: [
      'What is an effective strategy for {skill}?',
      'Which approach is best for {situation}?',
      'What is the first step in {process}?',
      'How can you improve your {ability}?',
      'What is the importance of {concept} in daily life?',
      'Which technique helps with {challenge}?',
      'What should you consider when {decision}?',
      'How do you develop {personal_quality}?',
      'What is the key to successful {activity}?',
      'Which habit contributes to {outcome}?',
      'What is emotional intelligence?',
      'How can you manage stress effectively?',
      'What are the benefits of goal setting?',
      'How do you build healthy relationships?',
      'What is the importance of time management?'
    ],
    variables: {
      skill: ['time management', 'communication', 'problem-solving', 'critical thinking', 'leadership'],
      situation: ['conflict resolution', 'public speaking', 'job interviews', 'teamwork', 'decision making'],
      process: ['goal setting', 'problem solving', 'learning new skills', 'building relationships'],
      ability: ['memory', 'concentration', 'creativity', 'empathy', 'resilience'],
      concept: ['teamwork', 'responsibility', 'integrity', 'perseverance', 'respect'],
      challenge: ['anxiety', 'procrastination', 'stress', 'conflict', 'change'],
      decision: ['choosing a career', 'making friends', 'managing money', 'solving problems'],
      personal_quality: ['confidence', 'patience', 'empathy', 'leadership', 'resilience'],
      activity: ['studying', 'communication', 'teamwork', 'goal achievement', 'relationship building'],
      outcome: ['success', 'happiness', 'health', 'productivity', 'well-being']
    }
  }
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

/**
 * Get subject name for template matching
 */
function getSubjectTemplateKey(subjectName: string): string {
  // Map FabriiQ subject names to template keys
  if (subjectName.toLowerCase().includes('mathematics') || subjectName.toLowerCase().includes('math')) {
    return 'Mathematics';
  } else if (subjectName.toLowerCase().includes('english') || subjectName.toLowerCase().includes('language')) {
    return 'English';
  } else if (subjectName.toLowerCase().includes('science') || subjectName.toLowerCase().includes('inquiry')) {
    return 'Science';
  } else if (subjectName.toLowerCase().includes('physical') || subjectName.toLowerCase().includes('wellbeing')) {
    return 'Physical Education';
  } else if (subjectName.toLowerCase().includes('life') || subjectName.toLowerCase().includes('learning')) {
    return 'Life Skills';
  }
  
  return 'Science'; // Default fallback
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
  const templateKey = getSubjectTemplateKey(subject.name);
  const templates = SUBJECT_QUESTION_TEMPLATES[templateKey as keyof typeof SUBJECT_QUESTION_TEMPLATES];
  
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
 * Generate CSV content for a subject
 */
function generateSubjectCSV(subject: SubjectData, questionsCount: number = 100000): string {
  console.log(`📝 Generating ${questionsCount.toLocaleString()} questions for ${subject.name}...`);

  const headers = [
    'title', 'questionType', 'difficulty', 'subjectId', 'subjectName', 'courseId', 'courseName',
    'topicId', 'topicName', 'bloomsLevel', 'gradeLevel', 'year', 'sourceReference',
    'text', 'keywords', 'explanation', 'hint',
    'option1', 'option1Correct', 'option1Feedback',
    'option2', 'option2Correct', 'option2Feedback',
    'option3', 'option3Correct', 'option3Feedback',
    'option4', 'option4Correct', 'option4Feedback',
    'correctAnswer', 'sampleAnswer', 'rubric', 'wordLimit'
  ];

  let csvContent = headers.join(',') + '\n';

  for (let i = 0; i < questionsCount; i++) {
    // Select question type with distribution
    let questionType: typeof QUESTION_TYPES[number];
    const rand = Math.random();
    if (rand < 0.4) questionType = 'MULTIPLE_CHOICE';
    else if (rand < 0.65) questionType = 'TRUE_FALSE';
    else if (rand < 0.85) questionType = 'SHORT_ANSWER';
    else if (rand < 0.95) questionType = 'ESSAY';
    else questionType = 'NUMERIC';

    // Select Bloom's level
    const bloomsLevel = BLOOMS_LEVELS[i % BLOOMS_LEVELS.length];

    // Select topic (if available)
    const topic = subject.topics.length > 0 ? subject.topics[i % subject.topics.length] : null;

    // Generate question
    const question = generateQuestionContent(subject, topic, questionType, bloomsLevel, i);

    // Convert to CSV row
    const row = headers.map(header => {
      let value = question[header] || '';

      // Handle arrays (keywords)
      if (Array.isArray(value)) {
        value = value.join(';');
      }

      // Handle boolean values
      if (typeof value === 'boolean') {
        value = value.toString();
      }

      // Handle numbers
      if (typeof value === 'number') {
        value = value.toString();
      }

      // Escape CSV values
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
      }

      return value;
    }).join(',');

    csvContent += row + '\n';

    // Progress indicator
    if ((i + 1) % 10000 === 0) {
      console.log(`  ✓ Generated ${(i + 1).toLocaleString()} questions`);
    }
  }

  return csvContent;
}

/**
 * Generate subject-wise datasets
 */
async function generateSubjectWiseDatasets() {
  try {
    console.log('🚀 Starting subject-wise dataset generation...\n');

    // Fetch subject data
    const subjects = await fetchSubjectData();

    if (subjects.length === 0) {
      console.log('❌ No subjects found in database. Please run the seed script first.');
      return;
    }

    console.log(`📚 Found ${subjects.length} subjects:`);
    subjects.forEach(subject => {
      console.log(`  - ${subject.name} (${subject.topics.length} topics, ${subject.learningOutcomes.length} learning outcomes)`);
    });
    console.log();

    // Create data directory if it doesn't exist
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Generate CSV file for each subject
    for (const subject of subjects) {
      const startTime = Date.now();

      // Clean subject name for filename
      const cleanSubjectName = subject.name
        .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .toLowerCase();

      const filename = `question-bank-${cleanSubjectName}-100k-questions.csv`;
      const filepath = join(dataDir, filename);

      console.log(`📊 Generating dataset for: ${subject.name}`);
      console.log(`📁 File: ${filename}`);

      // Generate CSV content
      const csvContent = generateSubjectCSV(subject, 100000);

      // Write to file
      writeFileSync(filepath, csvContent, 'utf8');

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      const fileSize = (csvContent.length / (1024 * 1024)).toFixed(2);

      console.log(`✅ Generated ${filename}`);
      console.log(`   📊 Size: ${fileSize} MB`);
      console.log(`   ⏱️  Time: ${duration} seconds`);
      console.log(`   📝 Questions: 100,000`);
      console.log();
    }

    console.log('🎉 Subject-wise dataset generation completed!');
    console.log(`📁 Files saved in: ${dataDir}`);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`✅ Generated ${subjects.length} subject-specific files`);
    console.log(`📝 Total questions: ${(subjects.length * 100000).toLocaleString()}`);
    console.log(`📚 Subjects covered: ${subjects.map(s => s.name).join(', ')}`);

  } catch (error) {
    console.error('❌ Error generating subject-wise datasets:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  generateSubjectWiseDatasets()
    .then(() => {
      console.log('\n🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { generateSubjectWiseDatasets };
