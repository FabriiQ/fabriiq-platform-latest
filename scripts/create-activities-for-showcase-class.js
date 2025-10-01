/**
 * Create Activities for Showcase Class
 * Adds comprehensive activities for class cmesxnvle006wuxvpxic2pp41
 */

const { PrismaClient } = require('@prisma/client');

async function createActivitiesForShowcaseClass() {
  const prisma = new PrismaClient();
  
  console.log('🎯 Creating activities for showcase class...\n');

  try {
    const targetClassId = 'cmesxnvle006wuxvpxic2pp41';
    
    // Get class details
    const targetClass = await prisma.class.findUnique({
      where: { id: targetClassId },
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
        }
      }
    });

    if (!targetClass) {
      console.log('❌ Showcase class not found');
      return;
    }

    console.log(`📋 Found class: ${targetClass.name}`);
    
    // Get English subject and topics
    const englishSubject = targetClass.courseCampus.course.subjects.find(s => 
      s.name.toLowerCase().includes('english')
    );
    
    if (!englishSubject) {
      console.log('❌ English subject not found');
      return;
    }

    console.log(`📚 Using subject: ${englishSubject.name}`);

    let topics = englishSubject.topics;
    console.log(`📖 Found ${topics.length} topics`);

    // Create topics if none exist
    if (topics.length === 0) {
      console.log('📝 Creating topics for English subject...');

      const topicTemplates = [
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
        },
        {
          title: 'Poetry and Literature',
          description: 'Exploring poetry and literary works',
          keywords: ['poetry', 'literature', 'analysis', 'themes']
        },
        {
          title: 'Vocabulary Development',
          description: 'Building and expanding vocabulary',
          keywords: ['vocabulary', 'words', 'definitions', 'usage']
        }
      ];

      for (const topicTemplate of topicTemplates) {
        try {
          const topic = await prisma.subjectTopic.create({
            data: {
              code: topicTemplate.title.replace(/\s+/g, '_').toUpperCase(),
              title: topicTemplate.title,
              description: topicTemplate.description,
              keywords: topicTemplate.keywords,
              subjectId: englishSubject.id,
              nodeType: 'TOPIC',
              orderIndex: topics.length + 1,
              status: 'ACTIVE'
            }
          });
          topics.push(topic);
          console.log(`   ✅ Created topic: ${topic.title}`);
        } catch (error) {
          console.log(`   ❌ Error creating topic ${topicTemplate.title}:`, error.message);
        }
      }
    }

    // Activity templates
    const activityTemplates = [
      {
        title: 'Reading Comprehension: The Great Gatsby',
        purpose: 'LEARNING',
        learningType: 'READING',
        content: {
          activityType: 'reading-comprehension',
          instructions: 'Read Chapter 1 of The Great Gatsby and answer the comprehension questions.',
          text: 'In my younger and more vulnerable years my father gave me some advice that I\'ve carried with me ever since...',
          questions: [
            {
              id: '1',
              text: 'What advice did the narrator\'s father give him?',
              type: 'short-answer',
              points: 5
            },
            {
              id: '2', 
              text: 'Describe the setting of the story.',
              type: 'short-answer',
              points: 5
            }
          ]
        }
      },
      {
        title: 'Creative Writing: Character Development',
        purpose: 'ASSESSMENT',
        assessmentType: 'ASSIGNMENT',
        content: {
          activityType: 'creative-writing',
          instructions: 'Create a detailed character profile for a protagonist in your own short story.',
          requirements: [
            'Character background and history',
            'Physical description',
            'Personality traits',
            'Goals and motivations',
            'Character arc'
          ],
          wordLimit: 500
        }
      },
      {
        title: 'Grammar Quiz: Sentence Structure',
        purpose: 'ASSESSMENT',
        assessmentType: 'QUIZ',
        content: {
          activityType: 'multiple-choice',
          instructions: 'Choose the correct answer for each grammar question.',
          questions: [
            {
              id: '1',
              text: 'Which sentence is grammatically correct?',
              options: [
                'Me and John went to the store.',
                'John and I went to the store.',
                'John and me went to the store.',
                'I and John went to the store.'
              ],
              answer: 1,
              points: 2
            },
            {
              id: '2',
              text: 'Identify the subject in this sentence: "The quick brown fox jumps over the lazy dog."',
              options: [
                'quick brown fox',
                'the quick brown fox',
                'fox',
                'jumps'
              ],
              answer: 1,
              points: 2
            }
          ]
        }
      },
      {
        title: 'Poetry Analysis: Shakespeare\'s Sonnets',
        purpose: 'LEARNING',
        learningType: 'READING',
        content: {
          activityType: 'text-analysis',
          instructions: 'Analyze the themes and literary devices in Sonnet 18.',
          text: 'Shall I compare thee to a summer\'s day?\nThou art more lovely and more temperate...',
          analysisPoints: [
            'Identify the rhyme scheme',
            'Find examples of metaphor',
            'Explain the main theme',
            'Discuss the volta (turn)'
          ]
        }
      },
      {
        title: 'Vocabulary Building: Academic Words',
        purpose: 'LEARNING',
        learningType: 'FLASH_CARDS',
        content: {
          activityType: 'vocabulary',
          instructions: 'Learn these academic vocabulary words and use them in sentences.',
          words: [
            {
              word: 'analyze',
              definition: 'to examine methodically and in detail',
              example: 'We need to analyze the data carefully.'
            },
            {
              word: 'synthesize',
              definition: 'to combine elements to form a coherent whole',
              example: 'The essay should synthesize multiple sources.'
            },
            {
              word: 'evaluate',
              definition: 'to judge or determine the significance of',
              example: 'Please evaluate the effectiveness of the argument.'
            }
          ]
        }
      }
    ];

    // Create activities
    let createdCount = 0;
    for (const template of activityTemplates) {
      try {
        const topic = topics[Math.floor(Math.random() * topics.length)];
        
        const activity = await prisma.activity.create({
          data: {
            title: template.title,
            purpose: template.purpose,
            learningType: template.learningType,
            assessmentType: template.assessmentType,
            status: 'ACTIVE',
            subjectId: englishSubject.id,
            topicId: topic.id,
            classId: targetClassId,
            content: template.content,
            isGradable: template.purpose === 'ASSESSMENT',
            maxScore: template.purpose === 'ASSESSMENT' ? 10 : null,
            passingScore: template.purpose === 'ASSESSMENT' ? 6 : null
          }
        });
        
        console.log(`   ✅ Created activity: ${activity.title}`);
        createdCount++;
      } catch (error) {
        console.log(`   ❌ Error creating activity ${template.title}:`, error.message);
      }
    }

    console.log(`\n🎉 Created ${createdCount} activities for showcase class!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createActivitiesForShowcaseClass();
