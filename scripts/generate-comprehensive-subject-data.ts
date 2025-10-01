/**
 * Generate comprehensive subject topics and learning outcomes
 * Creates realistic educational content aligned with Bloom's taxonomy
 */

import { PrismaClient, SubjectNodeType, CompetencyLevel, SystemStatus } from '@prisma/client';
import { BloomsTaxonomyLevel } from '@/features/bloom/types';

const prisma = new PrismaClient();

// Comprehensive subject topic templates
const SUBJECT_TOPIC_TEMPLATES = {
  'Mathematics': {
    chapters: [
      {
        title: 'Number Systems and Operations',
        topics: [
          { title: 'Natural Numbers and Integers', keywords: ['natural', 'integer', 'whole', 'counting'] },
          { title: 'Rational and Irrational Numbers', keywords: ['rational', 'irrational', 'fraction', 'decimal'] },
          { title: 'Real Number Operations', keywords: ['addition', 'subtraction', 'multiplication', 'division'] },
          { title: 'Number Properties and Patterns', keywords: ['properties', 'patterns', 'sequences', 'series'] }
        ]
      },
      {
        title: 'Algebraic Expressions and Equations',
        topics: [
          { title: 'Variables and Expressions', keywords: ['variable', 'expression', 'term', 'coefficient'] },
          { title: 'Linear Equations', keywords: ['linear', 'equation', 'solve', 'solution'] },
          { title: 'Quadratic Equations', keywords: ['quadratic', 'parabola', 'factoring', 'formula'] },
          { title: 'Systems of Equations', keywords: ['system', 'simultaneous', 'substitution', 'elimination'] }
        ]
      },
      {
        title: 'Geometry and Measurement',
        topics: [
          { title: 'Points, Lines, and Angles', keywords: ['point', 'line', 'angle', 'parallel', 'perpendicular'] },
          { title: 'Triangles and Polygons', keywords: ['triangle', 'polygon', 'congruent', 'similar'] },
          { title: 'Circles and Curved Shapes', keywords: ['circle', 'radius', 'diameter', 'circumference', 'area'] },
          { title: 'Three-Dimensional Shapes', keywords: ['3d', 'volume', 'surface area', 'prism', 'pyramid'] }
        ]
      },
      {
        title: 'Functions and Graphs',
        topics: [
          { title: 'Introduction to Functions', keywords: ['function', 'domain', 'range', 'input', 'output'] },
          { title: 'Linear Functions', keywords: ['linear', 'slope', 'intercept', 'graph'] },
          { title: 'Quadratic Functions', keywords: ['quadratic', 'parabola', 'vertex', 'axis'] },
          { title: 'Exponential and Logarithmic Functions', keywords: ['exponential', 'logarithm', 'growth', 'decay'] }
        ]
      }
    ]
  },
  'English': {
    chapters: [
      {
        title: 'Reading and Comprehension',
        topics: [
          { title: 'Reading Strategies', keywords: ['reading', 'strategy', 'comprehension', 'inference'] },
          { title: 'Literary Analysis', keywords: ['analysis', 'theme', 'character', 'plot', 'setting'] },
          { title: 'Non-fiction Texts', keywords: ['non-fiction', 'informational', 'expository', 'persuasive'] },
          { title: 'Poetry and Figurative Language', keywords: ['poetry', 'metaphor', 'simile', 'imagery', 'rhythm'] }
        ]
      },
      {
        title: 'Writing and Composition',
        topics: [
          { title: 'Writing Process', keywords: ['writing', 'process', 'brainstorm', 'draft', 'revise'] },
          { title: 'Narrative Writing', keywords: ['narrative', 'story', 'character', 'dialogue', 'sequence'] },
          { title: 'Expository Writing', keywords: ['expository', 'explain', 'inform', 'facts', 'evidence'] },
          { title: 'Persuasive Writing', keywords: ['persuasive', 'argument', 'opinion', 'convince', 'evidence'] }
        ]
      },
      {
        title: 'Language and Grammar',
        topics: [
          { title: 'Parts of Speech', keywords: ['noun', 'verb', 'adjective', 'adverb', 'pronoun'] },
          { title: 'Sentence Structure', keywords: ['sentence', 'subject', 'predicate', 'clause', 'phrase'] },
          { title: 'Punctuation and Capitalization', keywords: ['punctuation', 'comma', 'period', 'capital', 'apostrophe'] },
          { title: 'Spelling and Vocabulary', keywords: ['spelling', 'vocabulary', 'word', 'meaning', 'context'] }
        ]
      },
      {
        title: 'Speaking and Listening',
        topics: [
          { title: 'Oral Communication', keywords: ['speaking', 'presentation', 'audience', 'voice', 'gesture'] },
          { title: 'Active Listening', keywords: ['listening', 'attention', 'understanding', 'response'] },
          { title: 'Discussion and Debate', keywords: ['discussion', 'debate', 'opinion', 'evidence', 'respect'] },
          { title: 'Media Literacy', keywords: ['media', 'digital', 'source', 'credibility', 'bias'] }
        ]
      }
    ]
  },
  'Science': {
    chapters: [
      {
        title: 'Physical Science',
        topics: [
          { title: 'Matter and Its Properties', keywords: ['matter', 'solid', 'liquid', 'gas', 'properties'] },
          { title: 'Energy and Motion', keywords: ['energy', 'motion', 'force', 'speed', 'acceleration'] },
          { title: 'Heat and Temperature', keywords: ['heat', 'temperature', 'thermal', 'conduction', 'convection'] },
          { title: 'Light and Sound', keywords: ['light', 'sound', 'wave', 'reflection', 'refraction'] }
        ]
      },
      {
        title: 'Chemistry',
        topics: [
          { title: 'Atoms and Elements', keywords: ['atom', 'element', 'proton', 'neutron', 'electron'] },
          { title: 'Chemical Compounds', keywords: ['compound', 'molecule', 'formula', 'bond', 'reaction'] },
          { title: 'Chemical Reactions', keywords: ['reaction', 'reactant', 'product', 'equation', 'balance'] },
          { title: 'Acids, Bases, and pH', keywords: ['acid', 'base', 'ph', 'neutral', 'indicator'] }
        ]
      },
      {
        title: 'Biology',
        topics: [
          { title: 'Cells and Life Processes', keywords: ['cell', 'organism', 'life', 'process', 'function'] },
          { title: 'Genetics and Heredity', keywords: ['genetics', 'heredity', 'dna', 'gene', 'trait'] },
          { title: 'Evolution and Adaptation', keywords: ['evolution', 'adaptation', 'natural selection', 'species'] },
          { title: 'Ecosystems and Environment', keywords: ['ecosystem', 'environment', 'habitat', 'food chain', 'biodiversity'] }
        ]
      },
      {
        title: 'Earth and Space Science',
        topics: [
          { title: 'Earth\'s Structure and Processes', keywords: ['earth', 'structure', 'rock', 'mineral', 'plate'] },
          { title: 'Weather and Climate', keywords: ['weather', 'climate', 'atmosphere', 'precipitation', 'temperature'] },
          { title: 'Solar System and Universe', keywords: ['solar system', 'planet', 'star', 'galaxy', 'universe'] },
          { title: 'Natural Resources and Conservation', keywords: ['resource', 'conservation', 'renewable', 'fossil fuel', 'sustainability'] }
        ]
      }
    ]
  }
};

