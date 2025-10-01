import { PrismaClient } from "@prisma/client";
import { seedNewData } from "./seed-data/index";

const prisma = new PrismaClient();

/**
 * Main seed function that uses the comprehensive seeding approach
 */
async function main() {
  console.log("🌱 Starting database seeding...");

  try {
    console.log("📞 About to call seedNewData...");

    // Use the new comprehensive seeding approach
    await seedNewData();
    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    console.error("Stack trace:", error?.stack);
    throw error;
  } finally {
    console.log("🔌 Disconnecting from database...");
    await prisma.$disconnect();
  }
}

// Run the main function
main()
  .catch((e) => {
    console.error("Error during database seeding:", e);
    process.exit(1);
  });
