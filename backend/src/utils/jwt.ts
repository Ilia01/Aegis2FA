import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { JWTPayload, TokenPair } from '../types';

export const generateAccessToken = (payload: Omit<JWTPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'access' }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY,
    jwtid: randomUUID(),
  });
};

export const generateRefreshToken = (payload: Omit<JWTPayload, 'type'>): string => {
  return jwt.sign({ ...payload, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
    jwtid: randomUUID(),
  });
};

export const generateTokenPair = (userId: string, email: string, username: string): TokenPair => {
  const payload = { userId, email, username };

  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};


export const verifyAccessToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    if (decoded.type !== 'access') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
    if (decoded.type !== 'refresh') {
      return null;
    }
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate temporary token for 2FA flow (5 minutes expiry)
 */
export const generateTempToken = (userId: string): string => {
  return jwt.sign({ userId, type: 'temp_2fa' }, env.JWT_ACCESS_SECRET, {
    expiresIn: 300, // 5 minutes
    jwtid: randomUUID(),
  });
};

/**
 * Verify temporary 2FA token
 */
export const verifyTempToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    if (decoded.type !== 'temp_2fa') {
      return null;
    }
    return { userId: decoded.userId };
  } catch (error) {
    return null;
  }
};
