#!/usr/bin/env node

/**
 * Debug Recipient Loading Issues
 * Comprehensive debugging script to identify why no users are showing in recipient selection
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugRecipientLoading() {
  console.log('🔍 Debugging Recipient Loading Issues...\n');

  try {
    // 1. Check if database is seeded with users
    console.log('1. Checking database for users...');
    const totalUsers = await prisma.user.count();
    console.log(`   Total users in database: ${totalUsers}`);

    if (totalUsers === 0) {
      console.log('   ❌ No users found in database! Database needs to be seeded.');
      console.log('   Run: npm run db:seed');
      return;
    }

    // 2. Check user types distribution
    console.log('\n2. Checking user types distribution...');
    const userTypes = await prisma.user.groupBy({
      by: ['userType'],
      _count: {
        userType: true
      }
    });
    
    userTypes.forEach(type => {
      console.log(`   ${type.userType}: ${type._count.userType} users`);
    });

    // 3. Check campus associations
    console.log('\n3. Checking campus associations...');
    const campusAccess = await prisma.userCampusAccess.count();
    console.log(`   Total campus access records: ${campusAccess}`);

    const usersWithPrimaryCampus = await prisma.user.count({
      where: {
        primaryCampusId: {
          not: null
        }
      }
    });
    console.log(`   Users with primaryCampusId: ${usersWithPrimaryCampus}`);

    // 4. Check specific user data for each role
    console.log('\n4. Checking specific user data...');
    
    // System Admin
    const systemAdmins = await prisma.user.findMany({
      where: { userType: 'SYSTEM_ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        status: true,
        primaryCampusId: true,
        activeCampuses: {
          select: {
            campusId: true,
            status: true
          }
        }
      }
    });
    console.log(`   System Admins (${systemAdmins.length}):`);
    systemAdmins.forEach(user => {
      console.log(`     - ${user.name} (${user.email}) - Status: ${user.status} - Primary Campus: ${user.primaryCampusId}`);
    });

    // Campus Admins
    const campusAdmins = await prisma.user.findMany({
      where: { userType: 'CAMPUS_ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        status: true,
        primaryCampusId: true,
        activeCampuses: {
          select: {
            campusId: true,
            status: true
          }
        }
      }
    });
    console.log(`   Campus Admins (${campusAdmins.length}):`);
    campusAdmins.forEach(user => {
      console.log(`     - ${user.name} (${user.email}) - Status: ${user.status} - Primary Campus: ${user.primaryCampusId}`);
    });

    // Teachers
    const teachers = await prisma.user.findMany({
      where: { userType: { in: ['CAMPUS_TEACHER', 'TEACHER'] } },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        status: true,
        primaryCampusId: true,
        activeCampuses: {
          select: {
            campusId: true,
            status: true
          }
        }
      },
      take: 5 // Just show first 5
    });
    console.log(`   Teachers (showing first 5 of ${teachers.length}):`);
    teachers.forEach(user => {
      console.log(`     - ${user.name} (${user.email}) - Status: ${user.status} - Primary Campus: ${user.primaryCampusId}`);
    });

    // Students
    const students = await prisma.user.findMany({
      where: { userType: { in: ['CAMPUS_STUDENT', 'STUDENT'] } },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        status: true,
        primaryCampusId: true,
        activeCampuses: {
          select: {
            campusId: true,
            status: true
          }
        }
      },
      take: 5 // Just show first 5
    });
    console.log(`   Students (showing first 5 of ${students.length}):`);
    students.forEach(user => {
      console.log(`     - ${user.name} (${user.email}) - Status: ${user.status} - Primary Campus: ${user.primaryCampusId}`);
    });

    // 5. Test the searchRecipients query conditions
    console.log('\n5. Testing searchRecipients query conditions...');
    
    // Test 1: Basic query without filters
    const basicQuery = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    console.log(`   Basic query (status: ACTIVE): ${basicQuery.length} users found`);

    // Test 2: Query with campus filter
    const campuses = await prisma.campus.findMany({ take: 1 });
    if (campuses.length > 0) {
      const campusQuery = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          activeCampuses: {
            some: {
              campusId: campuses[0].id,
              status: 'ACTIVE'
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          userType: true,
        },
        take: 5
      });
      console.log(`   Campus query (campusId: ${campuses[0].id}): ${campusQuery.length} users found`);
    }

    // Test 3: Query with userType filter
    const teacherQuery = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: 'CAMPUS_TEACHER'
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    console.log(`   Teacher query (userType: CAMPUS_TEACHER): ${teacherQuery.length} users found`);

    // 6. Check if there are any data inconsistencies
    console.log('\n6. Checking for data inconsistencies...');
    
    const usersWithoutCampusAccess = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['CAMPUS_TEACHER', 'CAMPUS_STUDENT', 'CAMPUS_ADMIN'] },
        activeCampuses: {
          none: {}
        }
      },
      select: {
        id: true,
        name: true,
        userType: true,
        primaryCampusId: true
      }
    });
    
    if (usersWithoutCampusAccess.length > 0) {
      console.log(`   ⚠️  Found ${usersWithoutCampusAccess.length} campus users without campus access records:`);
      usersWithoutCampusAccess.forEach(user => {
        console.log(`     - ${user.name} (${user.userType}) - Primary Campus: ${user.primaryCampusId}`);
      });
    } else {
      console.log('   ✅ All campus users have proper campus access records');
    }

    // 7. Summary and recommendations
    console.log('\n📋 Summary and Recommendations:');
    
    if (totalUsers === 0) {
      console.log('   🔧 Action Required: Run database seeding');
      console.log('      Command: npm run db:seed');
    } else if (usersWithoutCampusAccess.length > 0) {
      console.log('   🔧 Action Required: Fix campus access records');
      console.log('      Some users are missing campus access records');
    } else {
      console.log('   ✅ Database appears to be properly seeded');
      console.log('   🔍 Issue might be in the frontend API calls or session data');
      console.log('   📝 Check browser console for API errors');
      console.log('   📝 Verify session.user.primaryCampusId is being passed correctly');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugRecipientLoading();
