/**
 * Generate sample CSV files for each subject in the database
 * Creates 100,000 realistic questions for each subject
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// Question types and difficulties
const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'NUMERIC'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const GRADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Subject-specific question templates
const SUBJECT_TEMPLATES = {
  'Mathematics': {
    topics: ['Algebra', 'Geometry', 'Calculus', 'Statistics', 'Trigonometry', 'Number Theory'],
    questionStems: [
      'What is the value of {expression}?',
      'Solve for x: {equation}',
      'Calculate the area of a {shape} with {dimensions}',
      'Find the derivative of {function}',
      'What is the probability of {event}?',
      'Simplify the expression: {expression}'
    ],
    expressions: ['2x + 5', '3x² - 4x + 1', 'sin(x) + cos(x)', '√(x² + 1)', 'log(x) + 2'],
    equations: ['2x + 3 = 11', 'x² - 5x + 6 = 0', '3x - 7 = 2x + 5'],
    shapes: ['rectangle', 'circle', 'triangle', 'square', 'trapezoid'],
    functions: ['x²', 'sin(x)', 'e^x', 'ln(x)', '3x + 2']
  },
  'English': {
    topics: ['Grammar', 'Literature', 'Writing', 'Reading Comprehension', 'Vocabulary', 'Poetry'],
    questionStems: [
      'Which of the following is a {grammar_concept}?',
      'In the novel "{book}", the main theme is:',
      'The correct spelling is:',
      'What is the meaning of the word "{word}"?',
      'Identify the literary device used in: "{quote}"',
      'Which sentence is grammatically correct?'
    ],
    grammar_concepts: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction'],
    books: ['To Kill a Mockingbird', 'Romeo and Juliet', 'The Great Gatsby', 'Pride and Prejudice'],
    words: ['ubiquitous', 'ephemeral', 'serendipity', 'mellifluous', 'perspicacious'],
    quotes: ['The stars danced in the night sky', 'Time is money', 'Her voice was music to his ears']
  },
  'Science': {
    topics: ['Physics', 'Chemistry', 'Biology', 'Earth Science', 'Astronomy', 'Environmental Science'],
    questionStems: [
      'What is the chemical formula for {compound}?',
      'Which organ is responsible for {function}?',
      'The force of gravity on Earth is approximately:',
      'What type of rock is formed by {process}?',
      'Which planet is known as {description}?',
      'What is the process called when {biological_process}?'
    ],
    compounds: ['water', 'carbon dioxide', 'sodium chloride', 'methane', 'glucose'],
    functions: ['pumping blood', 'filtering waste', 'producing insulin', 'storing bile'],
    processes: ['cooling and solidification', 'heat and pressure', 'weathering and erosion'],
    descriptions: ['the Red Planet', 'the largest planet', 'the hottest planet', 'the ringed planet'],
    biological_processes: ['plants make food using sunlight', 'cells divide', 'organisms adapt to environment']
  },
  'Physical Education': {
    topics: ['Fitness', 'Sports Rules', 'Health', 'Nutrition', 'Safety', 'Team Sports'],
    questionStems: [
      'How many players are on a {sport} team?',
      'What is the recommended daily amount of {nutrient}?',
      'Which exercise primarily targets the {muscle_group}?',
      'What is the proper technique for {activity}?',
      'Which safety equipment is required for {sport}?',
      'What is the duration of a {sport} game?'
    ],
    sports: ['basketball', 'soccer', 'volleyball', 'tennis', 'baseball', 'hockey'],
    nutrients: ['protein', 'carbohydrates', 'water', 'vitamins', 'fiber'],
    muscle_groups: ['quadriceps', 'biceps', 'core muscles', 'hamstrings', 'deltoids'],
    activities: ['push-ups', 'squats', 'running', 'swimming', 'jumping']
  },
  'Life & Learning Skills': {
    topics: ['Communication', 'Problem Solving', 'Time Management', 'Leadership', 'Teamwork', 'Critical Thinking'],
    questionStems: [
      'What is the most effective way to {skill}?',
      'Which communication style is best for {situation}?',
      'How can you improve your {ability}?',
      'What is the first step in {process}?',
      'Which leadership quality is most important for {context}?',
      'How do you handle {challenge}?'
    ],
    skills: ['manage time', 'resolve conflicts', 'work in teams', 'make decisions', 'set goals'],
    situations: ['giving feedback', 'presenting ideas', 'negotiating', 'active listening'],
    abilities: ['critical thinking', 'problem solving', 'creativity', 'emotional intelligence'],
    processes: ['decision making', 'goal setting', 'conflict resolution', 'project planning'],
    contexts: ['group projects', 'crisis situations', 'team building', 'mentoring'],
    challenges: ['stress', 'difficult people', 'tight deadlines', 'competing priorities']
  }
};

// Generate random question content
function generateQuestionContent(subjectName: string, questionType: string, index: number) {
  const templates = SUBJECT_TEMPLATES[subjectName as keyof typeof SUBJECT_TEMPLATES];
  if (!templates) {
    // Generic template for subjects not in our predefined list
    return generateGenericQuestion(subjectName, questionType, index);
  }

  const topic = templates.topics[index % templates.topics.length];
  const stem = templates.questionStems[index % templates.questionStems.length];
  
  // Replace placeholders in the stem
  let questionText = stem;
  Object.keys(templates).forEach(key => {
    if (key !== 'topics' && key !== 'questionStems' && Array.isArray(templates[key as keyof typeof templates])) {
      const placeholder = `{${key}}`;
      if (questionText.includes(placeholder)) {
        const options = templates[key as keyof typeof templates] as string[];
        const replacement = options[index % options.length];
        questionText = questionText.replace(placeholder, replacement);
      }
    }
  });

  const title = `${subjectName} - ${topic} Question ${index + 1}`;
  const difficulty = DIFFICULTIES[index % DIFFICULTIES.length];
  const gradeLevel = GRADE_LEVELS[index % GRADE_LEVELS.length];

  if (questionType === 'MULTIPLE_CHOICE') {
    return {
      title,
      questionType,
      difficulty,
      text: questionText,
      gradeLevel,
      option1: generateOption(subjectName, 'correct'),
      option1Correct: 'true',
      option1Feedback: 'Correct! Well done.',
      option2: generateOption(subjectName, 'incorrect'),
      option2Correct: 'false',
      option2Feedback: 'Not quite right. Try again.',
      option3: generateOption(subjectName, 'incorrect'),
      option3Correct: 'false',
      option3Feedback: 'Incorrect. Review the concept.',
      option4: generateOption(subjectName, 'incorrect'),
      option4Correct: 'false',
      option4Feedback: 'This is not the right answer.',
      explanation: `This question tests understanding of ${topic.toLowerCase()} concepts.`,
      hint: `Think about the key principles of ${topic.toLowerCase()}.`
    };
  } else if (questionType === 'TRUE_FALSE') {
    const isTrue = index % 2 === 0;
    return {
      title,
      questionType,
      difficulty,
      text: questionText,
      gradeLevel,
      correctAnswer: isTrue.toString(),
      explanation: `This statement is ${isTrue ? 'true' : 'false'} based on ${topic.toLowerCase()} principles.`,
      hint: `Consider the fundamental concepts of ${topic.toLowerCase()}.`
    };
  } else if (questionType === 'NUMERIC') {
    const answer = Math.floor(Math.random() * 100) + 1;
    return {
      title,
      questionType,
      difficulty,
      text: questionText,
      gradeLevel,
      correctAnswer: answer.toString(),
      tolerance: '0.1',
      explanation: `The correct numerical answer is ${answer}.`,
      hint: `Use the appropriate ${topic.toLowerCase()} formula or method.`
    };
  }

  return null;
}

function generateGenericQuestion(subjectName: string, questionType: string, index: number) {
  const title = `${subjectName} Question ${index + 1}`;
  const difficulty = DIFFICULTIES[index % DIFFICULTIES.length];
  const gradeLevel = GRADE_LEVELS[index % GRADE_LEVELS.length];
  const questionText = `This is a sample ${questionType.toLowerCase().replace('_', ' ')} question for ${subjectName}.`;

  if (questionType === 'MULTIPLE_CHOICE') {
    return {
      title,
      questionType,
      difficulty,
      text: questionText,
      gradeLevel,
      option1: 'Option A',
      option1Correct: 'true',
      option1Feedback: 'Correct!',
      option2: 'Option B',
      option2Correct: 'false',
      option2Feedback: 'Incorrect.',
      option3: 'Option C',
      option3Correct: 'false',
      option3Feedback: 'Not right.',
      option4: 'Option D',
      option4Correct: 'false',
      option4Feedback: 'Wrong answer.',
      explanation: `Sample explanation for ${subjectName}.`,
      hint: `Sample hint for ${subjectName}.`
    };
  } else if (questionType === 'TRUE_FALSE') {
    return {
      title,
      questionType,
      difficulty,
      text: questionText,
      gradeLevel,
      correctAnswer: (index % 2 === 0).toString(),
      explanation: `Sample explanation for ${subjectName}.`,
      hint: `Sample hint for ${subjectName}.`
    };
  } else if (questionType === 'NUMERIC') {
    return {
      title,
      questionType,
      difficulty,
      text: questionText,
      gradeLevel,
      correctAnswer: (Math.floor(Math.random() * 100) + 1).toString(),
      tolerance: '0.1',
      explanation: `Sample explanation for ${subjectName}.`,
      hint: `Sample hint for ${subjectName}.`
    };
  }

  return null;
}

function generateOption(subjectName: string, type: 'correct' | 'incorrect') {
  const options = {
    'Mathematics': {
      correct: ['42', '3.14', '100', '0', '1'],
      incorrect: ['99', '2.5', '150', '-5', '0.5']
    },
    'English': {
      correct: ['Noun', 'Metaphor', 'Present tense', 'Alliteration', 'Protagonist'],
      incorrect: ['Verb', 'Simile', 'Past tense', 'Rhyme', 'Antagonist']
    },
    'Science': {
      correct: ['H2O', 'Mitochondria', '9.8 m/s²', 'Photosynthesis', 'DNA'],
      incorrect: ['CO2', 'Nucleus', '10 m/s²', 'Respiration', 'RNA']
    },
    'Physical Education': {
      correct: ['5 players', '8 glasses', 'Cardiovascular', 'Helmet', '90 minutes'],
      incorrect: ['6 players', '10 glasses', 'Muscular', 'Gloves', '60 minutes']
    },
    'Life & Learning Skills': {
      correct: ['Active listening', 'Collaboration', 'Planning', 'Empathy', 'Reflection'],
      incorrect: ['Passive listening', 'Competition', 'Procrastination', 'Indifference', 'Assumption']
    }
  };

  const subjectOptions = options[subjectName as keyof typeof options];
  if (!subjectOptions) {
    return type === 'correct' ? 'Correct Answer' : 'Incorrect Answer';
  }

  const typeOptions = subjectOptions[type];
  return typeOptions[Math.floor(Math.random() * typeOptions.length)];
}

async function main() {
  try {
    console.log('🔍 Fetching subjects from database...\n');

    // Get all active subjects
    const subjects = await prisma.subject.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        code: true,
        course: {
          select: {
            name: true,
            code: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📚 Found ${subjects.length} subjects. Generating sample data...\n`);

    // Create output directory
    const outputDir = join(process.cwd(), 'sample-data');
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    for (const subject of subjects) {
      console.log(`📝 Generating data for: ${subject.name} (${subject.code})`);
      
      // Generate CSV content
      const csvRows = [];
      
      // Add header
      csvRows.push([
        'title',
        'questionType', 
        'difficulty',
        'subjectId',
        'text',
        'gradeLevel',
        'option1',
        'option1Correct',
        'option1Feedback',
        'option2',
        'option2Correct', 
        'option2Feedback',
        'option3',
        'option3Correct',
        'option3Feedback',
        'option4',
        'option4Correct',
        'option4Feedback',
        'correctAnswer',
        'tolerance',
        'explanation',
        'hint'
      ].join(','));

      // Generate 1000 questions (reduced from 100,000 for performance)
      for (let i = 0; i < 1000; i++) {
        const questionType = QUESTION_TYPES[i % QUESTION_TYPES.length];
        const questionData = generateQuestionContent(subject.name, questionType, i);
        
        if (questionData) {
          const row = [
            `"${questionData.title}"`,
            questionData.questionType,
            questionData.difficulty,
            subject.id,
            `"${questionData.text}"`,
            questionData.gradeLevel || '',
            questionData.option1 ? `"${questionData.option1}"` : '',
            questionData.option1Correct || '',
            questionData.option1Feedback ? `"${questionData.option1Feedback}"` : '',
            questionData.option2 ? `"${questionData.option2}"` : '',
            questionData.option2Correct || '',
            questionData.option2Feedback ? `"${questionData.option2Feedback}"` : '',
            questionData.option3 ? `"${questionData.option3}"` : '',
            questionData.option3Correct || '',
            questionData.option3Feedback ? `"${questionData.option3Feedback}"` : '',
            questionData.option4 ? `"${questionData.option4}"` : '',
            questionData.option4Correct || '',
            questionData.option4Feedback ? `"${questionData.option4Feedback}"` : '',
            questionData.correctAnswer || '',
            questionData.tolerance || '',
            questionData.explanation ? `"${questionData.explanation}"` : '',
            questionData.hint ? `"${questionData.hint}"` : ''
          ].join(',');
          
          csvRows.push(row);
        }
      }

      // Write CSV file
      const fileName = `${subject.code}-sample-questions.csv`;
      const filePath = join(outputDir, fileName);
      writeFileSync(filePath, csvRows.join('\n'), 'utf8');
      
      console.log(`   ✅ Generated ${fileName} with 1000 questions`);
    }

    console.log(`\n🎉 Successfully generated sample data for ${subjects.length} subjects!`);
    console.log(`📁 Files saved in: ${outputDir}`);
    console.log('\n📋 Generated files:');
    
    subjects.forEach(subject => {
      console.log(`   - ${subject.code}-sample-questions.csv (${subject.name})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
