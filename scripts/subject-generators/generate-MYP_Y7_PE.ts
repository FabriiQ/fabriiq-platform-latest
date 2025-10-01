/**
 * Generate Questions for Physical Education & Wellbeing (Y7)
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
  id: 'cmesxd54c0019txcfht9e5jec',
  name: 'Physical Education & Wellbeing (Y7)',
  code: 'MYP-Y7-PE',
  topics: [
  {
    "id": "cmeuyq7lm00ct13isiooxx2sd",
    "title": "Physical Education & Wellbeing: Unit 1",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH1",
    "learningOutcomes": [
      {
        "id": "cmf9r9aa70061qjr8kdxs4uob",
        "statement": "Students will list understand principles of health and fitness related to Physical Education & Wellbeing: Unit 1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9ahm0063qjr8n11fa26u",
        "statement": "Students will explain apply movement skills and strategies in various activities related to Physical Education & Wellbeing: Unit 1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9ap80065qjr80k4ds49h",
        "statement": "Students will operate analyze performance and technique in physical activities related to Physical Education & Wellbeing: Unit 1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9axk0067qjr8bu35v5z6",
        "statement": "Students will compare evaluate health and fitness practices related to Physical Education & Wellbeing: Unit 1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9b5h0069qjr8avzd1pcc",
        "statement": "Students will justify design personal fitness and wellness plans related to Physical Education & Wellbeing: Unit 1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9bda006bqjr8bovg62l3",
        "statement": "Students will construct demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing: Unit 1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7on00cv13iskd2du2i9",
    "title": "Physical Education & Wellbeing Topic 1.1",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH1-T1",
    "learningOutcomes": [
      {
        "id": "cmf9r9blc006dqjr8sykg8jua",
        "statement": "Students will select understand principles of health and fitness related to Physical Education & Wellbeing Topic 1.1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9c2p006fqjr8xlqse7li",
        "statement": "Students will explain apply movement skills and strategies in various activities related to Physical Education & Wellbeing Topic 1.1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9ca6006hqjr8e30i22kv",
        "statement": "Students will demonstrate analyze performance and technique in physical activities related to Physical Education & Wellbeing Topic 1.1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9chu006jqjr8u7qyt9ji",
        "statement": "Students will compare evaluate health and fitness practices related to Physical Education & Wellbeing Topic 1.1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9cpd006lqjr8siokv3tx",
        "statement": "Students will validate design personal fitness and wellness plans related to Physical Education & Wellbeing Topic 1.1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9d7s006nqjr8fvwv38x3",
        "statement": "Students will synthesize demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing Topic 1.1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7rs00cx13is89ytgebn",
    "title": "Physical Education & Wellbeing Topic 1.2",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH1-T2",
    "learningOutcomes": [
      {
        "id": "cmf9r9dzv006pqjr8ucaydxcz",
        "statement": "Students will list understand principles of health and fitness related to Physical Education & Wellbeing Topic 1.2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9e7g006rqjr8pla05spb",
        "statement": "Students will demonstrate apply movement skills and strategies in various activities related to Physical Education & Wellbeing Topic 1.2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9ef6006tqjr8ouh8onbk",
        "statement": "Students will solve analyze performance and technique in physical activities related to Physical Education & Wellbeing Topic 1.2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9end006vqjr8a1mysaa9",
        "statement": "Students will deconstruct evaluate health and fitness practices related to Physical Education & Wellbeing Topic 1.2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9fbp006xqjr8t9vx688i",
        "statement": "Students will recommend design personal fitness and wellness plans related to Physical Education & Wellbeing Topic 1.2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9fjg006zqjr857gml7b2",
        "statement": "Students will produce demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing Topic 1.2.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7uz00cz13iszjv3asa9",
    "title": "Physical Education & Wellbeing: Unit 2",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH2",
    "learningOutcomes": [
      {
        "id": "cmf9r9fr40071qjr8qr0by06x",
        "statement": "Students will define understand principles of health and fitness related to Physical Education & Wellbeing: Unit 2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9fyp0073qjr8z665uidj",
        "statement": "Students will contrast apply movement skills and strategies in various activities related to Physical Education & Wellbeing: Unit 2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9g6o0075qjr81ydcfvms",
        "statement": "Students will apply analyze performance and technique in physical activities related to Physical Education & Wellbeing: Unit 2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9gog0077qjr8btk3l2fj",
        "statement": "Students will categorize evaluate health and fitness practices related to Physical Education & Wellbeing: Unit 2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9gw60079qjr85p70ask3",
        "statement": "Students will recommend design personal fitness and wellness plans related to Physical Education & Wellbeing: Unit 2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9iad007bqjr8oxemofxv",
        "statement": "Students will produce demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing: Unit 2.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq7y000d113iss6s0dnir",
    "title": "Physical Education & Wellbeing Topic 2.1",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH2-T1",
    "learningOutcomes": [
      {
        "id": "cmf9r9igp007dqjr89mkgfi1w",
        "statement": "Students will recall understand principles of health and fitness related to Physical Education & Wellbeing Topic 2.1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9in4007fqjr83fd32w4a",
        "statement": "Students will compare apply movement skills and strategies in various activities related to Physical Education & Wellbeing Topic 2.1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9itn007hqjr8dydo3b44",
        "statement": "Students will operate analyze performance and technique in physical activities related to Physical Education & Wellbeing Topic 2.1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9j02007jqjr8kkxzh0at",
        "statement": "Students will deconstruct evaluate health and fitness practices related to Physical Education & Wellbeing Topic 2.1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9jgy007lqjr8z5cc3yjh",
        "statement": "Students will justify design personal fitness and wellness plans related to Physical Education & Wellbeing Topic 2.1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9jyh007nqjr8i5xbkzfb",
        "statement": "Students will produce demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing Topic 2.1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq81000d313is12z0uipu",
    "title": "Physical Education & Wellbeing Topic 2.2",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH2-T2",
    "learningOutcomes": [
      {
        "id": "cmf9r9kg2007pqjr8uxlkqusi",
        "statement": "Students will recognize understand principles of health and fitness related to Physical Education & Wellbeing Topic 2.2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9kwy007rqjr8spryas7j",
        "statement": "Students will illustrate apply movement skills and strategies in various activities related to Physical Education & Wellbeing Topic 2.2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9l4i007tqjr8wqcymiwg",
        "statement": "Students will complete analyze performance and technique in physical activities related to Physical Education & Wellbeing Topic 2.2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9lvl007vqjr8tu38jsod",
        "statement": "Students will distinguish evaluate health and fitness practices related to Physical Education & Wellbeing Topic 2.2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9m3g007xqjr8wmj9bbw1",
        "statement": "Students will prioritize design personal fitness and wellness plans related to Physical Education & Wellbeing Topic 2.2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9mb0007zqjr8zocqww5p",
        "statement": "Students will create demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing Topic 2.2.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq84100d513isc0bvsm9l",
    "title": "Physical Education & Wellbeing: Unit 3",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH3",
    "learningOutcomes": [
      {
        "id": "cmf9r9miz0081qjr8f6fe4lqq",
        "statement": "Students will recognize understand principles of health and fitness related to Physical Education & Wellbeing: Unit 3.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9mqe0083qjr86ftkk5pa",
        "statement": "Students will paraphrase apply movement skills and strategies in various activities related to Physical Education & Wellbeing: Unit 3.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9n960085qjr8widkmqej",
        "statement": "Students will apply analyze performance and technique in physical activities related to Physical Education & Wellbeing: Unit 3.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9ngz0087qjr8px5zkm6c",
        "statement": "Students will examine evaluate health and fitness practices related to Physical Education & Wellbeing: Unit 3.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9o2b0089qjr8ybwoy5n6",
        "statement": "Students will critique design personal fitness and wellness plans related to Physical Education & Wellbeing: Unit 3.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9q5d008bqjr84l4be060",
        "statement": "Students will develop demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing: Unit 3.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq86z00d713iswysn10r8",
    "title": "Physical Education & Wellbeing Topic 3.1",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH3-T1",
    "learningOutcomes": [
      {
        "id": "cmf9r9qd6008dqjr8bkj80v7o",
        "statement": "Students will identify understand principles of health and fitness related to Physical Education & Wellbeing Topic 3.1.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9qkt008fqjr87rqn3v5y",
        "statement": "Students will translate apply movement skills and strategies in various activities related to Physical Education & Wellbeing Topic 3.1.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9qst008hqjr8fg1xxtmn",
        "statement": "Students will implement analyze performance and technique in physical activities related to Physical Education & Wellbeing Topic 3.1.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9ra9008jqjr8grik84sh",
        "statement": "Students will analyze evaluate health and fitness practices related to Physical Education & Wellbeing Topic 3.1.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9rhp008lqjr8mapjjjtn",
        "statement": "Students will critique design personal fitness and wellness plans related to Physical Education & Wellbeing Topic 3.1.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9rps008nqjr8zlhzin2g",
        "statement": "Students will formulate demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing Topic 3.1.",
        "bloomsLevel": "CREATE"
      }
    ]
  },
  {
    "id": "cmeuyq8ba00d913isnqya9009",
    "title": "Physical Education & Wellbeing Topic 3.2",
    "code": "cmesxd54c0019txcfht9e5jec-GEN-CH3-T2",
    "learningOutcomes": [
      {
        "id": "cmf9r9sgt008pqjr8mi4kvlr3",
        "statement": "Students will select understand principles of health and fitness related to Physical Education & Wellbeing Topic 3.2.",
        "bloomsLevel": "REMEMBER"
      },
      {
        "id": "cmf9r9syo008rqjr8ynhyk462",
        "statement": "Students will classify apply movement skills and strategies in various activities related to Physical Education & Wellbeing Topic 3.2.",
        "bloomsLevel": "UNDERSTAND"
      },
      {
        "id": "cmf9r9tg5008tqjr8ungfpcw3",
        "statement": "Students will show analyze performance and technique in physical activities related to Physical Education & Wellbeing Topic 3.2.",
        "bloomsLevel": "APPLY"
      },
      {
        "id": "cmf9r9txx008vqjr84p7is5go",
        "statement": "Students will differentiate evaluate health and fitness practices related to Physical Education & Wellbeing Topic 3.2.",
        "bloomsLevel": "ANALYZE"
      },
      {
        "id": "cmf9r9uph008xqjr8femc01cz",
        "statement": "Students will evaluate design personal fitness and wellness plans related to Physical Education & Wellbeing Topic 3.2.",
        "bloomsLevel": "EVALUATE"
      },
      {
        "id": "cmf9r9vuq008zqjr8oqaypjxq",
        "statement": "Students will formulate demonstrate teamwork and sportsmanship related to Physical Education & Wellbeing Topic 3.2.",
        "bloomsLevel": "CREATE"
      }
    ]
  }
]
};

const TARGET_QUESTIONS = 50000;
const BATCH_SIZE = 500; // Smaller batches for better connection management
const QUESTIONS_PER_BATCH_GENERATION = 2500; // Generate in smaller chunks

async function generateForMYP_Y7_PE(): Promise<void> {
  console.log('🎯 Starting generation for Physical Education & Wellbeing (Y7)');
  console.log('='.repeat(60));
  
  try {
    // Check current question count
    const currentCount = await prisma.question.count({
      where: { subjectId: 'cmesxd54c0019txcfht9e5jec' }
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
    
    console.log(`\n🎉 Successfully generated ${totalGenerated} questions for Physical Education & Wellbeing (Y7)`);
    
  } catch (error) {
    console.error('❌ Error generating questions for Physical Education & Wellbeing (Y7):', error);
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
  generateForMYP_Y7_PE()
    .then(() => {
      console.log('\n🏁 Physical Education & Wellbeing (Y7) generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Physical Education & Wellbeing (Y7) generation failed:', error);
      process.exit(1);
    });
}

export { generateForMYP_Y7_PE };
