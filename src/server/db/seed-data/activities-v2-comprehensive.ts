import { PrismaClient, SystemStatus, ActivityPurpose, LearningActivityType, BloomsTaxonomyLevel } from '@prisma/client';
import type { ActivityV2Content, QuizV2Content, ReadingV2Content, VideoV2Content } from '../../features/activities-v2/types';

const prisma = new PrismaClient();

// Year 8 curriculum content organized by subject
const curriculumContent = {
  'English Language & Communication (Y8)': {
    topics: [
      {
        name: 'Poetry Analysis',
        reading: 'Understanding poetic devices, metaphors, and themes in contemporary poetry',
        quiz: 'Identifying literary devices and analyzing poem meanings',
        video: 'Poetry Analysis Techniques'
      },
      {
        name: 'Narrative Writing',
        reading: 'Elements of storytelling: character development, plot structure, and setting',
        quiz: 'Story structure and narrative techniques',
        video: 'Creative Writing: Building Compelling Characters'
      },
      {
        name: 'Grammar & Syntax',
        reading: 'Advanced grammar rules, sentence structure, and punctuation',
        quiz: 'Grammar rules and sentence construction',
        video: 'Mastering Complex Sentences'
      },
      {
        name: 'Media Literacy',
        reading: 'Analyzing bias, perspective, and persuasive techniques in media',
        quiz: 'Media analysis and critical thinking',
        video: 'Understanding Media Bias and Propaganda'
      }
    ]
  },
  'Mathematics & Logical Thinking (Y8)': {
    topics: [
      {
        name: 'Linear Equations',
        reading: 'Solving and graphing linear equations in one and two variables',
        quiz: 'Linear equation problem solving',
        video: 'Introduction to Linear Equations'
      },
      {
        name: 'Geometry & Measurement',
        reading: 'Area, perimeter, and volume calculations for complex shapes',
        quiz: 'Geometric calculations and proofs',
        video: 'Calculating Area and Volume'
      },
      {
        name: 'Statistics & Probability',
        reading: 'Data collection, analysis, and probability calculations',
        quiz: 'Statistical analysis and probability problems',
        video: 'Understanding Probability and Statistics'
      },
      {
        name: 'Algebraic Expressions',
        reading: 'Simplifying expressions, factoring, and algebraic manipulation',
        quiz: 'Algebraic manipulation and factoring',
        video: 'Algebra Basics: Expressions and Equations'
      }
    ]
  },
  'Integrated Science & Inquiry (Y8)': {
    topics: [
      {
        name: 'Chemical Reactions',
        reading: 'Understanding chemical equations, reactants, and products',
        quiz: 'Chemical reaction types and balancing equations',
        video: 'Introduction to Chemical Reactions'
      },
      {
        name: 'Forces & Motion',
        reading: 'Newton\'s laws, velocity, acceleration, and momentum',
        quiz: 'Physics problems involving forces and motion',
        video: 'Newton\'s Laws of Motion Explained'
      },
      {
        name: 'Ecosystems & Biodiversity',
        reading: 'Food chains, energy flow, and environmental interactions',
        quiz: 'Ecosystem relationships and biodiversity',
        video: 'Understanding Ecosystems and Food Webs'
      },
      {
        name: 'Scientific Method',
        reading: 'Hypothesis formation, experimental design, and data analysis',
        quiz: 'Scientific inquiry and experimental design',
        video: 'The Scientific Method in Action'
      }
    ]
  },
  'Physical Education & Wellbeing (Y8)': {
    topics: [
      {
        name: 'Team Sports Strategy',
        reading: 'Tactical approaches in basketball, soccer, and volleyball',
        quiz: 'Sports rules, strategies, and teamwork',
        video: 'Basketball Fundamentals and Team Play'
      },
      {
        name: 'Fitness & Health',
        reading: 'Exercise physiology, nutrition, and healthy lifestyle choices',
        quiz: 'Health and fitness principles',
        video: 'Building a Personal Fitness Plan'
      },
      {
        name: 'Mental Wellbeing',
        reading: 'Stress management, mindfulness, and emotional regulation',
        quiz: 'Mental health awareness and coping strategies',
        video: 'Mindfulness and Stress Management for Teens'
      },
      {
        name: 'Safety & First Aid',
        reading: 'Basic first aid procedures and injury prevention',
        quiz: 'First aid procedures and safety protocols',
        video: 'Basic First Aid and CPR Training'
      }
    ]
  },
  'Life & Learning Skills (Y8)': {
    topics: [
      {
        name: 'Digital Citizenship',
        reading: 'Online safety, digital footprints, and responsible technology use',
        quiz: 'Digital citizenship and online safety',
        video: 'Being a Responsible Digital Citizen'
      },
      {
        name: 'Study Skills',
        reading: 'Effective note-taking, time management, and exam preparation',
        quiz: 'Learning strategies and study techniques',
        video: 'Effective Study Techniques for Students'
      },
      {
        name: 'Communication Skills',
        reading: 'Public speaking, active listening, and interpersonal communication',
        quiz: 'Communication principles and techniques',
        video: 'Effective Communication and Public Speaking'
      },
      {
        name: 'Financial Literacy',
        reading: 'Budgeting, saving, and understanding money management',
        quiz: 'Personal finance and money management',
        video: 'Financial Literacy for Teenagers'
      }
    ]
  }
};

// YouTube video URLs for educational content
const educationalVideos = {
  'Poetry Analysis Techniques': 'https://www.youtube.com/watch?v=mKOSp7pxkJg',
  'Creative Writing: Building Compelling Characters': 'https://www.youtube.com/watch?v=1-l45LbWl4w',
  'Mastering Complex Sentences': 'https://www.youtube.com/watch?v=KYlmgJlC8Qs',
  'Understanding Media Bias and Propaganda': 'https://www.youtube.com/watch?v=q15eTySnWxc',
  'Introduction to Linear Equations': 'https://www.youtube.com/watch?v=WUvTyaaNkzM',
  'Calculating Area and Volume': 'https://www.youtube.com/watch?v=Yz-E1fd5tYs',
  'Understanding Probability and Statistics': 'https://www.youtube.com/watch?v=uzkc-qNVoOk',
  'Algebra Basics: Expressions and Equations': 'https://www.youtube.com/watch?v=NybHckSEQBI',
  'Introduction to Chemical Reactions': 'https://www.youtube.com/watch?v=8RlE8v5tP2s',
  'Newton\'s Laws of Motion Explained': 'https://www.youtube.com/watch?v=kKKM8Y-u7ds',
  'Understanding Ecosystems and Food Webs': 'https://www.youtube.com/watch?v=68tQgjhHGf8',
  'The Scientific Method in Action': 'https://www.youtube.com/watch?v=zi8FfMBYCkk',
  'Basketball Fundamentals and Team Play': 'https://www.youtube.com/watch?v=f9VXTlxmBBs',
  'Building a Personal Fitness Plan': 'https://www.youtube.com/watch?v=R2_Mn-qRKjA',
  'Mindfulness and Stress Management for Teens': 'https://www.youtube.com/watch?v=_DTmGtznb4s',
  'Basic First Aid and CPR Training': 'https://www.youtube.com/watch?v=C_b2K3QwGWw',
  'Being a Responsible Digital Citizen': 'https://www.youtube.com/watch?v=u0RryRbmza8',
  'Effective Study Techniques for Students': 'https://www.youtube.com/watch?v=IlU-zDU6aQ0',
  'Effective Communication and Public Speaking': 'https://www.youtube.com/watch?v=HAnw168huqA',
  'Financial Literacy for Teenagers': 'https://www.youtube.com/watch?v=gvZSpET11ZY'
};

function createDefaultAchievementConfig() {
  return {
    enabled: true,
    pointsAnimation: true,
    celebrationLevel: 'standard' as const,
    points: {
      base: 10,
      perfectScore: 15,
      speedBonus: 5,
      firstAttempt: 12,
      improvement: 8
    },
    speedBonusThresholdSeconds: 300,
    triggers: {
      completion: true,
      perfectScore: true,
      speedBonus: true,
      firstAttempt: true,
      improvement: true
    }
  };
}

function createReadingContent(topic: string, description: string): ReadingV2Content {
  return {
    version: '2.0',
    type: 'reading',
    title: `Reading: ${topic}`,
    description: `Comprehensive reading material on ${topic.toLowerCase()}`,
    estimatedTimeMinutes: 15,
    content: {
      type: 'rich_text',
      data: `<h2>${topic}</h2><p>${description}</p><p>This reading material provides comprehensive coverage of ${topic.toLowerCase()} concepts, including key principles, practical applications, and real-world examples.</p>`,
      metadata: {
        wordCount: 500,
        readingLevel: 'Grade 8',
        estimatedReadingTime: 15
      }
    },
    completionCriteria: {
      minTimeSeconds: 300,
      scrollPercentage: 80,
      interactionRequired: false
    },
    features: {
      allowBookmarking: true,
      allowHighlighting: true,
      allowNotes: true,
      showProgress: true
    },
    achievementConfig: createDefaultAchievementConfig()
  };
}

function createQuizContent(topic: string, description: string): QuizV2Content {
  return {
    version: '2.0',
    type: 'quiz',
    title: `Quiz: ${topic}`,
    description: `Assessment quiz covering ${topic.toLowerCase()}`,
    estimatedTimeMinutes: 10,
    questions: [
      { id: 'q1', points: 2, shuffleOptions: true, required: true },
      { id: 'q2', points: 2, shuffleOptions: true, required: true },
      { id: 'q3', points: 3, shuffleOptions: true, required: true },
      { id: 'q4', points: 3, shuffleOptions: true, required: true }
    ],
    settings: {
      timeLimitMinutes: 10,
      attemptsAllowed: 2,
      shuffleQuestions: true,
      showFeedback: true,
      passingScore: 70,
      showCorrectAnswers: true,
      allowReview: true
    },
    achievementConfig: createDefaultAchievementConfig()
  };
}

