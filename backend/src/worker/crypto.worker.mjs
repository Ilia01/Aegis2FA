/**
 * Worker wrapper for development - loads TypeScript using tsx require hook
 * In production, the compiled .js file is used directly
 */
import { createRequire } from 'node:module';

// Create require function for ESM
const require = createRequire(import.meta.url);

// Load tsx/cjs to enable TypeScript support via require
require('tsx/cjs');

// Import the actual TypeScript worker using require
const workerModule = require('./crypto.worker.ts');

// Re-export all functions
export const hashPassword = workerModule.hashPassword;
export const hashBackupCode = workerModule.hashBackupCode;
