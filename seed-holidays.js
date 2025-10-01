const { PrismaClient } = require('@prisma/client');

// Holiday data for Pakistan 2025-2027
const pakistanHolidays2025 = [
  {
    name: 'Kashmir Day',
    startDate: new Date('2025-02-05'),
    endDate: new Date('2025-02-05'),
    type: 'NATIONAL',
    description: 'Kashmir Solidarity Day'
  },
  {
    name: 'Pakistan Day',
    startDate: new Date('2025-03-23'),
    endDate: new Date('2025-03-23'),
    type: 'NATIONAL',
    description: 'Pakistan Resolution Day'
  },
  {
    name: 'Eid ul-Fitr',
    startDate: new Date('2025-03-30'),
    endDate: new Date('2025-04-01'),
    type: 'RELIGIOUS',
    description: 'Festival of Breaking the Fast'
  },
  {
    name: 'Labour Day',
    startDate: new Date('2025-05-01'),
    endDate: new Date('2025-05-01'),
    type: 'OTHER',
    description: 'International Workers Day'
  },
  {
    name: 'Youm-e-Takbeer',
    startDate: new Date('2025-05-28'),
    endDate: new Date('2025-05-28'),
    type: 'NATIONAL',
    description: 'Nuclear Tests Day'
  },
  {
    name: 'Eid ul-Azha',
    startDate: new Date('2025-06-07'),
    endDate: new Date('2025-06-09'),
    type: 'RELIGIOUS',
    description: 'Festival of Sacrifice'
  },
  {
    name: 'Ashura',
    startDate: new Date('2025-07-05'),
    endDate: new Date('2025-07-06'),
    type: 'RELIGIOUS',
    description: 'Day of Ashura'
  },
  {
    name: 'Independence Day',
    startDate: new Date('2025-08-14'),
    endDate: new Date('2025-08-14'),
    type: 'NATIONAL',
    description: 'Pakistan Independence Day'
  },
  {
    name: 'Milad un-Nabi',
    startDate: new Date('2025-09-05'),
    endDate: new Date('2025-09-05'),
    type: 'RELIGIOUS',
    description: 'Prophet Muhammad Birthday'
  },
  {
    name: 'Iqbal Day',
    startDate: new Date('2025-11-09'),
    endDate: new Date('2025-11-09'),
    type: 'NATIONAL',
    description: 'Allama Iqbal Day'
  },
  {
    name: 'Christmas Day',
    startDate: new Date('2025-12-25'),
    endDate: new Date('2025-12-25'),
    type: 'RELIGIOUS',
    description: 'Christmas Day'
  },
  {
    name: 'Quaid-e-Azam Day',
    startDate: new Date('2025-12-25'),
    endDate: new Date('2025-12-25'),
    type: 'NATIONAL',
    description: 'Founder of Pakistan Birthday'
  }
];

async function seedHolidays() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🌱 Starting holiday seeding...');
    
    // Get all campuses
    const campuses = await prisma.campus.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true }
    });
    
    console.log(`📍 Found ${campuses.length} active campuses`);
    
    // Get a system user for createdBy
    const systemUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: { contains: 'admin' } },
          { email: { contains: 'system' } }
        ]
      }
    });
    
    if (!systemUser) {
      throw new Error('No system user found for holiday creation');
    }
    
    console.log(`👤 Using user: ${systemUser.email} as creator`);
    
    let created = 0;
    let updated = 0;
    const errors = [];
    
    for (const holidayData of pakistanHolidays2025) {
      try {
        // Check if holiday already exists
        const existingHoliday = await prisma.holiday.findFirst({
          where: {
            name: holidayData.name,
            startDate: holidayData.startDate
          }
        });
        
        if (existingHoliday) {
          console.log(`⏭️  Holiday already exists: ${holidayData.name}`);
          updated++;
          continue;
        }
        
        // Create holiday
        const holiday = await prisma.holiday.create({
          data: {
            name: holidayData.name,
            startDate: holidayData.startDate,
            endDate: holidayData.endDate,
            type: holidayData.type,
            description: holidayData.description,
            status: 'ACTIVE',
            createdBy: systemUser.id,
            campuses: {
              connect: campuses.map(campus => ({ id: campus.id }))
            }
          }
        });
        
        console.log(`✅ Created holiday: ${holiday.name}`);
        created++;
        
      } catch (error) {
        console.error(`❌ Error creating holiday ${holidayData.name}:`, error.message);
        errors.push(`${holidayData.name}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Holiday seeding completed!');
    console.log(`📊 Results: ${created} created, ${updated} skipped`);
    if (errors.length > 0) {
      console.log(`⚠️  Errors: ${errors.length}`);
      errors.forEach(error => console.log(`   - ${error}`));
    }
    
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedHolidays();
