import { PrismaClient } from '@prisma/client';

export const testDb = new PrismaClient();

export const cleanDatabase = async () => {
  await testDb.webhookDelivery.deleteMany();
  await testDb.webhook.deleteMany();
  await testDb.apiKey.deleteMany();
  await testDb.auditLog.deleteMany();
  await testDb.session.deleteMany();
  await testDb.trustedDevice.deleteMany();
  await testDb.backupCode.deleteMany();
  await testDb.twoFactorMethod.deleteMany();
  await testDb.user.deleteMany();
};

export const createTestUser = async (data?: {
  email?: string;
  username?: string;
  password?: string;
}) => {
  const { hashPassword } = await import('../../src/utils/crypto');

  const email = data?.email || `test${Date.now()}@example.com`;
  const username = data?.username || `testuser${Date.now()}`;
  const password = data?.password || 'TestPass123!';

  const passwordHash = await hashPassword(password);

  return await testDb.user.create({
    data: {
      email,
      username,
      passwordHash,
    },
  });
};

export const disconnectTestDb = async () => {
  await testDb.$disconnect();
};
