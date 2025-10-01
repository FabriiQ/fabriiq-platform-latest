#!/usr/bin/env tsx

/**
 * Script to generate a comprehensive CSV file with 1000 educational questions
 * across multiple subjects, topics, and question types for testing bulk upload
 */

import * as fs from 'fs';
import * as path from 'path';

// Define subjects and their topics
const SUBJECTS = {
  'MATH': {
    name: 'Mathematics',
    topics: {
      'ALGEBRA': 'Algebra',
      'GEOMETRY': 'Geometry', 
      'CALCULUS': 'Calculus',
      'STATISTICS': 'Statistics',
      'TRIGONOMETRY': 'Trigonometry'
    }
  },
  'SCIENCE': {
    name: 'Science',
    topics: {
      'PHYSICS': 'Physics',
      'CHEMISTRY': 'Chemistry',
      'BIOLOGY': 'Biology',
      'EARTH_SCIENCE': 'Earth Science'
    }
  },
  'ENGLISH': {
    name: 'English Language Arts',
    topics: {
      'GRAMMAR': 'Grammar',
      'LITERATURE': 'Literature',
      'WRITING': 'Writing',
      'READING_COMP': 'Reading Comprehension'
    }
  },
  'HISTORY': {
    name: 'History',
    topics: {
      'WORLD_HISTORY': 'World History',
      'US_HISTORY': 'US History',
      'ANCIENT_HISTORY': 'Ancient History',
      'MODERN_HISTORY': 'Modern History'
    }
  },
  'GEOGRAPHY': {
    name: 'Geography',
    topics: {
      'PHYSICAL_GEO': 'Physical Geography',
      'HUMAN_GEO': 'Human Geography',
      'WORLD_GEO': 'World Geography',
      'CLIMATE': 'Climate and Weather'
    }
  }
};

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];
const BLOOMS_LEVELS = ['REMEMBERING', 'UNDERSTANDING', 'APPLYING', 'ANALYZING', 'EVALUATING', 'CREATING'];
const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'];

// Question templates by subject and topic
const QUESTION_TEMPLATES = {
  MATH: {
    ALGEBRA: [
      {
        type: 'MULTIPLE_CHOICE',
        template: 'Solve for x: {equation}',
        options: ['x = {answer}', 'x = {wrong1}', 'x = {wrong2}', 'x = {wrong3}'],
        explanation: 'To solve this equation, {steps}',
        hint: 'Remember to isolate the variable x'
      },
      {
        type: 'TRUE_FALSE',
        template: 'The equation {equation} has the solution x = {value}',
        explanation: 'By substituting x = {value} into the equation, we can verify this is {correct}',
        hint: 'Substitute the value back into the original equation'
      }
    ],
    GEOMETRY: [
      {
        type: 'MULTIPLE_CHOICE',
        template: 'What is the area of a {shape} with {dimensions}?',
        options: ['{answer} square units', '{wrong1} square units', '{wrong2} square units', '{wrong3} square units'],
        explanation: 'The formula for the area of a {shape} is {formula}',
        hint: 'Remember the area formula for {shape}'
      }
    ]
  },
  SCIENCE: {
    PHYSICS: [
      {
        type: 'MULTIPLE_CHOICE',
        template: 'What is the {concept} in this scenario: {scenario}?',
        options: ['{answer}', '{wrong1}', '{wrong2}', '{wrong3}'],
        explanation: 'According to {law}, {explanation}',
        hint: 'Consider the fundamental laws of physics'
      }
    ],
    CHEMISTRY: [
      {
        type: 'MULTIPLE_CHOICE',
        template: 'What is the {property} of {element}?',
        options: ['{answer}', '{wrong1}', '{wrong2}', '{wrong3}'],
        explanation: '{element} has {property} because {reason}',
        hint: 'Check the periodic table for element properties'
      }
    ]
  }
};

interface Question {
  title: string;
  questionType: string;
  difficulty: string;
  subjectId: string;
  subjectName: string;
  courseId: string;
  courseName: string;
  topicId: string;
  topicName: string;
  bloomsLevel: string;
  gradeLevel: number;
  year: number;
  sourceReference: string;
  text: string;
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
  sampleAnswer?: string;
  keywords?: string;
  rubric?: string;
  wordLimit?: string;
  explanation: string;
  hint: string;
}

