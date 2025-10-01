#!/usr/bin/env node

/**
 * Fix CAT Settings Structure
 * 
 * This script fixes the CAT settings structure to match the expected interface
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCATSettings() {
  console.log('🔧 Fixing CAT Settings Structure...\n');

  try {
    // Get the CAT activity
    const activity = await prisma.activity.findFirst({
      where: {
        status: 'ACTIVE',
        content: {
          path: ['settings', 'catSettings', 'enabled'],
          equals: true
        }
      },
      select: {
        id: true,
        title: true,
        content: true
      }
    });

    if (!activity) {
      console.log('❌ No CAT-enabled activity found');
      return;
    }

    console.log(`Found CAT activity: ${activity.title}`);
    
    let content = activity.content;
    console.log('\nCurrent CAT settings:');
    console.log(JSON.stringify(content.settings.catSettings, null, 2));

    // Fix the CAT settings structure
    const fixedCatSettings = {
      enabled: true,
      algorithm: 'irt_2pl', // Map from abilityEstimationMethod
      startingDifficulty: 0, // Map from startingAbility
      terminationCriteria: {
        minQuestions: content.settings.catSettings.terminationCriteria.minQuestions || 5,
        maxQuestions: content.settings.catSettings.terminationCriteria.maxQuestions || 20,
        standardErrorThreshold: content.settings.catSettings.terminationCriteria.standardErrorThreshold || 0.3
      },
      itemSelectionMethod: content.settings.catSettings.itemSelectionMethod || 'maximum_information',
      questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANKS'], // Add default question types
      difficultyRange: {
        min: -3.0,
        max: 3.0
      },
      bloomsLevels: ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE'] // Add default Bloom's levels
    };

    // Update the content
    content.settings.catSettings = fixedCatSettings;

    // Update the activity
    await prisma.activity.update({
      where: { id: activity.id },
      data: {
        content: content
      }
    });

    console.log('\n✅ CAT settings updated successfully!');
    console.log('\nNew CAT settings:');
    console.log(JSON.stringify(fixedCatSettings, null, 2));

    // Verify the update
    const updatedActivity = await prisma.activity.findUnique({
      where: { id: activity.id },
      select: {
        content: true
      }
    });

    const updatedCatSettings = updatedActivity.content.settings.catSettings;
    console.log('\n🔍 Verification:');
    console.log(`  Algorithm: ${updatedCatSettings.algorithm}`);
    console.log(`  Starting difficulty: ${updatedCatSettings.startingDifficulty}`);
    console.log(`  Min questions: ${updatedCatSettings.terminationCriteria.minQuestions}`);
    console.log(`  Max questions: ${updatedCatSettings.terminationCriteria.maxQuestions}`);
    console.log(`  Item selection: ${updatedCatSettings.itemSelectionMethod}`);
    console.log(`  Question types: ${updatedCatSettings.questionTypes?.join(', ')}`);

    console.log('\n🎉 CAT settings are now properly structured!');

  } catch (error) {
    console.error('\n❌ Error fixing CAT settings:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  fixCATSettings().catch(console.error);
}

module.exports = { fixCATSettings };
