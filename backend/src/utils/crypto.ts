import argon2 from 'argon2';
import Piscina from 'piscina';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

// Create a worker pool instance for CPU-intensive operations only (Argon2 hashing).
// Lightweight operations (OTP, tokens, HMAC) run on main thread to avoid IPC overhead.
const piscina = new Piscina({
  filename: path.resolve(
    __dirname,
    process.env.NODE_ENV === 'production'
      ? '../worker/crypto.worker.js'
      : '../worker/crypto.worker.mjs'  // Use .mjs wrapper for dev TypeScript support
  ),
  // Configure worker pool for optimal performance under high load
  // Argon2 hashing is CPU-intensive, so we use more threads for better concurrency
  minThreads: 4,
  maxThreads: Math.max(8, os.cpus().length), // Use all CPU cores or minimum 8 threads
  maxQueue: 2000, // Increase queue size for stress testing with 500+ concurrent users
  idleTimeout: 60000, // Keep workers alive for 1 minute
});

console.log(`[Crypto Worker Pool] Initialized with ${piscina.options.minThreads}-${piscina.options.maxThreads} threads`);

/**
 * Hash password using Argon2id (CPU-intensive, runs in worker pool)
 * ~100-300ms operation depending on memory cost
 */
export const hashPassword = async (password: string): Promise<string> => {
  return piscina.run(password, { name: 'hashPassword' });
};

/**
 * Verify password against hash (CPU-intensive, runs on main thread)
 * Argon2.verify is already optimized and doesn't block event loop significantly
 */
export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    console.error("Failed to verify password", error)
    return false;
  }
};

/**
 * Generate numeric OTP code (lightweight, runs on main thread)
 * ~microseconds operation - faster on main thread than worker IPC
 */
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  // Generate one digit at a time, ensuring unbiased distribution
  while (otp.length < length) {
    const byte = crypto.randomBytes(1)[0];
    if (byte < 250) {
      otp += digits[byte % 10];
    }
  }
  return otp;
};

/**
 * Generate backup codes (lightweight, runs on main thread)
 * ~milliseconds operation - IPC overhead > computation time
 */
export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
};

/**
 * Hash backup code using Argon2 (CPU-intensive, runs in worker pool)
 * Uses default Argon2 settings which are faster than password hashing
 */
export const hashBackupCode = async (code: string): Promise<string> => {
  return piscina.run(code, { name: 'hashBackupCode' });
};

/**
 * Verify backup code against hash (CPU-intensive, runs on main thread)
 */
export const verifyBackupCode = async (hash: string, code: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, code);
  } catch (error) {
    console.error("Failed to verify backupCode", error)
    return false;
  }
};

/**
 * Generate secure random token (lightweight, runs on main thread)
 * ~microseconds operation - much faster on main thread
 */
export const generateSecureToken = (bytes: number = 32): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Create HMAC signature (lightweight, runs on main thread)
 * ~microseconds operation - synchronous and fast
 */
export const createHMAC = (data: string, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
};

/**
 * Verify HMAC signature using constant-time comparison
 */
export const verifyHMAC = (data: string, signature: string, secret: string): boolean => {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
};