// Learning outcome templates by Bloom's level
const LEARNING_OUTCOME_TEMPLATES = {
  [BloomsTaxonomyLevel.REMEMBERING]: [
    'Students will recall {concept} and identify key {elements}',
    'Students will list the main {items} related to {topic}',
    'Students will define {terminology} used in {subject_area}',
    'Students will name the {components} of {system}',
    'Students will state the {rules} or {principles} of {concept}'
  ],
  [BloomsTaxonomyLevel.UNDERSTANDING]: [
    'Students will explain the {process} of {concept}',
    'Students will describe the relationship between {element1} and {element2}',
    'Students will summarize the main ideas of {topic}',
    'Students will interpret {data} or {information} about {subject}',
    'Students will classify {items} according to {criteria}'
  ],
  [BloomsTaxonomyLevel.APPLYING]: [
    'Students will solve {problems} using {method} or {formula}',
    'Students will demonstrate {skill} in {context}',
    'Students will use {tool} or {technique} to {accomplish_task}',
    'Students will apply {principle} to {new_situation}',
    'Students will calculate {values} using {procedure}'
  ],
  [BloomsTaxonomyLevel.ANALYZING]: [
    'Students will compare and contrast {concept1} and {concept2}',
    'Students will analyze the {components} of {system}',
    'Students will examine the {relationship} between {variables}',
    'Students will categorize {items} based on {characteristics}',
    'Students will identify the {patterns} in {data} or {information}'
  ],
  [BloomsTaxonomyLevel.EVALUATING]: [
    'Students will assess the {quality} or {effectiveness} of {solution}',
    'Students will critique the {argument} or {position} on {topic}',
    'Students will judge the {value} or {merit} of {work}',
    'Students will evaluate the {evidence} supporting {claim}',
    'Students will justify their {choice} or {decision} about {issue}'
  ],
  [BloomsTaxonomyLevel.CREATING]: [
    'Students will design a {product} or {solution} for {problem}',
    'Students will create an {original_work} that demonstrates {concept}',
    'Students will develop a {plan} or {strategy} for {goal}',
    'Students will construct a {model} or {representation} of {system}',
    'Students will produce a {creative_work} that incorporates {elements}'
  ]
};

