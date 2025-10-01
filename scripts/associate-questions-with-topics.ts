/**
 * Associate existing questions with relevant topics and learning outcomes
 * Analyzes question content and subject to find the best matching topics
 */

import { PrismaClient } from '@prisma/client';
import { BloomsTaxonomyLevel } from '@/features/bloom/types';

const prisma = new PrismaClient();

interface QuestionData {
  id: string;
  title: string;
  text: string;
  subjectId: string;
  topicId?: string;
  bloomsLevel?: BloomsTaxonomyLevel;
  keywords?: string[];
  gradeLevel?: number;
}

interface TopicData {
  id: string;
  code: string;
  title: string;
  description?: string;
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
 * Keyword mapping for different subjects to help with topic association
 */
const SUBJECT_KEYWORD_MAPPING = {
  'Mathematics': {
    'Algebra': ['equation', 'solve', 'variable', 'x', 'factor', 'polynomial', 'quadratic', 'linear'],
    'Geometry': ['area', 'perimeter', 'triangle', 'circle', 'rectangle', 'angle', 'shape', 'volume'],
    'Calculus': ['derivative', 'integral', 'limit', 'function', 'differentiate', 'integrate'],
    'Statistics': ['probability', 'mean', 'median', 'mode', 'data', 'average', 'distribution'],
    'Trigonometry': ['sin', 'cos', 'tan', 'sine', 'cosine', 'tangent', 'angle', 'triangle'],
    'Number Theory': ['prime', 'factor', 'divisible', 'integer', 'rational', 'irrational']
  },
  'English': {
    'Grammar': ['noun', 'verb', 'adjective', 'adverb', 'sentence', 'punctuation', 'grammar'],
    'Literature': ['novel', 'poem', 'author', 'character', 'theme', 'plot', 'setting'],
    'Writing': ['essay', 'paragraph', 'structure', 'organize', 'draft', 'revise', 'edit'],
    'Reading Comprehension': ['passage', 'main idea', 'inference', 'context', 'comprehension'],
    'Vocabulary': ['word', 'meaning', 'definition', 'synonym', 'antonym', 'vocabulary'],
    'Poetry': ['poem', 'rhyme', 'meter', 'stanza', 'metaphor', 'simile', 'imagery']
  },
  'Science': {
    'Physics': ['force', 'energy', 'motion', 'gravity', 'velocity', 'acceleration', 'mass'],
    'Chemistry': ['element', 'compound', 'reaction', 'atom', 'molecule', 'chemical', 'formula'],
    'Biology': ['cell', 'organism', 'DNA', 'gene', 'evolution', 'ecosystem', 'species'],
    'Earth Science': ['rock', 'mineral', 'weather', 'climate', 'geology', 'atmosphere'],
    'Astronomy': ['planet', 'star', 'galaxy', 'solar system', 'universe', 'space'],
    'Environmental Science': ['environment', 'pollution', 'conservation', 'ecosystem', 'sustainability']
  }
};

/**
 * Bloom's taxonomy keyword mapping
 */
const BLOOMS_KEYWORD_MAPPING = {
  [BloomsTaxonomyLevel.REMEMBERING]: ['recall', 'identify', 'list', 'define', 'name', 'state', 'what is', 'who is'],
  [BloomsTaxonomyLevel.UNDERSTANDING]: ['explain', 'describe', 'summarize', 'interpret', 'why', 'how', 'meaning'],
  [BloomsTaxonomyLevel.APPLYING]: ['solve', 'demonstrate', 'use', 'apply', 'calculate', 'find', 'determine'],
  [BloomsTaxonomyLevel.ANALYZING]: ['analyze', 'compare', 'contrast', 'examine', 'categorize', 'differentiate'],
  [BloomsTaxonomyLevel.EVALUATING]: ['evaluate', 'assess', 'judge', 'critique', 'justify', 'argue', 'defend'],
  [BloomsTaxonomyLevel.CREATING]: ['create', 'design', 'develop', 'construct', 'plan', 'produce', 'generate']
};

/**
 * Fetch all questions that need topic association
 */
async function fetchQuestionsNeedingTopics(): Promise<QuestionData[]> {
  console.log('📊 Fetching questions that need topic association...');
  
  const questions = await prisma.question.findMany({
    where: {
      OR: [
        { topicId: null },
        { topicId: '' },
        { bloomsLevel: null }
      ],
      status: 'ACTIVE'
    },
    select: {
      id: true,
      title: true,
      content: true,
      subjectId: true,
      topicId: true,
      bloomsLevel: true,
      metadata: true,
      gradeLevel: true
    }
  });

  return questions.map(q => ({
    id: q.id,
    title: q.title,
    text: (q.content as any)?.text || q.title,
    subjectId: q.subjectId,
    topicId: q.topicId || undefined,
    bloomsLevel: q.bloomsLevel as BloomsTaxonomyLevel || undefined,
    keywords: (q.metadata as any)?.keywords || [],
    gradeLevel: q.gradeLevel || undefined
  }));
}

/**
 * Fetch all available topics grouped by subject
 */
async function fetchTopicsBySubject(): Promise<Map<string, TopicData[]>> {
  console.log('📚 Fetching topics by subject...');
  
  const topics = await prisma.subjectTopic.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      code: true,
      title: true,
      description: true,
      keywords: true,
      subjectId: true
    }
  });

  const topicsBySubject = new Map<string, TopicData[]>();
  
  topics.forEach(topic => {
    if (!topicsBySubject.has(topic.subjectId)) {
      topicsBySubject.set(topic.subjectId, []);
    }
    topicsBySubject.get(topic.subjectId)!.push(topic);
  });

  return topicsBySubject;
}

