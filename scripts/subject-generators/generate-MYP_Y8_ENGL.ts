/**
 * Generate Questions for English Language & Communication (Y8)
 * Auto-generated script for subject-specific question generation
 */

import { PrismaClient } from '@prisma/client';
import { 
  generateQuestionsForSubject,
  seedQuestionsBatch,
  type SubjectData 
} from '../generate-million-questions-seed';

const prisma = new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const SUBJECT_DATA: SubjectData = {
  id: 'cmesxd5az001dtxcfqsu6wa37',
  name: 'English Language & Communication (Y8)',
  code: 'MYP-Y8-ENGL',
  topics: [
  {
    "id": "cmev0xiig000112j6rzfqq9ba",
    "title": "Reading Comprehension",
    "code": "READING_COMPREHENSION",
    "learningOutcomes": [
      {
        "id": "cmf71e2i9000e1181rkup3tjg",
        "statement": "Given a short passage, the student will be able to recall the stated main idea with 100% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71fgar002g1181dvao6tbg",
        "statement": "After reading a set of instructions, students will be able to explain the steps involved in completing a task to a partner, demonstrating understanding of the process within 10 minutes.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf71e2i9000c1181w3r9ncjh",
        "statement": "Given a reading passage, the student will be able to list five key details from the text with no errors.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e2da000a11812qukyl8i",
        "statement": "Given a list of words, the student will be able to identify the definition of vocabulary words used in the text with 90% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e3xu000k1181bz7ga2kg",
        "statement": "Given a reading passage, the student will be able to identify the names of the characters with 100% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e3x2000g1181zgdrrvaa",
        "statement": "Given a sentence from a text, the student will be able to define the meaning of unfamiliar words with 80% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e3xq000i1181tsxijost",
        "statement": "Given a reading passage, the student will be able to recall the explicit details of the plot with 80% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e3yv000m1181d0llv688",
        "statement": "Given a text, the student will be able to label the setting of the story with 100% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e3yx000q1181fjidcak9",
        "statement": "Given a short story, the student will be able to list the characters by name, without error.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71e3yx000o1181exfb4lvl",
        "statement": "Given a paragraph, the student will be able to recall the topic sentence with 100% accuracy.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf71fg79002a1181qli848jx",
        "statement": "Given a short story, students will be able to summarize the plot's main events in their own words with 80% accuracy within 20 minutes.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf71fgae002c11811nizdcav",
        "statement": "After reading a non-fiction article, students will be able to identify the author's purpose and provide two supporting pieces of evidence from the text within 15 minutes.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf71fgaq002e1181l8scffkw",
        "statement": "Students will be able to paraphrase the central argument of an editorial, demonstrating comprehension by accurately restating it in a single paragraph by the end of the class period.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf71fgb1002i11814yxccsic",
        "statement": "Given a passage with unfamiliar vocabulary, students will be able to infer the meaning of at least three unknown words using contextual clues with 75% accuracy within 30 minutes.",
        "bloomsLevel": "UNDERSTAND"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y8_ENGL(): Promise<void> {
  console.log('🎯 Starting generation for English Language & Communication (Y8)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd5az001dtxcfqsu6wa37' }
    });
    
    console.log(`📊 Current questions: ${currentCount.toLocaleString()}`);
    console.log(`🎯 Target questions: ${TARGET_QUESTIONS.toLocaleString()}`);
    
    if (currentCount >= TARGET_QUESTIONS) {
      console.log('✅ Subject already has sufficient questions. Skipping.');
      return;
    }
    
    const questionsToGenerate = TARGET_QUESTIONS - currentCount;
    console.log(`📝 Questions to generate: ${questionsToGenerate.toLocaleString()}`);
    
    // Get system user and question bank
    const systemUser = await prisma.user.findFirst();
    const questionBank = await prisma.questionBank.findFirst({ 
      where: { status: 'ACTIVE' } 
    });
    
    if (!systemUser || !questionBank) {
      throw new Error('Missing system user or question bank');
    }
    
    // Generate and seed in chunks to avoid connection timeouts
    let totalGenerated = 0;
    const chunks = Math.ceil(questionsToGenerate / QUESTIONS_PER_BATCH_GENERATION);
    
    for (let chunk = 0; chunk < chunks; chunk++) {
      const questionsInChunk = Math.min(
        QUESTIONS_PER_BATCH_GENERATION, 
        questionsToGenerate - totalGenerated
      );
      
      console.log(`\n🔄 Processing chunk ${chunk + 1}/${chunks} (${questionsInChunk} questions)`);
      
      // Generate questions for this chunk
      const questions = await generateQuestionsForSubject(
        SUBJECT_DATA,
        questionsInChunk,
        questionBank.id,
        systemUser.id,
        QUESTIONS_PER_BATCH_GENERATION // Use full chunk as batch size for generation
      );
      
      console.log(`✅ Generated ${questions.length} questions`);
      
      // Seed in smaller batches with connection management
      await seedQuestionsWithRetry(questions, BATCH_SIZE);
      
      totalGenerated += questions.length;
      console.log(`📊 Progress: ${totalGenerated}/${questionsToGenerate} (${((totalGenerated/questionsToGenerate)*100).toFixed(1)}%)`);
      
      // Small delay between chunks to prevent connection issues
      if (chunk < chunks - 1) {
        console.log('⏳ Waiting 2 seconds before next chunk...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for English Language & Communication (Y8)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for English Language & Communication (Y8):', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seed questions with retry logic and connection management
 */
async function seedQuestionsWithRetry(questions: any[], batchSize: number, maxRetries: number = 3): Promise<void> {
  console.log(`💾 Seeding ${questions.length} questions in batches of ${batchSize}...`);
  
  const batches = Math.ceil(questions.length / batchSize);
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batchNumber = Math.floor(i / batchSize) + 1;
    const batch = questions.slice(i, i + batchSize);
    
    let retries = 0;
    let success = false;
    
    while (!success && retries < maxRetries) {
      try {
        await prisma.question.createMany({
          data: batch,
          skipDuplicates: true
        });
        
        console.log(`   ✅ Seeded batch ${batchNumber}/${batches} (${batch.length} questions)`);
        success = true;
        
      } catch (error: any) {
        retries++;
        console.log(`   ⚠️  Batch ${batchNumber} failed (attempt ${retries}/${maxRetries}): ${error.message}`);
        
        if (retries < maxRetries) {
          // Reconnect and retry
          await prisma.$disconnect();
          await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
          console.log(`   🔄 Retrying batch ${batchNumber}...`);
        } else {
          console.error(`   ❌ Failed to seed batch ${batchNumber} after ${maxRetries} attempts`);
          throw error;
        }
      }
    }
    
    // Small delay between batches
    if (i + batchSize < questions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Run the script
if (require.main === module) {
  generateForMYP_Y8_ENGL()
    .then(() => {
      console.log('\n🏁 English Language & Communication (Y8) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 English Language & Communication (Y8) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y8_ENGL };
