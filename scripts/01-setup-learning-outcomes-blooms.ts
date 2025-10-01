/**
 * Learning Outcomes & Bloom's Taxonomy Setup Script
 * 
 * This script:
 * 1. Queries existing subjects and topics in the database
 * 2. Creates realistic learning outcomes for each subject-topic combination
 * 3. Associates learning outcomes with appropriate Bloom's taxonomy levels
 * 4. Ensures proper foreign key relationships
 */

import { PrismaClient } from '@prisma/client';
import { BloomsTaxonomyLevel } from '@/features/bloom/types';

const prisma = new PrismaClient();

// Bloom's taxonomy action verbs for each level
const BLOOMS_ACTION_VERBS = {
  [BloomsTaxonomyLevel.REMEMBER]: [
    'define', 'list', 'recall', 'identify', 'name', 'state', 'describe', 'recognize', 'select', 'match'
  ],
  [BloomsTaxonomyLevel.UNDERSTAND]: [
    'explain', 'summarize', 'interpret', 'classify', 'compare', 'contrast', 'demonstrate', 'illustrate', 'paraphrase', 'translate'
  ],
  [BloomsTaxonomyLevel.APPLY]: [
    'apply', 'use', 'implement', 'execute', 'solve', 'demonstrate', 'operate', 'calculate', 'show', 'complete'
  ],
  [BloomsTaxonomyLevel.ANALYZE]: [
    'analyze', 'examine', 'investigate', 'categorize', 'compare', 'contrast', 'differentiate', 'distinguish', 'organize', 'deconstruct'
  ],
  [BloomsTaxonomyLevel.EVALUATE]: [
    'evaluate', 'assess', 'judge', 'critique', 'justify', 'defend', 'support', 'validate', 'prioritize', 'recommend'
  ],
  [BloomsTaxonomyLevel.CREATE]: [
    'create', 'design', 'develop', 'construct', 'produce', 'generate', 'compose', 'plan', 'formulate', 'synthesize'
  ]
};

// Subject-specific learning outcome templates
const LEARNING_OUTCOME_TEMPLATES = {
  'Mathematics': {
    'Algebra': [
      'solve linear equations and inequalities',
      'factor polynomials and quadratic expressions',
      'graph linear and quadratic functions',
      'work with systems of equations',
      'understand function notation and operations'
    ],
    'Geometry': [
      'calculate area and perimeter of geometric shapes',
      'apply the Pythagorean theorem',
      'understand properties of triangles and quadrilaterals',
      'work with angles and parallel lines',
      'solve problems involving circles and their properties'
    ],
    'Statistics': [
      'collect, organize, and display data',
      'calculate measures of central tendency',
      'interpret graphs and charts',
      'understand probability concepts',
      'analyze data distributions'
    ],
    'Calculus': [
      'find derivatives using various rules',
      'apply integration techniques',
      'understand limits and continuity',
      'solve optimization problems',
      'analyze functions and their behavior'
    ]
  },
  'English': {
    'Grammar': [
      'identify parts of speech and their functions',
      'construct grammatically correct sentences',
      'use proper punctuation and capitalization',
      'understand subject-verb agreement',
      'apply rules of parallel structure'
    ],
    'Literature': [
      'analyze literary devices and techniques',
      'interpret themes and symbolism in texts',
      'compare different literary works',
      'understand character development',
      'evaluate author\'s purpose and perspective'
    ],
    'Writing': [
      'organize ideas in coherent paragraphs',
      'develop thesis statements and supporting arguments',
      'use appropriate tone and style',
      'revise and edit written work',
      'cite sources properly'
    ],
    'Reading': [
      'comprehend main ideas and supporting details',
      'make inferences from text',
      'analyze author\'s craft and structure',
      'evaluate credibility of sources',
      'synthesize information from multiple texts'
    ]
  },
  'Science': {
    'Physics': [
      'apply Newton\'s laws of motion',
      'calculate work, energy, and power',
      'understand wave properties and behavior',
      'analyze electrical circuits',
      'explain concepts of heat and thermodynamics'
    ],
    'Chemistry': [
      'balance chemical equations',
      'understand atomic structure and bonding',
      'calculate molar relationships',
      'predict chemical reactions',
      'analyze properties of matter'
    ],
    'Biology': [
      'understand cell structure and function',
      'explain processes of photosynthesis and respiration',
      'analyze genetic inheritance patterns',
      'classify living organisms',
      'understand ecosystem relationships'
    ],
    'Earth Science': [
      'explain rock cycle processes',
      'understand weather and climate patterns',
      'analyze geological formations',
      'study water cycle components',
      'investigate natural disasters'
    ]
  },
  'Physical Education': {
    'Fitness': [
      'demonstrate proper exercise techniques',
      'understand components of physical fitness',
      'create personal fitness plans',
      'monitor heart rate and intensity',
      'evaluate fitness progress'
    ],
    'Sports': [
      'apply rules and strategies of various sports',
      'demonstrate fundamental movement skills',
      'work effectively in team situations',
      'show good sportsmanship',
      'analyze game performance'
    ],
    'Health': [
      'understand nutrition principles',
      'identify health risk factors',
      'make informed health decisions',
      'understand body systems',
      'promote healthy lifestyle choices'
    ]
  },
  'Life Skills': {
    'Communication': [
      'demonstrate effective listening skills',
      'express ideas clearly and confidently',
      'use appropriate non-verbal communication',
      'resolve conflicts peacefully',
      'adapt communication style to audience'
    ],
    'Problem Solving': [
      'identify problems and their causes',
      'generate multiple solution options',
      'evaluate consequences of decisions',
      'implement chosen solutions',
      'reflect on problem-solving process'
    ],
    'Time Management': [
      'prioritize tasks effectively',
      'create and follow schedules',
      'set realistic goals',
      'avoid procrastination',
      'balance multiple responsibilities'
    ],
    'Leadership': [
      'demonstrate leadership qualities',
      'motivate and inspire others',
      'delegate tasks appropriately',
      'make ethical decisions',
      'take responsibility for outcomes'
    ]
  }
};

