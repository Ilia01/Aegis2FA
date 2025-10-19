import { validate, validateAsync, registerSchema, loginSchema } from '../../src/utils/validators';
import { z } from 'zod';

describe('Validators', () => {
  describe('Registration Validation', () => {
    const validData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'TestPass123!',
    };

    it('should validate correct registration data', () => {
      expect(() => validate(registerSchema, validData)).not.toThrow();
    });

    it('should reject invalid email', () => {
      const data = { ...validData, email: 'invalid-email' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject short username', () => {
      const data = { ...validData, username: 'ab' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject username with invalid characters', () => {
      const data = { ...validData, username: 'test@user' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject weak password (no uppercase)', () => {
      const data = { ...validData, password: 'testpass123!' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject weak password (no lowercase)', () => {
      const data = { ...validData, password: 'TESTPASS123!' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject weak password (no number)', () => {
      const data = { ...validData, password: 'TestPass!' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject weak password (no special char)', () => {
      const data = { ...validData, password: 'TestPass123' };
      expect(() => validate(registerSchema, data)).toThrow();
    });

    it('should reject short password', () => {
      const data = { ...validData, password: 'Test1!' };
      expect(() => validate(registerSchema, data)).toThrow();
    });
  });

  describe('Login Validation', () => {
    const validData = {
      emailOrUsername: 'testuser',
      password: 'password123',
    };

    it('should validate correct login data', () => {
      expect(() => validate(loginSchema, validData)).not.toThrow();
    });

    it('should accept email as identifier', () => {
      const data = { ...validData, emailOrUsername: 'test@example.com' };
      expect(() => validate(loginSchema, data)).not.toThrow();
    });

    it('should reject empty emailOrUsername', () => {
      const data = { ...validData, emailOrUsername: '' };
      expect(() => validate(loginSchema, data)).toThrow();
    });

    it('should reject empty password', () => {
      const data = { ...validData, password: '' };
      expect(() => validate(loginSchema, data)).toThrow();
    });

    it('should accept trustDevice option', () => {
      const data = { ...validData, trustDevice: true };
      expect(() => validate(loginSchema, data)).not.toThrow();
    });
  });

  describe('Async Validation', () => {
    const testSchema = z.object({
      email: z.string().email(),
    });

    it('should validate successfully', async () => {
      const result = await validateAsync(testSchema, { email: 'test@example.com' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should return errors for invalid data', async () => {
      const result = await validateAsync(testSchema, { email: 'invalid' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toBeDefined();
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
