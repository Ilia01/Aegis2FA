import speakeasy from 'speakeasy';
import { prisma } from '../config/database';
import { TOTPSetupResponse } from '../types';
import { generateBackupCodes, hashBackupCode } from '../utils/crypto';
import { createAuditLog } from './audit.service';
import { webhookService } from './webhook.service';

const APP_NAME = '2FA System';

/**
 * Generate TOTP secret and QR code
 */
export const setupTOTP = async (userId: string): Promise<TOTPSetupResponse> => {
  const secret = speakeasy.generateSecret({
    name: APP_NAME,
    length: 32,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, username: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const otpauthUrl = speakeasy.otpauthURL({
    secret: secret.base32,
    label: user.email,
    issuer: APP_NAME,
    encoding: 'base32',
  });

  const backupCodes = generateBackupCodes(10);

  return {
    secret: secret.base32,
    qrCode: otpauthUrl,
    backupCodes,
  };
};

/**
 * Verify TOTP code and enable 2FA
 */
export const verifyAndEnableTOTP = async (
  userId: string,
  secret: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ backupCodes: string[] }> => {
  const isValid = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: code,
    window: 2, // Allow 2 steps tolerance
  });

  if (!isValid) {
    await createAuditLog({
      userId,
      action: '2fa_failed',
      details: { method: 'totp', reason: 'Invalid code' },
      ipAddress,
      userAgent,
      success: false,
    });

    // Fire webhook event
    await webhookService.fireEvent({
      event: '2fa.failed',
      data: { userId, method: 'totp', reason: 'Invalid code' },
      userId,
      timestamp: new Date().toISOString(),
    });

    throw new Error('Invalid verification code');
  }

  // Check if TOTP already exists
  const existingMethod = await prisma.twoFactorMethod.findFirst({
    where: {
      userId,
      type: 'totp',
    },
  });

  if (existingMethod) {
    await prisma.twoFactorMethod.update({
      where: { id: existingMethod.id },
      data: {
        secret,
        enabled: true,
        verifiedAt: new Date(),
      },
    });
  } else {
    await prisma.twoFactorMethod.create({
      data: {
        userId,
        type: 'totp',
        secret,
        enabled: true,
        verifiedAt: new Date(),
      },
    });
  }

  // Enable 2FA for user
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  const backupCodes = generateBackupCodes(10);

  // Delete old backup codes
  await prisma.backupCode.deleteMany({
    where: { userId },
  });

  // Store new backup codes
  await Promise.all(
    backupCodes.map(async (code) => {
      const codeHash = await hashBackupCode(code);
      return prisma.backupCode.create({
        data: {
          userId,
          codeHash,
        },
      });
    })
  );

  await createAuditLog({
    userId,
    action: '2fa_enabled',
    details: { method: 'totp' },
    ipAddress,
    userAgent,
  });

  // Fire webhook event
  await webhookService.fireEvent({
    event: '2fa.enabled',
    data: { userId, method: 'totp' },
    userId,
    timestamp: new Date().toISOString(),
  });

  return { backupCodes };
};

/**
 * Verify TOTP code during login
 */
export const verifyTOTP = async (userId: string, code: string): Promise<boolean> => {
  const method = await prisma.twoFactorMethod.findFirst({
    where: {
      userId,
      type: 'totp',
      enabled: true,
    },
  });

  if (!method || !method.secret) {
    return false;
  }

  return speakeasy.totp.verify({
    secret: method.secret,
    encoding: 'base32',
    token: code,
    window: 2,
  });
};

/**
 * Disable TOTP 2FA
 */
export const disableTOTP = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await prisma.twoFactorMethod.deleteMany({
    where: {
      userId,
      type: 'totp',
    },
  });

  // Check if user has any other 2FA methods
  const otherMethods = await prisma.twoFactorMethod.count({
    where: {
      userId,
      enabled: true,
    },
  });

  if (otherMethods === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false },
    });

    await prisma.backupCode.deleteMany({
      where: { userId },
    });
  }

  await createAuditLog({
    userId,
    action: '2fa_disabled',
    details: { method: 'totp' },
    ipAddress,
    userAgent,
  });

  // Fire webhook event
  await webhookService.fireEvent({
    event: '2fa.disabled',
    data: { userId, method: 'totp' },
    userId,
    timestamp: new Date().toISOString(),
  });
};