/**
 * Get action verbs for each Bloom's level
 */
function getActionVerbsForBloomsLevel(level: BloomsTaxonomyLevel): string[] {
  const verbMap = {
    [BloomsTaxonomyLevel.REMEMBERING]: ['recall', 'identify', 'list', 'define', 'name', 'state', 'recognize', 'select'],
    [BloomsTaxonomyLevel.UNDERSTANDING]: ['explain', 'describe', 'summarize', 'interpret', 'classify', 'compare', 'discuss', 'predict'],
    [BloomsTaxonomyLevel.APPLYING]: ['solve', 'demonstrate', 'use', 'apply', 'calculate', 'implement', 'execute', 'operate'],
    [BloomsTaxonomyLevel.ANALYZING]: ['analyze', 'examine', 'compare', 'categorize', 'differentiate', 'organize', 'deconstruct', 'attribute'],
    [BloomsTaxonomyLevel.EVALUATING]: ['assess', 'critique', 'judge', 'evaluate', 'justify', 'argue', 'defend', 'support'],
    [BloomsTaxonomyLevel.CREATING]: ['design', 'create', 'develop', 'construct', 'plan', 'produce', 'generate', 'compose']
  };
  
  return verbMap[level] || ['understand'];
}

/**
 * Generate learning outcome statement
 */
