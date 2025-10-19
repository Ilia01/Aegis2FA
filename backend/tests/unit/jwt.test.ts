import {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  generateTempToken,
  verifyTempToken,
} from '../../src/utils/jwt';

describe('JWT Utils', () => {
  const mockPayload = {
    userId: '123',
    email: 'test@example.com',
    username: 'testuser',
  };

  describe('Token Generation', () => {
    it('should generate access token', () => {
      const token = generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate refresh token', () => {
      const token = generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate token pair', () => {
      const tokens = generateTokenPair(mockPayload.userId, mockPayload.email, mockPayload.username);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should generate temp token', () => {
      const token = generateTempToken(mockPayload.userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('Token Verification', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(mockPayload);
      const decoded = verifyAccessToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.type).toBe('access');
    });

    it('should reject invalid access token', () => {
      const decoded = verifyAccessToken('invalid.token.here');

      expect(decoded).toBeNull();
    });

    it('should reject refresh token as access token', () => {
      const refreshToken = generateRefreshToken(mockPayload);
      const decoded = verifyAccessToken(refreshToken);

      expect(decoded).toBeNull();
    });

    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(mockPayload);
      const decoded = verifyRefreshToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.type).toBe('refresh');
    });

    it('should reject access token as refresh token', () => {
      const accessToken = generateAccessToken(mockPayload);
      const decoded = verifyRefreshToken(accessToken);

      expect(decoded).toBeNull();
    });

    it('should verify valid temp token', () => {
      const token = generateTempToken(mockPayload.userId);
      const decoded = verifyTempToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
    });

    it('should reject invalid temp token', () => {
      const decoded = verifyTempToken('invalid.token');

      expect(decoded).toBeNull();
    });
  });
});
