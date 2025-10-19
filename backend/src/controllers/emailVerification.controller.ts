import { Response } from 'express';
import { AuthRequest } from '../types';
import * as emailVerificationService from '../services/emailVerification.service';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Send or resend email verification
 */
export const sendVerification = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  await emailVerificationService.sendVerificationEmail(userId, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Verification email sent successfully',
  });
});

/**
 * Verify email with token
 */
export const verifyEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { token } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  if (!token) {
    res.status(400).json({
      success: false,
      message: 'Verification token is required',
    });
    return;
  }

  const result = await emailVerificationService.verifyEmail(token, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Email verified successfully',
    data: {
      userId: result.userId,
    },
  });
});

/**
 * Check email verification status
 */
export const checkVerificationStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  const isVerified = await emailVerificationService.isEmailVerified(userId);

  res.json({
    success: true,
    data: {
      emailVerified: isVerified,
    },
  });
});
