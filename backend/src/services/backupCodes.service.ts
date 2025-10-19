import { prisma } from '../config/database';
import { generateBackupCodes, hashBackupCode, verifyBackupCode } from '../utils/crypto';
import { createAuditLog } from './audit.service';

export const generateUserBackupCodes = async (userId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled) {
    throw new Error('2FA must be enabled to generate backup codes');
  }

  const codes = generateBackupCodes(10);

  await prisma.backupCode.deleteMany({
    where: { userId },
  });

  await Promise.all(
    codes.map(async (code) => {
      const codeHash = await hashBackupCode(code);
      return prisma.backupCode.create({
        data: { userId, codeHash },
      });
    })
  );

  await createAuditLog({
    userId,
    action: 'backup_code_used',
    details: { action: 'generated' },
  });

  return codes;
};

export const verifyUserBackupCode = async (
  userId: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  const backupCodes = await prisma.backupCode.findMany({
    where: { userId, usedAt: null },
  });

  if (backupCodes.length === 0) {
    return false;
  }

  for (const backupCode of backupCodes) {
    const isValid = await verifyBackupCode(backupCode.codeHash, code);

    if (isValid) {
      await prisma.backupCode.update({
        where: { id: backupCode.id },
        data: { usedAt: new Date() },
      });

      await createAuditLog({
        userId,
        action: 'backup_code_used',
        details: { action: 'verified' },
        ipAddress,
        userAgent,
      });

      return true;
    }
  }

  await createAuditLog({
    userId,
    action: '2fa_failed',
    details: { method: 'backup_code', reason: 'Invalid code' },
    ipAddress,
    userAgent,
    success: false,
  });

  return false;
};

export const getBackupCodesCount = async (userId: string): Promise<number> => {
  return await prisma.backupCode.count({
    where: { userId, usedAt: null },
  });
};

export const hasBackupCodes = async (userId: string): Promise<boolean> => {
  const count = await getBackupCodesCount(userId);
  return count > 0;
};