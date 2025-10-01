/**
 * Fix CAT activity configuration
 * This script adds proper CAT settings to activities that have assessmentMode: 'cat' but missing settings
 */

const { PrismaClient } = require('@prisma/client');

async function fixCATActivityConfig() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing CAT activity configurations...\n');
    
    // Find activities with CAT assessment mode
    const catActivities = await prisma.activity.findMany({
      where: {
        content: {
          path: ['assessmentMode'],
          equals: 'cat'
        }
      }
    });
    
    console.log(`Found ${catActivities.length} CAT activities to check:\n`);
    
    for (const activity of catActivities) {
      console.log(`📋 Processing: ${activity.title} (ID: ${activity.id})`);
      
      const content = activity.content;
      const hasSettingsCat = !!(content.settings?.catSettings);
      const hasRootCat = !!(content.catSettings);
      
      if (!hasSettingsCat && !hasRootCat) {
        console.log(`   ⚠️  Missing CAT settings - adding defaults...`);
        
        // Add default CAT settings to the activity
        const updatedContent = {
          ...content,
          settings: {
            ...content.settings,
            catSettings: {
              enabled: true,
              algorithm: 'irt_2pl',
              startingDifficulty: 0,
              terminationCriteria: {
                minQuestions: 5,
                maxQuestions: 20,
                standardErrorThreshold: 0.3
              },
              itemSelectionMethod: 'maximum_information',
              questionTypes: ['MULTIPLE_CHOICE'],
              difficultyRange: {
                min: -3,
                max: 3
              },
              markingConfig: {
                positiveMarking: {
                  easy: 1,
                  medium: 2,
                  hard: 3
                },
                negativeMarking: {
                  enabled: true,
                  mcqPenalty: -1,
                  titaPenalty: 0,
                  unansweredPenalty: 0
                },
                scoringMethod: 'percentile'
              }
            }
          }
        };
        
        // Update the activity
        await prisma.activity.update({
          where: { id: activity.id },
          data: {
            content: updatedContent
          }
        });
        
        console.log(`   ✅ Added default CAT settings`);
      } else {
        console.log(`   ✅ CAT settings already present`);
      }
    }
    
    console.log('\n🎉 CAT activity configuration fix completed!');
    console.log('All CAT activities now have proper settings configured.');
    
  } catch (error) {
    console.error('❌ Error fixing CAT activity configurations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixCATActivityConfig().catch(console.error);
