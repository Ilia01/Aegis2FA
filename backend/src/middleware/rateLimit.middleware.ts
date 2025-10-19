import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const isTestEnv = env.NODE_ENV === 'test';
/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  skip: () => isTestEnv,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 5,
  skip: () => isTestEnv,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for 2FA verification
 */
export const twoFactorLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10,
  skip: () => isTestEnv,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many verification attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for OTP/code sending
 */
export const otpSendLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS * 4,
  max: 3,
  skip: () => isTestEnv,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many code requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for registration
 */
export const registerLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS * 4,
  max: 3, // 3 registrations per hour per IP
  skip: () => isTestEnv,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many accounts created, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
