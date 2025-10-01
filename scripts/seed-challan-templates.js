const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const challanTemplatesSeedData = [
  {
    name: 'Standard Fee Challan',
    description: 'Standard template with all essential information',
    copies: 3,
    design: {
      template: 'standard',
      institutionName: 'Allied School System',
      campusName: 'Main Campus',
      campusAddress: '19 km Ferozpur Road Lahore',
      campusPhone: '+92-42-111-111-111',
      whatsappNumber: '03364015028',
      kuickpayPrefix: '13330',
      bankName: 'Bank AL Habib Limited',
      bankAccountNumber: '0099-0981-0074-4601-6',
      bankCollectionAccount: '0099-0980-0047-4601-5',
      footerText: 'Please pay before due date to avoid late fees',
      showStudentPhoto: false,
      showBarcode: true,
      showQRCode: true,
      showDueDate: true,
      showPaymentInstructions: true,
      layout: {
        header: {
          showLogo: true,
          showInstitutionName: true,
          showCampusInfo: true,
        },
        body: {
          showStudentInfo: true,
          showFeeBreakdown: true,
          showDiscounts: true,
          showTotalAmount: true,
        },
        footer: {
          showBankDetails: true,
          showInstructions: true,
          showBarcode: true,
          showQRCode: true,
        }
      }
    }
  },
  {
    name: 'Compact Fee Challan',
    description: 'Compact template for smaller challans',
    copies: 2,
    design: {
      template: 'compact',
      institutionName: 'Allied School System',
      campusName: 'Main Campus',
      campusAddress: '19 km Ferozpur Road Lahore',
      campusPhone: '+92-42-111-111-111',
      whatsappNumber: '03364015028',
      kuickpayPrefix: '13330',
      bankName: 'Bank AL Habib Limited',
      bankAccountNumber: '0099-0981-0074-4601-6',
      bankCollectionAccount: '0099-0980-0047-4601-5',
      footerText: 'Pay before due date',
      showStudentPhoto: false,
      showBarcode: true,
      showQRCode: false,
      showDueDate: true,
      showPaymentInstructions: false,
      layout: {
        header: {
          showLogo: true,
          showInstitutionName: true,
          showCampusInfo: false,
        },
        body: {
          showStudentInfo: true,
          showFeeBreakdown: true,
          showDiscounts: false,
          showTotalAmount: true,
        },
        footer: {
          showBankDetails: true,
          showInstructions: false,
          showBarcode: true,
          showQRCode: false,
        }
      }
    }
  },
  {
    name: 'Detailed Fee Challan',
    description: 'Detailed template with comprehensive information',
    copies: 3,
    design: {
      template: 'detailed',
      institutionName: 'Allied School System',
      campusName: 'Main Campus',
      campusAddress: '19 km Ferozpur Road Lahore',
      campusPhone: '+92-42-111-111-111',
      whatsappNumber: '03364015028',
      kuickpayPrefix: '13330',
      bankName: 'Bank AL Habib Limited',
      bankAccountNumber: '0099-0981-0074-4601-6',
      bankCollectionAccount: '0099-0980-0047-4601-5',
      footerText: 'Please pay before due date to avoid late fees. For queries, contact administration.',
      showStudentPhoto: true,
      showBarcode: true,
      showQRCode: true,
      showDueDate: true,
      showPaymentInstructions: true,
      layout: {
        header: {
          showLogo: true,
          showInstitutionName: true,
          showCampusInfo: true,
        },
        body: {
          showStudentInfo: true,
          showFeeBreakdown: true,
          showDiscounts: true,
          showTotalAmount: true,
          showPreviousBalance: true,
          showLateFees: true,
        },
        footer: {
          showBankDetails: true,
          showInstructions: true,
          showBarcode: true,
          showQRCode: true,
          showContactInfo: true,
        }
      }
    }
  }
];

async function seedChallanTemplates() {
  console.log('🏦 Seeding challan templates...');

  try {
    // Get the first institution to associate templates with
    const institution = await prisma.institution.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (!institution) {
      console.warn('No active institution found. Skipping challan templates seeding.');
      return;
    }

    // Get the first admin user to set as creator
    const adminUser = await prisma.user.findFirst({
      where: { 
        userType: { in: ['SYSTEM_ADMIN', 'CAMPUS_ADMIN'] }
      }
    });

    if (!adminUser) {
      console.warn('No admin user found. Skipping challan templates seeding.');
      return;
    }

    for (const templateData of challanTemplatesSeedData) {
      // Check if template already exists
      const existingTemplate = await prisma.challanTemplate.findFirst({
        where: {
          name: templateData.name,
          institutionId: institution.id
        }
      });

      let result;
      if (existingTemplate) {
        // Update existing template
        result = await prisma.challanTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            description: templateData.description,
            design: templateData.design,
            copies: templateData.copies,
            updatedAt: new Date(),
            updatedById: adminUser.id,
          }
        });
        console.log(`✅ Updated template: ${result.name}`);
      } else {
        // Create new template
        result = await prisma.challanTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            design: templateData.design,
            copies: templateData.copies,
            institutionId: institution.id,
            createdById: adminUser.id,
            status: 'ACTIVE',
          }
        });
        console.log(`✅ Created template: ${result.name}`);
      }
    }

    console.log(`✅ Successfully seeded ${challanTemplatesSeedData.length} challan templates`);
  } catch (error) {
    console.error('❌ Error seeding challan templates:', error);
    throw error;
  }
}

async function main() {
  await seedChallanTemplates();
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  });
