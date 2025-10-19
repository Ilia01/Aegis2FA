import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    twoFactorEnabled: boolean;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type TwoFactorType = 'totp' | 'sms' | 'email';

export interface LoginResponse {
  success: boolean;
  requiresTwoFactor?: boolean;
  tempToken?: string; // Temporary token for 2FA verification
  tokens?: TokenPair;
  user?: {
    id: string;
    email: string;
    username: string;
    twoFactorEnabled: boolean;
  };
}

// 2FA Setup Response
export interface TOTPSetupResponse {
  secret: string;
  qrCode: string; // Data URL for QR code
  backupCodes?: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Audit Log Action types
export type AuditAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'register'
  | '2fa_enabled'
  | '2fa_disabled'
  | '2fa_verified'
  | '2fa_failed'
  | 'backup_code_used'
  | 'trusted_device_added'
  | 'trusted_device_removed'
  | 'password_changed'
  | 'session_revoked';

// stored in Redis
export interface OTPData {
  code: string;
  attempts: number;
  createdAt: string;
}

export interface TrustedDeviceData {
  deviceToken: string;
  deviceName?: string;
  expiresAt: Date;
}
