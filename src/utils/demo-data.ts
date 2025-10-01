/**
 * Demo Data Utilities
 * Provides fallback demo data for when APIs are not available
 */

import { BloomsTaxonomyLevel } from '@/features/bloom/types/bloom-taxonomy';
import type { ClassBloomsPerformance, StudentBloomsPerformance } from '@/features/bloom/types/analytics';

/**
 * Create demo class performance data
 */
export function createDemoClassPerformance(classId: string, className?: string): ClassBloomsPerformance {
  return {
    classId,
    className: className || 'Demo Class',
    studentCount: 25,
    averageMastery: 72.5,
    distribution: {
      [BloomsTaxonomyLevel.REMEMBER]: 85,
      [BloomsTaxonomyLevel.UNDERSTAND]: 78,
      [BloomsTaxonomyLevel.APPLY]: 72,
      [BloomsTaxonomyLevel.ANALYZE]: 65,
      [BloomsTaxonomyLevel.EVALUATE]: 58,
      [BloomsTaxonomyLevel.CREATE]: 45
    },
    studentPerformance: [
      {
        studentId: 'demo-student-1',
        studentName: 'John Smith',
        [BloomsTaxonomyLevel.REMEMBER]: 90,
        [BloomsTaxonomyLevel.UNDERSTAND]: 85,
        [BloomsTaxonomyLevel.APPLY]: 80,
        [BloomsTaxonomyLevel.ANALYZE]: 75,
        [BloomsTaxonomyLevel.EVALUATE]: 70,
        [BloomsTaxonomyLevel.CREATE]: 65,
        overallMastery: 77.5
      },
      {
        studentId: 'demo-student-2',
        studentName: 'Sarah Johnson',
        [BloomsTaxonomyLevel.REMEMBER]: 95,
        [BloomsTaxonomyLevel.UNDERSTAND]: 88,
        [BloomsTaxonomyLevel.APPLY]: 82,
        [BloomsTaxonomyLevel.ANALYZE]: 78,
        [BloomsTaxonomyLevel.EVALUATE]: 72,
        [BloomsTaxonomyLevel.CREATE]: 68,
        overallMastery: 80.5
      },
      {
        studentId: 'demo-student-3',
        studentName: 'Mike Davis',
        [BloomsTaxonomyLevel.REMEMBER]: 80,
        [BloomsTaxonomyLevel.UNDERSTAND]: 75,
        [BloomsTaxonomyLevel.APPLY]: 70,
        [BloomsTaxonomyLevel.ANALYZE]: 65,
        [BloomsTaxonomyLevel.EVALUATE]: 60,
        [BloomsTaxonomyLevel.CREATE]: 55,
        overallMastery: 67.5
      },
      {
        studentId: 'demo-student-4',
        studentName: 'Emily Chen',
        [BloomsTaxonomyLevel.REMEMBER]: 92,
        [BloomsTaxonomyLevel.UNDERSTAND]: 89,
        [BloomsTaxonomyLevel.APPLY]: 85,
        [BloomsTaxonomyLevel.ANALYZE]: 82,
        [BloomsTaxonomyLevel.EVALUATE]: 78,
        [BloomsTaxonomyLevel.CREATE]: 75,
        overallMastery: 83.5
      },
      {
        studentId: 'demo-student-5',
        studentName: 'Alex Rodriguez',
        [BloomsTaxonomyLevel.REMEMBER]: 78,
        [BloomsTaxonomyLevel.UNDERSTAND]: 72,
        [BloomsTaxonomyLevel.APPLY]: 68,
        [BloomsTaxonomyLevel.ANALYZE]: 62,
        [BloomsTaxonomyLevel.EVALUATE]: 58,
        [BloomsTaxonomyLevel.CREATE]: 52,
        overallMastery: 65.0
      },
      {
        studentId: 'demo-student-6',
        studentName: 'Lisa Wang',
        [BloomsTaxonomyLevel.REMEMBER]: 88,
        [BloomsTaxonomyLevel.UNDERSTAND]: 84,
        [BloomsTaxonomyLevel.APPLY]: 79,
        [BloomsTaxonomyLevel.ANALYZE]: 76,
        [BloomsTaxonomyLevel.EVALUATE]: 71,
        [BloomsTaxonomyLevel.CREATE]: 67,
        overallMastery: 77.5
      }
    ],
    topicPerformance: [
      {
        topicId: 'demo-topic-1',
        topicName: 'Algebra Fundamentals',
        subjectId: 'demo-subject-1',
        subjectName: 'Mathematics',
        averageMastery: 75,
        distribution: {
          [BloomsTaxonomyLevel.REMEMBER]: 85,
          [BloomsTaxonomyLevel.UNDERSTAND]: 80,
          [BloomsTaxonomyLevel.APPLY]: 75,
          [BloomsTaxonomyLevel.ANALYZE]: 70,
          [BloomsTaxonomyLevel.EVALUATE]: 65,
          [BloomsTaxonomyLevel.CREATE]: 50
        },
        masteryByLevel: {
          [BloomsTaxonomyLevel.REMEMBER]: 85,
          [BloomsTaxonomyLevel.UNDERSTAND]: 80,
          [BloomsTaxonomyLevel.APPLY]: 75,
          [BloomsTaxonomyLevel.ANALYZE]: 70,
          [BloomsTaxonomyLevel.EVALUATE]: 65,
          [BloomsTaxonomyLevel.CREATE]: 50
        },
        studentCount: 25,
        masteredCount: 18,
        partiallyMasteredCount: 5,
        notMasteredCount: 2
      }
    ],
    cognitiveGaps: [
      {
        bloomsLevel: BloomsTaxonomyLevel.CREATE,
        topicId: 'demo-topic-1',
        topicName: 'Algebra Fundamentals',
        subjectId: 'demo-subject-1',
        subjectName: 'Mathematics',
        gapSize: 25,
        affectedStudentCount: 15,
        affectedStudentIds: ['demo-student-1', 'demo-student-2', 'demo-student-3'],
        description: 'Students struggle with creative problem-solving in algebraic contexts'
      },
      {
        bloomsLevel: BloomsTaxonomyLevel.EVALUATE,
        topicId: 'demo-topic-1',
        topicName: 'Algebra Fundamentals',
        subjectId: 'demo-subject-1',
        subjectName: 'Mathematics',
        gapSize: 12,
        affectedStudentCount: 8,
        affectedStudentIds: ['demo-student-1', 'demo-student-3'],
        description: 'Students need more practice with critical evaluation of mathematical solutions'
      }
    ],
    interventionSuggestions: [
      {
        id: 'intervention-1',
        bloomsLevel: BloomsTaxonomyLevel.CREATE,
        topicId: 'demo-topic-1',
        topicName: 'Algebra Fundamentals',
        targetStudentIds: ['demo-student-1', 'demo-student-2', 'demo-student-3'],
        targetStudentCount: 15,
        description: 'Introduce more creative problem-solving activities',
        activitySuggestions: [
          'Creative thinking workshops',
          'Project-based learning modules',
          'Design thinking exercises',
          'Innovation challenges'
        ],
        resourceSuggestions: ['Creative thinking workshops', 'Project-based learning modules']
      },
      {
        id: 'intervention-2',
        bloomsLevel: BloomsTaxonomyLevel.EVALUATE,
        topicId: 'demo-topic-1',
        topicName: 'Algebra Fundamentals',
        targetStudentIds: ['demo-student-1', 'demo-student-3'],
        targetStudentCount: 8,
        description: 'Add peer review and critical analysis exercises',
        activitySuggestions: [
          'Peer assessment tools',
          'Critical thinking guides',
          'Debate and discussion forums',
          'Case study analysis'
        ],
        resourceSuggestions: ['Peer assessment tools', 'Critical thinking guides']
      },
      {
        id: 'intervention-3',
        bloomsLevel: BloomsTaxonomyLevel.ANALYZE,
        topicId: 'demo-topic-1',
        topicName: 'Algebra Fundamentals',
        targetStudentIds: ['demo-student-2', 'demo-student-3'],
        targetStudentCount: 12,
        description: 'Strengthen analytical thinking through structured problem decomposition',
        activitySuggestions: [
          'Problem decomposition exercises',
          'Data analysis workshops',
          'Cause and effect mapping',
          'Pattern recognition activities'
        ],
        resourceSuggestions: ['Analysis frameworks', 'Problem-solving templates']
      }
    ]
  };
}

