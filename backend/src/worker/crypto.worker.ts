import argon2 from 'argon2';

/**
 * Crypto Worker - CPU-Intensive Operations Only
 *
 * This worker handles only Argon2 hashing operations which are CPU-intensive
 * and benefit from running in a separate thread pool.
 *
 * Lightweight operations (OTP, tokens, HMAC) have been moved to the main thread
 * to avoid IPC serialization overhead.
 */

/**
 * Hash password using Argon2id with high security settings
 * ~100-300ms operation - CPU-intensive, benefits from worker threads
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Hash backup code using Argon2 with default settings
 * ~50-100ms operation - faster than password hashing but still CPU-intensive
 */
export async function hashBackupCode(code: string): Promise<string> {
  return argon2.hash(code);
}
