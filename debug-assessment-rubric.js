const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAssessmentRubric() {
  try {
    console.log('🔍 Debugging Assessment Rubric Issue...\n');
    
    const assessmentId = 'cmevrq91k00ov14e1zy4eo6bn';
    
    // 1. Check if assessment exists
    console.log('1️⃣ Checking if assessment exists...');
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        title: true,
        rubricId: true,
        rubric: true,
        bloomsDistribution: true,
        gradingType: true,
        status: true,
        createdAt: true
      }
    });

    if (!assessment) {
      console.log('❌ Assessment not found!');
      return;
    }

    console.log('✅ Assessment found:');
    console.log(`   Title: ${assessment.title}`);
    console.log(`   ID: ${assessment.id}`);
    console.log(`   RubricId: ${assessment.rubricId || 'NULL'}`);
    console.log(`   Has rubric JSON: ${!!assessment.rubric}`);
    console.log(`   Has bloomsDistribution: ${!!assessment.bloomsDistribution}`);
    console.log(`   GradingType: ${assessment.gradingType}`);
    console.log(`   Status: ${assessment.status}`);
    console.log('');

    // 2. Check if rubricId points to a valid rubric
    if (assessment.rubricId) {
      console.log('2️⃣ Checking linked rubric...');
      const rubric = await prisma.rubric.findUnique({
        where: { id: assessment.rubricId },
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
      });

      if (rubric) {
        console.log('✅ Linked rubric found:');
        console.log(`   Title: ${rubric.title}`);
        console.log(`   Type: ${rubric.type}`);
        console.log(`   Max Score: ${rubric.maxScore}`);
        console.log(`   Criteria Count: ${rubric.criteria?.length || 0}`);
        console.log(`   Performance Levels Count: ${rubric.performanceLevels?.length || 0}`);
        
        if (rubric.criteria && rubric.criteria.length > 0) {
          console.log('   Criteria:');
          rubric.criteria.forEach((criterion, index) => {
            console.log(`     ${index + 1}. ${criterion.name} (Bloom's: ${criterion.bloomsLevel})`);
            console.log(`        Levels: ${criterion.criteriaLevels?.length || 0}`);
          });
        }
        
        if (rubric.performanceLevels && rubric.performanceLevels.length > 0) {
          console.log('   Performance Levels:');
          rubric.performanceLevels.forEach((level, index) => {
            console.log(`     ${index + 1}. ${level.name} (${level.minScore}-${level.maxScore} points)`);
          });
        }
      } else {
        console.log('❌ Linked rubric NOT found! This is the problem.');
      }
    } else {
      console.log('2️⃣ No rubricId set on assessment');
    }

    // 3. Check embedded rubric JSON
    if (assessment.rubric) {
      console.log('3️⃣ Checking embedded rubric JSON...');
      try {
        const rubricData = typeof assessment.rubric === 'string' 
          ? JSON.parse(assessment.rubric) 
          : assessment.rubric;
        
        console.log('✅ Embedded rubric data found:');
        console.log(`   Has criteria: ${!!rubricData.criteria}`);
        console.log(`   Criteria count: ${rubricData.criteria?.length || 0}`);
        console.log(`   Has performanceLevels: ${!!rubricData.performanceLevels}`);
        console.log(`   Performance levels count: ${rubricData.performanceLevels?.length || 0}`);
        
        if (rubricData.criteria && rubricData.criteria.length > 0) {
          console.log('   Sample criterion:', JSON.stringify(rubricData.criteria[0], null, 2));
        }
      } catch (error) {
        console.log('❌ Error parsing embedded rubric JSON:', error.message);
      }
    } else {
      console.log('3️⃣ No embedded rubric JSON');
    }

    // 4. Check all rubrics in the system
    console.log('4️⃣ Checking all rubrics in system...');
    const allRubrics = await prisma.rubric.findMany({
      select: {
        id: true,
        title: true,
        type: true,
        maxScore: true,
        createdAt: true,
        createdById: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`Found ${allRubrics.length} rubrics in system:`);
    allRubrics.forEach((rubric, index) => {
      console.log(`   ${index + 1}. ${rubric.title} (ID: ${rubric.id})`);
    });

    // 5. Check assessment with full rubric include
    console.log('5️⃣ Testing full assessment fetch with rubric include...');
    const fullAssessment = await prisma.assessment.findUnique({
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

    if (fullAssessment?.bloomsRubric) {
      console.log('✅ Full assessment fetch with bloomsRubric successful');
      console.log(`   Rubric title: ${fullAssessment.bloomsRubric.title}`);
      console.log(`   Criteria: ${fullAssessment.bloomsRubric.criteria?.length || 0}`);
      console.log(`   Performance levels: ${fullAssessment.bloomsRubric.performanceLevels?.length || 0}`);
    } else {
      console.log('❌ Full assessment fetch shows no bloomsRubric');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAssessmentRubric();
