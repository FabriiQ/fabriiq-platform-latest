/**
 * Create Learning Outcomes for All Subjects
 * 
 * This script creates learning outcomes for all subjects that don't have them yet
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
const SUBJECT_LEARNING_OUTCOMES = {
  'Mathematics': [
    'solve mathematical problems using appropriate methods and strategies',
    'understand mathematical concepts and their relationships',
    'apply mathematical knowledge to real-world situations',
    'analyze mathematical patterns and structures',
    'evaluate mathematical solutions and reasoning',
    'create mathematical models and representations'
  ],
  'Science': [
    'understand scientific concepts and principles',
    'apply scientific methods and processes',
    'analyze scientific data and evidence',
    'evaluate scientific claims and theories',
    'design and conduct scientific investigations',
    'communicate scientific findings effectively'
  ],
  'English': [
    'understand various forms of literature and texts',
    'apply language skills in reading, writing, speaking, and listening',
    'analyze literary devices and techniques',
    'evaluate different perspectives and arguments',
    'create original written and oral compositions',
    'demonstrate effective communication skills'
  ],
  'Physical Education': [
    'understand principles of health and fitness',
    'apply movement skills and strategies in various activities',
    'analyze performance and technique in physical activities',
    'evaluate health and fitness practices',
    'design personal fitness and wellness plans',
    'demonstrate teamwork and sportsmanship'
  ],
  'Life Skills': [
    'understand personal development and life management concepts',
    'apply problem-solving and decision-making skills',
    'analyze social and emotional situations',
    'evaluate personal choices and their consequences',
    'create plans for personal and academic goals',
    'demonstrate effective interpersonal communication'
  ]
};

/**
 * Get subject category for learning outcome templates
 */
function getSubjectCategory(subjectName: string): string {
  const name = subjectName.toLowerCase();
  if (name.includes('math') || name.includes('logical')) return 'Mathematics';
  if (name.includes('science') || name.includes('inquiry')) return 'Science';
  if (name.includes('english') || name.includes('language') || name.includes('communication')) return 'English';
  if (name.includes('physical') || name.includes('wellbeing') || name.includes('pe')) return 'Physical Education';
  if (name.includes('life') || name.includes('learning') || name.includes('skills')) return 'Life Skills';
  return 'Life Skills'; // Default fallback
}

/**
 * Generate learning outcomes for a specific subject-topic combination
 */
function generateLearningOutcomesForTopic(subjectName: string, topicTitle: string, topicCode: string): Array<{
  statement: string;
  bloomsLevel: BloomsTaxonomyLevel;
}> {
  const category = getSubjectCategory(subjectName);
  const templates = SUBJECT_LEARNING_OUTCOMES[category as keyof typeof SUBJECT_LEARNING_OUTCOMES];
  const bloomsLevels = Object.values(BloomsTaxonomyLevel);

  const outcomes: Array<{ statement: string; bloomsLevel: BloomsTaxonomyLevel }> = [];

  // Create one learning outcome for each Bloom's level for this specific topic
  for (let i = 0; i < bloomsLevels.length; i++) {
    const bloomsLevel = bloomsLevels[i];
    const actionVerbs = BLOOMS_ACTION_VERBS[bloomsLevel];
    const template = templates[i % templates.length];
    const actionVerb = actionVerbs[Math.floor(Math.random() * actionVerbs.length)];

    // Create topic-specific learning outcome
    const statement = `Students will ${actionVerb} ${template} related to ${topicTitle}.`;

    outcomes.push({
      statement,
      bloomsLevel
    });
  }

  return outcomes;
}

/**
 * Create learning outcomes for all subjects
 */
async function createAllLearningOutcomes() {
  try {
    console.log('🚀 Creating learning outcomes for all subjects...\n');
    
    // Get all subjects with their topics
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
        },
        learningOutcomes: {
          select: { id: true }
        }
      }
    });

    console.log(`📊 Found ${subjects.length} subjects`);
    
    let totalCreated = 0;
    
    for (const subject of subjects) {
      console.log(`\n📚 Processing ${subject.name}...`);
      console.log(`   Topics: ${subject.topics.length}`);
      console.log(`   Existing Learning Outcomes: ${subject.learningOutcomes.length}`);
      
      if (subject.learningOutcomes.length > 0) {
        console.log(`   ⏭️  Skipping - already has learning outcomes`);
        continue;
      }
      
      // Create learning outcomes for each topic (skip subjects without topics)
      if (subject.topics.length === 0) {
        console.log(`   ⏭️  Skipping - no topics found for this subject`);
        continue;
      }

      // Create learning outcomes for each topic
      for (const topic of subject.topics) {
        const outcomes = generateLearningOutcomesForTopic(subject.name, topic.title, topic.code);

        for (const outcome of outcomes) {
          try {
            // Get a system user ID (we'll use the first user as system user)
            const systemUser = await prisma.user.findFirst();
            if (!systemUser) {
              console.warn(`     ⚠️  No users found - cannot create learning outcomes`);
              continue;
            }

            await prisma.learningOutcome.create({
              data: {
                statement: outcome.statement,
                bloomsLevel: outcome.bloomsLevel,
                subjectId: subject.id,
                topicId: topic.id,
                createdById: systemUser.id,
                actionVerbs: BLOOMS_ACTION_VERBS[outcome.bloomsLevel]
              }
            });
            totalCreated++;
          } catch (error) {
            console.warn(`     ⚠️  Failed to create outcome for ${topic.title}: ${outcome.statement.substring(0, 50)}...`);
          }
        }

        console.log(`     ✅ Created ${outcomes.length} outcomes for ${topic.title}`);
      }
    }
    
    console.log(`\n🎉 Total learning outcomes created: ${totalCreated}`);
    
    // Final validation
    const finalCount = await prisma.learningOutcome.count();
    const subjectsWithOutcomes = await prisma.subject.count({
      where: {
        status: 'ACTIVE',
        learningOutcomes: { some: {} }
      }
    });
    
    console.log(`\n📊 Final Statistics:`);
    console.log(`   Total Learning Outcomes: ${finalCount}`);
    console.log(`   Subjects with Outcomes: ${subjectsWithOutcomes}/${subjects.length}`);
    
    if (subjectsWithOutcomes === subjects.length) {
      console.log(`   ✅ All subjects now have learning outcomes!`);
    } else {
      console.log(`   ⚠️  ${subjects.length - subjectsWithOutcomes} subjects still need learning outcomes`);
    }
    
  } catch (error) {
    console.error('❌ Error creating learning outcomes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  createAllLearningOutcomes()
    .then(() => {
      console.log('\n🏁 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

export { createAllLearningOutcomes };
