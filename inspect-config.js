/**
 * Script to inspect the existing fee configuration
 */

const { PrismaClient } = require('@prisma/client');

async function inspectFeeConfiguration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Inspecting fee configuration...');
    
    await prisma.$connect();
    
    const feeConfig = await prisma.systemConfig.findFirst({
      where: {
        key: 'unified_fee_config',
        category: 'fee_management'
      }
    });
    
    if (feeConfig) {
      console.log('📋 Configuration Details:');
      console.log('ID:', feeConfig.id);
      console.log('Key:', feeConfig.key);
      console.log('Category:', feeConfig.category);
      console.log('Description:', feeConfig.description);
      console.log('Created At:', feeConfig.createdAt);
      console.log('Updated At:', feeConfig.updatedAt);
      console.log('Created By ID:', feeConfig.createdById);
      console.log('Updated By ID:', feeConfig.updatedById);
      console.log('Is Public:', feeConfig.isPublic);
      
      console.log('\n📄 Configuration Value:');
      console.log(JSON.stringify(feeConfig.value, null, 2));
      
      // Check if the value structure looks correct
      if (feeConfig.value && typeof feeConfig.value === 'object') {
        const value = feeConfig.value;
        console.log('\n🔍 Value Structure Analysis:');
        console.log('- Has general section:', 'general' in value);
        console.log('- Has lateFees section:', 'lateFees' in value);
        console.log('- Has receipts section:', 'receipts' in value);
        console.log('- Has notifications section:', 'notifications' in value);
        console.log('- Has reporting section:', 'reporting' in value);
        console.log('- Has system section:', 'system' in value);
        
        if (value.general && value.general.currency) {
          console.log('- Currency code:', value.general.currency.code);
        }
      }
      
    } else {
      console.log('❌ No fee configuration found');
    }
    
  } catch (error) {
    console.error('❌ Error inspecting configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectFeeConfiguration();