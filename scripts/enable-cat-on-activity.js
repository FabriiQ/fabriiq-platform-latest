#!/usr/bin/env node

/**
 * Enable CAT on an existing activity for testing
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function enableCATOnActivity() {
  console.log('🎯 Enabling CAT on an existing activity for testing...\n');

  try {
    // Find a quiz activity to convert to CAT
    const activities = await prisma.activity.findMany({
      where: {
        status: 'ACTIVE',
        purpose: 'ASSESSMENT' // Look for assessment activities
      },
      select: {
        id: true,
        title: true,
        content: true,
        subject: {
          select: { name: true }
        }
      },
      take: 5
    });

    console.log(`Found ${activities.length} assessment activities:`);
    activities.forEach((act, index) => {
      console.log(`  ${index + 1}. ${act.title} (${act.id})`);
      console.log(`     Subject: ${act.subject?.name || 'Unknown'}`);
    });

    if (activities.length === 0) {
      console.log('❌ No assessment activities found to convert to CAT');
      return;
    }

    // Select the first activity
    const selectedActivity = activities[0];
    console.log(`\n🔧 Converting activity: ${selectedActivity.title}`);

    // Get current content
    let content = selectedActivity.content;
    if (typeof content === 'string') {
      content = JSON.parse(content);
    }

    // Ensure it's a quiz
    if (!content || content.type !== 'quiz') {
      console.log('❌ Selected activity is not a quiz type');
      return;
    }

    console.log(`Current content structure:`);
    console.log(`  Type: ${content.type}`);
    console.log(`  Questions: ${content.questions?.length || 0}`);
    console.log(`  Has settings: ${!!content.settings}`);

    // Add CAT settings
    if (!content.settings) {
      content.settings = {};
    }

    content.settings.catSettings = {
      enabled: true,
      itemSelectionMethod: 'maximum_information',
      abilityEstimationMethod: 'maximum_likelihood',
      terminationCriteria: {
        minQuestions: 5,
        maxQuestions: 20,
        standardErrorThreshold: 0.3
      },
      startingAbility: 0,
      adaptiveParameters: {
        learningRate: 0.1,
        forgettingRate: 0.05,
        difficultyAdjustment: 0.2
      }
    };

    // Ensure assessment mode is set
    content.assessmentMode = 'cat';

    // Update the activity
    await prisma.activity.update({
      where: { id: selectedActivity.id },
      data: {
        content: content
      }
    });

    console.log(`\n✅ Successfully enabled CAT on activity: ${selectedActivity.title}`);
    console.log(`Activity ID: ${selectedActivity.id}`);
    console.log(`\nCAT Settings applied:`);
    console.log(JSON.stringify(content.settings.catSettings, null, 2));

    // Verify the update
    const updatedActivity = await prisma.activity.findUnique({
      where: { id: selectedActivity.id },
      select: {
        id: true,
        title: true,
        content: true
      }
    });

    const updatedContent = updatedActivity.content;
    const catEnabled = updatedContent?.settings?.catSettings?.enabled;
    
    console.log(`\n🔍 Verification:`);
    console.log(`  CAT Enabled: ${catEnabled}`);
    console.log(`  Assessment Mode: ${updatedContent?.assessmentMode}`);

    if (catEnabled) {
      console.log(`\n🎉 CAT is now enabled! You can test with:`);
      console.log(`  Activity ID: ${selectedActivity.id}`);
      console.log(`  URL: /student/class/[classId]/subjects/[subjectId]/activities/${selectedActivity.id}`);
    }

  } catch (error) {
    console.error('\n❌ Error enabling CAT:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  enableCATOnActivity().catch(console.error);
}

module.exports = { enableCATOnActivity };
