#!/usr/bin/env node

/**
 * Fix IRT Parameters for Questions
 * 
 * This script adds default IRT parameters to questions that don't have them
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixIRTParameters() {
  console.log('🔧 Fixing IRT Parameters for Questions...\n');

  try {
    // Get the CAT activity questions
    const activity = await prisma.activity.findFirst({
      where: {
        status: 'ACTIVE',
        content: {
          path: ['settings', 'catSettings', 'enabled'],
          equals: true
        }
      },
      select: {
        id: true,
        title: true,
        content: true
      }
    });

    if (!activity) {
      console.log('❌ No CAT-enabled activity found');
      return;
    }

    console.log(`Found CAT activity: ${activity.title}`);
    
    const content = activity.content;
    const questionIds = content.questions?.map(q => q.id) || [];
    console.log(`Activity has ${questionIds.length} questions`);

    if (questionIds.length === 0) {
      console.log('❌ No questions found in activity');
      return;
    }

    // Get questions from database
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds }
      },
      select: {
        id: true,
        difficulty: true,
        metadata: true
      }
    });

    console.log(`Found ${questions.length} questions in database`);

    // Check which questions need IRT parameters
    let questionsNeedingIRT = [];
    let questionsWithIRT = 0;

    for (const question of questions) {
      const hasIRT = question.metadata && 
                     typeof question.metadata === 'object' && 
                     question.metadata.irtParameters;
      
      if (hasIRT) {
        questionsWithIRT++;
      } else {
        questionsNeedingIRT.push(question);
      }
    }

    console.log(`Questions with IRT parameters: ${questionsWithIRT}`);
    console.log(`Questions needing IRT parameters: ${questionsNeedingIRT.length}`);

    if (questionsNeedingIRT.length === 0) {
      console.log('✅ All questions already have IRT parameters');
      return;
    }

    // Add default IRT parameters based on difficulty
    console.log('\n🔧 Adding default IRT parameters...');

    const getDefaultIRTParameters = (difficulty) => {
      switch (difficulty) {
        case 'VERY_EASY':
          return { discrimination: 0.8, difficulty: -2.0, guessing: 0.05 };
        case 'EASY':
          return { discrimination: 1.0, difficulty: -1.0, guessing: 0.1 };
        case 'MEDIUM':
          return { discrimination: 1.2, difficulty: 0.0, guessing: 0.15 };
        case 'HARD':
          return { discrimination: 1.4, difficulty: 1.0, guessing: 0.2 };
        case 'VERY_HARD':
          return { discrimination: 1.6, difficulty: 2.0, guessing: 0.25 };
        default:
          return { discrimination: 1.0, difficulty: 0.0, guessing: 0.15 };
      }
    };

    let updatedCount = 0;

    for (const question of questionsNeedingIRT) {
      try {
        const irtParams = getDefaultIRTParameters(question.difficulty);
        
        const existingMetadata = question.metadata && typeof question.metadata === 'object' 
          ? question.metadata 
          : {};

        await prisma.question.update({
          where: { id: question.id },
          data: {
            metadata: {
              ...existingMetadata,
              irtParameters: irtParams
            }
          }
        });

        console.log(`  ✅ Updated question ${question.id} (${question.difficulty})`);
        console.log(`     IRT: discrimination=${irtParams.discrimination}, difficulty=${irtParams.difficulty}, guessing=${irtParams.guessing}`);
        updatedCount++;

      } catch (error) {
        console.log(`  ❌ Failed to update question ${question.id}: ${error.message}`);
      }
    }

    console.log(`\n🎯 Summary:`);
    console.log(`  Questions updated: ${updatedCount}/${questionsNeedingIRT.length}`);
    console.log(`  Total questions with IRT: ${questionsWithIRT + updatedCount}/${questions.length}`);

    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const verifyQuestions = await prisma.question.findMany({
      where: {
        id: { in: questionIds }
      },
      select: {
        id: true,
        difficulty: true,
        metadata: true
      }
    });

    let verifiedCount = 0;
    for (const question of verifyQuestions) {
      const hasIRT = question.metadata && 
                     typeof question.metadata === 'object' && 
                     question.metadata.irtParameters;
      if (hasIRT) {
        verifiedCount++;
      }
    }

    console.log(`✅ Verification: ${verifiedCount}/${verifyQuestions.length} questions now have IRT parameters`);

    if (verifiedCount === verifyQuestions.length) {
      console.log('\n🎉 All questions now have IRT parameters! CAT should work properly.');
    } else {
      console.log('\n⚠️  Some questions still missing IRT parameters. Check the logs above.');
    }

  } catch (error) {
    console.error('\n❌ Error fixing IRT parameters:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixIRTParameters().catch(console.error);
}

module.exports = { fixIRTParameters };
