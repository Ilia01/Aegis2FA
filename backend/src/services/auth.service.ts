import { prisma } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { generateTokenPair, generateTempToken } from '../utils/jwt';
import { LoginResponse, TokenPair } from '../types';
import { auditLogQueue } from '../queues';

interface RegisterData {
  email: string;
  username: string;
  password: string;
}

interface LoginData {
  emailOrUsername: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export const registerUser = async (data: RegisterData, ipAddress?: string, userAgent?: string) => {
  const { email, username, password } = data;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new Error('Email already registered');
    }
    if (existingUser.username === username) {
      throw new Error('Username already taken');
    }
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
    },
    select: {
      id: true,
      email: true,
      username: true,
      emailVerified: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });

  auditLogQueue.add("registerUser", {
    userId: user.id,
    action: 'register',
    ipAddress,
    userAgent,
  }).catch(err => console.error("Failed to add registerUser audit job:", err));

  const tokens = generateTokenPair(user.id, user.email, user.username);

  await storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

  return {
    user,
    tokens,
  };
};

export const loginUser = async (data: LoginData): Promise<LoginResponse> => {
  const { emailOrUsername, password, ipAddress, userAgent } = data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
    },
    include: {
      twoFactorMethods: {
        where: { enabled: true },
      },
    },
  });

  if (!user) {
    auditLogQueue.add("loginFailed", {
      action: 'login_failed',
      details: { reason: 'User not found', identifier: emailOrUsername },
      ipAddress,
      userAgent,
      success: false,
    }).catch(err => console.error("Failed to add loginFailed audit job:", err));
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await verifyPassword(user.passwordHash, password);

  if (!isValidPassword) {
    auditLogQueue.add("loginFailed", {
      userId: user.id,
      action: 'login_failed',
      details: { reason: 'Invalid password' },
      ipAddress,
      userAgent,
      success: false,
    }).catch(err => console.error("Failed to add loginFailed audit job:", err));
    throw new Error('Invalid credentials');
  }

  if (!user.isActive) {
    throw new Error('Account is disabled');
  }

  if (user.twoFactorEnabled && user.twoFactorMethods.length > 0) {
    const tempToken = generateTempToken(user.id);
    auditLogQueue.add("loginSuccess2FA", {
      userId: user.id,
      action: 'login_success',
      details: { requires2FA: true },
      ipAddress,
      userAgent,
    }).catch(err => console.error("Failed to add loginSuccess2FA audit job:", err));

    return {
      success: true,
      requiresTwoFactor: true,
      tempToken,
    };
  }

  const tokens = generateTokenPair(user.id, user.email, user.username);

  // Store refresh token synchronously for faster login response (20-50ms improvement)
  await storeRefreshToken(user.id, tokens.refreshToken, ipAddress, userAgent);

  auditLogQueue.add("loginSuccess", {
    userId: user.id,
    action: 'login_success',
    ipAddress,
    userAgent,
  }).catch(err => console.error("Failed to add loginSuccess audit job:", err));

  return {
    success: true,
    requiresTwoFactor: false,
    tokens,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
};

export const storeRefreshToken = async (
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId,
      refreshToken,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt,
    },
  });
};

export const refreshAccessToken = async (
  refreshToken: string
): Promise<TokenPair> => {
  const session = await prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });

  if (!session) {
    throw new Error('Invalid refresh token');
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error('Refresh token expired');
  }

  const tokens = generateTokenPair(
    session.user.id,
    session.user.email,
    session.user.username
  );

  await prisma.session.update({
    where: { id: session.id },
    data: {
      refreshToken: tokens.refreshToken,
      lastUsedAt: new Date(),
    },
  });

  return tokens;
};

export const logoutUser = async (
  refreshToken: string,
  userId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  await prisma.session.deleteMany({
    where: { refreshToken },
  });

  if (userId) {
    auditLogQueue.add("logout", {
      userId,
      action: 'logout',
      ipAddress,
      userAgent,
    }).catch(err => console.error("Failed to add logout audit job:", err));
  }
};

export const revokeAllSessions = async (userId: string): Promise<void> => {
  await prisma.session.deleteMany({
    where: { userId },
  });

  auditLogQueue.add("sessionRevoked", {
    userId,
    action: 'session_revoked',
    details: { type: 'all_sessions' },
  }).catch(err => console.error("Failed to add sessionRevoked audit job:", err));
};


export const getUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      emailVerified: true,
      twoFactorEnabled: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};
