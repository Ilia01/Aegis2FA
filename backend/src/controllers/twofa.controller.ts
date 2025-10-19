import { Response } from 'express';
import { AuthRequest } from '../types';
import { asyncHandler } from '../middleware/error.middleware';
import * as totpService from '../services/totp.service';
import * as smsService from '../services/sms.service';
import * as emailService from '../services/email.service';
import * as twofaService from '../services/twofa.service';
import * as backupCodesService from '../services/backupCodes.service';
import * as trustedDeviceService from '../services/trustedDevice.service';

export const setupTOTP = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const result = await totpService.setupTOTP(req.user.id);

  res.json({
    success: true,
    message: 'TOTP setup initiated',
    data: {
      secret: result.secret,
      qrCode: result.qrCode,
      backupCodes: result.backupCodes,
    },
  });
});

export const verifyTOTPSetup = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { secret, code } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const result = await totpService.verifyAndEnableTOTP(
    req.user.id,
    secret,
    code,
    ipAddress,
    userAgent
  );

  res.json({
    success: true,
    message: 'TOTP 2FA enabled successfully',
    data: { backupCodes: result.backupCodes },
  });
});

export const setupSMS = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { phoneNumber } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await smsService.setupSMS(req.user.id, phoneNumber, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'SMS verification code sent',
  });
});

export const verifySMSSetup = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { code } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await smsService.verifySMSCode(req.user.id, code, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'SMS 2FA enabled successfully',
  });
});

export const setupEmail = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { email } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await emailService.setupEmail(req.user.id, email, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Email verification code sent',
  });
});

export const verifyEmailSetup = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { code } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await emailService.verifyEmailCode(req.user.id, code, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Email 2FA enabled successfully',
  });
});

export const verify2FA = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tempToken, code, trustDevice, deviceName } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const result = await twofaService.verify2FACode(
    tempToken,
    code,
    trustDevice,
    deviceName,
    ipAddress,
    userAgent
  );

  if (result.tokens.refreshToken) {
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  res.json({
    success: true,
    message: '2FA verification successful',
    data: {
      accessToken: result.tokens.accessToken,
      deviceToken: result.deviceToken,
    },
  });
});

export const verify2FABackupCode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tempToken, code } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  const tokens = await twofaService.verify2FABackupCode(tempToken, code, ipAddress, userAgent);

  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: 'Backup code verified successfully',
    data: { accessToken: tokens.accessToken },
  });
});

export const resend2FACode = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { tempToken, method } = req.body;

  const tokenData = require('../utils/jwt').verifyTempToken(tempToken);
  if (!tokenData) {
    res.status(401).json({ success: false, message: 'Invalid temporary token' });
    return;
  }

  await twofaService.send2FACode(tokenData.userId, method);

  res.json({
    success: true,
    message: `${method.toUpperCase()} code sent successfully`,
  });
});

export const get2FAMethods = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const methods = await twofaService.get2FAMethods(req.user.id);

  res.json({
    success: true,
    data: { methods },
  });
});

export const disable2FAMethod = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { methodId } = req.params;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await twofaService.disable2FAMethod(req.user.id, methodId, ipAddress, userAgent);

  res.json({
    success: true,
    message: '2FA method disabled successfully',
  });
});

export const generateBackupCodes = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const codes = await backupCodesService.generateUserBackupCodes(req.user.id);

  res.json({
    success: true,
    message: 'Backup codes generated successfully',
    data: { backupCodes: codes },
  });
});

export const getBackupCodesCount = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const count = await backupCodesService.getBackupCodesCount(req.user.id);

  res.json({
    success: true,
    data: { count },
  });
});

export const getTrustedDevices = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const devices = await trustedDeviceService.getUserTrustedDevices(req.user.id);

  res.json({
    success: true,
    data: { devices },
  });
});

export const removeTrustedDevice = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const { deviceId } = req.params;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await trustedDeviceService.removeTrustedDevice(req.user.id, deviceId, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'Trusted device removed successfully',
  });
});

export const removeAllTrustedDevices = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  await trustedDeviceService.removeAllTrustedDevices(req.user.id, ipAddress, userAgent);

  res.json({
    success: true,
    message: 'All trusted devices removed successfully',
  });
});