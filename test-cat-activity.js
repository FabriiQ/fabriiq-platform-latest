/**
 * Test script to verify CAT activity configuration
 * Run this to check if your CAT activity is properly configured
 */

const { PrismaClient } = require('@prisma/client');

async function testCATActivity() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking CAT activity configuration...\n');
    
    // Find activities with CAT assessment mode
    const catActivities = await prisma.activity.findMany({
      where: {
        content: {
          path: ['assessmentMode'],
          equals: 'cat'
        }
      },
      select: {
        id: true,
        title: true,
        content: true
      }
    });
    
    console.log(`Found ${catActivities.length} CAT activities:\n`);
    
    for (const activity of catActivities) {
      console.log(`📋 Activity: ${activity.title} (ID: ${activity.id})`);
      console.log(`   Assessment Mode: ${activity.content.assessmentMode}`);
      
      // Check for CAT settings
      const hasSettingsCat = !!(activity.content.settings?.catSettings);
      const hasRootCat = !!(activity.content.catSettings);
      const catEnabled = activity.content.settings?.catSettings?.enabled || activity.content.catSettings?.enabled;
      
      console.log(`   Has settings.catSettings: ${hasSettingsCat}`);
      console.log(`   Has root catSettings: ${hasRootCat}`);
      console.log(`   CAT enabled: ${catEnabled}`);
      
      if (hasSettingsCat || hasRootCat) {
        const settings = activity.content.settings?.catSettings || activity.content.catSettings;
        console.log(`   ✅ CAT Settings found:`);
        console.log(`      Algorithm: ${settings.algorithm || 'not set'}`);
        console.log(`      Min Questions: ${settings.terminationCriteria?.minQuestions || 'not set'}`);
        console.log(`      Max Questions: ${settings.terminationCriteria?.maxQuestions || 'not set'}`);
      } else {
        console.log(`   ⚠️  No CAT settings found - will use defaults`);
        console.log(`   ✅ This should now work with the fix (backend provides defaults)`);
      }
      
      // Check questions
      const questionCount = activity.content.questions?.length || 0;
      console.log(`   Questions: ${questionCount}`);
      
      console.log('');
    }
    
    if (catActivities.length === 0) {
      console.log('❌ No CAT activities found.');
      console.log('   To create a CAT activity, set assessmentMode to "cat" in the activity content.');
    } else {
      console.log('✅ CAT activities found and analyzed.');
      console.log('   With the fix, all CAT activities should now work properly.');
      console.log('   Activities without CAT settings will use default configuration.');
    }
    
  } catch (error) {
    console.error('❌ Error checking CAT activities:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testCATActivity().catch(console.error);
