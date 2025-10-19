import { prisma } from '../config/database';
import { redis } from '../config/redis';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { generateSecureToken } from '../utils/crypto';
import { auditLogQueue } from '../queues';

/**
 * Email Verification Service
 *
 * Handles email verification flow for new user registrations.
 * Users must verify email before enabling 2FA (required by user preference).
 */

// Email verification token expiry (1 hour)
const VERIFICATION_TOKEN_EXPIRY = 3600; // seconds

// Rate limiting (max 3 verification emails per hour)
const MAX_VERIFICATION_EMAILS_PER_HOUR = 3;
const VERIFICATION_RATE_LIMIT_WINDOW = 3600; // seconds

/**
 * Send email verification link to user
 */
export const sendVerificationEmail = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerified: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.emailVerified) {
    throw new Error('Email already verified');
  }

  // Check rate limit
  const rateLimitKey = `email_verification_rate:${userId}`;
  const currentCount = await redis.incr(rateLimitKey);

  if (currentCount === 1) {
    await redis.expire(rateLimitKey, VERIFICATION_RATE_LIMIT_WINDOW);
  }

  if (currentCount > MAX_VERIFICATION_EMAILS_PER_HOUR) {
    throw new Error('Too many verification emails sent. Please try again later.');
  }

  // Generate verification token
  const token = generateSecureToken(32);
  const tokenKey = `email_verification:${token}`;

  // Store token in Redis with user ID
  await redis.setex(tokenKey, VERIFICATION_TOKEN_EXPIRY, userId);

  // Send email
  await sendVerificationEmailMessage(user.email, token);

  // Audit log
  auditLogQueue.add('emailVerificationSent', {
    userId,
    action: 'email_verification_sent',
    details: { email: user.email },
    ipAddress,
    userAgent,
  }).catch(err => console.error('Failed to log email verification:', err));
};

/**
 * Verify email with token
 */
export const verifyEmail = async (
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; userId: string }> => {
  const tokenKey = `email_verification:${token}`;

  // Get userId from Redis
  const userId = await redis.get(tokenKey);

  if (!userId) {
    throw new Error('Invalid or expired verification token');
  }

  // Update user email verified status
  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
    select: { id: true, email: true },
  });

  // Delete token from Redis
  await redis.del(tokenKey);

  // Audit log
  auditLogQueue.add('emailVerified', {
    userId,
    action: 'email_verified',
    details: { email: user.email },
    ipAddress,
    userAgent,
  }).catch(err => console.error('Failed to log email verification:', err));

  return {
    success: true,
    userId,
  };
};

/**
 * Resend verification email
 */
export const resendVerificationEmail = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  return sendVerificationEmail(userId, ipAddress, userAgent);
};

/**
 * Check if user email is verified
 */
export const isEmailVerified = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });

  return user?.emailVerified || false;
};

/**
 * Send verification email message using Nodemailer
 */
async function sendVerificationEmailMessage(email: string, token: string): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
    console.error('[Email Verification] Email credentials not configured');
    throw new Error('Email service not configured');
  }

  const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
  });

  // Frontend verification URL (add to env)
  const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Email - 2FA Service',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email Address</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for registering with our 2FA service. To complete your registration and enable two-factor authentication features, please verify your email address by clicking the button below:</p>
            <center>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6;">${verificationUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't create an account with us, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Verify Your Email Address

Thank you for registering with our 2FA service. To complete your registration and enable two-factor authentication features, please verify your email address by clicking the link below:

${verificationUrl}

This link will expire in 1 hour.

If you didn't create an account with us, please ignore this email.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email Verification] Verification email sent to ${email}`);
  } catch (error) {
    console.error('[Email Verification] Failed to send email:', error);
    throw new Error('Failed to send verification email');
  }
}
