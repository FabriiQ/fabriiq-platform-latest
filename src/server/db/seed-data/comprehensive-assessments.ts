import { PrismaClient, SystemStatus, AssessmentCategory } from '@prisma/client';

/**
 * Comprehensive assessment and student attempts seeding
 */

export async function seedComprehensiveAssessments(prisma: PrismaClient) {
  console.log('📝 Starting comprehensive assessment seeding...');

  try {
    // Get all activities (these will serve as our assessment questions)
    const activities = await prisma.activity.findMany({
      where: { status: SystemStatus.ACTIVE },
      include: {
        subject: true,
        topic: true
      }
    });

    // Get all active enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { status: 'ACTIVE' },
      include: {
        student: true,
        class: {
          include: {
            courseCampus: {
              include: {
                course: true,
                campus: true
              }
            }
          }
        }
      }
    });

    // Get institution and term info
    const institution = await prisma.institution.findFirst({
      where: { status: 'ACTIVE' }
    });

    const term = await prisma.term.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!institution || !term) {
      console.warn('No active institution or term found');
      return;
    }

    // Get teachers for creating assessments
    const teachers = await prisma.user.findMany({
      where: { 
        userType: 'TEACHER',
        status: SystemStatus.ACTIVE 
      }
    });

    if (teachers.length === 0) {
      console.warn('No teachers found for creating assessments');
      return;
    }

    console.log(`Found ${activities.length} activities and ${enrollments.length} enrollments`);

    // Group activities by subject
    const activitiesBySubject = activities.reduce((acc, activity) => {
      const subjectId = activity.subjectId;
      if (!acc[subjectId]) {
        acc[subjectId] = [];
      }
      acc[subjectId].push(activity);
      return acc;
    }, {} as Record<string, any[]>);

    let assessmentCount = 0;
    let attemptCount = 0;

    // Create assessments for each subject
    for (const [subjectId, subjectActivities] of Object.entries(activitiesBySubject)) {
      if (subjectActivities.length === 0) continue;

      const subject = subjectActivities[0].subject;
      const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];

      // Create multiple assessments per subject (quizzes, tests, assignments)
      const assessmentTypes = [
        { type: 'QUIZ', count: 3, questionsPerAssessment: 10 },
        { type: 'TEST', count: 2, questionsPerAssessment: 20 },
        { type: 'ASSIGNMENT', count: 1, questionsPerAssessment: 5 }
      ];

      for (const assessmentType of assessmentTypes) {
        for (let i = 0; i < assessmentType.count; i++) {
          try {
            // Get a random class for this assessment
            const randomEnrollment = enrollments[Math.floor(Math.random() * enrollments.length)];

            // Create assessment
            const assessment = await prisma.assessment.create({
              data: {
                title: `${subject.name} ${assessmentType.type} ${i + 1}`,
                institutionId: institution.id,
                classId: randomEnrollment.classId,
                subjectId: subjectId,
                termId: term.id,
                maxScore: assessmentType.questionsPerAssessment * 10, // 10 marks per question
                passingScore: Math.floor(assessmentType.questionsPerAssessment * 10 * 0.6), // 60% passing
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                status: 'ACTIVE',
                createdById: randomTeacher.id,
                category: assessmentType.type === 'QUIZ' ? AssessmentCategory.QUIZ :
                         assessmentType.type === 'TEST' ? AssessmentCategory.EXAM : AssessmentCategory.ASSIGNMENT
              }
            });

            assessmentCount++;

            // Select random activities for this assessment
            const selectedActivities = subjectActivities
              .sort(() => 0.5 - Math.random())
              .slice(0, assessmentType.questionsPerAssessment);

            // Create student submissions for this assessment
            const relevantEnrollments = enrollments.filter(enrollment =>
              enrollment.classId === assessment.classId && Math.random() > 0.3 // 70% of students attempt each assessment
            );

            for (const enrollment of relevantEnrollments) {
              await createStudentSubmission(prisma, assessment, enrollment, selectedActivities);
              attemptCount++;
            }

          } catch (error) {
            console.error(`Error creating assessment for ${subject.name}:`, error);
          }
        }
      }
    }

    console.log(`✅ Created ${assessmentCount} assessments with ${attemptCount} student attempts`);

  } catch (error) {
    console.error('Error in comprehensive assessment seeding:', error);
    throw error;
  }
}

async function createStudentSubmission(prisma: PrismaClient, assessment: any, enrollment: any, activities: any[]) {
  try {
    // Determine if student completed the assessment
    const completionRate = Math.random();
    const isCompleted = completionRate > 0.2; // 80% completion rate
    
    // Calculate realistic scores based on student performance patterns
    const studentPerformanceLevel = Math.random(); // 0-1, where 1 is excellent
    const baseScore = studentPerformanceLevel * 0.7 + 0.3; // Score between 30% and 100%
    const finalScore = Math.min(100, Math.max(0, baseScore * 100 + (Math.random() - 0.5) * 20));
    
    const totalMarks = assessment.totalMarks;
    const obtainedMarks = Math.floor((finalScore / 100) * totalMarks);

    // Create assessment submission
    const submission = await prisma.assessmentSubmission.create({
      data: {
        assessmentId: assessment.id,
        studentId: enrollment.studentId,
        content: { answers: activities.map(a => ({ activityId: a.id, response: generateResponse(a, Math.random() > 0.3) })) },
        status: isCompleted ? 'SUBMITTED' : Math.random() > 0.5 ? 'DRAFT' : 'SUBMITTED',
        submittedAt: isCompleted ? new Date() : null,
        gradedAt: isCompleted && Math.random() > 0.2 ? new Date() : null
      }
    });

    // Create assessment result
    if (isCompleted) {
      await prisma.assessmentResult.create({
        data: {
          studentId: enrollment.studentId,
          assessmentId: assessment.id,
          score: obtainedMarks,
          maxScore: totalMarks,
          passingScore: assessment.passingScore || 0,
          submittedAt: new Date()
        }
      });
    }

    // Note: Individual activity attempts not tracked in current schema

  } catch (error) {
    console.error(`Error creating student attempt for ${enrollment.student.name}:`, error);
  }
}

function generateQuestionScore(activity: any, performanceLevel: number) {
  const difficulty = getDifficultyFromActivityType(activity.type);
  const successProbability = performanceLevel * (1 - difficulty * 0.3);
  const isCorrect = Math.random() < successProbability;
  
  return {
    isCorrect,
    score: isCorrect ? 10 : Math.floor(Math.random() * 5) // Partial credit for wrong answers
  };
}

function getDifficultyFromActivityType(type: string): number {
  const difficultyMap: Record<string, number> = {
    'MULTIPLE_CHOICE': 0.2,
    'TRUE_FALSE': 0.1,
    'FILL_IN_THE_BLANKS': 0.4,
    'MATCHING': 0.3,
    'DRAG_AND_DROP': 0.3,
    'NUMERIC': 0.5,
    'MULTIPLE_RESPONSE': 0.4,
    'DRAG_THE_WORDS': 0.3,
    'FLASH_CARDS': 0.2,
    'READING': 0.1,
    'VIDEO': 0.1
  };
  
  return difficultyMap[type] || 0.3;
}

function generateResponse(activity: any, isCorrect: boolean): string {
  // Generate realistic responses based on activity type
  const responses = {
    correct: ['A', 'True', 'Correct answer', '42', 'Yes'],
    incorrect: ['B', 'False', 'Wrong answer', '24', 'No']
  };
  
  const responseSet = isCorrect ? responses.correct : responses.incorrect;
  return responseSet[Math.floor(Math.random() * responseSet.length)];
}
