import {
  hashPassword,
  verifyPassword,
  generateOTP,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
  generateSecureToken,
  createHMAC,
  verifyHMAC,
} from '../../src/utils/crypto';

describe('Crypto Utils', () => {
  describe('Password Hashing', () => {
    it('should hash password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, password);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, 'WrongPassword123!');

      expect(isValid).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('OTP Generation', () => {
    it('should generate 6-digit OTP by default', () => {
      const otp = generateOTP();

      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate OTP of specified length', () => {
      const otp = generateOTP(8);

      expect(otp).toHaveLength(8);
      expect(otp).toMatch(/^\d{8}$/);
    });

    it('should generate different OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();

      expect(otp1).not.toBe(otp2);
    });
  });

  describe('Backup Codes', () => {
    it('should generate 10 backup codes by default', () => {
      const codes = generateBackupCodes();

      expect(codes).toHaveLength(10);
    });

    it('should generate codes in XXXX-XXXX format', () => {
      const codes = generateBackupCodes();

      codes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      });
    });

    it('should generate unique codes', () => {
      const codes = generateBackupCodes();
      const uniqueCodes = new Set(codes);

      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should hash and verify backup codes', async () => {
      const code = 'ABCD-1234';
      const hash = await hashBackupCode(code);
      const isValid = await verifyBackupCode(hash, code);

      expect(isValid).toBe(true);
    });

    it('should reject invalid backup code', async () => {
      const code = 'ABCD-1234';
      const hash = await hashBackupCode(code);
      const isValid = await verifyBackupCode(hash, 'WXYZ-9876');

      expect(isValid).toBe(false);
    });
  });

  describe('Secure Token', () => {
    it('should generate secure token', () => {
      const token = generateSecureToken();

      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });

    it('should generate tokens of specified length', () => {
      const token = generateSecureToken(16);

      expect(token.length).toBe(32);
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('HMAC', () => {
    it('should create HMAC signature', () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature = createHMAC(data, secret);

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64);
    });

    it('should verify valid HMAC', () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature = createHMAC(data, secret);
      const isValid = verifyHMAC(data, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should reject invalid HMAC', () => {
      const data = 'test data';
      const secret = 'test secret';
      const signature = createHMAC(data, secret);
      const isValid = verifyHMAC('different data', signature, secret);

      expect(isValid).toBe(false);
    });

    it('should reject HMAC with wrong secret', () => {
      const data = 'test data';
      const signature = createHMAC(data, 'secret1');
      const isValid = verifyHMAC(data, signature, 'secret2');

      expect(isValid).toBe(false);
    });
  });
});
