/**
 * Test the UnifiedFeeManagementService directly
 */

import { PrismaClient } from '@prisma/client';

async function testService() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testing UnifiedFeeManagementService directly...');
    
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Import the service (need to use dynamic import for ES modules)
    const serviceModule = await import('./src/server/api/services/unified-fee-management.service.js');
    const { UnifiedFeeManagementService } = serviceModule;
    
    console.log('✅ Service imported');
    
    const service = new UnifiedFeeManagementService(prisma);
    
    try {
      console.log('🔄 Calling getConfiguration...');
      const config = await service.getConfiguration();
      
      console.log('✅ Configuration retrieved successfully!');
      console.log('📋 Configuration summary:');
      console.log('- Institution ID:', config.institutionId || 'Not set');
      console.log('- Campus ID:', config.campusId || 'Not set');
      console.log('- Currency:', config.general?.currency?.code || 'Not set');
      console.log('- Late fees enabled:', config.lateFees?.enabled || false);
      console.log('- Receipts enabled:', config.receipts?.enabled || false);
      console.log('- Notifications enabled:', config.notifications?.enabled || false);
      
      return true;
    } catch (serviceError) {
      console.error('❌ Service error:', serviceError);
      console.error('Error message:', serviceError.message);
      console.error('Error stack:', serviceError.stack);
      return false;
    }
    
  } catch (error) {
    console.error('❌ General error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Database disconnected');
  }
}

testService().then((success) => {
  if (success) {
    console.log('✅ Test completed successfully');
  } else {
    console.log('❌ Test failed');
  }
  process.exit(success ? 0 : 1);
});