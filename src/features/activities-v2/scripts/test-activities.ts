/**
 * Activities V2 Test Script
 * 
 * Script to test Activities V2 functionality with sample data
 */

import { ActivityV2Service } from '../services/activity-v2.service';
import { CreateActivityV2Input, QuizV2Content, ReadingV2Content, VideoV2Content } from '../types';

// Sample test data
const sampleQuizContent: QuizV2Content = {
  version: '2.0',
  type: 'quiz',
  title: 'Sample Math Quiz',
  description: 'A sample quiz to test basic math concepts',
  estimatedTimeMinutes: 20,
  questions: [
    {
      id: 'q1',
      order: 1,
      points: 2,
      shuffleOptions: false
    },
    {
      id: 'q2',
      order: 2,
      points: 3,
      shuffleOptions: true
    },
    {
      id: 'q3',
      order: 3,
      points: 2,
      shuffleOptions: false
    }
  ],
  settings: {
    shuffleQuestions: true,
    showFeedbackImmediately: false,
    showCorrectAnswers: true,
    timeLimitMinutes: 25,
    attemptsAllowed: 2,
    passingScore: 70,
    allowReview: true,
    showProgressBar: true
  },
  assessmentMode: 'standard',
  achievementConfig: {
    enabled: true,
    pointsAnimation: true,
    celebrationLevel: 'standard',
    points: {
      base: 30,
      perfectScore: 10,
      speedBonus: 5,
      firstAttempt: 5
    },
    triggers: {
      completion: true,
      perfectScore: true,
      speedBonus: true,
      firstAttempt: true,
      improvement: false
    }
  }
};

const sampleReadingContent: ReadingV2Content = {
  version: '2.0',
  type: 'reading',
  title: 'Introduction to Photosynthesis',
  description: 'Learn about the process of photosynthesis in plants',
  estimatedTimeMinutes: 15,
  content: {
    type: 'rich_text',
    data: `# Photosynthesis: The Foundation of Life

Photosynthesis is one of the most important biological processes on Earth. It is the process by which plants, algae, and some bacteria convert light energy from the sun into chemical energy stored in glucose molecules.

## The Process

The basic equation for photosynthesis is:
6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂

This process occurs in two main stages:

### Light-Dependent Reactions
These reactions occur in the thylakoids of chloroplasts and require direct sunlight. During this stage:
- Chlorophyll absorbs light energy
- Water molecules are split, releasing oxygen
- ATP and NADPH are produced

### Light-Independent Reactions (Calvin Cycle)
These reactions occur in the stroma of chloroplasts and use the ATP and NADPH from the first stage:
- Carbon dioxide is fixed into organic molecules
- Glucose is produced
- The cycle regenerates to continue the process

## Importance

Photosynthesis is crucial because it:
- Produces oxygen that most life forms need to survive
- Forms the base of most food chains
- Removes carbon dioxide from the atmosphere
- Stores energy that can be used by other organisms

Understanding photosynthesis helps us appreciate the interconnectedness of life on Earth and the importance of protecting plant life.`,
    metadata: {
      wordCount: 185,
      estimatedReadingTime: 1
    }
  },
  completionCriteria: {
    minTimeSeconds: 300, // 5 minutes
    scrollPercentage: 85,
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
    points: {
      base: 20,
      speedBonus: 5,
      firstAttempt: 3
    },
    triggers: {
      completion: true,
      perfectScore: false,
      speedBonus: false,
      firstAttempt: true,
      improvement: false
    }
  }
};

const sampleVideoContent: VideoV2Content = {
  version: '2.0',
  type: 'video',
  title: 'Introduction to Algebra',
  description: 'Basic concepts of algebra explained with examples',
  estimatedTimeMinutes: 12,
  video: {
    provider: 'youtube',
    url: 'https://www.youtube.com/watch?v=NybHckSEQBI',
    duration: 720, // 12 minutes
    metadata: {
      title: 'Algebra Basics: What Is Algebra? - Math Antics',
      thumbnail: 'https://img.youtube.com/vi/NybHckSEQBI/maxresdefault.jpg'
    }
  },
  completionCriteria: {
    minWatchPercentage: 80,
    minWatchTimeSeconds: 600, // 10 minutes
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
    celebrationLevel: 'enthusiastic',
    points: {
      base: 15,
      speedBonus: 3,
      firstAttempt: 2
    },
    triggers: {
      completion: true,
      perfectScore: false,
      speedBonus: false,
      firstAttempt: true,
      improvement: false
    }
  }
};