function generateQuestions(): Question[] {
  const questions: Question[] = [];
  let questionCount = 0;
  const targetCount = 1000;

  // Generate questions for each subject and topic
  for (const [subjectId, subject] of Object.entries(SUBJECTS)) {
    for (const [topicId, topicName] of Object.entries(subject.topics)) {
      const questionsPerTopic = Math.floor(targetCount / (Object.keys(SUBJECTS).length * Object.keys(subject.topics).length));
      
      for (let i = 0; i < questionsPerTopic && questionCount < targetCount; i++) {
        const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
        const bloomsLevel = BLOOMS_LEVELS[Math.floor(Math.random() * BLOOMS_LEVELS.length)];
        const questionType = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
        const gradeLevel = Math.floor(Math.random() * 12) + 1;
        
        const question = generateQuestionByType(
          questionType,
          subjectId,
          subject.name,
          topicId,
          topicName,
          difficulty,
          bloomsLevel,
          gradeLevel,
          questionCount + 1
        );
        
        questions.push(question);
        questionCount++;
      }
    }
  }

  // Fill remaining questions if needed
  while (questionCount < targetCount) {
    const subjectKeys = Object.keys(SUBJECTS);
    const subjectId = subjectKeys[Math.floor(Math.random() * subjectKeys.length)];
    const subject = SUBJECTS[subjectId as keyof typeof SUBJECTS];
    const topicKeys = Object.keys(subject.topics);
    const topicId = topicKeys[Math.floor(Math.random() * topicKeys.length)];
    const topicName = subject.topics[topicId as keyof typeof subject.topics];
    
    const difficulty = DIFFICULTIES[Math.floor(Math.random() * DIFFICULTIES.length)];
    const bloomsLevel = BLOOMS_LEVELS[Math.floor(Math.random() * BLOOMS_LEVELS.length)];
    const questionType = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
    const gradeLevel = Math.floor(Math.random() * 12) + 1;
    
    const question = generateQuestionByType(
      questionType,
      subjectId,
      subject.name,
      topicId,
      topicName,
      difficulty,
      bloomsLevel,
      gradeLevel,
      questionCount + 1
    );
    
    questions.push(question);
    questionCount++;
  }

  return questions;
}

function generateQuestionByType(
  questionType: string,
  subjectId: string,
  subjectName: string,
  topicId: string,
  topicName: string,
  difficulty: string,
  bloomsLevel: string,
  gradeLevel: number,
  questionNumber: number
): Question {
  const baseQuestion: Question = {
    title: `${subjectName} - ${topicName} Question ${questionNumber}`,
    questionType,
    difficulty,
    subjectId,
    subjectName,
    courseId: `course-${subjectId.toLowerCase()}`,
    courseName: `${subjectName} Course`,
    topicId,
    topicName,
    bloomsLevel,
    gradeLevel,
    year: 2024,
    sourceReference: 'Generated Test Data',
    text: '',
    explanation: '',
    hint: ''
  };

  // Generate question content based on type and subject
  switch (questionType) {
    case 'MULTIPLE_CHOICE':
      return generateMultipleChoiceQuestion(baseQuestion, subjectId, topicId);
    case 'TRUE_FALSE':
      return generateTrueFalseQuestion(baseQuestion, subjectId, topicId);
    case 'SHORT_ANSWER':
      return generateShortAnswerQuestion(baseQuestion, subjectId, topicId);
    case 'ESSAY':
      return generateEssayQuestion(baseQuestion, subjectId, topicId);
    default:
      return generateMultipleChoiceQuestion(baseQuestion, subjectId, topicId);
  }
}

function generateMultipleChoiceQuestion(baseQuestion: Question, subjectId: string, topicId: string): Question {
  const questionData = getQuestionData(subjectId, topicId, 'MULTIPLE_CHOICE');

  return {
    ...baseQuestion,
    text: questionData.text,
    option1: questionData.options[0],
    option1Correct: 'true',
    option1Feedback: 'Correct! ' + questionData.correctFeedback,
    option2: questionData.options[1],
    option2Correct: 'false',
    option2Feedback: 'Incorrect. ' + questionData.incorrectFeedback,
    option3: questionData.options[2],
    option3Correct: 'false',
    option3Feedback: 'Incorrect. ' + questionData.incorrectFeedback,
    option4: questionData.options[3],
    option4Correct: 'false',
    option4Feedback: 'Incorrect. ' + questionData.incorrectFeedback,
    explanation: questionData.explanation,
    hint: questionData.hint
  };
}

function generateTrueFalseQuestion(baseQuestion: Question, subjectId: string, topicId: string): Question {
  const questionData = getQuestionData(subjectId, topicId, 'TRUE_FALSE');

  return {
    ...baseQuestion,
    text: questionData.text,
    correctAnswer: questionData.correctAnswer || (Math.random() > 0.5 ? 'true' : 'false'),
    explanation: questionData.explanation,
    hint: questionData.hint
  };
}

