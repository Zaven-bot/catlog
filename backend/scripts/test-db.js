const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('DB connected');
    process.exit(0);
  } catch (error) {
    console.log('DB not ready');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();