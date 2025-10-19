import { prisma } from '../config/database';
import { verifyTempToken, generateTokenPair } from '../utils/jwt';
import { storeRefreshToken } from './auth.service';
import { createAuditLog } from './audit.service';
import { verifyTOTP } from './totp.service';
import { verifySMSLogin, sendSMSCode } from './sms.service';
import { verifyEmailLogin, sendEmailCode } from './email.service';
import { verifyUserBackupCode } from './backupCodes.service';
import { createTrustedDevice } from './trustedDevice.service';
import { webhookService } from './webhook.service';
import { TokenPair } from '../types';

export const verify2FACode = async (
  tempToken: string,
  code: string,
  trustDevice: boolean = false,
  deviceName?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ tokens: TokenPair; deviceToken?: string }> => {
  const tokenData = verifyTempToken(tempToken);

  if (!tokenData) {
    throw new Error('Invalid or expired temporary token');
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenData.userId },
    include: {
      twoFactorMethods: {
        where: { enabled: true },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  let verified = false;
  let method = 'unknown';

  for (const twoFactorMethod of user.twoFactorMethods) {
    if (twoFactorMethod.type === 'totp') {
      verified = await verifyTOTP(user.id, code);
      if (verified) {
        method = 'totp';
        break;
      }
    } else if (twoFactorMethod.type === 'sms') {
      verified = await verifySMSLogin(user.id, code);
      if (verified) {
        method = 'sms';
        break;
      }
    } else if (twoFactorMethod.type === 'email') {
      verified = await verifyEmailLogin(user.id, code);
      if (verified) {
        method = 'email';
        break;
      }
    }
  }

  if (!verified) {
    await createAuditLog({
      userId: user.id,
      action: '2fa_failed',
      details: { reason: 'Invalid code' },
      ipAddress,
      userAgent,
      success: false,
    });

    // Fire webhook event
    await webhookService.fireEvent({
      event: '2fa.failed',
      data: { userId: user.id, reason: 'Invalid code' },
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    throw new Error('Invalid verification code');
  }

  const tokens = generateTokenPair(user.id, user.email, user.username);
  await storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

  let deviceToken: string | undefined;

  if (trustDevice) {
    const finalIpAddress = ipAddress || '127.0.0.1';
    const finalUserAgent = userAgent || 'Unknown';
    deviceToken = await createTrustedDevice(user.id, deviceName, finalIpAddress, finalUserAgent);
  }

  await createAuditLog({
    userId: user.id,
    action: '2fa_verified',
    details: { method, trustDevice },
    ipAddress,
    userAgent,
  });

  // Fire webhook event
  await webhookService.fireEvent({
    event: '2fa.verified',
    data: { userId: user.id, method, trustDevice },
    userId: user.id,
    timestamp: new Date().toISOString(),
  });

  return { tokens, deviceToken };
};

export const verify2FABackupCode = async (
  tempToken: string,
  backupCode: string,
  ipAddress?: string,
  userAgent?: string
): Promise<TokenPair> => {
  const tokenData = verifyTempToken(tempToken);

  if (!tokenData) {
    throw new Error('Invalid or expired temporary token');
  }

  const verified = await verifyUserBackupCode(
    tokenData.userId,
    backupCode,
    ipAddress,
    userAgent
  );

  if (!verified) {
    throw new Error('Invalid backup code');
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenData.userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tokens = generateTokenPair(user.id, user.email, user.username);
  await storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

  await createAuditLog({
    userId: user.id,
    action: '2fa_verified',
    details: { method: 'backup_code' },
    ipAddress,
    userAgent,
  });

  return tokens;
};

export const send2FACode = async (userId: string, method: 'sms' | 'email'): Promise<void> => {
  const twoFactorMethod = await prisma.twoFactorMethod.findFirst({
    where: {
      userId,
      type: method,
      enabled: true,
    },
  });

  if (!twoFactorMethod) {
    throw new Error(`${method.toUpperCase()} 2FA not enabled`);
  }

  if (method === 'sms' && twoFactorMethod.phoneNumber) {
    await sendSMSCode(userId, twoFactorMethod.phoneNumber);
  } else if (method === 'email' && twoFactorMethod.email) {
    await sendEmailCode(userId, twoFactorMethod.email);
  } else {
    throw new Error('Invalid 2FA method configuration');
  }
};

export const get2FAMethods = async (userId: string) => {
  const methods = await prisma.twoFactorMethod.findMany({
    where: { userId, enabled: true },
    select: {
      id: true,
      type: true,
      phoneNumber: true,
      email: true,
      verifiedAt: true,
      createdAt: true,
    },
  });

  return methods.map((method) => ({
    id: method.id,
    type: method.type,
    phoneNumber: method.phoneNumber ? `***${method.phoneNumber.slice(-4)}` : undefined,
    email: method.email ? `${method.email.slice(0, 3)}***@${method.email.split('@')[1]}` : undefined,
    verifiedAt: method.verifiedAt,
    createdAt: method.createdAt,
  }));
};

export const disable2FAMethod = async (
  userId: string,
  methodId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const method = await prisma.twoFactorMethod.findFirst({
    where: { id: methodId, userId },
  });

  if (!method) {
    throw new Error('2FA method not found');
  }

  await prisma.twoFactorMethod.delete({
    where: { id: methodId },
  });

  const remainingMethods = await prisma.twoFactorMethod.count({
    where: { userId, enabled: true },
  });

  if (remainingMethods === 0) {
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
    details: { method: method.type },
    ipAddress,
    userAgent,
  });

  // Fire webhook event
  await webhookService.fireEvent({
    event: '2fa.disabled',
    data: { userId, method: method.type },
    userId,
    timestamp: new Date().toISOString(),
  });
};