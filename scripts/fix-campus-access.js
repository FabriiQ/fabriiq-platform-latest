#!/usr/bin/env node

/**
 * Fix Campus Access Records
 * Ensure all users have proper campus access records
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCampusAccess() {
  console.log('🔧 Fixing Campus Access Records...\n');

  try {
    // 1. Get all campuses
    const campuses = await prisma.campus.findMany({
      select: {
        id: true,
        name: true
      }
    });
    console.log(`Found ${campuses.length} campuses`);

    // 2. Get users without campus access
    const usersWithoutAccess = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        userType: { in: ['TEACHER', 'STUDENT', 'CAMPUS_TEACHER', 'CAMPUS_STUDENT', 'CAMPUS_ADMIN', 'ADMINISTRATOR'] },
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

    console.log(`Found ${usersWithoutAccess.length} users without campus access`);

    if (usersWithoutAccess.length === 0) {
      console.log('✅ All users already have campus access records');
      return;
    }

    // 3. Create campus access records
    let fixedCount = 0;
    const defaultCampus = campuses[0]; // Use first campus as default

    for (const user of usersWithoutAccess) {
      try {
        // Determine which campus to assign
        let targetCampusId = user.primaryCampusId || defaultCampus.id;
        
        // Verify the campus exists
        const campusExists = campuses.find(c => c.id === targetCampusId);
        if (!campusExists) {
          targetCampusId = defaultCampus.id;
        }

        // Create campus access record
        await prisma.userCampusAccess.create({
          data: {
            userId: user.id,
            campusId: targetCampusId,
            status: 'ACTIVE',
            accessLevel: user.userType.includes('ADMIN') ? 'FULL' : 'STANDARD',
            grantedAt: new Date(),
            grantedBy: 'system-fix'
          }
        });

        console.log(`   ✅ Fixed access for ${user.name} (${user.userType}) -> ${campusExists?.name || defaultCampus.name}`);
        fixedCount++;
      } catch (error) {
        console.log(`   ❌ Failed to fix access for ${user.name}: ${error.message}`);
      }
    }

    console.log(`\n🎯 Fixed campus access for ${fixedCount} users`);

    // 4. Verify the fix
    console.log('\n📊 Verification:');
    const campusUserCounts = await Promise.all(
      campuses.map(async (campus) => {
        const count = await prisma.user.count({
          where: {
            status: 'ACTIVE',
            activeCampuses: {
              some: {
                campusId: campus.id,
                status: 'ACTIVE'
              }
            }
          }
        });
        return { campus: campus.name, count };
      })
    );

    campusUserCounts.forEach(({ campus, count }) => {
      console.log(`   ${campus}: ${count} users`);
    });

    // 5. Test searchRecipients query with campus filter
    console.log('\n🧪 Testing searchRecipients with campus filter:');
    for (const campus of campuses.slice(0, 2)) { // Test first 2 campuses
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
        take: 5
      });
      console.log(`   ${campus.name}: ${campusUsers.length} users found`);
    }

    console.log('\n✅ Campus access fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing campus access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix function
fixCampusAccess();
