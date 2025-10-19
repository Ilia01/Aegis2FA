import twilio from 'twilio';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { generateOTP } from '../utils/crypto';
import { otpUtils } from '../config/redis';
import { createAuditLog } from './audit.service';

const APP_NAME = '2FA System';

let twilioClient: twilio.Twilio | null = null;

if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

/**
 * Setup SMS 2FA
 */
export const setupSMS = async (
  userId: string,
  phoneNumber: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  if (!twilioClient) {
    throw new Error('SMS service not configured');
  }

  const existingMethod = await prisma.twoFactorMethod.findFirst({
    where: {
      userId,
      type: 'sms',
    },
  });

  if (existingMethod) {
    await prisma.twoFactorMethod.update({
      where: { id: existingMethod.id },
      data: {
        phoneNumber,
        enabled: false, // Require verification
        verifiedAt: null,
      },
    });
  } else {
    await prisma.twoFactorMethod.create({
      data: {
        userId,
        type: 'sms',
        phoneNumber,
        enabled: false, // Require verification
      },
    });
  }

  await sendSMSCode(userId, phoneNumber);

  await createAuditLog({
    userId,
    action: '2fa_enabled',
    details: { method: 'sms', phoneNumber: phoneNumber.slice(-4) },
    ipAddress,
    userAgent,
  });
};

/**
 * Send SMS verification code
 */
export const sendSMSCode = async (userId: string, phoneNumber: string): Promise<void> => {
  if (!twilioClient || !env.TWILIO_PHONE_NUMBER) {
    throw new Error('SMS service not configured');
  }

  const rateLimitKey = `sms_rate_limit:${userId}`;
  const isRateLimited = await otpUtils.checkRateLimit(rateLimitKey, 3, 3600); // 3 per hour

  if (isRateLimited) {
    throw new Error('Too many SMS requests. Please try again later.');
  }

  const code = generateOTP(env.OTP_LENGTH);

  const otpKey = `sms_otp:${userId}`;
  await otpUtils.storeOTP(otpKey, code, env.OTP_EXPIRY_MINUTES);

  // Send SMS
  try {
    await twilioClient.messages.create({
      body: `Your ${APP_NAME} verification code is: ${code}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes.`,
      from: env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error('Failed to send SMS code');
  }
};

/**
 * Verify SMS code and enable SMS 2FA
 */
export const verifySMSCode = async (
  userId: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const otpKey = `sms_otp:${userId}`;

  // Get OTP from Redis
  const otpData = await otpUtils.getOTP(otpKey);

  if (!otpData) {
    throw new Error('Verification code expired or not found');
  }

  // Check attempts
  if (otpData.attempts >= 5) {
    await otpUtils.deleteOTP(otpKey);
    throw new Error('Too many failed attempts. Please request a new code.');
  }

  // Verify code
  if (otpData.code !== code) {
    await otpUtils.incrementAttempts(otpKey);
    await createAuditLog({
      userId,
      action: '2fa_failed',
      details: { method: 'sms', reason: 'Invalid code' },
      ipAddress,
      userAgent,
      success: false,
    });
    throw new Error('Invalid verification code');
  }

  await otpUtils.deleteOTP(otpKey);

  // Enable SMS 2FA
  await prisma.twoFactorMethod.updateMany({
    where: {
      userId,
      type: 'sms',
    },
    data: {
      enabled: true,
      verifiedAt: new Date(),
    },
  });

  // Enable 2FA for user
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  await createAuditLog({
    userId,
    action: '2fa_verified',
    details: { method: 'sms' },
    ipAddress,
    userAgent,
  });
};

/**
 * Verify SMS code during login
 */
export const verifySMSLogin = async (userId: string, code: string): Promise<boolean> => {
  const otpKey = `sms_otp:${userId}`;
  const otpData = await otpUtils.getOTP(otpKey);

  if (!otpData || otpData.code !== code) {
    if (otpData) {
      await otpUtils.incrementAttempts(otpKey);
    }
    return false;
  }

  await otpUtils.deleteOTP(otpKey);
  return true;
};

/**
 * Disable SMS 2FA
 */
export const disableSMS = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await prisma.twoFactorMethod.deleteMany({
    where: {
      userId,
      type: 'sms',
    },
  });

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
  }

  await createAuditLog({
    userId,
    action: '2fa_disabled',
    details: { method: 'sms' },
    ipAddress,
    userAgent,
  });
};
