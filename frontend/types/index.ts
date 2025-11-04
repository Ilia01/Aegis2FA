// User types
export interface User {
  id: string
  email: string
  username: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  createdAt: string
  updatedAt: string
}

// Auth types
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse {
  success: boolean
  requiresTwoFactor?: boolean
  tempToken?: string
  tokens?: TokenPair
  user?: User
}

export interface RegisterResponse {
  success: boolean
  user: User
  tokens: TokenPair
}

// 2FA Method types
export type TwoFactorMethodType = 'totp' | 'sms' | 'email'

export interface TwoFactorMethod {
  id: string
  type: TwoFactorMethodType
  phoneNumber?: string
  email?: string
  verifiedAt: string
  createdAt: string
}

// TOTP types
export interface TOTPSetupResponse {
  success: boolean
  data: {
    secret: string
    qrCode: string
    backupCodes: string[]
  }
}

export interface TOTPVerifySetupResponse {
  success: boolean
  data: {
    backupCodes: string[]
  }
}

// Backup Codes
export interface BackupCodesResponse {
  success: boolean
  data: {
    backupCodes: string[]
  }
}

export interface BackupCodesCountResponse {
  success: boolean
  data: {
    count: number
  }
}

// Trusted Devices
export interface TrustedDevice {
  id: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  lastUsedAt: string | null
  expiresAt: string
  createdAt: string
}

export interface TrustedDevicesResponse {
  success: boolean
  data: {
    devices: TrustedDevice[]
  }
}

// 2FA Verification
export interface Verify2FARequest {
  tempToken: string
  code: string
  trustDevice?: boolean
  deviceName?: string
}

export interface Verify2FAResponse {
  success: boolean
  data: {
    accessToken: string
    refreshToken: string
    deviceToken?: string
  }
}

// API Response types
export interface APIResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
}

export interface APIError {
  success: false
  message: string
  errors?: string[]
}

// Form types
export interface LoginFormData {
  emailOrUsername: string
  password: string
}

export interface RegisterFormData {
  email: string
  username: string
  password: string
  confirmPassword: string
}

export interface Verify2FAFormData {
  code: string
  trustDevice?: boolean
  deviceName?: string
}

export interface VerifyBackupCodeFormData {
  code: string
}

export interface TOTPVerifyFormData {
  code: string
}

export interface SMSSetupFormData {
  phoneNumber: string
}

export interface EmailSetupFormData {
  email: string
}
