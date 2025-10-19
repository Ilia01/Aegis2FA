import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
  trustDevice: z.boolean().optional(),
});

export const verify2FASchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
  trustDevice: z.boolean().optional(),
});

export const verifyTOTPSetupSchema = z.object({
  secret: z.string().min(1, 'Secret is required'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
});

export const setupSMSSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Invalid phone number format. Use E.164 format (e.g., +1234567890)'),
});

export const setupEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyOTPSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only digits'),
});

export const verifyBackupCodeSchema = z.object({
  tempToken: z.string().min(1, 'Temporary token is required'),
  code: z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Invalid backup code format'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const trustDeviceSchema = z.object({
  deviceName: z.string().max(100).optional(),
});

export const validate = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  return schema.parse(data);
};

export const validateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: string[] }> => {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map((err) => `${err.path.join('.')}: ${err.message}`),
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
};