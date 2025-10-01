const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database state...');
    
    // Check TopicMastery records
    const topicMasteryCount = await prisma.topicMastery.count();
    console.log(`📊 TopicMastery records: ${topicMasteryCount}`);
    
    if (topicMasteryCount > 0) {
      const sampleTopicMastery = await prisma.topicMastery.findFirst({
        include: {
          subject: true,
          student: true,
          topic: true
        }
      });
      console.log('📝 Sample TopicMastery record:', JSON.stringify(sampleTopicMastery, null, 2));
    }
    
    // Check AssessmentResult records
    const assessmentResultCount = await prisma.assessmentResult.count();
    console.log(`📊 AssessmentResult records: ${assessmentResultCount}`);
    
    // Check for AssessmentResults with topicMasteryId
    const assessmentResultsWithTopicMastery = await prisma.assessmentResult.count({
      where: {
        topicMasteryId: {
          not: null
        }
      }
    });
    console.log(`📊 AssessmentResults with topicMasteryId: ${assessmentResultsWithTopicMastery}`);
    
    // Check Students
    const studentCount = await prisma.user.count({
      where: {
        userType: 'STUDENT'
      }
    });
    console.log(`👥 Student records: ${studentCount}`);
    
    // Check Subject Topics
    const topicCount = await prisma.subjectTopic.count();
    console.log(`📚 Subject Topic records: ${topicCount}`);
    
    // Check Subjects
    const subjectCount = await prisma.subject.count();
    console.log(`📖 Subject records: ${subjectCount}`);
    
    // Check Fee Structures
    const feeStructureCount = await prisma.feeStructure.count();
    console.log(`💰 Fee Structure records: ${feeStructureCount}`);
    
    // Check Enrollment Fees
    const enrollmentFeeCount = await prisma.enrollmentFee.count();
    console.log(`💳 Enrollment Fee records: ${enrollmentFeeCount}`);
    
    // Check Student Enrollments
    const enrollmentCount = await prisma.studentEnrollment.count();
    console.log(`🎓 Student Enrollment records: ${enrollmentCount}`);
    
    console.log('✅ Database check completed');
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
