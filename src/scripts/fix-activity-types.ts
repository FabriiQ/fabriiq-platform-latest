/**
 * Script to fix activity types for backward/forward compatibility
 * 
 * This script ensures that all activities have proper activity type fields
 * set for both legacy and V2 compatibility.
 */

import { PrismaClient, LearningActivityType, AssessmentType, ActivityPurpose } from '@prisma/client';

const prisma = new PrismaClient();

interface ActivityContent {
  type?: string;
  activityType?: string;
  version?: string;
  [key: string]: any;
}

async function fixActivityTypes() {
  console.log('🔧 Starting activity types fix...');

  try {
    // Get all activities
    const activities = await prisma.activity.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        learningType: true,
        gradingConfig: true,
        purpose: true,
        assessmentType: true,
      }
    });

    console.log(`📊 Found ${activities.length} activities to process`);

    let updatedCount = 0;
    let v2Count = 0;
    let legacyCount = 0;

    for (const activity of activities) {
      const content = activity.content as ActivityContent;
      let needsUpdate = false;
      let updateData: any = {};

      // Check if this is a V2 activity
      const isV2Activity = activity.gradingConfig && 
                          typeof activity.gradingConfig === 'object' && 
                          (activity.gradingConfig as any).version === '2.0';

      if (isV2Activity) {
        v2Count++;
        
        // For V2 activities, ensure learningType is set based on content.type
        if (content?.type && !activity.learningType) {
          const learningType = mapContentTypeToLearningType(content.type);
          if (learningType) {
            updateData.learningType = learningType;
            needsUpdate = true;
            console.log(`  ✅ V2 Activity "${activity.title}": Setting learningType to ${learningType}`);
          }
        }

        // Ensure gradingConfig has the type field
        if (!activity.gradingConfig || !(activity.gradingConfig as any).type) {
          updateData.gradingConfig = {
            ...(activity.gradingConfig as any || {}),
            version: '2.0',
            type: content?.type || 'quiz'
          };
          needsUpdate = true;
          console.log(`  ✅ V2 Activity "${activity.title}": Updating gradingConfig`);
        }
      } else {
        legacyCount++;
        
        // For legacy activities, ensure content has activityType if learningType exists
        if (activity.learningType && content && !content.activityType && !content.type) {
          const activityType = mapLearningTypeToActivityType(activity.learningType);
          if (activityType) {
            updateData.content = {
              ...content,
              activityType: activityType
            };
            needsUpdate = true;
            console.log(`  ✅ Legacy Activity "${activity.title}": Setting content.activityType to ${activityType}`);
          }
        }

        // Ensure purpose and assessmentType are set for legacy activities
        if (!activity.purpose) {
          updateData.purpose = ActivityPurpose.LEARNING;
          needsUpdate = true;
        }

        if (!activity.assessmentType && activity.learningType) {
          const assessmentType = mapLearningTypeToAssessmentType(activity.learningType);
          if (assessmentType) {
            updateData.assessmentType = assessmentType;
            needsUpdate = true;
          }
        }
      }

      // Apply updates if needed
      if (needsUpdate) {
        await prisma.activity.update({
          where: { id: activity.id },
          data: updateData
        });
        updatedCount++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`  • Total activities processed: ${activities.length}`);
    console.log(`  • V2 activities: ${v2Count}`);
    console.log(`  • Legacy activities: ${legacyCount}`);
    console.log(`  • Activities updated: ${updatedCount}`);
    console.log(`\n✅ Activity types fix completed successfully!`);

  } catch (error) {
    console.error('❌ Error fixing activity types:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function mapContentTypeToLearningType(contentType: string): LearningActivityType | null {
  switch (contentType.toLowerCase()) {
    case 'quiz':
      return LearningActivityType.QUIZ;
    case 'reading':
      return LearningActivityType.READING;
    case 'video':
      return LearningActivityType.VIDEO;
    case 'multiple-choice':
      return LearningActivityType.MULTIPLE_CHOICE;
    case 'true-false':
      return LearningActivityType.TRUE_FALSE;
    case 'fill-in-the-blanks':
      return LearningActivityType.FILL_IN_THE_BLANKS;
    case 'matching':
      return LearningActivityType.MATCHING;
    case 'sequence':
      return LearningActivityType.SEQUENCE;
    case 'drag-and-drop':
      return LearningActivityType.DRAG_AND_DROP;
    case 'drag-the-words':
      return LearningActivityType.DRAG_THE_WORDS;
    case 'numeric':
      return LearningActivityType.NUMERIC;
    case 'multiple-response':
      return LearningActivityType.MULTIPLE_RESPONSE;
    case 'flash-cards':
      return LearningActivityType.FLASH_CARDS;
    case 'h5p':
      return LearningActivityType.H5P;
    case 'book':
      return LearningActivityType.BOOK;
    default:
      return null;
  }
}

function mapLearningTypeToActivityType(learningType: LearningActivityType): string | null {
  switch (learningType) {
    case LearningActivityType.QUIZ:
      return 'quiz';
    case LearningActivityType.READING:
      return 'reading';
    case LearningActivityType.VIDEO:
      return 'video';
    case LearningActivityType.MULTIPLE_CHOICE:
      return 'multiple-choice';
    case LearningActivityType.TRUE_FALSE:
      return 'true-false';
    case LearningActivityType.FILL_IN_THE_BLANKS:
      return 'fill-in-the-blanks';
    case LearningActivityType.MATCHING:
      return 'matching';
    case LearningActivityType.SEQUENCE:
      return 'sequence';
    case LearningActivityType.DRAG_AND_DROP:
      return 'drag-and-drop';
    case LearningActivityType.DRAG_THE_WORDS:
      return 'drag-the-words';
    case LearningActivityType.NUMERIC:
      return 'numeric';
    case LearningActivityType.MULTIPLE_RESPONSE:
      return 'multiple-response';
    case LearningActivityType.FLASH_CARDS:
      return 'flash-cards';
    case LearningActivityType.H5P:
      return 'h5p';
    case LearningActivityType.BOOK:
      return 'book';
    default:
      return null;
  }
}

function mapLearningTypeToAssessmentType(learningType: LearningActivityType): AssessmentType | null {
  switch (learningType) {
    case LearningActivityType.QUIZ:
    case LearningActivityType.MULTIPLE_CHOICE:
    case LearningActivityType.TRUE_FALSE:
    case LearningActivityType.FILL_IN_THE_BLANKS:
    case LearningActivityType.MATCHING:
    case LearningActivityType.SEQUENCE:
    case LearningActivityType.DRAG_AND_DROP:
    case LearningActivityType.DRAG_THE_WORDS:
    case LearningActivityType.NUMERIC:
    case LearningActivityType.MULTIPLE_RESPONSE:
      return AssessmentType.QUIZ;
    case LearningActivityType.READING:
    case LearningActivityType.VIDEO:
    case LearningActivityType.FLASH_CARDS:
    case LearningActivityType.H5P:
    case LearningActivityType.BOOK:
      return AssessmentType.ASSIGNMENT;
    default:
      return AssessmentType.QUIZ;
  }
}

// Run the script if called directly
if (require.main === module) {
  fixActivityTypes()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { fixActivityTypes };