interface SubjectTopicData {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  topicId: string;
  topicTitle: string;
  topicCode: string;
}

/**
 * Fetch all subjects and their topics from the database
 */
async function fetchSubjectsAndTopics(): Promise<SubjectTopicData[]> {
  console.log('📊 Fetching subjects and topics from database...');
  
  const subjects = await prisma.subject.findMany({
    where: { status: 'ACTIVE' },
    include: {
      topics: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          code: true,
          title: true
        }
      }
    }
  });

  const subjectTopicData: SubjectTopicData[] = [];
  
  for (const subject of subjects) {
    if (subject.topics.length === 0) {
      // Subject without topics - create a general entry
      subjectTopicData.push({
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        topicId: '',
        topicTitle: 'General',
        topicCode: 'GEN'
      });
    } else {
      // Subject with topics
      for (const topic of subject.topics) {
        subjectTopicData.push({
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          topicId: topic.id,
          topicTitle: topic.title,
          topicCode: topic.code
        });
      }
    }
  }

  console.log(`✅ Found ${subjects.length} subjects with ${subjectTopicData.length} subject-topic combinations`);
  return subjectTopicData;
}

/**
 * Generate learning outcomes for a subject-topic combination
 */
function generateLearningOutcomes(subjectName: string, topicTitle: string): Array<{
  statement: string;
  bloomsLevel: BloomsTaxonomyLevel;
}> {
  const outcomes: Array<{ statement: string; bloomsLevel: BloomsTaxonomyLevel }> = [];
  
  // Find matching templates
  let templates: string[] = [];
  
  // Try to find exact subject match
  if (LEARNING_OUTCOME_TEMPLATES[subjectName as keyof typeof LEARNING_OUTCOME_TEMPLATES]) {
    const subjectTemplates = LEARNING_OUTCOME_TEMPLATES[subjectName as keyof typeof LEARNING_OUTCOME_TEMPLATES];
    
    // Try to find exact topic match
    if (subjectTemplates[topicTitle as keyof typeof subjectTemplates]) {
      templates = subjectTemplates[topicTitle as keyof typeof subjectTemplates];
    } else {
      // Use first available topic templates for this subject
      const firstTopicKey = Object.keys(subjectTemplates)[0];
      templates = subjectTemplates[firstTopicKey as keyof typeof subjectTemplates];
    }
  } else {
    // Fallback to generic templates based on subject type
    if (subjectName.toLowerCase().includes('math')) {
      templates = LEARNING_OUTCOME_TEMPLATES.Mathematics.Algebra;
    } else if (subjectName.toLowerCase().includes('english') || subjectName.toLowerCase().includes('language')) {
      templates = LEARNING_OUTCOME_TEMPLATES.English.Grammar;
    } else if (subjectName.toLowerCase().includes('science')) {
      templates = LEARNING_OUTCOME_TEMPLATES.Science.Biology;
    } else if (subjectName.toLowerCase().includes('physical') || subjectName.toLowerCase().includes('wellbeing')) {
      templates = LEARNING_OUTCOME_TEMPLATES['Physical Education'].Fitness;
    } else if (subjectName.toLowerCase().includes('life') || subjectName.toLowerCase().includes('skills')) {
      templates = LEARNING_OUTCOME_TEMPLATES['Life Skills']['Problem Solving'];
    } else {
      // Generic fallback
      templates = [
        'understand key concepts',
        'apply learned principles',
        'analyze information critically',
        'evaluate different perspectives',
        'create original solutions'
      ];
    }
  }

  // Generate outcomes for each Bloom's level
  const bloomsLevels = Object.values(BloomsTaxonomyLevel);
  
  for (let i = 0; i < bloomsLevels.length; i++) {
    const bloomsLevel = bloomsLevels[i];
    const actionVerbs = BLOOMS_ACTION_VERBS[bloomsLevel];
    const template = templates[i % templates.length];
    const actionVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];
    
    // Create learning outcome statement
    const statement = `Students will ${actionVerb} ${template} in ${topicTitle || subjectName}.`;
    
    outcomes.push({
      statement,
      bloomsLevel
    });
  }

  return outcomes;
}

