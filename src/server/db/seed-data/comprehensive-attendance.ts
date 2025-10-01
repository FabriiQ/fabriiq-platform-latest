import { PrismaClient, SystemStatus, AttendanceStatusType } from '@prisma/client';

/**
 * Comprehensive attendance seeding with historical data
 */

export async function seedComprehensiveAttendance(prisma: PrismaClient) {
  console.log('📅 Starting comprehensive attendance seeding...');

  try {
    // Get all active enrollments
    const enrollments = await prisma.studentEnrollment.findMany({
      where: { status: 'ACTIVE' },
      include: {
        student: true,
        class: {
          include: {
            courseCampus: {
              include: {
                campus: true
              }
            }
          }
        },

      }
    });

    // Get all teachers
    const teachers = await prisma.user.findMany({
      where: { 
        userType: 'TEACHER',
        status: SystemStatus.ACTIVE 
      }
    });

    if (teachers.length === 0) {
      console.warn('No teachers found for attendance marking');
      return;
    }

    console.log(`Found ${enrollments.length} active enrollments`);

    // Generate attendance for the last 60 days
    const daysToGenerate = 60;
    const today = new Date();
    
    let attendanceRecords = 0;

    for (let dayOffset = daysToGenerate; dayOffset >= 0; dayOffset--) {
      const attendanceDate = new Date(today);
      attendanceDate.setDate(today.getDate() - dayOffset);
      
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (attendanceDate.getDay() === 0 || attendanceDate.getDay() === 6) {
        continue;
      }

      console.log(`Generating attendance for ${attendanceDate.toDateString()}`);

      // Group enrollments by class for batch processing
      const enrollmentsByClass = enrollments.reduce((acc, enrollment) => {
        const classId = enrollment.classId;
        if (!acc[classId]) {
          acc[classId] = [];
        }
        acc[classId].push(enrollment);
        return acc;
      }, {} as Record<string, any[]>);

      // Create attendance for each class
      for (const [classId, classEnrollments] of Object.entries(enrollmentsByClass)) {
        const randomTeacher = teachers[Math.floor(Math.random() * teachers.length)];

        // Note: Creating individual attendance records (no session table in schema)

        // Create attendance records for each student in the class
        for (const enrollment of classEnrollments) {
          // Generate realistic attendance patterns
          const attendanceStatus = generateAttendanceStatus(dayOffset);
          
          try {
            await prisma.attendance.create({
              data: {
                studentId: enrollment.studentId,
                classId: classId,
                date: attendanceDate,
                status: attendanceStatus.status as AttendanceStatusType,
                remarks: attendanceStatus.remarks
              }
            });

            attendanceRecords++;
          } catch (error) {
            console.error(`Error creating attendance for student ${enrollment.student.name}:`, error);
          }
        }
      }
    }

    console.log(`✅ Created ${attendanceRecords} attendance records`);

    // Generate attendance summary statistics
    await generateAttendanceSummaries(prisma, enrollments);

  } catch (error) {
    console.error('Error in comprehensive attendance seeding:', error);
    throw error;
  }
}

function generateAttendanceStatus(dayOffset: number) {
  // More recent days have better attendance
  const baseAttendanceRate = Math.max(0.7, 0.95 - (dayOffset * 0.002));
  const random = Math.random();

  if (random < baseAttendanceRate) {
    // Present
    const isLate = Math.random() < 0.1; // 10% chance of being late
    return {
      status: isLate ? AttendanceStatusType.LATE : AttendanceStatusType.PRESENT,
      remarks: isLate ? 'Late arrival' : null
    };
  } else if (random < baseAttendanceRate + 0.15) {
    // Absent
    const reasons = ['Sick', 'Family emergency', 'Medical appointment', 'Personal reasons'];
    return {
      status: AttendanceStatusType.ABSENT,
      remarks: reasons[Math.floor(Math.random() * reasons.length)]
    };
  } else {
    // Excused absence
    return {
      status: AttendanceStatusType.EXCUSED,
      remarks: 'Excused absence'
    };
  }
}

async function generateAttendanceSummaries(prisma: PrismaClient, enrollments: any[]) {
  console.log('📊 Generating attendance summaries...');

  for (const enrollment of enrollments) {
    try {
      // Calculate attendance statistics for the student
      const attendanceStats = await prisma.attendance.groupBy({
        by: ['status'],
        where: {
          studentId: enrollment.studentId,
          date: {
            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
          }
        },
        _count: {
          status: true
        }
      });

      const totalDays = attendanceStats.reduce((sum, stat) => sum + stat._count.status, 0);
      const presentDays = attendanceStats.find(stat => stat.status === 'PRESENT')?._count.status || 0;
      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Note: Attendance summary table not available in current schema
      console.log(`Calculated attendance for student ${enrollment.studentId}: ${attendancePercentage.toFixed(1)}%`);
    } catch (error) {
      // Skip if attendance summary table doesn't exist
      console.log('Attendance summary table not available');
      break;
    }
  }

  console.log('✅ Attendance summaries generated');
}