function createVideoContent(topic: string, videoTitle: string): VideoV2Content {
  const videoUrl = educationalVideos[videoTitle] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  
  return {
    version: '2.0',
    type: 'video',
    title: `Video: ${topic}`,
    description: `Educational video covering ${topic.toLowerCase()}`,
    estimatedTimeMinutes: 8,
    video: {
      provider: 'youtube',
      url: videoUrl,
      duration: 480,
      metadata: {
        title: videoTitle,
        thumbnail: `https://img.youtube.com/vi/${videoUrl.split('v=')[1]}/maxresdefault.jpg`,
        description: `Educational video about ${topic}`
      }
    },
    completionCriteria: {
      minWatchPercentage: 80,
      minWatchTimeSeconds: 360,
      interactionPoints: []
    },
    features: {
      allowSeeking: true,
      showControls: true,
      allowSpeedChange: true,
      showTranscript: false
    },
    achievementConfig: createDefaultAchievementConfig()
  };
}

export async function seedActivitiesV2Comprehensive() {
  console.log('🚀 Starting comprehensive Activities v2 seeding...');
  
  try {
    // Get the target class (SIS-BOYS-Y8-C where Robert teaches)
    const targetClass = await prisma.class.findFirst({
      where: {
        code: 'SIS-BOYS-Y8-C',
        status: SystemStatus.ACTIVE
      },
      include: {
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: true
              }
            }
          }
        }
      }
    });

    if (!targetClass) {
      console.log('❌ Target class SIS-BOYS-Y8-C not found');
      return;
    }

    console.log(`📚 Found target class: ${targetClass.name} (${targetClass.code})`);
    console.log(`📖 Subjects: ${targetClass.courseCampus.course.subjects.map(s => s.name).join(', ')}`);

    let totalActivitiesCreated = 0;

    // Process each subject
    for (const subject of targetClass.courseCampus.course.subjects) {
      console.log(`\n📝 Processing subject: ${subject.name}`);
      
      const subjectContent = curriculumContent[subject.name];
      if (!subjectContent) {
        console.log(`   ⚠️ No curriculum content defined for ${subject.name}`);
        continue;
      }

      // Process each topic in the subject
      for (const [topicIndex, topic] of subjectContent.topics.entries()) {
        console.log(`   📖 Creating activities for topic: ${topic.name}`);

        // Create Reading Activity (50% weight)
        const readingContent = createReadingContent(topic.name, topic.reading);
        const readingActivity = await prisma.activity.create({
          data: {
            title: readingContent.title,
            purpose: ActivityPurpose.LEARNING,
            learningType: LearningActivityType.READING,
            status: SystemStatus.ACTIVE,
            subjectId: subject.id,
            classId: targetClass.id,
            content: readingContent,
            isGradable: true,
            maxScore: 10,
            passingScore: 7,
            weightage: 0.5,
            bloomsLevel: BloomsTaxonomyLevel.UNDERSTAND,
            duration: 15
          }
        });

        // Create Quiz Activity (25% weight)
        const quizContent = createQuizContent(topic.name, topic.quiz);
        const quizActivity = await prisma.activity.create({
          data: {
            title: quizContent.title,
            purpose: ActivityPurpose.ASSESSMENT,
            learningType: LearningActivityType.QUIZ,
            status: SystemStatus.ACTIVE,
            subjectId: subject.id,
            classId: targetClass.id,
            content: quizContent,
            isGradable: true,
            maxScore: 10,
            passingScore: 7,
            weightage: 0.25,
            bloomsLevel: BloomsTaxonomyLevel.APPLY,
            duration: 10
          }
        });

        // Create Video Activity (25% weight)
        const videoContent = createVideoContent(topic.name, topic.video);
        const videoActivity = await prisma.activity.create({
          data: {
            title: videoContent.title,
            purpose: ActivityPurpose.LEARNING,
            learningType: LearningActivityType.VIDEO,
            status: SystemStatus.ACTIVE,
            subjectId: subject.id,
            classId: targetClass.id,
            content: videoContent,
            isGradable: true,
            maxScore: 10,
            passingScore: 7,
            weightage: 0.25,
            bloomsLevel: BloomsTaxonomyLevel.REMEMBER,
            duration: 8
          }
        });

        totalActivitiesCreated += 3;
        console.log(`     ✅ Created 3 activities for ${topic.name}`);
      }

      console.log(`   ✅ Completed ${subject.name}: ${subjectContent.topics.length * 3} activities`);
    }

    console.log(`\n🎉 Successfully created ${totalActivitiesCreated} activities following Activities v2 architecture!`);
    console.log(`📊 Distribution: 50% Reading, 25% Quiz, 25% Video`);
    
  } catch (error) {
    console.error('❌ Error during comprehensive seeding:', error);
    throw error;
  }
}

export default seedActivitiesV2Comprehensive;
