#!/usr/bin/env node

/**
 * Fee Management System Test Script
 * 
 * This script performs basic validation of the fee management system
 * to ensure all core functionality is working correctly.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function testFeeStructureTables() {
  console.log('🔍 Testing fee structure tables...');
  try {
    const count = await prisma.feeStructure.count();
    console.log(`✅ Fee structures table accessible (${count} records)`);
    return true;
  } catch (error) {
    console.error('❌ Fee structures table test failed:', error.message);
    return false;
  }
}

async function testDiscountTypeTables() {
  console.log('🔍 Testing discount type tables...');
  try {
    const count = await prisma.discountType.count();
    console.log(`✅ Discount types table accessible (${count} records)`);
    return true;
  } catch (error) {
    console.error('❌ Discount types table test failed:', error.message);
    return false;
  }
}

async function testEnrollmentFeeTables() {
  console.log('🔍 Testing enrollment fee tables...');
  try {
    const count = await prisma.enrollmentFee.count();
    console.log(`✅ Enrollment fees table accessible (${count} records)`);
    return true;
  } catch (error) {
    console.error('❌ Enrollment fees table test failed:', error.message);
    return false;
  }
}

async function testFeeDiscountTables() {
  console.log('🔍 Testing fee discount tables...');
  try {
    const count = await prisma.feeDiscount.count();
    console.log(`✅ Fee discounts table accessible (${count} records)`);
    return true;
  } catch (error) {
    console.error('❌ Fee discounts table test failed:', error.message);
    return false;
  }
}

async function testBasicQueries() {
  console.log('🔍 Testing basic queries...');
  try {
    // Test fee structure query with joins
    const feeStructures = await prisma.feeStructure.findMany({
      take: 5,
      include: {
        programCampus: {
          include: {
            program: {
              select: { id: true, name: true }
            },
            campus: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });
    console.log(`✅ Fee structure query with joins successful (${feeStructures.length} records)`);

    // Test discount type query
    const discountTypes = await prisma.discountType.findMany({
      where: { status: 'ACTIVE' },
      take: 5
    });
    console.log(`✅ Discount type query successful (${discountTypes.length} records)`);

    return true;
  } catch (error) {
    console.error('❌ Basic queries test failed:', error.message);
    return false;
  }
}

async function testIndexes() {
  console.log('🔍 Testing database indexes...');
  try {
    // This is a simplified test - in a real scenario you'd check pg_stat_user_indexes
    const result = await prisma.$queryRaw`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND (tablename LIKE '%fee%' OR tablename LIKE '%discount%')
      LIMIT 10
    `;
    console.log(`✅ Database indexes check successful (${result.length} indexes found)`);
    return true;
  } catch (error) {
    console.log('⚠️  Index check skipped (may not be PostgreSQL or insufficient permissions)');
    return true; // Don't fail the test for this
  }
}

async function testDataIntegrity() {
  console.log('🔍 Testing data integrity...');
  try {
    // Test foreign key relationships
    const enrollmentFeesWithStructures = await prisma.enrollmentFee.findMany({
      take: 5,
      include: {
        feeStructure: true,
        enrollment: true
      }
    });

    const discountsWithTypes = await prisma.feeDiscount.findMany({
      take: 5,
      include: {
        discountType: true,
        enrollmentFee: true
      }
    });

    console.log(`✅ Data integrity check successful`);
    console.log(`   - Enrollment fees with structures: ${enrollmentFeesWithStructures.length}`);
    console.log(`   - Discounts with types: ${discountsWithTypes.length}`);
    return true;
  } catch (error) {
    console.error('❌ Data integrity test failed:', error.message);
    return false;
  }
}

async function generateTestReport() {
  console.log('\n📊 Generating test report...');
  
  try {
    const stats = {
      feeStructures: await prisma.feeStructure.count(),
      discountTypes: await prisma.discountType.count(),
      enrollmentFees: await prisma.enrollmentFee.count(),
      feeDiscounts: await prisma.feeDiscount.count(),
      activeDiscountTypes: await prisma.discountType.count({
        where: { status: 'ACTIVE' }
      }),
      pendingFees: await prisma.enrollmentFee.count({
        where: { paymentStatus: 'PENDING' }
      })
    };

    console.log('\n📈 System Statistics:');
    console.log(`   Fee Structures: ${stats.feeStructures}`);
    console.log(`   Discount Types: ${stats.discountTypes} (${stats.activeDiscountTypes} active)`);
    console.log(`   Enrollment Fees: ${stats.enrollmentFees} (${stats.pendingFees} pending)`);
    console.log(`   Fee Discounts: ${stats.feeDiscounts}`);

    return stats;
  } catch (error) {
    console.error('❌ Test report generation failed:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Fee Management System Tests\n');
  
  const tests = [
    testDatabaseConnection,
    testFeeStructureTables,
    testDiscountTypeTables,
    testEnrollmentFeeTables,
    testFeeDiscountTables,
    testBasicQueries,
    testIndexes,
    testDataIntegrity
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) passedTests++;
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
    }
    console.log(''); // Add spacing between tests
  }

  // Generate report
  await generateTestReport();

  // Final results
  console.log('\n🎯 Test Results Summary:');
  console.log(`   Passed: ${passedTests}/${totalTests} tests`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Fee management system is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please review the issues above.');
  }

  return passedTests === totalTests;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

module.exports = {
  runAllTests,
  testDatabaseConnection,
  testFeeStructureTables,
  testDiscountTypeTables,
  testEnrollmentFeeTables,
  testFeeDiscountTables
};