function generateShortAnswerQuestion(baseQuestion: Question, subjectId: string, topicId: string): Question {
  const questionData = getQuestionData(subjectId, topicId, 'SHORT_ANSWER');

  return {
    ...baseQuestion,
    text: questionData.text,
    sampleAnswer: questionData.sampleAnswer || 'Sample answer for this question',
    keywords: JSON.stringify(questionData.keywords || ['key', 'concept', 'answer']),
    explanation: questionData.explanation,
    hint: questionData.hint
  };
}

function generateEssayQuestion(baseQuestion: Question, subjectId: string, topicId: string): Question {
  const questionData = getQuestionData(subjectId, topicId, 'ESSAY');

  return {
    ...baseQuestion,
    text: questionData.text,
    rubric: JSON.stringify(questionData.rubric || [
      { criteria: 'Content', points: 4, description: 'Demonstrates thorough understanding' },
      { criteria: 'Organization', points: 3, description: 'Well-structured response' },
      { criteria: 'Grammar', points: 3, description: 'Proper grammar and spelling' }
    ]),
    wordLimit: questionData.wordLimit || '500',
    explanation: questionData.explanation,
    hint: questionData.hint
  };
}

function getQuestionData(subjectId: string, topicId: string, questionType: string) {
  // Generate realistic question content based on subject and topic
  const questionBank = {
    MATH: {
      ALGEBRA: {
        MULTIPLE_CHOICE: [
          {
            text: 'Solve for x: 2x + 5 = 13',
            options: ['x = 4', 'x = 6', 'x = 8', 'x = 9'],
            correctFeedback: 'Subtract 5 from both sides, then divide by 2.',
            incorrectFeedback: 'Remember to perform the same operation on both sides.',
            explanation: 'To solve 2x + 5 = 13, subtract 5 from both sides to get 2x = 8, then divide by 2 to get x = 4.',
            hint: 'Isolate the variable by performing inverse operations.'
          },
          {
            text: 'What is the slope of the line y = 3x - 2?',
            options: ['3', '-2', '1/3', '2/3'],
            correctFeedback: 'In slope-intercept form y = mx + b, m is the slope.',
            incorrectFeedback: 'The slope is the coefficient of x in y = mx + b form.',
            explanation: 'In the equation y = 3x - 2, the coefficient of x is 3, which represents the slope.',
            hint: 'Look for the coefficient of x in the equation y = mx + b.'
          },
          {
            text: 'Solve the quadratic equation: x² - 5x + 6 = 0',
            options: ['x = 2, x = 3', 'x = 1, x = 6', 'x = -2, x = -3', 'x = 0, x = 5'],
            correctFeedback: 'Factor as (x-2)(x-3) = 0, so x = 2 or x = 3.',
            incorrectFeedback: 'Try factoring or using the quadratic formula.',
            explanation: 'Factor x² - 5x + 6 = (x-2)(x-3) = 0, giving x = 2 and x = 3.',
            hint: 'Look for two numbers that multiply to 6 and add to -5.'
          },
          {
            text: 'Simplify: √(16x⁴y²)',
            options: ['4x²y', '4x²|y|', '16x²y', '4xy'],
            correctFeedback: 'Correct! √(16x⁴y²) = √16 · √(x⁴) · √(y²) = 4x²|y|',
            incorrectFeedback: 'Remember that √(y²) = |y| for all real y.',
            explanation: 'When taking square roots, √(a²) = |a| to ensure a positive result.',
            hint: 'Break down the square root into separate factors.'
          }
        ],
        TRUE_FALSE: [
          {
            text: 'The equation x² - 4 = 0 has two real solutions.',
            correctAnswer: 'true',
            explanation: 'x² - 4 = 0 can be factored as (x-2)(x+2) = 0, giving solutions x = 2 and x = -2.',
            hint: 'Factor the equation or use the quadratic formula.'
          },
          {
            text: 'The quadratic formula can only be used for equations with positive discriminants.',
            correctAnswer: 'false',
            explanation: 'The quadratic formula can be used for all quadratic equations, regardless of the discriminant value.',
            hint: 'Consider what happens when the discriminant is negative, zero, or positive.'
          }
        ],
        SHORT_ANSWER: [
          {
            text: 'Solve the equation 3x - 7 = 14 and show your work.',
            sampleAnswer: 'Add 7 to both sides: 3x = 21. Divide by 3: x = 7.',
            keywords: ['x = 7', 'add 7', 'divide by 3', 'isolate variable'],
            explanation: 'To solve linear equations, isolate the variable using inverse operations.',
            hint: 'Perform the same operation on both sides of the equation.'
          },
          {
            text: 'Factor completely: x² + 7x + 12',
            sampleAnswer: '(x + 3)(x + 4)',
            keywords: ['(x + 3)(x + 4)', 'factor', 'multiply to 12', 'add to 7'],
            explanation: 'Find two numbers that multiply to 12 and add to 7: 3 and 4.',
            hint: 'Look for two numbers that multiply to the constant term and add to the coefficient of x.'
          },
          {
            text: 'Find the derivative of f(x) = 3x² + 2x - 5',
            sampleAnswer: 'f\'(x) = 6x + 2',
            keywords: ['6x + 2', 'derivative', 'power rule', '3x² becomes 6x'],
            explanation: 'Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹',
            hint: 'Apply the power rule to each term separately.'
          }
        ],
        ESSAY: [
          {
            text: 'Explain the importance of algebra in real-world applications. Provide at least three examples.',
            rubric: [
              { criteria: 'Examples', points: 4, description: 'Provides 3+ clear real-world examples' },
              { criteria: 'Explanation', points: 3, description: 'Clearly explains importance' },
              { criteria: 'Organization', points: 3, description: 'Well-structured response' }
            ],
            wordLimit: '400',
            explanation: 'A good essay should include specific examples like engineering, finance, and science.',
            hint: 'Think about how equations are used in different careers and daily life.'
          }
        ]
      },
      GEOMETRY: {
        MULTIPLE_CHOICE: [
          {
            text: 'What is the area of a circle with radius 5 units?',
            options: ['25π square units', '10π square units', '5π square units', '50π square units'],
            correctFeedback: 'Use the formula A = πr² where r = 5.',
            incorrectFeedback: 'Remember the area formula for a circle is A = πr².',
            explanation: 'The area of a circle is A = πr². With r = 5, A = π(5)² = 25π square units.',
            hint: 'The area formula for a circle is A = πr².'
          }
        ]
      }
    },
    SCIENCE: {
      PHYSICS: {
        MULTIPLE_CHOICE: [
          {
            text: 'What is the unit of force in the SI system?',
            options: ['Newton', 'Joule', 'Watt', 'Pascal'],
            correctFeedback: 'Newton is the SI unit of force, named after Isaac Newton.',
            incorrectFeedback: 'Force is measured in Newtons in the SI system.',
            explanation: 'The Newton (N) is the SI unit of force, defined as kg⋅m/s².',
            hint: 'Think about Newton\'s laws of motion.'
          }
        ]
      },
      CHEMISTRY: {
        MULTIPLE_CHOICE: [
          {
            text: 'What is the chemical symbol for gold?',
            options: ['Au', 'Ag', 'Go', 'Gd'],
            correctFeedback: 'Au comes from the Latin word "aurum" meaning gold.',
            incorrectFeedback: 'Gold\'s symbol comes from its Latin name.',
            explanation: 'Gold\'s chemical symbol is Au, derived from the Latin word "aurum".',
            hint: 'Think about the Latin origin of the element name.'
          }
        ]
      }
    },
    ENGLISH: {
      GRAMMAR: {
        MULTIPLE_CHOICE: [
          {
            text: 'Which sentence uses correct subject-verb agreement?',
            options: ['The dogs are barking.', 'The dogs is barking.', 'The dog are barking.', 'The dogs was barking.'],
            correctFeedback: 'Plural subject "dogs" requires plural verb "are".',
            incorrectFeedback: 'Check if the subject and verb agree in number.',
            explanation: 'Plural subjects require plural verbs. "Dogs" is plural, so it takes "are".',
            hint: 'Match plural subjects with plural verbs.'
          }
        ]
      }
    }
  };

  // Get random question from the appropriate category
  const subjectQuestions = questionBank[subjectId as keyof typeof questionBank];
  if (!subjectQuestions) {
    return getDefaultQuestion(questionType);
  }

  const topicQuestions = subjectQuestions[topicId as keyof typeof subjectQuestions];
  if (!topicQuestions) {
    return getDefaultQuestion(questionType);
  }

  const typeQuestions = topicQuestions[questionType as keyof typeof topicQuestions];
  if (!typeQuestions || !Array.isArray(typeQuestions)) {
    return getDefaultQuestion(questionType);
  }

  const randomQuestion = typeQuestions[Math.floor(Math.random() * typeQuestions.length)];
  return randomQuestion;
}

