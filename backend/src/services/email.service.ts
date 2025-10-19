import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { generateOTP } from '../utils/crypto';
import { otpUtils } from '../config/redis';
import { createAuditLog } from './audit.service';

const APP_NAME = '2FA System';

let transporter: nodemailer.Transporter | null = null;

if (env.EMAIL_USER && env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
  });
}

export const setupEmail = async (
  userId: string,
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const existingMethod = await prisma.twoFactorMethod.findFirst({
    where: { userId, type: 'email' },
  });

  if (existingMethod) {
    await prisma.twoFactorMethod.update({
      where: { id: existingMethod.id },
      data: { email, enabled: false, verifiedAt: null },
    });
  } else {
    await prisma.twoFactorMethod.create({
      data: { userId, type: 'email', email, enabled: false },
    });
  }

  await sendEmailCode(userId, email);

  await createAuditLog({
    userId,
    action: '2fa_enabled',
    details: { method: 'email' },
    ipAddress,
    userAgent,
  });
};

export const sendEmailCode = async (userId: string, email: string): Promise<void> => {
  if (!transporter || !env.EMAIL_FROM) {
    throw new Error('Email service not configured');
  }

  const rateLimitKey = `email_rate_limit:${userId}`;
  const isRateLimited = await otpUtils.checkRateLimit(rateLimitKey, 3, 3600);

  if (isRateLimited) {
    throw new Error('Too many email requests. Please try again later.');
  }

  const code = generateOTP(env.OTP_LENGTH);
  const otpKey = `email_otp:${userId}`;
  await otpUtils.storeOTP(otpKey, code, env.OTP_EXPIRY_MINUTES);

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: email,
      subject: `Your ${APP_NAME} Verification Code`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #666;">This code will expire in ${env.OTP_EXPIRY_MINUTES} minutes.</p>
          <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `,
      text: `Your ${APP_NAME} verification code is: ${code}. Valid for ${env.OTP_EXPIRY_MINUTES} minutes.`,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email code');
  }
};


export const verifyEmailCode = async (
  userId: string,
  code: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const otpKey = `email_otp:${userId}`;
  const otpData = await otpUtils.getOTP(otpKey);

  if (!otpData) {
    throw new Error('Verification code expired or not found');
  }

  if (otpData.attempts >= 5) {
    await otpUtils.deleteOTP(otpKey);
    throw new Error('Too many failed attempts. Please request a new code.');
  }

  if (otpData.code !== code) {
    await otpUtils.incrementAttempts(otpKey);
    await createAuditLog({
      userId,
      action: '2fa_failed',
      details: { method: 'email', reason: 'Invalid code' },
      ipAddress,
      userAgent,
      success: false,
    });
    throw new Error('Invalid verification code');
  }

  await otpUtils.deleteOTP(otpKey);

  await prisma.twoFactorMethod.updateMany({
    where: { userId, type: 'email' },
    data: { enabled: true, verifiedAt: new Date() },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  await createAuditLog({
    userId,
    action: '2fa_verified',
    details: { method: 'email' },
    ipAddress,
    userAgent,
  });
};

export const verifyEmailLogin = async (userId: string, code: string): Promise<boolean> => {
  const otpKey = `email_otp:${userId}`;
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

export const disableEmail = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await prisma.twoFactorMethod.deleteMany({
    where: { userId, type: 'email' },
  });

  const otherMethods = await prisma.twoFactorMethod.count({
    where: { userId, enabled: true },
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
    details: { method: 'email' },
    ipAddress,
    userAgent,
  });
};