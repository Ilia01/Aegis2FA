import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Authentication middleware - verifies JWT token
 */
/**
 * Safely extract and validate authorization token from header
 * Returns null if header is invalid or missing
 */
function extractBearerToken(authHeaderRaw: string | string[] | undefined): string | null {
  // Type guard: must be a non-empty string
  if (typeof authHeaderRaw !== 'string') {
    return null;
  }

  if (authHeaderRaw.length === 0 || authHeaderRaw.length > 1000) {
    return null;
  }

  // Validate Bearer token format (JWT: header.payload.signature)
  const bearerMatch = /^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/.exec(authHeaderRaw);

  return bearerMatch ? bearerMatch[1] : null;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token === null) {
      res.status(401).json({
        success: false,
        message: 'No valid token provided',
      });
      return;
    }

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
    const token = extractBearerToken(req.headers.authorization);

    if (token !== null) {
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

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
