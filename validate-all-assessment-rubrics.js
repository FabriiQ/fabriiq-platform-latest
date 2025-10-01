const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function validateAllAssessmentRubrics() {
  try {
    console.log('🔍 Validating All Assessment Rubrics...\n');
    
    // Get all assessments
    const assessments = await prisma.assessment.findMany({
      select: {
        id: true,
        title: true,
        rubricId: true,
        rubric: true,
        gradingType: true,
        status: true,
        createdAt: true
      },
      where: {
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${assessments.length} active assessments\n`);

    const issues = [];
    const validAssessments = [];
    const fixableAssessments = [];

    // Check each assessment
    for (const assessment of assessments) {
      const assessmentInfo = {
        id: assessment.id,
        title: assessment.title,
        hasRubricId: !!assessment.rubricId,
        hasEmbeddedRubric: !!assessment.rubric,
        gradingType: assessment.gradingType,
        issue: null,
        canFix: false
      };

      // Check if assessment has rubric configuration
      if (assessment.rubricId) {
        // Check if the linked rubric exists
        const linkedRubric = await prisma.rubric.findUnique({
          where: { id: assessment.rubricId },
          include: {
            criteria: true,
            performanceLevels: true
          }
        });

        if (linkedRubric) {
          const hasValidCriteria = linkedRubric.criteria && linkedRubric.criteria.length > 0;
          const hasValidLevels = linkedRubric.performanceLevels && linkedRubric.performanceLevels.length > 0;
          
          if (hasValidCriteria && hasValidLevels) {
            assessmentInfo.issue = null; // No issue
            validAssessments.push(assessmentInfo);
          } else {
            assessmentInfo.issue = 'Linked rubric exists but has no criteria or performance levels';
            issues.push(assessmentInfo);
          }
        } else {
          assessmentInfo.issue = 'Linked rubric does not exist';
          assessmentInfo.canFix = true; // Can fix by linking to existing rubric
          issues.push(assessmentInfo);
          fixableAssessments.push(assessment);
        }
      } else if (assessment.rubric) {
        // Check embedded rubric
        try {
          const rubricData = typeof assessment.rubric === 'string' 
            ? JSON.parse(assessment.rubric) 
            : assessment.rubric;
          
          const hasValidCriteria = rubricData.criteria && rubricData.criteria.length > 0;
          const hasValidLevels = rubricData.performanceLevels && rubricData.performanceLevels.length > 0;
          
          if (hasValidCriteria && hasValidLevels) {
            assessmentInfo.issue = null; // No issue - has valid embedded rubric
            validAssessments.push(assessmentInfo);
          } else {
            assessmentInfo.issue = 'Embedded rubric exists but has no criteria or performance levels';
            issues.push(assessmentInfo);
          }
        } catch (error) {
          assessmentInfo.issue = 'Embedded rubric exists but is invalid JSON';
          issues.push(assessmentInfo);
        }
      } else {
        // No rubric at all
        if (assessment.gradingType === 'MANUAL' || !assessment.gradingType) {
          assessmentInfo.issue = 'No rubric configured (may be intentional for score-based grading)';
          assessmentInfo.canFix = true;
          issues.push(assessmentInfo);
          fixableAssessments.push(assessment);
        } else {
          validAssessments.push(assessmentInfo); // Probably score-based grading
        }
      }
    }

    // Report results
    console.log('✅ Valid Assessments:', validAssessments.length);
    if (validAssessments.length > 0) {
      validAssessments.slice(0, 5).forEach(assessment => {
        console.log(`   - ${assessment.title} (${assessment.id})`);
      });
      if (validAssessments.length > 5) {
        console.log(`   ... and ${validAssessments.length - 5} more`);
      }
    }
    console.log('');

    console.log('❌ Assessments with Issues:', issues.length);
    if (issues.length > 0) {
      issues.forEach(assessment => {
        console.log(`   - ${assessment.title} (${assessment.id})`);
        console.log(`     Issue: ${assessment.issue}`);
        console.log(`     Can Fix: ${assessment.canFix ? 'Yes' : 'No'}`);
        console.log('');
      });
    }

    // Offer to fix fixable assessments
    if (fixableAssessments.length > 0) {
      console.log(`🔧 Found ${fixableAssessments.length} assessments that can be fixed by linking to existing rubrics\n`);
      
      // Get available rubrics
      const availableRubrics = await prisma.rubric.findMany({
        select: {
          id: true,
          title: true,
          type: true,
          maxScore: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      if (availableRubrics.length > 0) {
        console.log('📚 Available rubrics to link:');
        availableRubrics.forEach((rubric, index) => {
          console.log(`   ${index + 1}. ${rubric.title} (${rubric.type}) - Max: ${rubric.maxScore}`);
        });
        console.log('');
        
        console.log('💡 To fix these assessments, you can run:');
        console.log('   node fix-assessment-rubric.js');
        console.log('   (Modify the script to process multiple assessments)');
      } else {
        console.log('❌ No rubrics available to link assessments to');
        console.log('💡 Create rubrics first, then link assessments to them');
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Total Assessments: ${assessments.length}`);
    console.log(`   Valid: ${validAssessments.length}`);
    console.log(`   With Issues: ${issues.length}`);
    console.log(`   Fixable: ${fixableAssessments.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

validateAllAssessmentRubrics();
