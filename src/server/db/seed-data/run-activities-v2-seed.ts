import { seedActivitiesV2Comprehensive } from './activities-v2-comprehensive';

async function main() {
  console.log('🚀 Starting comprehensive Activities v2 seeding for Year 8 C...');
  console.log('📅 Started at:', new Date().toISOString());

  try {
    await seedActivitiesV2Comprehensive();
    console.log('\n✅ Activities v2 seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during Activities v2 seeding:', error);
    throw error;
  } finally {
    console.log('📅 Completed at:', new Date().toISOString());
  }
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
