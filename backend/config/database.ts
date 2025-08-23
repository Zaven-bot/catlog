import { PrismaClient } from '@prisma/client';

declare const process: any;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
  errorFormat: 'pretty',
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database configuration utilities
export const getDatabaseConfig = () => ({
  url: process.env.DATABASE_URL,
  isRDS: process.env.DATABASE_URL?.includes('rds.amazonaws.com') || false,
  isProduction: process.env.NODE_ENV === 'production',
});

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};