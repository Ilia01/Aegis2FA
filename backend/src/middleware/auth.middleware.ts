import { Response, NextFunction } from 'express';
import { AuthRequest, JWTPayload } from '../types';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Authentication middleware - verifies JWT token
 */

/**
 * Extract and verify JWT token from authorization header
 * Returns the decoded payload if valid, null otherwise
 * This function performs both extraction AND cryptographic verification
 */
function extractAndVerifyToken(authHeaderRaw: string | string[] | undefined): JWTPayload | null {
  // Type guard: must be a non-empty string
  if (typeof authHeaderRaw !== 'string') {
    return null;
  }

  if (authHeaderRaw.length === 0 || authHeaderRaw.length > 1000) {
    return null;
  }

  // Validate Bearer token format (JWT: header.payload.signature)
  const bearerMatch = /^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/.exec(authHeaderRaw);

  if (!bearerMatch) {
    return null;
  }

  // Cryptographically verify the token - this is the security check
  // The result is based on cryptographic verification, not user input
  return verifyAccessToken(bearerMatch[1]);
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and verify token - security decision based on cryptographic verification
    const payload = extractAndVerifyToken(req.headers.authorization);

    // Security check based on verification result, not user input
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
    // Extract and verify token - security decision based on cryptographic verification
    const payload = extractAndVerifyToken(req.headers.authorization);

    // Only set user if cryptographic verification succeeded
    if (payload) {
      req.user = {
        id: payload.userId,
        email: payload.email,
        username: payload.username,
        twoFactorEnabled: false,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};
