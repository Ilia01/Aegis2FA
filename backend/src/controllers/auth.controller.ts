import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import * as authService from '../services/auth.service';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Register new user
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const result = await authService.registerUser(
    { email, username, password },
    ipAddress,
    userAgent
  );

  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
    },
  });
});

/**
 * Login user
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const result = await authService.loginUser({
    emailOrUsername,
    password,
    ipAddress,
    userAgent,
  });

  if (result.requiresTwoFactor) {
    res.json({
      success: true,
      message: '2FA verification required',
      data: {
        requiresTwoFactor: true,
        tempToken: result.tempToken,
      },
    });
    return;
  }

  if (result.tokens) {
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.tokens?.accessToken,
    },
  });
});

/**
 * Refresh access token
 */
export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!refreshToken) {
    res.status(401).json({
      success: false,
      message: 'Refresh token not provided',
    });
    return;
  }

  const tokens = await authService.refreshAccessToken(refreshToken);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: tokens.accessToken,
    },
  });
});

/**
 * Logout user
 */
export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  if (refreshToken) {
    await authService.logoutUser(refreshToken, req.user?.id, ipAddress, userAgent);
  }

  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * Get current user
 */
export const getCurrentUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  const user = await authService.getUserById(req.user.id);

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  res.json({
    success: true,
    data: { user },
  });
});

/**
 * Revoke all sessions
 */
export const revokeAllSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Not authenticated',
    });
    return;
  }

  await authService.revokeAllSessions(req.user.id);

  res.json({
    success: true,
    message: 'All sessions revoked successfully',
  });
});
