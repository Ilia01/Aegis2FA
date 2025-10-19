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
 * Result type for API key verification
 */
interface ApiKeyVerificationResult {
  valid: boolean;
  apiKey?: {
    id: string;
    userId: string;
    name: string;
    scopes: string[];
    rateLimit: number;
    email: string;
  };
  error?: 'missing' | 'invalid' | 'expired' | 'inactive' | 'rate_limited';
  message?: string;
}

/**
 * Extract and cryptographically verify API key from headers
 * Performs complete validation including database lookup and argon2 verification
 * Returns verification result - security decision based on cryptographic check
 */
async function extractAndVerifyApiKey(
  authHeaderRaw: string | string[] | undefined,
  apiKeyHeaderRaw: string | string[] | undefined
): Promise<ApiKeyVerificationResult> {
  // Extract API key value from headers
  let apiKeyValue: string | null = null;

  // Try Authorization header first
  if (typeof authHeaderRaw === 'string' && authHeaderRaw.length > 0 && authHeaderRaw.length < 200) {
    const bearerMatch = /^Bearer\s+(pk_(?:live|test)_[A-Za-z0-9]{32,})$/.exec(authHeaderRaw);
    if (bearerMatch) {
      apiKeyValue = bearerMatch[1];
    }
  }

  // Try X-API-Key header if Authorization didn't match
  if (!apiKeyValue && typeof apiKeyHeaderRaw === 'string' && apiKeyHeaderRaw.length > 0 && apiKeyHeaderRaw.length < 200) {
    if (/^pk_(?:live|test)_[A-Za-z0-9]{32,}$/.test(apiKeyHeaderRaw)) {
      apiKeyValue = apiKeyHeaderRaw;
    }
  }

  if (!apiKeyValue) {
    return { valid: false, error: 'missing' };
  }

  // Perform database lookup and cryptographic verification
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
    return { valid: false, error: 'invalid' };
  }

  // Cryptographically verify using argon2
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
    return { valid: false, error: 'invalid' };
  }

  // Check expiry
  if (matchedApiKey.expiresAt && new Date(matchedApiKey.expiresAt) < new Date()) {
    return { valid: false, error: 'expired', message: 'API key has expired' };
  }

  // Check user account status
  if (!matchedApiKey.user.isActive) {
    return { valid: false, error: 'inactive', message: 'User account is inactive' };
  }

  // Check rate limit
  const rateLimitKey = `api_key_rate_limit:${matchedApiKey.id}`;
  const requestCount = await redis.incr(rateLimitKey);

  if (requestCount === 1) {
    await redis.expire(rateLimitKey, 3600);
  }

  if (requestCount > matchedApiKey.rateLimit) {
    return {
      valid: false,
      error: 'rate_limited',
      message: `Rate limit exceeded. Limit: ${matchedApiKey.rateLimit} requests per hour`,
    };
  }

  // Update last used (async, don't wait)
  prisma.apiKey.update({
    where: { id: matchedApiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  // Return verified API key
  return {
    valid: true,
    apiKey: {
      id: matchedApiKey.id,
      userId: matchedApiKey.userId,
      name: matchedApiKey.name,
      scopes: matchedApiKey.scopes,
      rateLimit: matchedApiKey.rateLimit,
      email: matchedApiKey.user.email,
    },
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
    // Extract and cryptographically verify API key
    // Security decision based on cryptographic verification result
    const result = await extractAndVerifyApiKey(
      req.headers.authorization,
      req.headers['x-api-key']
    );

    // Check verification result (not directly checking user input)
    if (!result.valid) {
      const statusCode = result.error === 'rate_limited' ? 429 :
                         result.error === 'inactive' ? 403 : 401;

      const message = result.message ||
                     (result.error === 'missing' ? 'API key required. Provide via Authorization: Bearer or X-API-Key header' : 'Invalid API key');

      res.status(statusCode).json({
        success: false,
        message,
      });
      return;
    }

    // At this point, cryptographic verification has succeeded
    (req as ApiKeyRequest).apiKey = {
      id: result.apiKey!.id,
      userId: result.apiKey!.userId,
      name: result.apiKey!.name,
      scopes: result.apiKey!.scopes,
      rateLimit: result.apiKey!.rateLimit,
    };

    // Also attach user info for compatibility with existing auth middleware
    (req as any).user = {
      userId: result.apiKey!.userId,
      email: result.apiKey!.email,
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
