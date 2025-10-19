import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { prisma } from '../config/database';

/**
 * Middleware to require email verification before allowing 2FA setup
 *
 * Users can login without email verification, but must verify their email
 * before they can enable any 2FA methods (TOTP, SMS, or Email).
 *
 * This ensures a verified email exists for account recovery purposes.
 */
export const requireEmailVerified = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
      return;
    }

    // Check if user email is verified
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        success: false,
        message: 'Email verification required before enabling 2FA',
        error: 'EMAIL_NOT_VERIFIED',
        data: {
          emailVerified: false,
          hint: 'Please verify your email address using the /api/email/send-verification endpoint',
        },
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[requireEmailVerified] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};
