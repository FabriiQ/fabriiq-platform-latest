#!/usr/bin/env node

/**
 * Debug CAT Quiz Loading Issues
 * 
 * This script helps debug why CAT quizzes are still loading infinitely
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugCATLoading() {
  console.log('🔍 Debugging CAT Quiz Loading Issues...\n');

  try {
    // 1. Check if we have any CAT-enabled activities
    console.log('1. Checking for CAT-enabled activities...');
    const activities = await prisma.activity.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        title: true,
        content: true,
        purpose: true
      },
      take: 10
    });

    console.log(`Found ${activities.length} active activities`);

    let catActivities = [];
    for (const activity of activities) {
      try {
        const content = activity.content;
        if (content && typeof content === 'object') {
          const settings = content.settings || {};
          const catSettings = settings.catSettings;
          
          if (catSettings && catSettings.enabled) {
            catActivities.push({
              id: activity.id,
              title: activity.title,
              catSettings: catSettings
            });
          }
        }
      } catch (error) {
        console.warn(`Error parsing content for activity ${activity.id}:`, error.message);
      }
    }

    console.log(`Found ${catActivities.length} CAT-enabled activities:`);
    catActivities.forEach(act => {
      console.log(`  • ${act.title} (${act.id})`);
      console.log(`    CAT Settings:`, JSON.stringify(act.catSettings, null, 2));
    });

    // 2. Check for existing advanced sessions
    console.log('\n2. Checking existing advanced assessment sessions...');
    const sessions = await prisma.advancedAssessmentSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        activityId: true,
        studentId: true,
        assessmentMode: true,
        startedAt: true,
        completedAt: true,
        isActive: true,
        lastAccessedAt: true
      }
    });

    console.log(`Found ${sessions.length} advanced assessment sessions:`);
    sessions.forEach(session => {
      console.log(`  • ${session.id}`);
      console.log(`    Activity: ${session.activityId}`);
      console.log(`    Student: ${session.studentId}`);
      console.log(`    Mode: ${session.assessmentMode}`);
      console.log(`    Started: ${session.startedAt}`);
      console.log(`    Completed: ${session.completedAt || 'Not completed'}`);
      console.log(`    Active: ${session.isActive}`);
      console.log(`    Last Accessed: ${session.lastAccessedAt}`);
      console.log('');
    });

    // 3. Test CAT activity structure
    if (catActivities.length > 0) {
      console.log('\n3. Testing CAT activity structure...');
      const testActivity = catActivities[0];
      
      const fullActivity = await prisma.activity.findUnique({
        where: { id: testActivity.id },
        select: {
          id: true,
          title: true,
          content: true,
          subject: {
            select: { id: true, name: true }
          },
          class: {
            select: { id: true, name: true }
          }
        }
      });

      console.log('Full activity structure:');
      console.log('  ID:', fullActivity.id);
      console.log('  Title:', fullActivity.title);
      console.log('  Subject:', fullActivity.subject?.name);
      console.log('  Class:', fullActivity.class?.name);
      
      const content = fullActivity.content;
      if (content && typeof content === 'object') {
        console.log('  Content type:', content.type);
        console.log('  Questions count:', content.questions?.length || 0);
        console.log('  CAT Settings:', JSON.stringify(content.settings?.catSettings, null, 2));
        
        // Check if questions have proper structure
        if (content.questions && content.questions.length > 0) {
          console.log('  First question structure:');
          const firstQ = content.questions[0];
          console.log('    ID:', firstQ.id);
          console.log('    Points:', firstQ.points);
          console.log('    Order:', firstQ.order);
        }
      }
    }

    // 4. Check for students
    console.log('\n4. Checking for students...');
    const students = await prisma.studentProfile.findMany({
      take: 5,
      select: {
        id: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log(`Found ${students.length} students:`);
    students.forEach(student => {
      console.log(`  • ${student.user?.name || 'Unknown'} (${student.id})`);
    });

    // 5. Test tRPC procedure simulation
    if (catActivities.length > 0 && students.length > 0) {
      console.log('\n5. Simulating CAT session creation...');
      const testActivityId = catActivities[0].id;
      const testStudentId = students[0].id;
      
      console.log(`Testing with Activity: ${testActivityId}, Student: ${testStudentId}`);
      
      // This would normally be done through the service, but let's check the data
      console.log('✅ Data looks ready for CAT session creation');
    }

    // 6. Check question bank
    console.log('\n6. Checking question bank...');
    const questionCount = await prisma.question.count();
    console.log(`Found ${questionCount} questions in question bank`);

    if (questionCount > 0) {
      const sampleQuestions = await prisma.question.findMany({
        take: 3,
        select: {
          id: true,
          questionType: true,
          content: true
        }
      });

      console.log('Sample questions:');
      sampleQuestions.forEach(q => {
        console.log(`  • ${q.id} (${q.questionType})`);
      });
    }

    console.log('\n🎯 Debug Summary:');
    console.log(`  • CAT Activities: ${catActivities.length}`);
    console.log(`  • Advanced Sessions: ${sessions.length}`);
    console.log(`  • Students: ${students.length}`);
    console.log(`  • Questions: ${questionCount}`);

    if (catActivities.length === 0) {
      console.log('\n⚠️  Issue: No CAT-enabled activities found!');
      console.log('   Make sure activities have catSettings.enabled = true');
    }

    if (students.length === 0) {
      console.log('\n⚠️  Issue: No students found!');
      console.log('   Make sure student profiles exist');
    }

    if (questionCount === 0) {
      console.log('\n⚠️  Issue: No questions in question bank!');
      console.log('   CAT requires questions to select from');
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
if (require.main === module) {
  debugCATLoading().catch(console.error);
}

module.exports = { debugCATLoading };