// Test functions
export async function testCreateActivities() {
  console.log('🧪 Testing Activities V2 Creation...\n');
  
  const service = new ActivityV2Service();
  const testUserId = 'test-user-123';
  const testSubjectId = 'test-subject-123';
  const testClassId = 'test-class-123';

  try {
    // Test Quiz Creation
    console.log('📝 Creating Quiz Activity...');
    const quizInput: CreateActivityV2Input = {
      title: sampleQuizContent.title,
      subjectId: testSubjectId,
      classId: testClassId,
      content: sampleQuizContent,
      isGradable: true,
      maxScore: sampleQuizContent.questions.reduce((sum, q) => sum + q.points, 0),
      passingScore: Math.ceil(sampleQuizContent.questions.reduce((sum, q) => sum + q.points, 0) * 0.7)
    };

    const quizActivity = await service.createActivity(quizInput, testUserId);
    console.log('✅ Quiz Activity Created:', quizActivity.id);

    // Test Reading Creation
    console.log('\n📖 Creating Reading Activity...');
    const readingInput: CreateActivityV2Input = {
      title: sampleReadingContent.title,
      subjectId: testSubjectId,
      classId: testClassId,
      content: sampleReadingContent,
      isGradable: true,
      maxScore: 100,
      passingScore: 60
    };

    const readingActivity = await service.createActivity(readingInput, testUserId);
    console.log('✅ Reading Activity Created:', readingActivity.id);

    // Test Video Creation
    console.log('\n🎥 Creating Video Activity...');
    const videoInput: CreateActivityV2Input = {
      title: sampleVideoContent.title,
      subjectId: testSubjectId,
      classId: testClassId,
      content: sampleVideoContent,
      isGradable: true,
      maxScore: 100,
      passingScore: 60
    };

    const videoActivity = await service.createActivity(videoInput, testUserId);
    console.log('✅ Video Activity Created:', videoActivity.id);

    console.log('\n🎉 All activities created successfully!');
    
    return {
      quiz: quizActivity,
      reading: readingActivity,
      video: videoActivity
    };

  } catch (error) {
    console.error('❌ Error creating activities:', error);
    throw error;
  }
}

export async function testSubmitActivities(activities: any) {
  console.log('\n🧪 Testing Activities V2 Submission...\n');
  
  const service = new ActivityV2Service();
  const testStudentId = 'test-student-123';

  try {
    // Test Quiz Submission
    console.log('📝 Submitting Quiz Activity...');
    const quizSubmission = await service.submitActivity({
      activityId: activities.quiz.id,
      answers: {
        'q1': 'sample-answer-1',
        'q2': 'sample-answer-2',
        'q3': 'sample-answer-3'
      },
      timeSpent: 1200 // 20 minutes
    }, testStudentId);

    console.log('✅ Quiz Submitted - Score:', quizSubmission.result.score);

    // Test Reading Submission
    console.log('\n📖 Submitting Reading Activity...');
    const readingSubmission = await service.submitActivity({
      activityId: activities.reading.id,
      progress: {
        scrollPercentage: 90,
        timeSpent: 400,
        bookmarks: [
          {
            id: 'bookmark-1',
            position: 25,
            title: 'Light-Dependent Reactions',
            createdAt: new Date()
          }
        ],
        highlights: [],
        notes: [
          {
            id: 'note-1',
            position: 50,
            content: 'Remember: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂',
            createdAt: new Date()
          }
        ]
      },
      timeSpent: 400
    }, testStudentId);

    console.log('✅ Reading Submitted - Score:', readingSubmission.result.score);

    // Test Video Submission
    console.log('\n🎥 Submitting Video Activity...');
    const videoSubmission = await service.submitActivity({
      activityId: activities.video.id,
      progress: {
        currentTime: 600,
        watchedPercentage: 85,
        watchedSegments: [
          { start: 0, end: 60, watched: true },
          { start: 60, end: 120, watched: true },
          { start: 120, end: 180, watched: true }
        ],
        interactionResponses: []
      },
      timeSpent: 650
    }, testStudentId);

    console.log('✅ Video Submitted - Score:', videoSubmission.result.score);

    console.log('\n🎉 All submissions completed successfully!');

    return {
      quiz: quizSubmission,
      reading: readingSubmission,
      video: videoSubmission
    };

  } catch (error) {
    console.error('❌ Error submitting activities:', error);
    throw error;
  }
}

export async function testGetActivities(activities: any) {
  console.log('\n🧪 Testing Activities V2 Retrieval...\n');
  
  const service = new ActivityV2Service();

  try {
    // Test Get Activity
    console.log('📋 Retrieving Quiz Activity...');
    const retrievedQuiz = await service.getActivity(activities.quiz.id);
    console.log('✅ Quiz Retrieved:', retrievedQuiz?.title);

    console.log('\n📋 Retrieving Reading Activity...');
    const retrievedReading = await service.getActivity(activities.reading.id);
    console.log('✅ Reading Retrieved:', retrievedReading?.title);

    console.log('\n📋 Retrieving Video Activity...');
    const retrievedVideo = await service.getActivity(activities.video.id);
    console.log('✅ Video Retrieved:', retrievedVideo?.title);

    // Test Get Student Attempts
    console.log('\n📊 Retrieving Student Attempts...');
    const attempts = await service.getStudentAttempts(activities.quiz.id, 'test-student-123');
    console.log('✅ Attempts Retrieved:', attempts.length);

    console.log('\n🎉 All retrievals completed successfully!');

  } catch (error) {
    console.error('❌ Error retrieving activities:', error);
    throw error;
  }
}

// Main test runner
export async function runAllTests() {
  console.log('🚀 Starting Activities V2 Test Suite\n');
  console.log('=' .repeat(50));

  try {
    // Create test activities
    const activities = await testCreateActivities();
    
    // Submit test activities
    const submissions = await testSubmitActivities(activities);
    
    // Retrieve test activities
    await testGetActivities(activities);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 All tests completed successfully!');
    console.log('✅ Activities V2 is working correctly');

  } catch (error) {
    console.log('\n' + '='.repeat(50));
    console.error('❌ Test suite failed:', error);
    console.log('🔧 Please check the implementation and try again');
  }
}

// Export sample data for use in other tests
export {
  sampleQuizContent,
  sampleReadingContent,
  sampleVideoContent
};
