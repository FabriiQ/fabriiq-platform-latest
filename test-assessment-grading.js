const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAssessmentGrading() {
  console.log('🧪 Testing assessment grading functionality...');

  try {
    // Get a sample assessment with a topic
    const assessment = await prisma.assessment.findFirst({
      where: {
        topicId: {
          not: null
        }
      },
      include: {
        topic: true,
        class: true
      }
    });

    if (!assessment) {
      console.log('⚠️ No assessment with topic found. Creating a test assessment...');
      
      // Get a sample class and topic
      const sampleClass = await prisma.class.findFirst();
      const sampleTopic = await prisma.subjectTopic.findFirst();
      
      if (!sampleClass || !sampleTopic) {
        console.log('❌ No class or topic found for creating test assessment');
        return;
      }

      // Create a test assessment
      const testAssessment = await prisma.assessment.create({
        data: {
          title: 'Test Assessment for TopicMastery',
          institutionId: sampleClass.institutionId,
          classId: sampleClass.id,
          subjectId: sampleTopic.subjectId,
          topicId: sampleTopic.id,
          termId: sampleClass.termId,
          maxScore: 100,
          passingScore: 60,
          createdById: 'system-test'
        }
      });
      
      console.log(`✅ Created test assessment: ${testAssessment.id}`);
      
      // Use the created assessment for testing
      const createdAssessment = await prisma.assessment.findUnique({
        where: { id: testAssessment.id },
        include: {
          topic: true,
          class: true
        }
      });
      
      await testGradingWithAssessment(createdAssessment);
    } else {
      console.log(`📝 Found assessment: ${assessment.title} (ID: ${assessment.id})`);
      await testGradingWithAssessment(assessment);
    }

  } catch (error) {
    console.error('❌ Error in assessment grading test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testGradingWithAssessment(assessment) {
  console.log(`\n🎯 Testing grading with assessment: ${assessment.title}`);
  console.log(`   - Topic: ${assessment.topic?.title || 'No topic'}`);
  console.log(`   - Topic ID: ${assessment.topicId}`);

  // Get a student from the same class
  const studentEnrollment = await prisma.studentEnrollment.findFirst({
    where: {
      classId: assessment.classId
    },
    include: {
      student: {
        include: {
          user: true
        }
      }
    }
  });

  if (!studentEnrollment) {
    console.log('⚠️ No student enrollment found for this class');
    return;
  }

  console.log(`👤 Testing with student: ${studentEnrollment.student.user.name} (ID: ${studentEnrollment.student.userId})`);

  // Check if TopicMastery exists for this student and topic
  const existingTopicMastery = await prisma.topicMastery.findFirst({
    where: {
      studentId: studentEnrollment.student.userId,
      topicId: assessment.topicId
    }
  });

  console.log(`🧠 TopicMastery exists: ${existingTopicMastery ? 'Yes' : 'No'}`);
  if (existingTopicMastery) {
    console.log(`   - TopicMastery ID: ${existingTopicMastery.id}`);
    console.log(`   - Overall Mastery: ${existingTopicMastery.overallMastery}%`);
  }

  // Create a test submission
  console.log('\n📤 Creating test submission...');
  const submission = await prisma.assessmentSubmission.create({
    data: {
      assessmentId: assessment.id,
      studentId: studentEnrollment.student.id,
      status: 'SUBMITTED',
      score: 85,
      content: JSON.stringify({
        answers: [
          { questionId: 'q1', answer: 'Test answer 1', score: 20 },
          { questionId: 'q2', answer: 'Test answer 2', score: 25 },
          { questionId: 'q3', answer: 'Test answer 3', score: 40 }
        ]
      }),
      submittedAt: new Date()
    }
  });

  console.log(`✅ Created submission: ${submission.id}`);

  // Test the assessment service grading functionality
  console.log('\n⚡ Testing assessment result creation...');
  
  try {
    // Simulate what the assessment service does
    const assessmentResult = await prisma.assessmentResult.create({
      data: {
        studentId: studentEnrollment.student.userId, // This should match TopicMastery.studentId
        assessmentId: assessment.id,
        score: 85,
        maxScore: 100,
        passingScore: 60,
        bloomsLevelScores: JSON.stringify({
          REMEMBER: { score: 15, maxScore: 20 },
          UNDERSTAND: { score: 20, maxScore: 25 },
          APPLY: { score: 35, maxScore: 40 }
        }),
        topicMasteryId: existingTopicMastery?.id, // This should now work
        submittedAt: new Date()
      }
    });

    console.log(`🎉 SUCCESS! Created AssessmentResult: ${assessmentResult.id}`);
    console.log(`   - Student ID: ${assessmentResult.studentId}`);
    console.log(`   - Assessment ID: ${assessmentResult.assessmentId}`);
    console.log(`   - Topic Mastery ID: ${assessmentResult.topicMasteryId}`);
    console.log(`   - Score: ${assessmentResult.score}/${assessmentResult.maxScore}`);

    // Verify the foreign key relationship works
    const resultWithRelations = await prisma.assessmentResult.findUnique({
      where: { id: assessmentResult.id },
      include: {
        topicMastery: true,
        student: true,
        assessment: true
      }
    });

    if (resultWithRelations.topicMastery) {
      console.log(`✅ Foreign key relationship verified - TopicMastery linked successfully`);
      console.log(`   - TopicMastery Overall Score: ${resultWithRelations.topicMastery.overallMastery}%`);
    } else {
      console.log(`⚠️ No TopicMastery relationship found`);
    }

  } catch (error) {
    console.error('❌ Error creating AssessmentResult:', error.message);
    
    if (error.message.includes('Foreign key constraint violated')) {
      console.log('\n🔍 Debugging foreign key constraint...');
      console.log(`   - Student ID being used: ${studentEnrollment.student.userId}`);
      console.log(`   - TopicMastery ID being used: ${existingTopicMastery?.id || 'null'}`);
      
      // Check if the TopicMastery actually exists
      if (existingTopicMastery) {
        const tmExists = await prisma.topicMastery.findUnique({
          where: { id: existingTopicMastery.id }
        });
        console.log(`   - TopicMastery exists in DB: ${tmExists ? 'Yes' : 'No'}`);
      }
    }
  }
}

// Test the new assessment service method
async function testAssessmentServiceMethod() {
  console.log('\n🔧 Testing updated assessment service method...');
  
  try {
    // Get a sample assessment and student
    const assessment = await prisma.assessment.findFirst({
      where: { topicId: { not: null } }
    });
    
    const studentProfile = await prisma.studentProfile.findFirst();
    
    if (!assessment || !studentProfile) {
      console.log('⚠️ Missing assessment or student for service test');
      return;
    }

    console.log(`Testing with assessment ${assessment.id} and student ${studentProfile.userId}`);

    // Check if TopicMastery exists
    let topicMastery = await prisma.topicMastery.findFirst({
      where: {
        studentId: studentProfile.userId,
        topicId: assessment.topicId
      }
    });

    console.log(`TopicMastery exists before: ${topicMastery ? 'Yes' : 'No'}`);

    // If no TopicMastery exists, the service should create one
    if (!topicMastery) {
      console.log('🔨 Creating TopicMastery as the service would...');
      
      const topic = await prisma.subjectTopic.findUnique({
        where: { id: assessment.topicId },
        select: { id: true, subjectId: true }
      });

      if (topic) {
        topicMastery = await prisma.topicMastery.create({
          data: {
            studentId: studentProfile.userId,
            topicId: assessment.topicId,
            subjectId: topic.subjectId,
            rememberLevel: 0,
            understandLevel: 0,
            applyLevel: 0,
            analyzeLevel: 0,
            evaluateLevel: 0,
            createLevel: 0,
            overallMastery: 0,
            lastAssessmentDate: new Date()
          }
        });
        console.log(`✅ Created new TopicMastery: ${topicMastery.id}`);
      }
    }

    // Now test creating AssessmentResult
    const assessmentResult = await prisma.assessmentResult.create({
      data: {
        studentId: studentProfile.userId,
        assessmentId: assessment.id,
        score: 75,
        maxScore: 100,
        passingScore: 60,
        topicMasteryId: topicMastery.id,
        submittedAt: new Date()
      }
    });

    console.log(`🎉 SUCCESS! Assessment service method simulation worked!`);
    console.log(`   - AssessmentResult ID: ${assessmentResult.id}`);
    console.log(`   - TopicMastery ID: ${assessmentResult.topicMasteryId}`);

  } catch (error) {
    console.error('❌ Error in service method test:', error.message);
  }
}

async function main() {
  await testAssessmentGrading();
  await testAssessmentServiceMethod();
}

main();
