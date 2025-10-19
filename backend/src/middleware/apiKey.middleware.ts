import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import * as argon2 from 'argon2';

/**
 * API Key Authentication Middleware
 * Allows third-party applications to authenticate using API keys
 *
 * Usage in headers:
 * Authorization: Bearer pk_live_...
 * or
 * X-API-Key: pk_live_...
 */

interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    userId: string;
    name: string;
    scopes: string[];
    rateLimit: number;
  };
}

/**
 * Middleware to authenticate API key from request headers
 */
export const requireApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'] as string;

    let apiKeyValue: string | null = null;

    // Support both Authorization: Bearer and X-API-Key headers
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKeyValue = authHeader.substring(7);
    } else if (apiKeyHeader) {
      apiKeyValue = apiKeyHeader;
    }

    if (!apiKeyValue) {
      res.status(401).json({
        success: false,
        message: 'API key required. Provide via Authorization: Bearer or X-API-Key header',
      });
      return;
    }

    const keyPrefix = apiKeyValue.substring(0, 12);

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        keyPrefix,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (apiKeys.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
      return;
    }

    let matchedApiKey = null;
    for (const key of apiKeys) {
      try {
        const isValid = await argon2.verify(key.keyHash, apiKeyValue);
        if (isValid) {
          matchedApiKey = key;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!matchedApiKey) {
      res.status(401).json({
        success: false,
        message: 'Invalid API key',
      });
      return;
    }

    if (matchedApiKey.expiresAt && new Date(matchedApiKey.expiresAt) < new Date()) {
      res.status(401).json({
        success: false,
        message: 'API key has expired',
      });
      return;
    }

    if (!matchedApiKey.user.isActive) {
      res.status(403).json({
        success: false,
        message: 'User account is inactive',
      });
      return;
    }

    const rateLimitKey = `api_key_rate_limit:${matchedApiKey.id}`;
    const requestCount = await redis.incr(rateLimitKey);

    if (requestCount === 1) {
      // Set expiry for 1 hour (rate limit window)
      await redis.expire(rateLimitKey, 3600);
    }

    if (requestCount > matchedApiKey.rateLimit) {
      res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Limit: ${matchedApiKey.rateLimit} requests per hour`,
      });
      return;
    }

    // Update last used timestamp (async, don't wait)
    prisma.apiKey.update({
      where: { id: matchedApiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {}); // Ignore errors


    (req as ApiKeyRequest).apiKey = {
      id: matchedApiKey.id,
      userId: matchedApiKey.userId,
      name: matchedApiKey.name,
      scopes: matchedApiKey.scopes,
      rateLimit: matchedApiKey.rateLimit,
    };

    // Also attach user info for compatibility with existing auth middleware
    (req as any).user = {
      userId: matchedApiKey.userId,
      email: matchedApiKey.user.email,
    };

    next();
  } catch (error: any) {
    console.error('API Key authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during API key authentication',
    });
  }
};

/**
 * Middleware to check if API key has required scope
 * Usage: requireScope('2fa:write')
 */
export const requireScope = (requiredScope: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKeyReq = req as ApiKeyRequest;

    if (!apiKeyReq.apiKey) {
      res.status(403).json({
        success: false,
        message: 'API key required for scope validation',
      });
      return;
    }

    const hasScope = apiKeyReq.apiKey.scopes.includes(requiredScope) ||
                     apiKeyReq.apiKey.scopes.includes('*'); // Wildcard scope

    if (!hasScope) {
      res.status(403).json({
        success: false,
        message: `Insufficient permissions. Required scope: ${requiredScope}`,
      });
      return;
    }

    next();
  };
};

/**
 * Flexible auth middleware that accepts either JWT or API key
 * Tries JWT first, then falls back to API key
 */
export const flexibleAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Check if user is already authenticated via JWT (from requireAuth middleware)
  if ((req as any).user) {
    return next();
  }


  await requireApiKey(req, res, next);
};

export type { ApiKeyRequest };
