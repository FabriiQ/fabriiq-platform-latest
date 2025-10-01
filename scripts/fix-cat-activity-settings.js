const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixCATActivitySettings() {
  console.log('🔧 Fixing CAT Activity Settings Structure...');

  try {
    // Find the CAT activity
    const activity = await prisma.activity.findUnique({
      where: { id: 'cmfczupgr0001vof5200zslyu' }
    });

    if (!activity) {
      console.log('❌ CAT activity not found');
      return;
    }

    console.log('✅ Found activity:', activity.title);

    // Parse current content
    const content = activity.content;
    console.log('📋 Current assessment mode:', content.assessmentMode);
    console.log('📋 Has settings:', !!content.settings);
    console.log('📋 Has CAT settings:', !!content.settings?.catSettings);

    // Create proper CAT settings structure
    const properCATSettings = {
      enabled: true,
      algorithm: 'irt_2pl',
      startingDifficulty: 0,
      terminationCriteria: {
        minQuestions: 5,
        maxQuestions: 20,
        standardErrorThreshold: 0.3
      },
      itemSelectionMethod: 'maximum_information',
      questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANKS'],
      difficultyRange: {
        min: -3.0,
        max: 3.0
      },
      bloomsLevels: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE']
    };

    // Update the activity content
    const updatedContent = {
      ...content,
      assessmentMode: 'cat',
      settings: {
        ...content.settings,
        catSettings: properCATSettings
      }
    };

    // Save the updated activity
    await prisma.activity.update({
      where: { id: activity.id },
      data: {
        content: updatedContent
      }
    });

    console.log('\n✅ Updated CAT activity with proper settings structure:');
    console.log('   ✓ Assessment Mode: cat');
    console.log('   ✓ CAT Settings: Complete structure');
    console.log('   ✓ Algorithm:', properCATSettings.algorithm);
    console.log('   ✓ Starting Difficulty:', properCATSettings.startingDifficulty);
    console.log('   ✓ Min Questions:', properCATSettings.terminationCriteria.minQuestions);
    console.log('   ✓ Max Questions:', properCATSettings.terminationCriteria.maxQuestions);
    console.log('   ✓ SE Threshold:', properCATSettings.terminationCriteria.standardErrorThreshold);
    console.log('   ✓ Item Selection:', properCATSettings.itemSelectionMethod);

    console.log('\n🎯 CAT Activity Settings Fixed Successfully!');

  } catch (error) {
    console.error('❌ Error fixing CAT activity settings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCATActivitySettings().catch(console.error);