/**
 * Create learning outcomes in the database
 */
async function createLearningOutcomes(subjectTopicData: SubjectTopicData[]) {
  console.log('🎯 Creating learning outcomes...');

  let totalCreated = 0;

  for (const data of subjectTopicData) {
    console.log(`📝 Processing ${data.subjectName} - ${data.topicTitle}...`);

    // Generate learning outcomes for this subject-topic combination
    const outcomes = generateLearningOutcomes(data.subjectName, data.topicTitle);

    // Create learning outcomes in database
    for (const outcome of outcomes) {
      try {
        await prisma.learningOutcome.create({
          data: {
            statement: outcome.statement,
            bloomsLevel: outcome.bloomsLevel,
            subjectId: data.subjectId,
            topicId: data.topicId || null,
            status: 'ACTIVE',
            createdBy: 'system',
            updatedBy: 'system'
          }
        });
        totalCreated++;
      } catch (error) {
        console.warn(`⚠️  Failed to create learning outcome: ${outcome.statement}`);
        console.warn(`   Error: ${error}`);
      }
    }

    console.log(`   ✅ Created ${outcomes.length} learning outcomes`);
  }

  console.log(`🎉 Total learning outcomes created: ${totalCreated}`);
}

/**
 * Validate existing learning outcomes
 */
async function validateLearningOutcomes() {
  console.log('🔍 Validating learning outcomes...');

  const totalOutcomes = await prisma.learningOutcome.count();
  const outcomesBySubject = await prisma.learningOutcome.groupBy({
    by: ['subjectId'],
    _count: {
      id: true
    }
  });

  const outcomesByBloomsLevel = await prisma.learningOutcome.groupBy({
    by: ['bloomsLevel'],
    _count: {
      id: true
    }
  });

  console.log(`📊 Validation Results:`);
  console.log(`   Total Learning Outcomes: ${totalOutcomes}`);
  console.log(`   Subjects with Outcomes: ${outcomesBySubject.length}`);
  console.log(`   Bloom's Levels Distribution:`);

  for (const level of outcomesByBloomsLevel) {
    console.log(`     ${level.bloomsLevel}: ${level._count.id} outcomes`);
  }

  // Check for subjects without learning outcomes
  const subjectsWithoutOutcomes = await prisma.subject.findMany({
    where: {
      status: 'ACTIVE',
      learningOutcomes: {
        none: {}
      }
    },
    select: {
      name: true,
      code: true
    }
  });

  if (subjectsWithoutOutcomes.length > 0) {
    console.log(`⚠️  Subjects without learning outcomes:`);
    subjectsWithoutOutcomes.forEach(subject => {
      console.log(`     - ${subject.name} (${subject.code})`);
    });
  } else {
    console.log(`✅ All active subjects have learning outcomes`);
  }
}

/**
 * Main execution function
 */
async function setupLearningOutcomesAndBlooms() {
  try {
    console.log('🚀 Starting Learning Outcomes & Bloom\'s Taxonomy Setup...\n');

    // Step 1: Fetch existing subjects and topics
    const subjectTopicData = await fetchSubjectsAndTopics();

    if (subjectTopicData.length === 0) {
      console.log('❌ No subjects found. Please run the database seed first.');
      return;
    }

    // Step 2: Check existing learning outcomes
    const existingOutcomes = await prisma.learningOutcome.count();
    console.log(`📋 Existing learning outcomes: ${existingOutcomes}`);

    if (existingOutcomes > 0) {
      console.log('⚠️  Learning outcomes already exist. Skipping creation to avoid duplicates.');
      console.log('   If you want to recreate them, please delete existing outcomes first.');
    } else {
      // Step 3: Create learning outcomes
      await createLearningOutcomes(subjectTopicData);
    }

    // Step 4: Validate the setup
    await validateLearningOutcomes();

    console.log('\n✅ Learning Outcomes & Bloom\'s Taxonomy setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up learning outcomes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  setupLearningOutcomesAndBlooms()
    .then(() => {
      console.log('\n🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { setupLearningOutcomesAndBlooms };
