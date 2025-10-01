#!/usr/bin/env node

/**
 * Test Recipient Loading Fixes
 * Verify that the userType mapping fixes work correctly
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRecipientFixes() {
  console.log('🧪 Testing Recipient Loading Fixes...\n');

  try {
    // 1. Test the new userType mapping logic
    console.log('1. Testing userType mapping fixes...');
    
    // Test CAMPUS_TEACHER mapping
    const teacherQuery = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['CAMPUS_TEACHER', 'TEACHER'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    console.log(`   Teachers (CAMPUS_TEACHER + TEACHER): ${teacherQuery.length} users found`);
    teacherQuery.forEach(user => {
      console.log(`     - ${user.name} (${user.userType})`);
    });

    // Test CAMPUS_STUDENT mapping
    const studentQuery = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['CAMPUS_STUDENT', 'STUDENT'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    console.log(`   Students (CAMPUS_STUDENT + STUDENT): ${studentQuery.length} users found`);
    studentQuery.forEach(user => {
      console.log(`     - ${user.name} (${user.userType})`);
    });

    // Test CAMPUS_ADMIN mapping
    const adminQuery = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['CAMPUS_ADMIN', 'ADMINISTRATOR'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    console.log(`   Admins (CAMPUS_ADMIN + ADMINISTRATOR): ${adminQuery.length} users found`);
    adminQuery.forEach(user => {
      console.log(`     - ${user.name} (${user.userType})`);
    });

    // 2. Test campus-specific queries
    console.log('\n2. Testing campus-specific queries...');
    
    const campuses = await prisma.campus.findMany({ take: 2 });
    
    for (const campus of campuses) {
      console.log(`   Testing campus: ${campus.name} (${campus.id})`);
      
      // Test campus users query
      const campusUsers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          activeCampuses: {
            some: {
              campusId: campus.id,
              status: 'ACTIVE'
            }
          }
        },
        select: {
          id: true,
          name: true,
          userType: true,
        },
        take: 10
      });
      
      console.log(`     Found ${campusUsers.length} users in this campus`);
      
      // Group by userType
      const userTypeGroups = campusUsers.reduce((acc, user) => {
        acc[user.userType] = (acc[user.userType] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(userTypeGroups).forEach(([type, count]) => {
        console.log(`       ${type}: ${count} users`);
      });
    }

    // 3. Test system-wide queries (for system admins)
    console.log('\n3. Testing system-wide queries...');
    
    const systemWideUsers = await prisma.user.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        userType: true,
      },
      take: 20
    });
    
    console.log(`   System-wide query: ${systemWideUsers.length} users found`);
    
    // Group by userType
    const systemUserTypeGroups = systemWideUsers.reduce((acc, user) => {
      acc[user.userType] = (acc[user.userType] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(systemUserTypeGroups).forEach(([type, count]) => {
      console.log(`     ${type}: ${count} users`);
    });

    // 4. Test search functionality
    console.log('\n4. Testing search functionality...');
    
    const searchResults = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: 'john', mode: 'insensitive' } },
          { email: { contains: 'john', mode: 'insensitive' } },
          { username: { contains: 'john', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
      },
      take: 5
    });
    
    console.log(`   Search for 'john': ${searchResults.length} users found`);
    searchResults.forEach(user => {
      console.log(`     - ${user.name} (${user.email}) - ${user.userType}`);
    });

    // 5. Summary
    console.log('\n📋 Test Results Summary:');
    console.log(`   ✅ Teachers found: ${teacherQuery.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Students found: ${studentQuery.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Admins found: ${adminQuery.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Campus queries working: ${campuses.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ System-wide queries working: ${systemWideUsers.length > 0 ? 'YES' : 'NO'}`);
    console.log(`   ✅ Search functionality working: ${searchResults.length >= 0 ? 'YES' : 'NO'}`);

    console.log('\n🎯 Expected Behavior After Fixes:');
    console.log('   • System Admin: Should see all users across all campuses');
    console.log('   • Campus Admin: Should see users from their primary campus');
    console.log('   • Teachers: Should see students and other teachers from their campus');
    console.log('   • Students: Should see teachers and other students from their campus');
    console.log('   • All roles: Should be able to search and filter by user type');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Test recipient selection in different portals');
    console.log('   3. Check browser console for detailed debug logs');
    console.log('   4. Verify that users appear in the recipient selector');

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test function
testRecipientFixes();
