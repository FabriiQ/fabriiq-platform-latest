/**
 * Test script to verify time tracking functionality
 * 
 * This script can be run to verify that:
 * 1. Time tracking data is being saved to the database
 * 2. ActivityGrade records are being updated with time fields
 * 3. LearningTimeRecord entries are being created
 * 4. Achievements are being awarded
 * 
 * Usage: Run this via Node.js or adapt it to a test framework
 */

import { PrismaClient } from '@prisma/client';
import { LearningTimeService } from '../server/api/services/learning-time.service';

const prisma = new PrismaClient();
const learningTimeService = new LearningTimeService({ prisma });

async function testTimeTracking() {
  console.log('🧪 Testing Time Tracking Functionality...\n');

  try {
    // Test data - replace with actual IDs from your database
    const testStudentId = 'test-student-id'; // Replace with a real student ID
    const testActivityId = 'test-activity-id'; // Replace with a real activity ID
    const testTimeSpent = 15; // 15 minutes

    console.log('📊 Test Parameters:');
    console.log(`Student ID: ${testStudentId}`);
    console.log(`Activity ID: ${testActivityId}`);
    console.log(`Time Spent: ${testTimeSpent} minutes\n`);

    // Test 1: Record time spent
    console.log('1️⃣ Testing time recording...');
    await learningTimeService.recordTimeSpent({
      studentId: testStudentId,
      activityId: testActivityId,
      timeSpentMinutes: testTimeSpent,
      startedAt: new Date(Date.now() - testTimeSpent * 60 * 1000),
      completedAt: new Date(),
    });
    console.log('✅ Time recording completed successfully\n');

    // Test 2: Verify LearningTimeRecord was created
    console.log('2️⃣ Checking LearningTimeRecord...');
    const timeRecords = await prisma.learningTimeRecord.findMany({
      where: {
        studentId: testStudentId,
        activityId: testActivityId,
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (timeRecords.length > 0) {
      console.log('✅ LearningTimeRecord found:');
      console.log(`   - Time spent: ${timeRecords[0].timeSpentMinutes} minutes`);
      console.log(`   - Started at: ${timeRecords[0].startedAt}`);
      console.log(`   - Completed at: ${timeRecords[0].completedAt}\n`);
    } else {
      console.log('❌ No LearningTimeRecord found\n');
    }

    // Test 3: Verify ActivityGrade was updated
    console.log('3️⃣ Checking ActivityGrade...');
    const activityGrade = await prisma.activityGrade.findUnique({
      where: {
        activityId_studentId: {
          activityId: testActivityId,
          studentId: testStudentId,
        },
      },
    });

    if (activityGrade) {
      console.log('✅ ActivityGrade found:');
      console.log(`   - Time spent: ${activityGrade.timeSpentMinutes || 'Not set'} minutes`);
      console.log(`   - Learning started at: ${activityGrade.learningStartedAt || 'Not set'}`);
      console.log(`   - Learning completed at: ${activityGrade.learningCompletedAt || 'Not set'}`);
      console.log(`   - Content timeSpent: ${(activityGrade.content as any)?.timeSpent || 'Not set'}\n`);
    } else {
      console.log('❌ No ActivityGrade found\n');
    }

    // Test 4: Check learning time statistics
    console.log('4️⃣ Testing learning time statistics...');
    const stats = await learningTimeService.getLearningTimeStats({
      studentId: testStudentId,
    });
    console.log('✅ Learning time stats:');
    console.log(`   - Total time spent: ${stats.totalTimeSpentMinutes} minutes`);
    console.log(`   - Total activities completed: ${stats.totalActivitiesCompleted}`);
    console.log(`   - Average time per activity: ${stats.averageTimePerActivity} minutes`);
    console.log(`   - Efficiency score: ${stats.efficiencyScore}%\n`);

    // Test 5: Check for achievements
    console.log('5️⃣ Checking for achievements...');
    const achievements = await prisma.studentAchievement.findMany({
      where: {
        studentId: testStudentId,
        unlockedAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (achievements.length > 0) {
      console.log('✅ Recent achievements found:');
      achievements.forEach((achievement, index) => {
        console.log(`   ${index + 1}. ${achievement.title}: ${achievement.description}`);
      });
      console.log();
    } else {
      console.log('ℹ️ No recent achievements found (this is normal for repeated tests)\n');
    }

    console.log('🎉 Time tracking test completed successfully!');

  } catch (error) {
    console.error('❌ Time tracking test failed:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      console.log('\n💡 Tip: Make sure to replace testStudentId and testActivityId with real IDs from your database');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Uncomment the line below to run the test
// testTimeTracking();

export { testTimeTracking };