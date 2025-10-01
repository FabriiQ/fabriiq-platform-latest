/**
 * Create Activities for All Classes
 * Adds comprehensive activities for all active classes
 */

const { PrismaClient } = require('@prisma/client');

async function createActivitiesForAllClasses() {
  const prisma = new PrismaClient();
  
  console.log('🎯 Creating activities for all classes...\n');

  try {
    // Get all active classes with their subjects and topics
    const classes = await prisma.class.findMany({
      where: { 
        status: 'ACTIVE'
      },
      include: {
        courseCampus: {
          include: {
            course: {
              include: {
                subjects: {
                  include: {
                    topics: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            activities: true
          }
        }
      }
    });

    console.log(`📋 Found ${classes.length} active classes`);

    let totalActivitiesCreated = 0;

    for (const classData of classes) {
      console.log(`\n🏫 Processing class: ${classData.name} (${classData.code})`);
      console.log(`   Current activities: ${classData._count.activities}`);

      // Skip if class already has many activities
      if (classData._count.activities >= 5) {
        console.log(`   ⏭️  Skipping - already has ${classData._count.activities} activities`);
        continue;
      }

      const subjects = classData.courseCampus.course.subjects;
      console.log(`   📚 Found ${subjects.length} subjects`);

      for (const subject of subjects) {
        let topics = subject.topics;
        console.log(`   📖 Subject: ${subject.name} - ${topics.length} topics`);

        // Create topics if none exist
        if (topics.length === 0) {
          console.log('   📝 Creating topics for subject...');
          
          const topicTemplates = getTopicTemplatesForSubject(subject.name);
          
          for (const topicTemplate of topicTemplates) {
            try {
              const topic = await prisma.subjectTopic.create({
                data: {
                  code: topicTemplate.title.replace(/\s+/g, '_').toUpperCase(),
                  title: topicTemplate.title,
                  description: topicTemplate.description,
                  keywords: topicTemplate.keywords,
                  subjectId: subject.id,
                  nodeType: 'TOPIC',
                  orderIndex: topics.length + 1,
                  status: 'ACTIVE'
                }
              });
              topics.push(topic);
              console.log(`      ✅ Created topic: ${topic.title}`);
            } catch (error) {
              console.log(`      ❌ Error creating topic ${topicTemplate.title}:`, error.message);
            }
          }
        }

        // Create activities for this subject
        const activityTemplates = getActivityTemplatesForSubject(subject.name);
        
        for (const template of activityTemplates.slice(0, 3)) { // Limit to 3 activities per subject
          try {
            const topic = topics[Math.floor(Math.random() * topics.length)];
            
            const activity = await prisma.activity.create({
              data: {
                title: template.title,
                purpose: template.purpose,
                learningType: template.learningType,
                assessmentType: template.assessmentType,
                status: 'ACTIVE',
                subjectId: subject.id,
                topicId: topic.id,
                classId: classData.id,
                content: template.content,
                isGradable: template.purpose === 'ASSESSMENT',
                maxScore: template.purpose === 'ASSESSMENT' ? 10 : null,
                passingScore: template.purpose === 'ASSESSMENT' ? 6 : null
              }
            });
            
            console.log(`      ✅ Created activity: ${activity.title}`);
            totalActivitiesCreated++;
          } catch (error) {
            console.log(`      ❌ Error creating activity ${template.title}:`, error.message);
          }
        }
      }
    }

    console.log(`\n🎉 Created ${totalActivitiesCreated} activities across all classes!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getTopicTemplatesForSubject(subjectName) {
  const lowerName = subjectName.toLowerCase();
  
  if (lowerName.includes('english') || lowerName.includes('language')) {
    return [
      {
        title: 'Reading Comprehension',
        description: 'Understanding and analyzing written texts',
        keywords: ['reading', 'comprehension', 'analysis', 'interpretation']
      },
      {
        title: 'Creative Writing',
        description: 'Developing creative writing skills and techniques',
        keywords: ['writing', 'creativity', 'storytelling', 'narrative']
      },
      {
        title: 'Grammar and Language',
        description: 'Understanding grammar rules and language structure',
        keywords: ['grammar', 'syntax', 'language', 'structure']
      }
    ];
  } else if (lowerName.includes('math') || lowerName.includes('mathematics')) {
    return [
      {
        title: 'Number Operations',
        description: 'Basic arithmetic and number manipulation',
        keywords: ['numbers', 'arithmetic', 'operations', 'calculation']
      },
      {
        title: 'Algebra Basics',
        description: 'Introduction to algebraic concepts',
        keywords: ['algebra', 'equations', 'variables', 'expressions']
      },
      {
        title: 'Geometry Fundamentals',
        description: 'Shapes, angles, and spatial relationships',
        keywords: ['geometry', 'shapes', 'angles', 'measurement']
      }
    ];
  } else if (lowerName.includes('science')) {
    return [
      {
        title: 'Scientific Method',
        description: 'Understanding how science works',
        keywords: ['method', 'hypothesis', 'experiment', 'observation']
      },
      {
        title: 'Life Sciences',
        description: 'Study of living organisms',
        keywords: ['biology', 'life', 'organisms', 'ecology']
      },
      {
        title: 'Physical Sciences',
        description: 'Physics and chemistry concepts',
        keywords: ['physics', 'chemistry', 'matter', 'energy']
      }
    ];
  } else {
    return [
      {
        title: 'Introduction',
        description: 'Basic concepts and fundamentals',
        keywords: ['introduction', 'basics', 'fundamentals', 'overview']
      },
      {
        title: 'Practice',
        description: 'Hands-on practice and application',
        keywords: ['practice', 'application', 'exercises', 'skills']
      },
      {
        title: 'Assessment',
        description: 'Evaluation and testing',
        keywords: ['assessment', 'evaluation', 'testing', 'review']
      }
    ];
  }
}

function getActivityTemplatesForSubject(subjectName) {
  const lowerName = subjectName.toLowerCase();
  
  if (lowerName.includes('english') || lowerName.includes('language')) {
    return [
      {
        title: 'Reading Comprehension Exercise',
        purpose: 'LEARNING',
        learningType: 'READING',
        content: {
          activityType: 'reading-comprehension',
          instructions: 'Read the passage and answer the questions.',
          text: 'Sample reading passage...',
          questions: []
        }
      },
      {
        title: 'Grammar Quiz',
        purpose: 'ASSESSMENT',
        assessmentType: 'QUIZ',
        learningType: 'MULTIPLE_CHOICE',
        content: {
          activityType: 'multiple-choice',
          instructions: 'Choose the correct answer.',
          questions: []
        }
      },
      {
        title: 'Creative Writing Task',
        purpose: 'ASSESSMENT',
        assessmentType: 'ASSIGNMENT',
        learningType: 'OTHER',
        content: {
          activityType: 'creative-writing',
          instructions: 'Write a creative piece.',
          requirements: []
        }
      }
    ];
  } else if (lowerName.includes('math') || lowerName.includes('mathematics')) {
    return [
      {
        title: 'Math Practice Problems',
        purpose: 'LEARNING',
        learningType: 'NUMERIC',
        content: {
          activityType: 'numeric',
          instructions: 'Solve the math problems.',
          problems: []
        }
      },
      {
        title: 'Math Quiz',
        purpose: 'ASSESSMENT',
        assessmentType: 'QUIZ',
        learningType: 'MULTIPLE_CHOICE',
        content: {
          activityType: 'multiple-choice',
          instructions: 'Choose the correct answer.',
          questions: []
        }
      },
      {
        title: 'Problem Solving',
        purpose: 'ASSESSMENT',
        assessmentType: 'ASSIGNMENT',
        learningType: 'OTHER',
        content: {
          activityType: 'problem-solving',
          instructions: 'Solve the complex problems.',
          problems: []
        }
      }
    ];
  } else {
    return [
      {
        title: 'Study Material',
        purpose: 'LEARNING',
        learningType: 'READING',
        content: {
          activityType: 'reading',
          instructions: 'Study the provided material.',
          content: 'Study material content...'
        }
      },
      {
        title: 'Knowledge Check',
        purpose: 'ASSESSMENT',
        assessmentType: 'QUIZ',
        learningType: 'MULTIPLE_CHOICE',
        content: {
          activityType: 'multiple-choice',
          instructions: 'Test your knowledge.',
          questions: []
        }
      },
      {
        title: 'Practice Assignment',
        purpose: 'ASSESSMENT',
        assessmentType: 'ASSIGNMENT',
        learningType: 'OTHER',
        content: {
          activityType: 'assignment',
          instructions: 'Complete the assignment.',
          requirements: []
        }
      }
    ];
  }
}

createActivitiesForAllClasses();
