import { PrismaClient } from '@prisma/client';
import { env } from './env';

const prismaClientSingleton = () => {
  return new PrismaClient({
    // Disable query logging for better performance (queries can slow down significantly under load)
    // Enable only errors and warnings
    log: ['error', 'warn'],
    // Connection pool configuration for better concurrency
    // These settings help handle high concurrent load (e.g., stress tests with 500+ users)
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});