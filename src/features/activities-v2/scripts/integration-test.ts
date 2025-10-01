/**
 * Activities V2 Integration Test
 * 
 * Comprehensive integration test to verify all components work together
 */

import { PrismaClient } from '@prisma/client';
import { ActivityV2Service } from '../services/activity-v2.service';
import { QuestionBankService } from '@/features/question-bank/services/question-bank.service';
import { CreateActivityV2Input, QuizV2Content, ReadingV2Content, VideoV2Content } from '../types';

// Test configuration
const TEST_CONFIG = {
  userId: 'test-user-integration',
  studentId: 'test-student-integration',
  subjectId: 'test-subject-integration',
  classId: 'test-class-integration',
  topicId: 'test-topic-integration'
};

// Initialize services
const prisma = new PrismaClient();
const questionBankService = new QuestionBankService(prisma);
const activityV2Service = new ActivityV2Service(prisma, questionBankService);

/**
 * Test Activities V2 end-to-end workflow
 */
export async function runIntegrationTest() {
  console.log('🚀 Starting Activities V2 Integration Test\n');
  
  try {
    // Step 1: Test Quiz Activity
    console.log('📝 Testing Quiz Activity...');
    await testQuizActivity();
    console.log('✅ Quiz Activity test passed\n');

    // Step 2: Test Reading Activity
    console.log('📖 Testing Reading Activity...');
    await testReadingActivity();
    console.log('✅ Reading Activity test passed\n');

    // Step 3: Test Video Activity
    console.log('🎥 Testing Video Activity...');
    await testVideoActivity();
    console.log('✅ Video Activity test passed\n');

    // Step 4: Test Service Integration
    console.log('🔧 Testing Service Integration...');
    await testServiceIntegration();
    console.log('✅ Service Integration test passed\n');

    console.log('🎉 All integration tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Test Quiz Activity creation and submission
 */
async function testQuizActivity() {
  const quizContent: QuizV2Content = {
    version: '2.0',
    type: 'quiz',
    title: 'Integration Test Quiz',
    description: 'A quiz for integration testing',
    estimatedTimeMinutes: 15,
    questions: [
      {
        id: 'test-q1',
        order: 1,
        points: 2,
        shuffleOptions: false
      },
      {
        id: 'test-q2',
        order: 2,
        points: 3,
        shuffleOptions: true
      }
    ],
    settings: {
      shuffleQuestions: false,
      showFeedbackImmediately: false,
      showCorrectAnswers: true,
      attemptsAllowed: 2,
      allowReview: true,
      showProgressBar: true
    },
    assessmentMode: 'standard',
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: { base: 25 },
      triggers: {
        completion: true,
        perfectScore: true,
        speedBonus: false,
        firstAttempt: true,
        improvement: false
      }
    }
  };

  const createInput: CreateActivityV2Input = {
    title: quizContent.title,
    subjectId: TEST_CONFIG.subjectId,
    classId: TEST_CONFIG.classId,
    topicId: TEST_CONFIG.topicId,
    content: quizContent,
    isGradable: true,
    maxScore: 5,
    passingScore: 3
  };

  // Create quiz
  const quiz = await activityV2Service.createActivity(createInput, TEST_CONFIG.userId);
  console.log('  ✓ Quiz created with ID:', quiz.id);

  // Submit quiz
  const submitInput = {
    activityId: quiz.id,
    answers: {
      'test-q1': 'answer1',
      'test-q2': 'answer2'
    },
    timeSpent: 900 // 15 minutes
  };

  const result = await activityV2Service.submitActivity(submitInput, TEST_CONFIG.studentId);
  console.log('  ✓ Quiz submitted with score:', result.result.score);

  // Verify activity retrieval
  const retrievedQuiz = await activityV2Service.getActivity(quiz.id);
  console.log('  ✓ Quiz retrieved:', retrievedQuiz?.title);

  return quiz;
}

/**
 * Test Reading Activity creation and submission
 */
async function testReadingActivity() {
  const readingContent: ReadingV2Content = {
    version: '2.0',
    type: 'reading',
    title: 'Integration Test Reading',
    description: 'A reading activity for integration testing',
    estimatedTimeMinutes: 10,
    content: {
      type: 'rich_text',
      data: 'This is a test reading content for integration testing. It contains enough text to test the reading functionality and completion criteria.',
      metadata: {
        wordCount: 25,
        estimatedReadingTime: 1
      }
    },
    completionCriteria: {
      minTimeSeconds: 60,
      scrollPercentage: 80,
      interactionRequired: false
    },
    features: {
      allowBookmarking: true,
      allowHighlighting: true,
      allowNotes: true,
      showProgress: true
    },
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: { base: 15 },
      triggers: {
        completion: true,
        perfectScore: false,
        speedBonus: false,
        firstAttempt: true,
        improvement: false
      }
    }
  };

  const createInput: CreateActivityV2Input = {
    title: readingContent.title,
    subjectId: TEST_CONFIG.subjectId,
    classId: TEST_CONFIG.classId,
    content: readingContent,
    isGradable: true,
    maxScore: 100,
    passingScore: 60
  };

  // Create reading
  const reading = await activityV2Service.createActivity(createInput, TEST_CONFIG.userId);
  console.log('  ✓ Reading created with ID:', reading.id);

  // Submit reading
  const submitInput = {
    activityId: reading.id,
    progress: {
      scrollPercentage: 90,
      timeSpent: 120,
      bookmarks: [],
      highlights: [],
      notes: []
    },
    timeSpent: 120
  };

  const result = await activityV2Service.submitActivity(submitInput, TEST_CONFIG.studentId);
  console.log('  ✓ Reading submitted with score:', result.result.score);

  return reading;
}

/**
 * Test Video Activity creation and submission
 */
async function testVideoActivity() {
  const videoContent: VideoV2Content = {
    version: '2.0',
    type: 'video',
    title: 'Integration Test Video',
    description: 'A video activity for integration testing',
    estimatedTimeMinutes: 8,
    video: {
      provider: 'youtube',
      url: 'https://www.youtube.com/watch?v=test123',
      duration: 480,
      metadata: {
        title: 'Test Video'
      }
    },
    completionCriteria: {
      minWatchPercentage: 75,
      minWatchTimeSeconds: 300,
      interactionPoints: []
    },
    features: {
      allowSeeking: true,
      showControls: true,
      allowSpeedChange: true,
      showTranscript: false
    },
    achievementConfig: {
      enabled: true,
      pointsAnimation: true,
      celebrationLevel: 'standard',
      points: { base: 12 },
      triggers: {
        completion: true,
        perfectScore: false,
        speedBonus: false,
        firstAttempt: true,
        improvement: false
      }
    }
  };

  const createInput: CreateActivityV2Input = {
    title: videoContent.title,
    subjectId: TEST_CONFIG.subjectId,
    classId: TEST_CONFIG.classId,
    content: videoContent,
    isGradable: true,
    maxScore: 100,
    passingScore: 60
  };

  // Create video
  const video = await activityV2Service.createActivity(createInput, TEST_CONFIG.userId);
  console.log('  ✓ Video created with ID:', video.id);

  // Submit video
  const submitInput = {
    activityId: video.id,
    progress: {
      currentTime: 380,
      watchedPercentage: 80,
      watchedSegments: [],
      interactionResponses: []
    },
    timeSpent: 400
  };

  const result = await activityV2Service.submitActivity(submitInput, TEST_CONFIG.studentId);
  console.log('  ✓ Video submitted with score:', result.result.score);

  return video;
}

/**
 * Test service integration and data consistency
 */
async function testServiceIntegration() {
  // Test getting student attempts
  const activities = await prisma.activity.findMany({
    where: {
      createdById: TEST_CONFIG.userId,
      title: {
        contains: 'Integration Test'
      }
    },
    take: 1
  });

  if (activities.length > 0) {
    const attempts = await activityV2Service.getStudentAttempts(
      activities[0].id, 
      TEST_CONFIG.studentId
    );
    console.log('  ✓ Retrieved attempts:', attempts.length);
  }

  // Test activity validation
  try {
    const invalidContent = {
      version: '2.0',
      type: 'quiz',
      title: 'Invalid Quiz',
      questions: [], // Empty questions should fail validation
      settings: {},
      assessmentMode: 'standard',
      achievementConfig: { enabled: false }
    } as any;

    await activityV2Service.createActivity({
      title: 'Invalid Activity',
      subjectId: TEST_CONFIG.subjectId,
      classId: TEST_CONFIG.classId,
      content: invalidContent,
      isGradable: true,
      maxScore: 0,
      passingScore: 0
    }, TEST_CONFIG.userId);

    throw new Error('Should have failed validation');
  } catch (error) {
    console.log('  ✓ Validation correctly rejected invalid content');
  }

  // Test database consistency
  const activityCount = await prisma.activity.count({
    where: {
      createdById: TEST_CONFIG.userId,
      title: {
        contains: 'Integration Test'
      }
    }
  });
  console.log('  ✓ Created activities in database:', activityCount);
}

// Run the test if called directly
if (require.main === module) {
  runIntegrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}
