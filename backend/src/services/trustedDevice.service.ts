import { prisma } from '../config/database';
import { generateSecureToken, createHMAC } from '../utils/crypto';
import { env } from '../config/env';
import { createAuditLog } from './audit.service';

export const createTrustedDevice = async (
  userId: string,
  deviceName: string | undefined,
  ipAddress: string,
  userAgent: string
): Promise<string> => {
  const deviceToken = generateSecureToken(32);
  const signature = createHMAC(deviceToken, env.DEVICE_TOKEN_SECRET);
  const signedToken = `${deviceToken}.${signature}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.trustedDevice.create({
    data: {
      userId,
      deviceToken: signedToken,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
    },
  });

  await createAuditLog({
    userId,
    action: 'trusted_device_added',
    details: { deviceName, ipAddress },
    ipAddress,
    userAgent,
  });

  return signedToken;
};

export const verifyTrustedDevice = async (
  userId: string,
  deviceToken: string
): Promise<boolean> => {
  try {
    const device = await prisma.trustedDevice.findFirst({
      where: { userId, deviceToken },
    });

    if (!device) {
      return false;
    }

    if (device.expiresAt < new Date()) {
      await prisma.trustedDevice.delete({
        where: { id: device.id },
      });
      return false;
    }

    await prisma.trustedDevice.update({
      where: { id: device.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  } catch (error) {
    return false;
  }
};

export const getUserTrustedDevices = async (userId: string) => {
  return await prisma.trustedDevice.findMany({
    where: { userId },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      deviceName: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
    },
  });
};

export const removeTrustedDevice = async (
  userId: string,
  deviceId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const device = await prisma.trustedDevice.findFirst({
    where: { id: deviceId, userId },
  });

  if (!device) {
    throw new Error('Trusted device not found');
  }

  await prisma.trustedDevice.delete({
    where: { id: deviceId },
  });

  await createAuditLog({
    userId,
    action: 'trusted_device_removed',
    details: { deviceId, deviceName: device.deviceName },
    ipAddress,
    userAgent,
  });
};

export const removeAllTrustedDevices = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await prisma.trustedDevice.deleteMany({
    where: { userId },
  });

  await createAuditLog({
    userId,
    action: 'trusted_device_removed',
    details: { action: 'all_devices' },
    ipAddress,
    userAgent,
  });
};

export const cleanupExpiredDevices = async (): Promise<number> => {
  const result = await prisma.trustedDevice.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  return result.count;
};