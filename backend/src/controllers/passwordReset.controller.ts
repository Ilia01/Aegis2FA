import { Request, Response } from 'express';
import * as passwordResetService from '../services/passwordReset.service';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Request password reset
 */
export const requestReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  if (!email) {
    res.status(400).json({
      success: false,
      message: 'Email is required',
    });
    return;
  }

  await passwordResetService.requestPasswordReset(email, ipAddress, userAgent);

  // Always return success (don't reveal if email exists)
  res.json({
    success: true,
    message: 'If an account with that email exists, a password reset link has been sent',
  });
});

/**
 * Verify reset token is valid
 */
export const verifyToken = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    res.status(400).json({
      success: false,
      message: 'Reset token is required',
    });
    return;
  }

  const isValid = await passwordResetService.verifyResetToken(token);

  if (!isValid) {
    res.status(400).json({
      success: false,
      message: 'Invalid or expired reset token',
    });
    return;
  }

  res.json({
    success: true,
    message: 'Token is valid',
  });
});

/**
 * Reset password with token
 */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  if (!token || !newPassword) {
    res.status(400).json({
      success: false,
      message: 'Token and new password are required',
    });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long',
    });
    return;
  }

  const result = await passwordResetService.resetPassword(
    token,
    newPassword,
    ipAddress,
    userAgent
  );

  res.json({
    success: true,
    message: 'Password reset successfully. All sessions have been logged out. Please log in with your new password.',
    data: {
      userId: result.userId,
    },
  });
});
