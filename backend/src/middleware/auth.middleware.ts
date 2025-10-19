import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Strict validation to prevent bypass attacks
    if (!authHeader || typeof authHeader !== 'string') {
      res.status(401).json({
        success: false,
        message: 'No token provided',
      });
      return;
    }

    const bearerMatch = /^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/.exec(authHeader);
    if (!bearerMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization header format',
      });
      return;
    }

    const token = bearerMatch[1];

    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      username: payload.username,
      twoFactorEnabled: false, // Will be loaded if needed
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Strict validation to prevent bypass attacks
    if (authHeader && typeof authHeader === 'string') {
      const bearerMatch = /^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/.exec(authHeader);
      if (bearerMatch) {
        const token = bearerMatch[1];
        const payload = verifyAccessToken(token);

        if (payload) {
          req.user = {
            id: payload.userId,
            email: payload.email,
            username: payload.username,
            twoFactorEnabled: false,
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
