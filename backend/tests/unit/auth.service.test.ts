import { cleanDatabase, createTestUser, testDb, disconnectTestDb } from '../helpers/testDb';
import { cleanRedis, disconnectTestRedis } from '../helpers/testRedis';
import * as authService from '../../src/services/auth.service';

describe('Auth Service', () => {
  beforeEach(async () => {
    await cleanDatabase();
    await cleanRedis();
  });

  afterAll(async () => {
    await disconnectTestDb();
    await disconnectTestRedis();
  });

  describe('registerUser', () => {
    it('should register new user successfully', async () => {
      const result = await authService.registerUser({
        email: 'new@example.com',
        username: 'newuser',
        password: 'TestPass123!',
      });

      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('new@example.com');
      expect(result.user.username).toBe('newuser');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should hash password', async () => {
      const password = 'TestPass123!';
      await authService.registerUser({
        email: 'new@example.com',
        username: 'newuser',
        password,
      });

      const user = await testDb.user.findUnique({
        where: { email: 'new@example.com' },
      });

      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(password);
    });

    it('should reject duplicate email', async () => {
      await authService.registerUser({
        email: 'test@example.com',
        username: 'user1',
        password: 'TestPass123!',
      });

      await expect(
        authService.registerUser({
          email: 'test@example.com',
          username: 'user2',
          password: 'TestPass123!',
        })
      ).rejects.toThrow('Email already registered');
    });

    it('should reject duplicate username', async () => {
      await authService.registerUser({
        email: 'user1@example.com',
        username: 'testuser',
        password: 'TestPass123!',
      });

      await expect(
        authService.registerUser({
          email: 'user2@example.com',
          username: 'testuser',
          password: 'TestPass123!',
        })
      ).rejects.toThrow('Username already taken');
    });
  });

  describe('loginUser', () => {
    beforeEach(async () => {
      await authService.registerUser({
        email: 'login@example.com',
        username: 'loginuser',
        password: 'TestPass123!',
      });
    });

    it('should login with email', async () => {
      const result = await authService.loginUser({
        emailOrUsername: 'login@example.com',
        password: 'TestPass123!',
      });

      expect(result.success).toBe(true);
      expect(result.requiresTwoFactor).toBe(false);
      expect(result.tokens).toBeDefined();
      expect(result.user).toBeDefined();
    });

    it('should login with username', async () => {
      const result = await authService.loginUser({
        emailOrUsername: 'loginuser',
        password: 'TestPass123!',
      });

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.loginUser({
          emailOrUsername: 'login@example.com',
          password: 'WrongPassword123!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      await expect(
        authService.loginUser({
          emailOrUsername: 'nonexistent@example.com',
          password: 'TestPass123!',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should require 2FA when enabled', async () => {
      const user = await testDb.user.findUnique({
        where: { email: 'login@example.com' },
      });

      await testDb.user.update({
        where: { id: user!.id },
        data: { twoFactorEnabled: true },
      });

      await testDb.twoFactorMethod.create({
        data: {
          userId: user!.id,
          type: 'totp',
          secret: 'test-secret',
          enabled: true,
        },
      });

      const result = await authService.loginUser({
        emailOrUsername: 'login@example.com',
        password: 'TestPass123!',
      });

      expect(result.success).toBe(true);
      expect(result.requiresTwoFactor).toBe(true);
      expect(result.tempToken).toBeDefined();
      expect(result.tokens).toBeUndefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token', async () => {
      const registerResult = await authService.registerUser({
        email: 'refresh@example.com',
        username: 'refreshuser',
        password: 'TestPass123!',
      });

      const newTokens = await authService.refreshAccessToken(registerResult.tokens.refreshToken);

      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(registerResult.tokens.accessToken);
    });

    it('should reject invalid refresh token', async () => {
      await expect(authService.refreshAccessToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should reject expired refresh token', async () => {
      const user = await createTestUser();

      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      await testDb.session.create({
        data: {
          userId: user.id,
          refreshToken: 'expired-token',
          expiresAt: expiredDate,
        },
      });

      await expect(authService.refreshAccessToken('expired-token')).rejects.toThrow(
        'Refresh token expired'
      );
    });
  });

  describe('logoutUser', () => {
    it('should revoke refresh token', async () => {
      const registerResult = await authService.registerUser({
        email: 'logout@example.com',
        username: 'logoutuser',
        password: 'TestPass123!',
      });

      await authService.logoutUser(registerResult.tokens.refreshToken);

      const session = await testDb.session.findUnique({
        where: { refreshToken: registerResult.tokens.refreshToken },
      });

      expect(session).toBeNull();
    });
  });

  describe('revokeAllSessions', () => {
    it('should revoke all user sessions', async () => {
      const user = await createTestUser();

      await testDb.session.createMany({
        data: [
          {
            userId: user.id,
            refreshToken: 'token1',
            expiresAt: new Date(Date.now() + 86400000),
          },
          {
            userId: user.id,
            refreshToken: 'token2',
            expiresAt: new Date(Date.now() + 86400000),
          },
        ],
      });

      await authService.revokeAllSessions(user.id);

      const sessions = await testDb.session.findMany({
        where: { userId: user.id },
      });

      expect(sessions).toHaveLength(0);
    });
  });

  describe('getUserById', () => {
    it('should get user by id', async () => {
      const createdUser = await createTestUser();
      const user = await authService.getUserById(createdUser.id);

      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUser.id);
      expect(user?.email).toBe(createdUser.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await authService.getUserById('non-existent-id');

      expect(user).toBeNull();
    });
  });
});
