/**
 * Test script to validate the configuration against the Zod schema
 */

const { PrismaClient } = require('@prisma/client');

async function testSchemaValidation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing schema validation...');
    
    await prisma.$connect();
    
    // Get the existing configuration
    const feeConfig = await prisma.systemConfig.findFirst({
      where: {
        key: 'unified_fee_config',
        category: 'fee_management'
      }
    });
    
    if (!feeConfig) {
      console.log('❌ No fee configuration found');
      return;
    }
    
    console.log('✅ Found configuration, attempting validation...');
    
    // Import the validation modules
    const { unifiedFeeConfigSchema } = require('./src/types/fee-management-unified');
    
    try {
      const validatedConfig = unifiedFeeConfigSchema.parse(feeConfig.value);
      console.log('✅ Schema validation passed!');
      console.log('📋 Validated configuration structure:');
      console.log('- Institution ID:', validatedConfig.institutionId || 'Not set');
      console.log('- Campus ID:', validatedConfig.campusId || 'Not set');
      console.log('- Currency:', validatedConfig.general.currency.code);
      console.log('- Late fees enabled:', validatedConfig.lateFees.enabled);
      console.log('- Receipts enabled:', validatedConfig.receipts.enabled);
      console.log('- Notifications enabled:', validatedConfig.notifications.enabled);
      
    } catch (validationError) {
      console.error('❌ Schema validation failed!');
      console.error('Validation errors:', validationError.errors);
      
      // Log each validation error in detail
      if (validationError.errors) {
        validationError.errors.forEach((error, index) => {
          console.error(`\nError ${index + 1}:`);
          console.error('- Path:', error.path.join('.'));
          console.error('- Message:', error.message);
          console.error('- Received:', error.received);
          console.error('- Expected:', error.expected);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchemaValidation();