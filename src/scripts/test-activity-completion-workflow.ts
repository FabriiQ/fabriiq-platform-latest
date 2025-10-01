/**
 * Test script to validate the complete activity completion workflow
 * 
 * This script tests:
 * 1. Activity submission and grading
 * 2. Achievement processing and display
 * 3. Learning journey event creation
 * 4. Time investment tracking
 * 5. Gradebook integration
 * 6. Database integrity
 */

import { PrismaClient } from '@prisma/client';
import { ActivityV2Service } from '@/features/activities-v2/services/activity-v2.service';
import { QuestionBankService } from '@/features/question-bank/services/question-bank.service';
import { UnifiedAchievementService } from '@/features/activties/services/unified-achievement.service';
import { JourneyEventService } from '@/server/api/services/journey-event.service';
import { LearningTimeService } from '@/server/api/services/learning-time.service';

const prisma = new PrismaClient();

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  data?: any;
}

class ActivityCompletionWorkflowTester {
  private results: TestResult[] = [];
  private testStudentId: string = '';
  private testActivityId: string = '';
  private testClassId: string = '';

  async runTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Activity Completion Workflow Tests...\n');

    try {
      // Setup test data
      await this.setupTestData();

      // Test Activities V2 submission
      await this.testActivitiesV2Submission();

      // Test achievement processing
      await this.testAchievementProcessing();

      // Test learning journey creation
      await this.testLearningJourneyCreation();

      // Test time investment tracking
      await this.testTimeInvestmentTracking();

      // Test gradebook integration
      await this.testGradebookIntegration();

      // Test database integrity
      await this.testDatabaseIntegrity();

      // Cleanup test data
      await this.cleanupTestData();

    } catch (error) {
      this.addResult('Test Execution', false, `Test execution failed: ${error}`);
    }

