/**
 * Generate Questions for Physical Education & Wellbeing (Y8)
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
  id: 'cmesxd5ld001jtxcf6rsg2gdu',
  name: 'Physical Education & Wellbeing (Y8)',
  code: 'MYP-Y8-PE',
  topics: [
  {
    "id": "cmev1pvul001v6vwijmw8tuzs",
    "title": "Introduction",
    "code": "INTRODUCTION",
    "learningOutcomes": [
      {
        "id": "cmf9raaw200b1qjr87xipba5b",
        "statement": "Students will match understand principles of health and fitness related to Introduction.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9rab4200b3qjr82e1aqaip",
        "statement": "Students will summarize apply movement skills and strategies in various activities related to Introduction.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9rabfz00b5qjr87zk0lof7",
        "statement": "Students will show analyze performance and technique in physical activities related to Introduction.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9raby300b7qjr8yldi7f2b",
        "statement": "Students will examine evaluate health and fitness practices related to Introduction.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9rac5j00b9qjr8r2l3est2",
        "statement": "Students will critique design personal fitness and wellness plans related to Introduction.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9racdb00bbqjr8gns3692y",
        "statement": "Students will synthesize demonstrate teamwork and sportsmanship related to Introduction.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1pvxi001x6vwie9zcdbjo",
    "title": "Practice",
    "code": "PRACTICE",
    "learningOutcomes": [
      {
        "id": "cmf9rackp00bdqjr8bv2kgk0o",
        "statement": "Students will recognize understand principles of health and fitness related to Practice.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9racsw00bfqjr8wi6rqkjy",
        "statement": "Students will explain apply movement skills and strategies in various activities related to Practice.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9rad0g00bhqjr8q6r8qu68",
        "statement": "Students will solve analyze performance and technique in physical activities related to Practice.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9rad8f00bjqjr8avtpcd18",
        "statement": "Students will deconstruct evaluate health and fitness practices related to Practice.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9radfz00blqjr8tb66s9ze",
        "statement": "Students will judge design personal fitness and wellness plans related to Practice.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9rado200bnqjr8g5dijelj",
        "statement": "Students will develop demonstrate teamwork and sportsmanship related to Practice.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1pw0d001z6vwis8cqmnq9",
    "title": "Assessment",
    "code": "ASSESSMENT",
    "learningOutcomes": [
      {
        "id": "cmf9raef500bpqjr8019bteof",
        "statement": "Students will recognize understand principles of health and fitness related to Assessment.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9raemn00brqjr8mpyz40p1",
        "statement": "Students will interpret apply movement skills and strategies in various activities related to Assessment.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9raeu100btqjr8wwouuku6",
        "statement": "Students will operate analyze performance and technique in physical activities related to Assessment.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9raf1q00bvqjr8eesi7xod",
        "statement": "Students will compare evaluate health and fitness practices related to Assessment.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9raf9a00bxqjr8t9qf9cjx",
        "statement": "Students will validate design personal fitness and wellness plans related to Assessment.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9rafgt00bzqjr87mvc00c9",
        "statement": "Students will plan demonstrate teamwork and sportsmanship related to Assessment.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y8_PE(): Promise<void> {
  console.log('🎯 Starting generation for Physical Education & Wellbeing (Y8)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd5ld001jtxcf6rsg2gdu' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Physical Education & Wellbeing (Y8)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Physical Education & Wellbeing (Y8):', error);
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
  generateForMYP_Y8_PE()
    .then(() => {
      console.log('\n🏁 Physical Education & Wellbeing (Y8) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Physical Education & Wellbeing (Y8) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y8_PE };