function getDefaultQuestion(questionType: string) {
  const defaults = {
    MULTIPLE_CHOICE: {
      text: 'What is the correct answer to this sample question?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctFeedback: 'This is the correct answer.',
      incorrectFeedback: 'This is not the correct answer.',
      explanation: 'This is a sample explanation for the question.',
      hint: 'This is a sample hint for the question.'
    },
    TRUE_FALSE: {
      text: 'This is a sample true/false statement.',
      explanation: 'This statement is true/false because of this reason.',
      hint: 'Consider the key concepts involved.'
    },
    SHORT_ANSWER: {
      text: 'Provide a short answer to this question.',
      sampleAnswer: 'A comprehensive answer addressing the key points.',
      keywords: ['key', 'concept', 'important', 'main'],
      explanation: 'The answer should include these key points.',
      hint: 'Think about the main concepts.'
    },
    ESSAY: {
      text: 'Write an essay discussing this topic in detail.',
      rubric: [
        { criteria: 'Content', points: 4, description: 'Demonstrates understanding' },
        { criteria: 'Organization', points: 3, description: 'Well-structured' },
        { criteria: 'Grammar', points: 3, description: 'Proper language use' }
      ],
      wordLimit: '500',
      explanation: 'A good essay should include introduction, body, and conclusion.',
      hint: 'Structure your response with clear arguments.'
    }
  };

  return defaults[questionType as keyof typeof defaults] || defaults.MULTIPLE_CHOICE;
}

