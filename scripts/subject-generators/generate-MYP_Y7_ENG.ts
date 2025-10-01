/**
 * Generate Questions for English Language & Communication (Y7)
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
  id: 'cmesxd4rj0013txcfc70y7frh',
  name: 'English Language & Communication (Y7)',
  code: 'MYP-Y7-ENG',
  topics: [
  {
    "id": "cmeuyq5v800bv13is5u46bghi",
    "title": "English Language & Communication Topic 1.1",
    "code": "cmesxd4rj0013txcfc70y7frh-GEN-CH1-T1",
    "learningOutcomes": [
      {
        "id": "cmf6pbky6000avytmv844hc3i",
        "statement": "After a class discussion on active listening, the student will be able to describe three active listening techniques, providing specific examples of how each can be applied in a conversation.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf6pbl1h000cvytmdxgbsp1t",
        "statement": "Using a provided diagram, the student will be able to illustrate the communication process, including sender, receiver, message, and feedback.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf6pbl1j000fvytmgcf1h7o2",
        "statement": "Given a short passage, the student will be able to paraphrase the main idea demonstrating comprehension of the author's intent.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf6pbl1j000gvytm4qqz7msg",
        "statement": "After reviewing definitions of verbal and nonverbal communication, the student will be able to summarize the differences between them in their own words.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf6pbl30000ivytm0khtssdp",
        "statement": "Given examples of different communication styles, the student will be able to explain the key characteristics of each style with accurate descriptions.",
        "bloomsLevel": "UNDERSTAND"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y7_ENG(): Promise<void> {
  console.log('🎯 Starting generation for English Language & Communication (Y7)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd4rj0013txcfc70y7frh' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for English Language & Communication (Y7)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for English Language & Communication (Y7):', error);
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
  generateForMYP_Y7_ENG()
    .then(() => {
      console.log('\n🏁 English Language & Communication (Y7) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 English Language & Communication (Y7) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y7_ENG };
