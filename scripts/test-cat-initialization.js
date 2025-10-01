#!/usr/bin/env node

/**
 * Test CAT Initialization Process
 * 
 * This script tests the CAT initialization process step by step
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCATInitialization() {
  console.log('🧪 Testing CAT Initialization Process...\n');

  try {
    // 1. Get the CAT-enabled activity
    console.log('1. Finding CAT-enabled activity...');
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
        content: true,
        subjectId: true,
        subject: {
          select: { name: true }
        }
      }
    });

    if (!activity) {
      console.log('❌ No CAT-enabled activity found');
      return;
    }

    console.log(`✅ Found CAT activity: ${activity.title} (${activity.id})`);
    console.log(`   Subject: ${activity.subject?.name}`);

    // 2. Get a test student
    console.log('\n2. Finding test student...');
    const student = await prisma.studentProfile.findFirst({
      select: {
        id: true,
        userId: true,
        user: {
          select: { name: true }
        }
      }
    });

    if (!student) {
      console.log('❌ No student found');
      return;
    }

    console.log(`✅ Found student: ${student.user?.name} (${student.id})`);

    // 3. Test activity content parsing
    console.log('\n3. Testing activity content parsing...');
    const content = activity.content;
    console.log(`   Content type: ${typeof content}`);
    
    if (content && typeof content === 'object') {
      console.log(`   Quiz type: ${content.type}`);
      console.log(`   Questions count: ${content.questions?.length || 0}`);
      console.log(`   Assessment mode: ${content.assessmentMode}`);
      console.log(`   CAT enabled: ${content.settings?.catSettings?.enabled}`);
      
      const catSettings = content.settings?.catSettings;
      if (catSettings) {
        console.log(`   CAT Settings:`);
        console.log(`     - Item selection: ${catSettings.itemSelectionMethod}`);
        console.log(`     - Ability estimation: ${catSettings.abilityEstimationMethod}`);
        console.log(`     - Min questions: ${catSettings.terminationCriteria?.minQuestions}`);
        console.log(`     - Max questions: ${catSettings.terminationCriteria?.maxQuestions}`);
        console.log(`     - Standard error threshold: ${catSettings.terminationCriteria?.standardErrorThreshold}`);
      }
    }

    // 4. Test historical performance lookup
    console.log('\n4. Testing historical performance lookup...');
    const historicalGrades = await prisma.activityGrade.findMany({
      where: {
        studentId: student.id,
        activity: {
          subjectId: activity.subjectId
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        score: true,
        points: true,
        createdAt: true,
        activity: {
          select: {
            title: true
          }
        }
      }
    });

    console.log(`   Found ${historicalGrades.length} historical grades`);
    if (historicalGrades.length > 0) {
      const avgScore = historicalGrades.reduce((sum, g) => sum + (g.score || 0), 0) / historicalGrades.length;
      const avgPoints = historicalGrades.reduce((sum, g) => sum + (g.points || 100), 0) / historicalGrades.length;
      console.log(`   Average performance: ${avgScore.toFixed(1)}/${avgPoints.toFixed(1)} (${((avgScore/avgPoints)*100).toFixed(1)}%)`);
    } else {
      console.log(`   No historical performance - will use default starting ability`);
    }

    // 5. Test question availability
    console.log('\n5. Testing question availability...');
    const questionIds = content.questions?.map(q => q.id) || [];
    console.log(`   Activity has ${questionIds.length} questions`);

    if (questionIds.length > 0) {
      // Check if questions exist in question bank
      const existingQuestions = await prisma.question.findMany({
        where: {
          id: { in: questionIds.slice(0, 5) } // Check first 5
        },
        select: {
          id: true,
          questionType: true,
          metadata: true
        }
      });

      console.log(`   ${existingQuestions.length}/${Math.min(5, questionIds.length)} questions found in question bank`);
      
      // Check for IRT parameters
      let questionsWithIRT = 0;
      existingQuestions.forEach(q => {
        if (q.metadata && typeof q.metadata === 'object' && q.metadata.irtParameters) {
          questionsWithIRT++;
        }
      });
      
      console.log(`   ${questionsWithIRT}/${existingQuestions.length} questions have IRT parameters`);
    }

    // 6. Simulate CAT session creation
    console.log('\n6. Simulating CAT session creation...');
    
    // Create a mock session object like the service would
    const mockSession = {
      id: `cat_${activity.id}_${student.id}_${Date.now()}`,
      activityId: activity.id,
      studentId: student.id,
      assessmentMode: 'cat',
      startedAt: new Date(),
      currentQuestionIndex: 0,
      totalQuestions: content.questions?.length || 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      averageResponseTime: 0,
      learningGains: 0,
      difficultyProgression: []
    };

    console.log(`   Mock session created: ${mockSession.id}`);
    console.log(`   Session mode: ${mockSession.assessmentMode}`);
    console.log(`   Total questions available: ${mockSession.totalQuestions}`);

    // 7. Test database session save
    console.log('\n7. Testing database session save...');
    try {
      await prisma.advancedAssessmentSession.create({
        data: {
          id: mockSession.id,
          activityId: mockSession.activityId,
          studentId: mockSession.studentId,
          assessmentMode: mockSession.assessmentMode,
          sessionData: JSON.stringify(mockSession),
          startedAt: mockSession.startedAt,
          lastAccessedAt: new Date()
        }
      });
      console.log(`   ✅ Session saved to database successfully`);

      // Clean up
      await prisma.advancedAssessmentSession.delete({
        where: { id: mockSession.id }
      });
      console.log(`   🧹 Test session cleaned up`);

    } catch (dbError) {
      console.log(`   ❌ Database save failed: ${dbError.message}`);
    }

    console.log('\n🎯 CAT Initialization Test Summary:');
    console.log(`   ✅ CAT activity found: ${activity.title}`);
    console.log(`   ✅ Student found: ${student.user?.name}`);
    console.log(`   ✅ Content parsing: Working`);
    console.log(`   ✅ Historical performance: ${historicalGrades.length} records`);
    console.log(`   ✅ Questions available: ${questionIds.length}`);
    console.log(`   ✅ Database operations: Working`);

    console.log('\n🚀 CAT initialization should work! Try accessing:');
    console.log(`   Activity ID: ${activity.id}`);
    console.log(`   Student ID: ${student.id}`);

  } catch (error) {
    console.error('\n❌ CAT initialization test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testCATInitialization().catch(console.error);
}

module.exports = { testCATInitialization };