function exportToCSV(questions: Question[]): string {
  // Define CSV headers based on the enhanced template
  const headers = [
    'title',
    'questionType',
    'difficulty',
    'subjectId',
    'subjectName',
    'courseId',
    'courseName',
    'topicId',
    'topicName',
    'bloomsLevel',
    'gradeLevel',
    'year',
    'sourceReference',
    'text',
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
    'sampleAnswer',
    'keywords',
    'rubric',
    'wordLimit',
    'explanation',
    'hint'
  ];

  // Create CSV content
  const csvRows = [headers.join(',')];

  questions.forEach(question => {
    const row = headers.map(header => {
      const value = question[header as keyof Question];
      // Escape commas and quotes in CSV values
      if (value === undefined || value === null) {
        return '';
      }
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

async function generateQuestionBankCSV() {
  console.log('🚀 Starting to generate 1000 question CSV file...');

  try {
    // Generate questions
    console.log('📝 Generating questions...');
    const questions = generateQuestions();
    console.log(`✅ Generated ${questions.length} questions`);

    // Export to CSV
    console.log('💾 Exporting to CSV...');
    const csvContent = exportToCSV(questions);

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write CSV file
    const outputPath = path.join(outputDir, 'question-bank-1000-questions.csv');
    fs.writeFileSync(outputPath, csvContent, 'utf8');

    console.log(`🎉 Successfully generated CSV file: ${outputPath}`);
    console.log(`📊 File contains ${questions.length} questions across ${Object.keys(SUBJECTS).length} subjects`);

    // Display summary statistics
    const stats = generateStats(questions);
    console.log('\n📈 Question Statistics:');
    console.log(`- Subjects: ${stats.subjects}`);
    console.log(`- Question Types: ${stats.questionTypes}`);
    console.log(`- Difficulty Levels: ${stats.difficulties}`);
    console.log(`- Grade Levels: ${stats.gradeLevels}`);
    console.log(`- Bloom's Taxonomy Levels: ${stats.bloomsLevels}`);

  } catch (error) {
    console.error('❌ Error generating question bank CSV:', error);
    throw error;
  }
}

function generateStats(questions: Question[]) {
  const subjects = new Set(questions.map(q => q.subjectName));
  const questionTypes = new Set(questions.map(q => q.questionType));
  const difficulties = new Set(questions.map(q => q.difficulty));
  const gradeLevels = new Set(questions.map(q => q.gradeLevel));
  const bloomsLevels = new Set(questions.map(q => q.bloomsLevel));

  return {
    subjects: Array.from(subjects).join(', '),
    questionTypes: Array.from(questionTypes).join(', '),
    difficulties: Array.from(difficulties).join(', '),
    gradeLevels: Array.from(gradeLevels).sort((a, b) => a - b).join(', '),
    bloomsLevels: Array.from(bloomsLevels).join(', ')
  };
}

// Run the script
if (require.main === module) {
  generateQuestionBankCSV()
    .then(() => {
      console.log('🎉 Question bank CSV generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to generate question bank CSV:', error);
      process.exit(1);
    });
}

export { generateQuestionBankCSV };