function generateLearningOutcome(
  template: string,
  topicTitle: string,
  subjectName: string,
  topicKeywords: string[]
): string {
  let statement = template;
  
  // Replace placeholders with actual content
  const replacements = {
    '{concept}': topicTitle.toLowerCase(),
    '{topic}': topicTitle.toLowerCase(),
    '{subject_area}': subjectName.toLowerCase(),
    '{subject}': subjectName.toLowerCase(),
    '{elements}': 'elements',
    '{items}': 'concepts',
    '{terminology}': 'terminology',
    '{components}': 'components',
    '{system}': 'system',
    '{rules}': 'rules',
    '{principles}': 'principles',
    '{process}': 'process',
    '{element1}': topicKeywords[0] || 'concepts',
    '{element2}': topicKeywords[1] || 'principles',
    '{data}': 'data',
    '{information}': 'information',
    '{criteria}': 'criteria',
    '{problems}': 'problems',
    '{method}': 'methods',
    '{formula}': 'formulas',
    '{skill}': 'skills',
    '{context}': 'real-world contexts',
    '{tool}': 'tools',
    '{technique}': 'techniques',
    '{accomplish_task}': 'solve problems',
    '{principle}': 'principles',
    '{new_situation}': 'new situations',
    '{values}': 'values',
    '{procedure}': 'procedures',
    '{concept1}': topicKeywords[0] || 'concept A',
    '{concept2}': topicKeywords[1] || 'concept B',
    '{relationship}': 'relationships',
    '{variables}': 'variables',
    '{characteristics}': 'characteristics',
    '{patterns}': 'patterns',
    '{quality}': 'quality',
    '{effectiveness}': 'effectiveness',
    '{solution}': 'solutions',
    '{argument}': 'arguments',
    '{position}': 'positions',
    '{value}': 'value',
    '{merit}': 'merit',
    '{work}': 'work',
    '{evidence}': 'evidence',
    '{claim}': 'claims',
    '{choice}': 'choices',
    '{decision}': 'decisions',
    '{issue}': 'issues',
    '{product}': 'products',
    '{problem}': 'problems',
    '{original_work}': 'original work',
    '{plan}': 'plans',
    '{strategy}': 'strategies',
    '{goal}': 'goals',
    '{model}': 'models',
    '{representation}': 'representations',
    '{creative_work}': 'creative work'
  };
  
  Object.entries(replacements).forEach(([placeholder, replacement]) => {
    statement = statement.replace(new RegExp(placeholder, 'g'), replacement);
  });
  
  return statement;
}

/**
 * Create topics and learning outcomes for a subject
 */
