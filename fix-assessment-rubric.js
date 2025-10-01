const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixAssessmentRubric() {
  try {
    console.log('🔧 Fixing Assessment Rubric Link...\n');
    
    const assessmentId = 'cmevrq91k00ov14e1zy4eo6bn';
    
    // 1. Get the assessment
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        title: true,
        rubricId: true,
        gradingType: true,
        subjectId: true
      }
    });

    if (!assessment) {
      console.log('❌ Assessment not found!');
      return;
    }

    console.log('📋 Current assessment state:');
    console.log(`   Title: ${assessment.title}`);
    console.log(`   RubricId: ${assessment.rubricId || 'NULL'}`);
    console.log(`   GradingType: ${assessment.gradingType || 'NULL'}`);
    console.log('');

    // 2. Get available rubrics
    const rubrics = await prisma.rubric.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        maxScore: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('📚 Available rubrics:');
    rubrics.forEach((rubric, index) => {
      console.log(`   ${index + 1}. ${rubric.title} (ID: ${rubric.id}) - ${rubric.type} - Max: ${rubric.maxScore}`);
    });
    console.log('');

    if (rubrics.length === 0) {
      console.log('❌ No rubrics found in the system!');
      return;
    }

    // 3. Select the most recent rubric (or you can modify this logic)
    const selectedRubric = rubrics[0]; // Using the most recent one
    console.log(`🎯 Selected rubric: ${selectedRubric.title} (${selectedRubric.id})`);

    // 4. Update the assessment to link it to the rubric
    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        rubricId: selectedRubric.id,
        gradingType: 'MANUAL' // Ensure grading type is set
      },
      select: {
        id: true,
        title: true,
        rubricId: true,
        gradingType: true
      }
    });

    console.log('✅ Assessment updated successfully!');
    console.log(`   Title: ${updatedAssessment.title}`);
    console.log(`   RubricId: ${updatedAssessment.rubricId}`);
    console.log(`   GradingType: ${updatedAssessment.gradingType}`);
    console.log('');

    // 5. Verify the link works by fetching with rubric include
    const verifyAssessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        bloomsRubric: {
          include: {
            criteria: {
              include: {
                criteriaLevels: {
                  include: {
                    performanceLevel: true
                  }
                }
              }
            },
            performanceLevels: true
          }
        }
      }
    });

    if (verifyAssessment?.bloomsRubric) {
      console.log('🎉 Verification successful! Rubric is now linked:');
      console.log(`   Rubric title: ${verifyAssessment.bloomsRubric.title}`);
      console.log(`   Criteria count: ${verifyAssessment.bloomsRubric.criteria?.length || 0}`);
      console.log(`   Performance levels count: ${verifyAssessment.bloomsRubric.performanceLevels?.length || 0}`);
      
      if (verifyAssessment.bloomsRubric.criteria && verifyAssessment.bloomsRubric.criteria.length > 0) {
        console.log('   Sample criteria:');
        verifyAssessment.bloomsRubric.criteria.slice(0, 3).forEach((criterion, index) => {
          console.log(`     ${index + 1}. ${criterion.name} (${criterion.bloomsLevel})`);
        });
      }
    } else {
      console.log('❌ Verification failed - rubric still not accessible');
    }

    console.log('\n🌐 You can now test the grading interface at:');
    console.log(`   http://localhost:3000/teacher/classes/cmesxnvle006wuxvpxic2pp41/assessments/${assessmentId}/grade`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAssessmentRubric();
