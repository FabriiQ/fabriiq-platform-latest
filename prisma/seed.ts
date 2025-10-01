import { seedNewData } from '../src/server/db/seed-data/index';

async function main() {
  console.log('Starting database seeding from prisma/seed.ts...');
  await seedNewData();
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seeding:', e);
    process.exit(1);
  });