async function createTopicsAndOutcomes(subjectId: string, subjectName: string, userId: string) {
  console.log(`📚 Creating topics and learning outcomes for ${subjectName}...`);
  
  const subjectTemplate = SUBJECT_TOPIC_TEMPLATES[subjectName as keyof typeof SUBJECT_TOPIC_TEMPLATES];
  if (!subjectTemplate) {
    console.log(`   ⚠️  No template found for ${subjectName}, skipping...`);
    return;
  }
  
  let topicCount = 0;
  let outcomeCount = 0;
  
  for (const [chapterIndex, chapter] of subjectTemplate.chapters.entries()) {
    // Create chapter
    const chapterCode = `${subjectId.slice(0, 8)}-CH${chapterIndex + 1}`;
    
    let chapterRecord;
    try {
      chapterRecord = await prisma.subjectTopic.upsert({
        where: {
          subjectId_code: {
            subjectId,
            code: chapterCode
          }
        },
        update: {
          title: chapter.title,
          description: `Chapter ${chapterIndex + 1}: ${chapter.title}`,
          nodeType: SubjectNodeType.CHAPTER,
          orderIndex: chapterIndex,
          estimatedMinutes: 240,
          competencyLevel: CompetencyLevel.INTERMEDIATE,
          keywords: [subjectName.toLowerCase(), 'chapter', `ch${chapterIndex + 1}`],
          status: SystemStatus.ACTIVE
        },
        create: {
          code: chapterCode,
          title: chapter.title,
          description: `Chapter ${chapterIndex + 1}: ${chapter.title}`,
          nodeType: SubjectNodeType.CHAPTER,
          orderIndex: chapterIndex,
          estimatedMinutes: 240,
          competencyLevel: CompetencyLevel.INTERMEDIATE,
          keywords: [subjectName.toLowerCase(), 'chapter', `ch${chapterIndex + 1}`],
          subjectId,
          status: SystemStatus.ACTIVE
        }
      });
      
      console.log(`   ✅ Created chapter: ${chapter.title}`);
    } catch (error) {
      console.log(`   ❌ Error creating chapter ${chapter.title}:`, error);
      continue;
    }
    
    // Create topics for this chapter
    for (const [topicIndex, topic] of chapter.topics.entries()) {
      const topicCode = `${chapterCode}-T${topicIndex + 1}`;
      
      try {
        const topicRecord = await prisma.subjectTopic.upsert({
          where: {
            subjectId_code: {
              subjectId,
              code: topicCode
            }
          },
          update: {
            title: topic.title,
            description: `Topic ${topicIndex + 1} of ${chapter.title}: ${topic.title}`,
            nodeType: SubjectNodeType.TOPIC,
            orderIndex: topicIndex,
            estimatedMinutes: 90,
            competencyLevel: CompetencyLevel.BASIC,
            keywords: [...topic.keywords, subjectName.toLowerCase()],
            parentTopicId: chapterRecord.id,
            status: SystemStatus.ACTIVE
          },
          create: {
            code: topicCode,
            title: topic.title,
            description: `Topic ${topicIndex + 1} of ${chapter.title}: ${topic.title}`,
            nodeType: SubjectNodeType.TOPIC,
            orderIndex: topicIndex,
            estimatedMinutes: 90,
            competencyLevel: CompetencyLevel.BASIC,
            keywords: [...topic.keywords, subjectName.toLowerCase()],
            subjectId,
            parentTopicId: chapterRecord.id,
            status: SystemStatus.ACTIVE
          }
        });
        
        topicCount++;
        console.log(`      ✅ Created topic: ${topic.title}`);
        
        // Create learning outcomes for this topic
        for (const bloomsLevel of Object.values(BloomsTaxonomyLevel)) {
          const templates = LEARNING_OUTCOME_TEMPLATES[bloomsLevel];
          const template = templates[Math.floor(Math.random() * templates.length)];
          
          const statement = generateLearningOutcome(
            template,
            topic.title,
            subjectName,
            topic.keywords
          );
          
          try {
            await prisma.learningOutcome.create({
              data: {
                statement,
                description: `${bloomsLevel} level learning outcome for ${topic.title}`,
                bloomsLevel,
                actionVerbs: getActionVerbsForBloomsLevel(bloomsLevel),
                subjectId,
                topicId: topicRecord.id,
                createdById: userId
              }
            });
            
            outcomeCount++;
          } catch (error) {
            // Outcome might already exist, continue
            console.log(`      ⚠️  Learning outcome already exists or error: ${error}`);
          }
        }
        
      } catch (error) {
        console.log(`      ❌ Error creating topic ${topic.title}:`, error);
      }
    }
  }
  
  console.log(`   📊 Created ${topicCount} topics and ${outcomeCount} learning outcomes for ${subjectName}`);
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting comprehensive subject data generation...');
    
    // Get existing subjects
    const subjects = await prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true }
    });
    
    console.log(`📚 Found ${subjects.length} subjects`);
    
    // Get a system user for creating learning outcomes
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@fabriiq.com' }
    });
    
    if (!systemUser) {
      console.log('⚠️  No system user found, using first available user...');
      systemUser = await prisma.user.findFirst();
      
      if (!systemUser) {
        console.log('❌ No users found in database. Please create a user first.');
        return;
      }
    }
    
    // Process each subject
    for (const subject of subjects) {
      await createTopicsAndOutcomes(subject.id, subject.name, systemUser.id);
    }
    
    console.log('\n🎉 Comprehensive subject data generation completed!');
    
    // Show summary statistics
    const topicCount = await prisma.subjectTopic.count({
      where: { status: 'ACTIVE' }
    });
    
    const outcomeCount = await prisma.learningOutcome.count();
    
    console.log(`📊 Final Statistics:`);
    console.log(`   - Subjects processed: ${subjects.length}`);
    console.log(`   - Total topics: ${topicCount}`);
    console.log(`   - Total learning outcomes: ${outcomeCount}`);
    
  } catch (error) {
    console.error('❌ Error generating subject data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}
