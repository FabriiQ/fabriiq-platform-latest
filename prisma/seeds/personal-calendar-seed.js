const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Personal Event Types (matching the enum in the schema)
const PersonalEventType = {
  STUDY_SESSION: 'STUDY_SESSION',
  ASSIGNMENT: 'ASSIGNMENT',
  EXAM_PREP: 'EXAM_PREP',
  MEETING: 'MEETING',
  PERSONAL: 'PERSONAL',
  REMINDER: 'REMINDER',
  BREAK: 'BREAK'
};

async function seedPersonalCalendar() {
  console.log('🌱 Seeding personal calendar events...');

  try {
    // Get some existing users (students and teachers)
    const students = await prisma.user.findMany({
      where: { userType: 'STUDENT' },
      take: 5,
    });

    const teachers = await prisma.user.findMany({
      where: { userType: 'TEACHER' },
      take: 3,
    });

    if (students.length === 0 && teachers.length === 0) {
      console.log('⚠️  No users found. Please seed users first.');
      return;
    }

    // Helper function to create events for a user
    const createEventsForUser = async (userId, userType) => {
      const now = new Date();
      const events = [];

      if (userType === 'STUDENT') {
        // Student-specific events
        events.push(
          // Study sessions
          {
            title: 'Mathematics Study Session',
            description: 'Review calculus concepts and practice problems',
            startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
            endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
            isAllDay: false,
            type: PersonalEventType.STUDY_SESSION,
            color: '#1F504B',
            userId,
          },
          {
            title: 'Physics Lab Preparation',
            description: 'Prepare for upcoming physics laboratory experiment',
            startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // +1.5 hours
            isAllDay: false,
            type: PersonalEventType.STUDY_SESSION,
            color: '#1F504B',
            userId,
          },
          // Assignments
          {
            title: 'History Essay Due',
            description: 'Submit the essay on World War II causes and effects',
            startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            isAllDay: true,
            type: PersonalEventType.ASSIGNMENT,
            color: '#2563eb',
            userId,
          },
          {
            title: 'Programming Project Deadline',
            description: 'Final submission for the web development project',
            startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            isAllDay: true,
            type: PersonalEventType.ASSIGNMENT,
            color: '#2563eb',
            userId,
          },
          // Exam preparation
          {
            title: 'Chemistry Exam Prep',
            description: 'Final review session before the chemistry midterm',
            startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // +3 hours
            isAllDay: false,
            type: PersonalEventType.EXAM_PREP,
            color: '#dc2626',
            userId,
          },
          // Personal events
          {
            title: 'Study Group Meeting',
            description: 'Weekly study group for advanced mathematics',
            startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
            isAllDay: false,
            type: PersonalEventType.MEETING,
            color: '#6b7280',
            userId,
          },
          // Reminders
          {
            title: 'Library Book Return',
            description: 'Return borrowed books to the library',
            startDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
            isAllDay: true,
            type: PersonalEventType.REMINDER,
            color: '#d97706',
            userId,
          }
        );
      } else {
        // Teacher-specific events
        events.push(
          // Meetings
          {
            title: 'Parent-Teacher Conference',
            description: 'Meeting with parents to discuss student progress',
            startDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // +1 hour
            isAllDay: false,
            type: PersonalEventType.MEETING,
            color: '#6b7280',
            userId,
          },
          {
            title: 'Faculty Meeting',
            description: 'Monthly faculty meeting to discuss curriculum updates',
            startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // +1.5 hours
            isAllDay: false,
            type: PersonalEventType.MEETING,
            color: '#6b7280',
            userId,
          },
          // Personal/Professional development
          {
            title: 'Lesson Plan Preparation',
            description: 'Prepare lesson plans for next week\'s classes',
            startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000), // +3 hours
            isAllDay: false,
            type: PersonalEventType.PERSONAL,
            color: '#059669',
            userId,
          },
          // Reminders
          {
            title: 'Grade Assignments',
            description: 'Grade and provide feedback on student assignments',
            startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // +2 hours
            isAllDay: false,
            type: PersonalEventType.REMINDER,
            color: '#d97706',
            userId,
          },
          {
            title: 'Professional Development Workshop',
            description: 'Attend workshop on modern teaching methodologies',
            startDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000),
            endDate: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // +4 hours
            isAllDay: false,
            type: PersonalEventType.PERSONAL,
            color: '#059669',
            userId,
          },
          // Break/Personal time
          {
            title: 'Lunch Break',
            description: 'Personal lunch break',
            startDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000), // Tomorrow at noon
            endDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 13 * 60 * 60 * 1000), // +1 hour
            isAllDay: false,
            type: PersonalEventType.BREAK,
            color: '#9ca3af',
            userId,
          }
        );
      }

      // Create events for this user
      for (const eventData of events) {
        await prisma.personalCalendarEvent.create({
          data: eventData,
        });
      }

      console.log(`✅ Created ${events.length} events for ${userType.toLowerCase()}: ${userId}`);
    };

    // Create events for students
    for (const student of students) {
      await createEventsForUser(student.id, 'STUDENT');
    }

    // Create events for teachers
    for (const teacher of teachers) {
      await createEventsForUser(teacher.id, 'TEACHER');
    }

    console.log('🎉 Personal calendar seeding completed successfully!');
    
    // Show summary
    const totalEvents = await prisma.personalCalendarEvent.count();
    console.log(`📊 Total personal calendar events in database: ${totalEvents}`);

  } catch (error) {
    console.error('❌ Error seeding personal calendar:', error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedPersonalCalendar()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedPersonalCalendar };
