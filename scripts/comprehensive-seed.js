const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function comprehensiveSeed() {
  try {
    console.log('🌱 Starting comprehensive database seeding...');
    
    // Hash password for all users
    const hashedPassword = await bcrypt.hash('Password123!', 12);
    
    // 1. Create Institution
    console.log('📚 Creating institution...');
    const institution = await prisma.institution.upsert({
      where: { code: 'OXFORD-ACADEMY' },
      update: {},
      create: {
        name: 'Oxford Academy International',
        code: 'OXFORD-ACADEMY',
        status: 'ACTIVE'
      }
    });
    console.log('✅ Institution created:', institution.name);

    // 2. Create Campus
    console.log('🏫 Creating campus...');
    const campus = await prisma.campus.upsert({
      where: { code: 'OXFORD-MAIN' },
      update: {},
      create: {
        name: 'Oxford Academy Main Campus',
        code: 'OXFORD-MAIN',
        institutionId: institution.id,
        status: 'ACTIVE',
        address: {
          street: '123 Education Street',
          city: 'Learning City',
          state: 'Education State',
          zipCode: '12345',
          country: 'Education Country'
        },
        contact: {
          phone: '+1-555-0124',
          email: 'main@oxfordacademy.edu',
          website: 'https://oxfordacademy.edu'
        }
      }
    });
    console.log('✅ Campus created:', campus.name);

    // 3. Create Admin User first (needed for academic cycle)
    console.log('👤 Creating admin user...');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@oxfordacademy.edu' },
      update: { password: hashedPassword },
      create: {
        name: 'System Administrator',
        email: 'admin@oxfordacademy.edu',
        username: 'admin',
        password: hashedPassword,
        userType: 'SYSTEM_ADMIN',
        accessScope: 'SYSTEM',
        status: 'ACTIVE',
        institutionId: institution.id,
        primaryCampusId: campus.id
      }
    });
    console.log('✅ Admin user created:', admin.name);

    // 4. Create Academic Cycle
    console.log('📅 Creating academic cycle...');
    const academicCycle = await prisma.academicCycle.upsert({
      where: { code: 'AY2024-25' },
      update: {},
      create: {
        name: 'Academic Year 2024-2025',
        code: 'AY2024-25',
        institutionId: institution.id,
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        status: 'ACTIVE',
        duration: 10, // 10 months
        createdBy: admin.id
      }
    });
    console.log('✅ Academic cycle created:', academicCycle.name);

    // 5. Create Program
    console.log('🎓 Creating program...');
    const program = await prisma.program.upsert({
      where: { code: 'PRIMARY-ENG' },
      update: {},
      create: {
        name: 'Primary English Program',
        code: 'PRIMARY-ENG',
        institutionId: institution.id,
        status: 'ACTIVE',
        type: 'ACADEMIC',
        duration: 12
      }
    });
    console.log('✅ Program created:', program.name);

    // 5. Create Program-Campus Association
    const programCampus = await prisma.programCampus.upsert({
      where: {
        programId_campusId: {
          programId: program.id,
          campusId: campus.id
        }
      },
      update: {},
      create: {
        programId: program.id,
        campusId: campus.id,
        status: 'ACTIVE'
      }
    });

    // 6. Create Course
    console.log('📖 Creating course...');
    const course = await prisma.course.upsert({
      where: { code: 'ENG-GRADE5' },
      update: {},
      create: {
        name: 'English Grade 5',
        code: 'ENG-GRADE5',
        programId: program.id,
        status: 'ACTIVE',
        credits: 6,
        description: 'Grade 5 English curriculum based on Oxford English standards'
      }
    });
    console.log('✅ Course created:', course.name);

    // 7. Create Subject
    console.log('📝 Creating English subject...');
    const subject = await prisma.subject.upsert({
      where: { code: 'ENG5-OXFORD' },
      update: {},
      create: {
        name: 'Oxford English Grade 5',
        code: 'ENG5-OXFORD',
        courseId: course.id,
        status: 'ACTIVE',
        description: 'Oxford English curriculum for Grade 5 students focusing on reading, writing, speaking, and listening skills',
        credits: 6,
        isCore: true
      }
    });
    console.log('✅ Subject created:', subject.name);

    // 8. Create Teacher User
    console.log('👩‍🏫 Creating teacher user...');

    // English Teacher
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@oxfordacademy.edu' },
      update: { password: hashedPassword },
      create: {
        name: 'Sarah Johnson',
        email: 'teacher@oxfordacademy.edu',
        username: 'teacher',
        password: hashedPassword,
        userType: 'TEACHER',
        accessScope: 'SINGLE_CAMPUS',
        status: 'ACTIVE',
        institutionId: institution.id,
        primaryCampusId: campus.id
      }
    });

    console.log('✅ Teacher user created:', teacher.name);

    // 9. Create Class
    console.log('🏛️ Creating class...');
    const classRoom = await prisma.class.upsert({
      where: { code: 'GRADE5-A' },
      update: {},
      create: {
        name: 'Grade 5 Section A',
        code: 'GRADE5-A',
        programCampusId: programCampus.id,
        academicCycleId: academicCycle.id,
        status: 'ACTIVE',
        capacity: 30,
        classTeacherId: teacher.id
      }
    });
    console.log('✅ Class created:', classRoom.name);

    // 10. Create Oxford English Topics
    console.log('📚 Creating Oxford English topics...');
    const topics = [
      {
        name: 'Reading Comprehension',
        code: 'ENG5-RC',
        description: 'Developing reading skills through various text types including fiction, non-fiction, and poetry',
        keywords: ['reading', 'comprehension', 'fiction', 'non-fiction', 'poetry', 'analysis'],
        metadata: {
          difficulty: 'intermediate',
          estimatedHours: 40,
          prerequisites: ['basic reading skills'],
          learningOutcomes: ['Understand main ideas', 'Identify supporting details', 'Make inferences']
        }
      },
      {
        name: 'Creative Writing',
        code: 'ENG5-CW',
        description: 'Expressing ideas through creative writing including stories, poems, and descriptive texts',
        keywords: ['writing', 'creativity', 'stories', 'poems', 'descriptive', 'imagination'],
        metadata: {
          difficulty: 'intermediate',
          estimatedHours: 35,
          prerequisites: ['basic writing skills'],
          learningOutcomes: ['Write creative stories', 'Use descriptive language', 'Develop characters']
        }
      },
      {
        name: 'Grammar and Language Structure',
        code: 'ENG5-GLS',
        description: 'Understanding English grammar rules, sentence structure, and language conventions',
        keywords: ['grammar', 'syntax', 'sentence structure', 'punctuation', 'parts of speech'],
        metadata: {
          difficulty: 'intermediate',
          estimatedHours: 30,
          prerequisites: ['basic grammar knowledge'],
          learningOutcomes: ['Use correct grammar', 'Form complex sentences', 'Apply punctuation rules']
        }
      },
      {
        name: 'Speaking and Listening',
        code: 'ENG5-SL',
        description: 'Developing oral communication skills through presentations, discussions, and active listening',
        keywords: ['speaking', 'listening', 'presentation', 'discussion', 'communication', 'oral'],
        metadata: {
          difficulty: 'intermediate',
          estimatedHours: 25,
          prerequisites: ['basic communication skills'],
          learningOutcomes: ['Present ideas clearly', 'Listen actively', 'Participate in discussions']
        }
      },
      {
        name: 'Vocabulary Building',
        code: 'ENG5-VB',
        description: 'Expanding vocabulary through word study, context clues, and word relationships',
        keywords: ['vocabulary', 'words', 'meaning', 'context', 'synonyms', 'antonyms'],
        metadata: {
          difficulty: 'intermediate',
          estimatedHours: 20,
          prerequisites: ['basic vocabulary'],
          learningOutcomes: ['Use new vocabulary', 'Understand word meanings', 'Apply context clues']
        }
      }
    ];

    const createdTopics = [];
    for (const topicData of topics) {
      const topic = await prisma.subjectTopic.upsert({
        where: { code: topicData.code },
        update: {},
        create: {
          ...topicData,
          subjectId: subject.id,
          status: 'ACTIVE',
          orderIndex: createdTopics.length + 1
        }
      });
      createdTopics.push(topic);
    }
    console.log(`✅ Created ${createdTopics.length} Oxford English topics`);

    return {
      institution,
      campus,
      academicCycle,
      program,
      course,
      subject,
      admin,
      teacher,
      classRoom,
      programCampus,
      topics: createdTopics
    };

  } catch (error) {
    console.error('❌ Error in comprehensive seeding:', error);
    throw error;
  }
}

// Continue with more seeding...
module.exports = { comprehensiveSeed };

if (require.main === module) {
  comprehensiveSeed()
    .then(() => {
      console.log('🎉 Comprehensive seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