    return this.results;
  }

  private async setupTestData(): Promise<void> {
    try {
      // Create test student
      const testStudent = await prisma.studentProfile.create({
        data: {
          id: `test-student-${Date.now()}`,
          userId: `test-user-${Date.now()}`,
          studentId: `STU${Date.now()}`,
          firstName: 'Test',
          lastName: 'Student',
          email: `test-student-${Date.now()}@example.com`,
          status: 'ACTIVE'
        }
      });
      this.testStudentId = testStudent.id;

      // Create test class
      const testClass = await prisma.class.create({
        data: {
          id: `test-class-${Date.now()}`,
          name: 'Test Class',
          description: 'Test class for workflow testing',
          institutionId: 'test-institution',
          status: 'ACTIVE'
        }
      });
      this.testClassId = testClass.id;

      // Create test Activities V2 activity
      const testActivity = await prisma.activity.create({
        data: {
          id: `test-activity-${Date.now()}`,
          title: 'Test Quiz Activity',
          description: 'Test quiz for workflow testing',
          classId: this.testClassId,
          maxScore: 100,
          activityType: 'quiz',
          content: {
            version: '2.0',
            type: 'quiz',
            title: 'Test Quiz',
            description: 'Test quiz activity',
            estimatedTimeMinutes: 30,
            achievementConfig: {
              basePoints: 10,
              perfectScoreBonus: 5,
              speedBonus: 3,
              firstAttemptBonus: 2
            },
            questions: [
              {
                id: 'q1',
                type: 'MULTIPLE_CHOICE',
                content: {
                  question: 'What is 2 + 2?',
                  options: ['3', '4', '5', '6'],
                  correctAnswer: 1
                },
                points: 50
              },
              {
                id: 'q2',
                type: 'MULTIPLE_CHOICE',
                content: {
                  question: 'What is the capital of France?',
                  options: ['London', 'Berlin', 'Paris', 'Madrid'],
                  correctAnswer: 2
                },
                points: 50
              }
            ]
          },
          status: 'ACTIVE'
        }
      });
      this.testActivityId = testActivity.id;

      this.addResult('Setup Test Data', true, 'Test data created successfully', {
        studentId: this.testStudentId,
        classId: this.testClassId,
        activityId: this.testActivityId
      });

    } catch (error) {
      this.addResult('Setup Test Data', false, `Failed to setup test data: ${error}`);
      throw error;
    }
  }

  private async testActivitiesV2Submission(): Promise<void> {
    try {
      const activityV2Service = new ActivityV2Service(
        prisma,
        new QuestionBankService(prisma)
      );

      const submissionInput = {
        activityId: this.testActivityId,
        answers: {
          'q1': 1, // Correct answer
          'q2': 2  // Correct answer
        },
        timeSpent: 1800, // 30 minutes in seconds
        questionTimings: {
          'q1': 900,
          'q2': 900
        },
        analytics: {
          totalQuestions: 2,
          answeredQuestions: 2,
          averageTimePerQuestion: 900,
          pauseCount: 0,
          bloomsDistribution: { 'remember': 2 },
          difficultyDistribution: { 'easy': 2 }
        }
      };

      const result = await activityV2Service.submitActivity(submissionInput, this.testStudentId);

      // Verify the result
      if (result.score === 100 && result.passed && result.achievements.length > 0) {
        this.addResult('Activities V2 Submission', true, 'Activity submitted and graded successfully', {
          score: result.score,
          passed: result.passed,
          achievements: result.achievements.length
        });
      } else {
        this.addResult('Activities V2 Submission', false, 'Activity submission result is incorrect', result);
      }

    } catch (error) {
      this.addResult('Activities V2 Submission', false, `Activity submission failed: ${error}`);
    }
  }

  private async testAchievementProcessing(): Promise<void> {
    try {
      // Check if achievements were created in the database
      const achievements = await prisma.studentAchievement.findMany({
        where: {
          studentId: this.testStudentId
        }
      });

      if (achievements.length > 0) {
        this.addResult('Achievement Processing', true, `${achievements.length} achievements created`, {
          achievements: achievements.map(a => ({ title: a.title, unlocked: a.unlocked }))
        });
      } else {
        this.addResult('Achievement Processing', false, 'No achievements were created');
      }

    } catch (error) {
      this.addResult('Achievement Processing', false, `Achievement processing test failed: ${error}`);
    }
  }

  private async testLearningJourneyCreation(): Promise<void> {
    try {
      // Check if journey events were created
      const journeyEvents = await prisma.journeyEvent.findMany({
        where: {
          studentId: this.testStudentId,
          type: 'activity'
        }
      });

      if (journeyEvents.length > 0) {
        this.addResult('Learning Journey Creation', true, `${journeyEvents.length} journey events created`, {
          events: journeyEvents.map(e => ({ title: e.title, date: e.date }))
        });
      } else {
        this.addResult('Learning Journey Creation', false, 'No journey events were created');
      }

    } catch (error) {
      this.addResult('Learning Journey Creation', false, `Learning journey test failed: ${error}`);
    }
  }

  private async testTimeInvestmentTracking(): Promise<void> {
    try {
      // Check if learning time records were created
      const timeRecords = await prisma.learningTimeRecord.findMany({
        where: {
          studentId: this.testStudentId,
          activityId: this.testActivityId
        }
      });

      if (timeRecords.length > 0) {
        const totalTime = timeRecords.reduce((sum, record) => sum + record.timeSpentMinutes, 0);
        this.addResult('Time Investment Tracking', true, `Time records created: ${totalTime} minutes`, {
          records: timeRecords.length,
          totalTime
        });
      } else {
        this.addResult('Time Investment Tracking', false, 'No time records were created');
      }

    } catch (error) {
      this.addResult('Time Investment Tracking', false, `Time investment test failed: ${error}`);
    }
  }

  private async testGradebookIntegration(): Promise<void> {
    try {
      // Check if activity grade was created
      const activityGrade = await prisma.activityGrade.findFirst({
        where: {
          studentId: this.testStudentId,
          activityId: this.testActivityId
        }
      });

      if (activityGrade && activityGrade.score === 100) {
        this.addResult('Gradebook Integration', true, 'Activity grade saved successfully', {
          score: activityGrade.score,
          status: activityGrade.status
        });
      } else {
        this.addResult('Gradebook Integration', false, 'Activity grade not saved correctly', activityGrade);
      }

    } catch (error) {
      this.addResult('Gradebook Integration', false, `Gradebook integration test failed: ${error}`);
    }
  }

  private async testDatabaseIntegrity(): Promise<void> {
    try {
      // Check for any orphaned records or data inconsistencies
      const checks = await Promise.all([
        // Check activity grade exists
        prisma.activityGrade.count({
          where: { studentId: this.testStudentId, activityId: this.testActivityId }
        }),
        // Check learning time record exists
        prisma.learningTimeRecord.count({
          where: { studentId: this.testStudentId, activityId: this.testActivityId }
        }),
        // Check journey event exists
        prisma.journeyEvent.count({
          where: { studentId: this.testStudentId, type: 'activity' }
        })
      ]);

      const [gradeCount, timeCount, journeyCount] = checks;
      
      if (gradeCount > 0 && timeCount > 0 && journeyCount > 0) {
        this.addResult('Database Integrity', true, 'All related records exist', {
          grades: gradeCount,
          timeRecords: timeCount,
          journeyEvents: journeyCount
        });
      } else {
        this.addResult('Database Integrity', false, 'Missing related records', {
          grades: gradeCount,
          timeRecords: timeCount,
          journeyEvents: journeyCount
        });
      }

    } catch (error) {
      this.addResult('Database Integrity', false, `Database integrity test failed: ${error}`);
    }
  }

  private async cleanupTestData(): Promise<void> {
    try {
      // Clean up test data in reverse order of creation
      await prisma.learningTimeRecord.deleteMany({
        where: { studentId: this.testStudentId }
      });
      
      await prisma.journeyEvent.deleteMany({
        where: { studentId: this.testStudentId }
      });
      
      await prisma.studentAchievement.deleteMany({
        where: { studentId: this.testStudentId }
      });
      
      await prisma.activityGrade.deleteMany({
        where: { studentId: this.testStudentId }
      });
      
      await prisma.activity.delete({
        where: { id: this.testActivityId }
      });
      
      await prisma.class.delete({
        where: { id: this.testClassId }
      });
      
      await prisma.studentProfile.delete({
        where: { id: this.testStudentId }
      });

      this.addResult('Cleanup Test Data', true, 'Test data cleaned up successfully');

    } catch (error) {
      this.addResult('Cleanup Test Data', false, `Failed to cleanup test data: ${error}`);
    }
  }

  private addResult(step: string, success: boolean, message: string, data?: any): void {
    this.results.push({ step, success, message, data });
    const status = success ? '✅' : '❌';
    console.log(`${status} ${step}: ${message}`);
    if (data && Object.keys(data).length > 0) {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  }
}

// Export for use in other scripts
export { ActivityCompletionWorkflowTester };

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new ActivityCompletionWorkflowTester();
  tester.runTests()
    .then((results) => {
      console.log('\n📊 Test Results Summary:');
      const passed = results.filter(r => r.success).length;
      const total = results.length;
      console.log(`${passed}/${total} tests passed`);
      
      if (passed === total) {
        console.log('🎉 All tests passed! Activity completion workflow is working correctly.');
      } else {
        console.log('⚠️  Some tests failed. Please review the issues above.');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
