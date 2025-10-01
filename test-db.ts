import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log("Testing database connection...");
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("Database connection successful:", result);
    
    // Test if we can query institutions
    const institutions = await prisma.institution.findMany();
    console.log(`Found ${institutions.length} institutions`);
    
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