/**
 * Fetch learning outcomes by subject and topic
 */
async function fetchLearningOutcomes(): Promise<Map<string, LearningOutcomeData[]>> {
  console.log('🎯 Fetching learning outcomes...');
  
  const outcomes = await prisma.learningOutcome.findMany({
    select: {
      id: true,
      statement: true,
      bloomsLevel: true,
      subjectId: true,
      topicId: true
    }
  });

  const outcomesByKey = new Map<string, LearningOutcomeData[]>();
  
  outcomes.forEach(outcome => {
    const key = outcome.topicId || outcome.subjectId;
    if (!outcomesByKey.has(key)) {
      outcomesByKey.set(key, []);
    }
    outcomesByKey.get(key)!.push(outcome as LearningOutcomeData);
  });

  return outcomesByKey;
}

/**
 * Calculate similarity score between question and topic
 */
function calculateTopicSimilarity(question: QuestionData, topic: TopicData, subjectName: string): number {
  let score = 0;
  const questionText = `${question.title} ${question.text}`.toLowerCase();
  const topicText = `${topic.title} ${topic.description || ''}`.toLowerCase();
  
  // 1. Direct keyword matches from topic keywords
  topic.keywords.forEach(keyword => {
    if (questionText.includes(keyword.toLowerCase())) {
      score += 3;
    }
  });
  
  // 2. Subject-specific keyword mapping
  const subjectMapping = SUBJECT_KEYWORD_MAPPING[subjectName as keyof typeof SUBJECT_KEYWORD_MAPPING];
  if (subjectMapping) {
    Object.entries(subjectMapping).forEach(([topicKey, keywords]) => {
      if (topic.title.toLowerCase().includes(topicKey.toLowerCase())) {
        keywords.forEach(keyword => {
          if (questionText.includes(keyword.toLowerCase())) {
            score += 2;
          }
        });
      }
    });
  }
  
  // 3. Title similarity
  const topicWords = topic.title.toLowerCase().split(' ');
  topicWords.forEach(word => {
    if (word.length > 3 && questionText.includes(word)) {
      score += 1;
    }
  });
  
  // 4. Question keywords match
  if (question.keywords) {
    question.keywords.forEach(keyword => {
      if (topicText.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });
  }
  
  return score;
}

/**
 * Determine Bloom's taxonomy level from question content
 */
function determineBloomsLevel(question: QuestionData): BloomsTaxonomyLevel {
  const questionText = `${question.title} ${question.text}`.toLowerCase();
  
  let maxScore = 0;
  let bestLevel = BloomsTaxonomyLevel.UNDERSTANDING;
  
  Object.entries(BLOOMS_KEYWORD_MAPPING).forEach(([level, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      if (questionText.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });
    
    if (score > maxScore) {
      maxScore = score;
      bestLevel = level as BloomsTaxonomyLevel;
    }
  });
  
  // If no keywords match, use question type heuristics
  if (maxScore === 0) {
    if (questionText.includes('define') || questionText.includes('what is')) {
      return BloomsTaxonomyLevel.REMEMBERING;
    } else if (questionText.includes('explain') || questionText.includes('describe')) {
      return BloomsTaxonomyLevel.UNDERSTANDING;
    } else if (questionText.includes('solve') || questionText.includes('calculate')) {
      return BloomsTaxonomyLevel.APPLYING;
    } else if (questionText.includes('compare') || questionText.includes('analyze')) {
      return BloomsTaxonomyLevel.ANALYZING;
    } else if (questionText.includes('evaluate') || questionText.includes('assess')) {
      return BloomsTaxonomyLevel.EVALUATING;
    } else if (questionText.includes('create') || questionText.includes('design')) {
      return BloomsTaxonomyLevel.CREATING;
    }
  }
  
  return bestLevel;
}

/**
 * Find best matching topic for a question
 */
function findBestTopic(question: QuestionData, topics: TopicData[], subjectName: string): TopicData | null {
  if (topics.length === 0) return null;
  
  let bestTopic: TopicData | null = null;
  let bestScore = 0;
  
  topics.forEach(topic => {
    const score = calculateTopicSimilarity(question, topic, subjectName);
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  });
  
  // Only return topic if score is above threshold
  return bestScore >= 2 ? bestTopic : null;
}

/**
 * Find relevant learning outcomes for a question
 */
function findRelevantLearningOutcomes(
  question: QuestionData,
  topic: TopicData | null,
  bloomsLevel: BloomsTaxonomyLevel,
  learningOutcomes: Map<string, LearningOutcomeData[]>
): string[] {
  const relevantOutcomes: string[] = [];
  
  // First try topic-specific outcomes
  if (topic) {
    const topicOutcomes = learningOutcomes.get(topic.id) || [];
    topicOutcomes.forEach(outcome => {
      if (outcome.bloomsLevel === bloomsLevel) {
        relevantOutcomes.push(outcome.id);
      }
    });
  }
  
  // If no topic outcomes, try subject-level outcomes
  if (relevantOutcomes.length === 0) {
    const subjectOutcomes = learningOutcomes.get(question.subjectId) || [];
    subjectOutcomes.forEach(outcome => {
      if (outcome.bloomsLevel === bloomsLevel && relevantOutcomes.length < 3) {
        relevantOutcomes.push(outcome.id);
      }
    });
  }
  
  return relevantOutcomes;
}

/**
 * Main function to associate questions with topics
 */
async function main() {
  try {
    console.log('🚀 Starting question-topic association process...');
    
    // Fetch data
    const [questions, topicsBySubject, learningOutcomes] = await Promise.all([
      fetchQuestionsNeedingTopics(),
      fetchTopicsBySubject(),
      fetchLearningOutcomes()
    ]);
    
    console.log(`📊 Found ${questions.length} questions needing topic association`);
    console.log(`📚 Found topics for ${topicsBySubject.size} subjects`);
    
    // Get subject names for better matching
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true }
    });
    const subjectNames = new Map(subjects.map(s => [s.id, s.name]));
    
    let processed = 0;
    let associated = 0;
    let bloomsUpdated = 0;
    let outcomesAssociated = 0;
    
    // Process questions in batches
    const batchSize = 50;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(questions.length / batchSize)}`);
      
      for (const question of batch) {
        try {
          const subjectName = subjectNames.get(question.subjectId) || 'Unknown';
          const subjectTopics = topicsBySubject.get(question.subjectId) || [];
          
          // Find best matching topic if not already assigned
          let assignedTopic: TopicData | null = null;
          if (!question.topicId) {
            assignedTopic = findBestTopic(question, subjectTopics, subjectName);
          }
          
          // Determine Bloom's level if not already assigned
          let assignedBloomsLevel = question.bloomsLevel;
          if (!assignedBloomsLevel) {
            assignedBloomsLevel = determineBloomsLevel(question);
          }
          
          // Find relevant learning outcomes
          const relevantOutcomes = findRelevantLearningOutcomes(
            question,
            assignedTopic,
            assignedBloomsLevel,
            learningOutcomes
          );
          
          // Update question in database
          const updateData: any = {};
          
          if (assignedTopic && !question.topicId) {
            updateData.topicId = assignedTopic.id;
            associated++;
          }
          
          if (assignedBloomsLevel && !question.bloomsLevel) {
            updateData.bloomsLevel = assignedBloomsLevel;
            bloomsUpdated++;
          }
          
          if (relevantOutcomes.length > 0) {
            updateData.learningOutcomeIds = relevantOutcomes;
            outcomesAssociated++;
          }
          
          if (Object.keys(updateData).length > 0) {
            await prisma.question.update({
              where: { id: question.id },
              data: updateData
            });
          }
          
          processed++;
          
          if (processed % 100 === 0) {
            console.log(`   ✅ Processed ${processed}/${questions.length} questions`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing question ${question.id}:`, error);
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Question-topic association completed!');
    console.log(`📊 Results:`);
    console.log(`   - Questions processed: ${processed}`);
    console.log(`   - Topics associated: ${associated}`);
    console.log(`   - Bloom's levels assigned: ${bloomsUpdated}`);
    console.log(`   - Learning outcomes associated: ${outcomesAssociated}`);
    
  } catch (error) {
    console.error('❌ Error in question-topic association:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}
