import { prisma } from '../config/database';
import { redis } from '../config/redis';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { generateSecureToken, hashPassword } from '../utils/crypto';
import { auditLogQueue } from '../queues';

/**
 * Password Reset Service
 *
 * Handles password reset flow with email-based token verification.
 * Tokens are stored in Redis with 1-hour expiry.
 */

// Password reset token expiry (1 hour)
const RESET_TOKEN_EXPIRY = 3600; // seconds

// Rate limiting (max 3 password reset requests per hour per email)
const MAX_RESET_REQUESTS_PER_HOUR = 3;
const RESET_RATE_LIMIT_WINDOW = 3600; // seconds

/**
 * Request password reset - Generate token and send email
 */
export const requestPasswordReset = async (
  email: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true },
  });

  // Don't reveal if email exists or not (security best practice)
  // Always return success, but only send email if user exists
  if (!user) {
    console.log(`[Password Reset] Reset requested for non-existent email: ${email}`);
    return;
  }

  // Check rate limit
  const rateLimitKey = `password_reset_rate:${email}`;
  const currentCount = await redis.incr(rateLimitKey);

  if (currentCount === 1) {
    await redis.expire(rateLimitKey, RESET_RATE_LIMIT_WINDOW);
  }

  if (currentCount > MAX_RESET_REQUESTS_PER_HOUR) {
    throw new Error('Too many password reset requests. Please try again later.');
  }

  // Generate reset token
  const token = generateSecureToken(32);
  const tokenKey = `password_reset:${token}`;

  // Store token in Redis with user ID
  await redis.setex(tokenKey, RESET_TOKEN_EXPIRY, user.id);

  // Send reset email
  await sendPasswordResetEmail(user.email, user.username, token);

  // Audit log
  auditLogQueue.add('passwordResetRequested', {
    userId: user.id,
    action: 'password_reset_requested',
    details: { email: user.email },
    ipAddress,
    userAgent,
  }).catch(err => console.error('Failed to log password reset request:', err));
};

/**
 * Verify reset token is valid
 */
export const verifyResetToken = async (token: string): Promise<boolean> => {
  const tokenKey = `password_reset:${token}`;
  const userId = await redis.get(tokenKey);
  return !!userId;
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  token: string,
  newPassword: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ success: boolean; userId: string }> => {
  const tokenKey = `password_reset:${token}`;

  // Get userId from Redis
  const userId = await redis.get(tokenKey);

  if (!userId) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      updatedAt: new Date(),
    },
  });

  // Delete the reset token (one-time use)
  await redis.del(tokenKey);

  // Invalidate all user sessions (force re-login with new password)
  await prisma.session.deleteMany({
    where: { userId },
  });

  // Audit log
  auditLogQueue.add('passwordReset', {
    userId,
    action: 'password_reset_completed',
    ipAddress,
    userAgent,
  }).catch(err => console.error('Failed to log password reset:', err));

  return {
    success: true,
    userId,
  };
};

/**
 * Send password reset email using Nodemailer
 */
async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  if (!env.EMAIL_USER || !env.EMAIL_PASSWORD) {
    console.error('[Password Reset] Email credentials not configured');
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

  // Frontend password reset URL (add to env if needed)
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: env.EMAIL_FROM || env.EMAIL_USER,
    to: email,
    subject: 'Password Reset Request - 2FA Service',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #e74c3c; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello <strong>${username}</strong>,</p>
            <p>We received a request to reset your password for your 2FA account. Click the button below to choose a new password:</p>
            <center>
              <a href="${resetUrl}" class="button">Reset Password</a>
            </center>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #e74c3c;">${resetUrl}</p>
            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>You can only use this link once</li>
                <li>All your active sessions will be logged out after password reset</li>
              </ul>
            </div>
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <p>For security reasons, consider changing your password if you suspect unauthorized access.</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply.</p>
            <p>If you need assistance, contact support.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Password Reset Request

Hello ${username},

We received a request to reset your password for your 2FA account. Click the link below to choose a new password:

${resetUrl}

SECURITY NOTICE:
- This link will expire in 1 hour
- You can only use this link once
- All your active sessions will be logged out after password reset

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

For security reasons, consider changing your password if you suspect unauthorized access.

This is an automated message, please do not reply.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Password Reset] Reset email sent to ${email}`);
  } catch (error) {
    console.error('[Password Reset] Failed to send email:', error);
    throw new Error('Failed to send password reset email');
  }
}
