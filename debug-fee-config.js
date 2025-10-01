/**
 * Debug script to test the fee configuration endpoint
 */

const { PrismaClient } = require('@prisma/client');

async function testFeeConfiguration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Check if SystemConfig table exists and is accessible
    console.log('🔍 Checking SystemConfig table...');
    const systemConfigs = await prisma.systemConfig.findMany({
      take: 5
    });
    console.log(`✅ Found ${systemConfigs.length} system configs`);
    
    // Check for existing fee configuration
    console.log('🔍 Checking for existing fee configuration...');
    const feeConfig = await prisma.systemConfig.findFirst({
      where: {
        key: 'unified_fee_config',
        category: 'fee_management'
      }
    });
    
    if (feeConfig) {
      console.log('✅ Found existing fee configuration:', {
        id: feeConfig.id,
        key: feeConfig.key,
        category: feeConfig.category,
        hasValue: !!feeConfig.value,
        createdAt: feeConfig.createdAt
      });
    } else {
      console.log('ℹ️ No existing fee configuration found');
    }
    
    // Test creating a simple config record
    console.log('🔍 Testing config creation...');
    
    // First, we need a user ID - let's get the first user
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      console.log('❌ No users found in database - this might be the issue');
      return;
    }
    
    console.log('✅ Found user for config creation:', firstUser.id);
    
    // Try to create/update a test config
    const testConfig = await prisma.systemConfig.upsert({
      where: {
        key: 'unified_fee_config'
      },
      create: {
        key: 'unified_fee_config',
        category: 'fee_management',
        value: {
          test: true,
          created_by_debug: true
        },
        description: 'Debug test configuration',
        createdById: firstUser.id
      },
      update: {
        description: 'Debug test configuration (updated)',
        updatedById: firstUser.id
      }
    });
    
    console.log('✅ Successfully created/updated test config:', testConfig.id);
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
    
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  }
}

testFeeConfiguration()
  .then(() => {
    console.log('✅ Debug script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug script failed:', error);
    process.exit(1);
  });