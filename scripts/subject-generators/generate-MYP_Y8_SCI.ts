/**
 * Generate Questions for Integrated Science & Inquiry (Y8)
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
  id: 'cmesxd5h6001htxcfbvidnh6t',
  name: 'Integrated Science & Inquiry (Y8)',
  code: 'MYP-Y8-SCI',
  topics: [
  {
    "id": "cmev1pvcl001j6vwij7cnaep7",
    "title": "Scientific Method",
    "code": "SCIENTIFIC_METHOD",
    "learningOutcomes": [
      {
        "id": "cmf9ra1zd00a1qjr8crim8duo",
        "statement": "Students will identify understand scientific concepts and principles related to Scientific Method.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9ra27600a3qjr81aijb9vd",
        "statement": "Students will translate apply scientific methods and processes related to Scientific Method.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9ra2ow00a5qjr8l5b1c0f2",
        "statement": "Students will show analyze scientific data and evidence related to Scientific Method.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9ra54100a7qjr8hz09wsid",
        "statement": "Students will contrast evaluate scientific claims and theories related to Scientific Method.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9ra5bt00a9qjr8hcj5a0h0",
        "statement": "Students will support design and conduct scientific investigations related to Scientific Method.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9ra5jf00abqjr8dg1hwanc",
        "statement": "Students will produce communicate scientific findings effectively related to Scientific Method.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1pvg0001l6vwihc31zrby",
    "title": "Life Sciences",
    "code": "LIFE_SCIENCES",
    "learningOutcomes": [
      {
        "id": "cmf9ra5zw00adqjr831xto9f3",
        "statement": "Students will define understand scientific concepts and principles related to Life Sciences.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9ra6hg00afqjr8ug6wb2wn",
        "statement": "Students will explain apply scientific methods and processes related to Life Sciences.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9ra6ow00ahqjr86itdcqqw",
        "statement": "Students will implement analyze scientific data and evidence related to Life Sciences.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9ra76g00ajqjr87lb3o62h",
        "statement": "Students will differentiate evaluate scientific claims and theories related to Life Sciences.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9ra7e900alqjr80zwpwwgb",
        "statement": "Students will defend design and conduct scientific investigations related to Life Sciences.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9ra7wc00anqjr89o345ezi",
        "statement": "Students will produce communicate scientific findings effectively related to Life Sciences.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmev1pviv001n6vwif5erz6ma",
    "title": "Physical Sciences",
    "code": "PHYSICAL_SCIENCES",
    "learningOutcomes": [
      {
        "id": "cmf9ra84900apqjr8jhqzx96n",
        "statement": "Students will recognize understand scientific concepts and principles related to Physical Sciences.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9ra9t700arqjr86oml7m0q",
        "statement": "Students will contrast apply scientific methods and processes related to Physical Sciences.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9raa0r00atqjr87bftegav",
        "statement": "Students will operate analyze scientific data and evidence related to Physical Sciences.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9raa8l00avqjr8x8tg65ka",
        "statement": "Students will compare evaluate scientific claims and theories related to Physical Sciences.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9raagh00axqjr87p7aftam",
        "statement": "Students will critique design and conduct scientific investigations related to Physical Sciences.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9raaoc00azqjr8yz9ljaku",
        "statement": "Students will plan communicate scientific findings effectively related to Physical Sciences.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y8_SCI(): Promise<void> {
  console.log('🎯 Starting generation for Integrated Science & Inquiry (Y8)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd5h6001htxcfbvidnh6t' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Integrated Science & Inquiry (Y8)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Integrated Science & Inquiry (Y8):', error);
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
  generateForMYP_Y8_SCI()
    .then(() => {
      console.log('\n🏁 Integrated Science & Inquiry (Y8) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Integrated Science & Inquiry (Y8) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y8_SCI };