/**
 * Create demo student performance data
 */
export function createDemoStudentPerformance(studentId?: string, studentName?: string): StudentBloomsPerformance {
  return {
    studentId: studentId || 'demo-student-1',
    studentName: studentName || 'John Smith',
    [BloomsTaxonomyLevel.REMEMBER]: 90,
    [BloomsTaxonomyLevel.UNDERSTAND]: 85,
    [BloomsTaxonomyLevel.APPLY]: 80,
    [BloomsTaxonomyLevel.ANALYZE]: 75,
    [BloomsTaxonomyLevel.EVALUATE]: 70,
    [BloomsTaxonomyLevel.CREATE]: 65,
    overallMastery: 77.5
  };
}

/**
 * Create demo student profile data
 */
export function createDemoStudentProfile(studentId: string) {
  return {
    id: studentId,
    name: "John Smith",
    email: "john.smith@example.com",
    username: "john.smith",
    userType: "STUDENT" as const,
    status: "ACTIVE" as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Create demo class data
 */
export function createDemoClassData(classId: string) {
  return {
    id: classId,
    name: "Mathematics Grade 10",
    description: "Advanced Mathematics Course",
    status: "ACTIVE" as const,
    campusId: "demo-campus",
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Create demo achievements data
 */
export function createDemoAchievements() {
  return [
    {
      id: "ach-1",
      title: "Math Wizard",
      description: "Completed 10 math activities with 90%+ score",
      type: "ACADEMIC" as const,
      earnedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      points: 100
    },
    {
      id: "ach-2", 
      title: "Quick Learner",
      description: "Completed activities in record time",
      type: "ENGAGEMENT" as const,
      earnedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      points: 75
    },
    {
      id: "ach-3",
      title: "Consistent Performer",
      description: "Maintained high performance for 30 days",
      type: "ACADEMIC" as const,
      earnedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      points: 150
    },
    {
      id: "ach-4",
      title: "Critical Thinker",
      description: "Excelled in analysis and evaluation tasks",
      type: "ACADEMIC" as const,
      earnedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      points: 125
    },
    {
      id: "ach-5",
      title: "Team Player",
      description: "Outstanding collaboration in group activities",
      type: "ENGAGEMENT" as const,
      earnedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      points: 90
    },
    {
      id: "ach-6",
      title: "Creative Genius",
      description: "Demonstrated exceptional creativity in problem-solving",
      type: "ACADEMIC" as const,
      earnedAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000),
      points: 200
    },
    {
      id: "ach-7",
      title: "Perfect Attendance",
      description: "100% attendance for the month",
      type: "ENGAGEMENT" as const,
      earnedAt: new Date(Date.now() - 49 * 24 * 60 * 60 * 1000),
      points: 50
    },
    {
      id: "ach-8",
      title: "Bloom's Master",
      description: "Achieved mastery across all Bloom's taxonomy levels",
      type: "ACADEMIC" as const,
      earnedAt: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000),
      points: 300
    }
  ];
}

/**
 * Create demo rewards data
 */
export function createDemoRewards() {
  return [
    {
      id: "reward-1",
      title: "Golden Star",
      description: "Awarded for exceptional academic performance",
      type: "BADGE" as const,
      earnedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      points: 50,
      icon: "⭐",
      rarity: "RARE" as const
    },
    {
      id: "reward-2",
      title: "Lightning Bolt",
      description: "For completing activities with speed and accuracy",
      type: "BADGE" as const,
      earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      points: 75,
      icon: "⚡",
      rarity: "UNCOMMON" as const
    },
    {
      id: "reward-3",
      title: "Brain Trophy",
      description: "Master of critical thinking and analysis",
      type: "TROPHY" as const,
      earnedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      points: 150,
      icon: "🏆",
      rarity: "LEGENDARY" as const
    },
    {
      id: "reward-4",
      title: "Collaboration Crown",
      description: "Outstanding teamwork and peer support",
      type: "BADGE" as const,
      earnedAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      points: 100,
      icon: "👑",
      rarity: "RARE" as const
    }
  ];
}

/**
 * Create demo learning patterns data
 */
export function createDemoLearningPatterns() {
  return {
    learningStyle: {
      primary: 'visual' as const,
      secondary: 'kinesthetic' as const,
      confidence: 0.85
    },
    cognitivePreferences: {
      processingSpeed: 'fast' as const,
      complexityPreference: 'moderate' as const,
      feedbackSensitivity: 'moderate' as const,
      collaborationPreference: 'small_group' as const
    },
    performancePatterns: {
      consistencyScore: 85,
      improvementTrend: 'steady' as const,
      peakPerformanceTime: 'morning' as const,
      difficultyAdaptation: 'quick' as const
    },
    engagementPatterns: {
      attentionSpan: 'long' as const,
      motivationTriggers: ['Achievement badges', 'Peer collaboration', 'Real-world applications'],
      procrastinationTendency: 'low' as const,
      helpSeekingBehavior: 'proactive' as const
    },
    riskFactors: [
      {
        factor: 'Time management',
        severity: 'low' as const,
        description: 'Occasionally struggles with deadline management',
        interventions: ['Time blocking techniques', 'Calendar reminders', 'Progress tracking']
      }
    ],
    strengths: [
      'Strong analytical thinking',
      'Excellent problem-solving skills',
      'Good collaboration abilities',
      'High motivation for STEM subjects'
    ],
    adaptiveRecommendations: [
      'Provide visual diagrams and charts for complex concepts',
      'Include hands-on activities and experiments',
      'Offer collaborative group projects',
      'Use real-world problem scenarios',
      'Provide immediate feedback on progress'
    ]
  };
}
