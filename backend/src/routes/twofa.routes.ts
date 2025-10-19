import { Router } from 'express';
import * as twofaController from '../controllers/twofa.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { requireEmailVerified } from '../middleware/requireEmailVerified.middleware';
import { twoFactorLimiter, otpSendLimiter } from '../middleware/rateLimit.middleware';
import {
  verify2FASchema,
  verifyTOTPSetupSchema,
  setupSMSSchema,
  setupEmailSchema,
  verifyOTPSchema,
  verifyBackupCodeSchema,
} from '../utils/validators';

const router = Router();

// All 2FA setup endpoints require email verification
router.post('/totp/setup', authenticate, requireEmailVerified, twofaController.setupTOTP);
router.post(
  '/totp/verify-setup',
  authenticate,
  validate(verifyTOTPSetupSchema),
  twofaController.verifyTOTPSetup
);

router.post(
  '/sms/setup',
  authenticate,
  requireEmailVerified,
  otpSendLimiter,
  validate(setupSMSSchema),
  twofaController.setupSMS
);
router.post(
  '/sms/verify-setup',
  authenticate,
  validate(verifyOTPSchema),
  twofaController.verifySMSSetup
);

router.post(
  '/email/setup',
  authenticate,
  requireEmailVerified,
  otpSendLimiter,
  validate(setupEmailSchema),
  twofaController.setupEmail
);
router.post(
  '/email/verify-setup',
  authenticate,
  validate(verifyOTPSchema),
  twofaController.verifyEmailSetup
);

router.post(
  '/verify',
  twoFactorLimiter,
  validate(verify2FASchema),
  twofaController.verify2FA
);
router.post(
  '/verify-backup-code',
  twoFactorLimiter,
  validate(verifyBackupCodeSchema),
  twofaController.verify2FABackupCode
);
router.post('/resend', otpSendLimiter, twofaController.resend2FACode);

router.get('/methods', authenticate, twofaController.get2FAMethods);
router.delete('/methods/:methodId', authenticate, twofaController.disable2FAMethod);

router.get('/backup-codes/count', authenticate, twofaController.getBackupCodesCount);
router.post('/backup-codes/generate', authenticate, twofaController.generateBackupCodes);

router.get('/devices', authenticate, twofaController.getTrustedDevices);
router.delete('/devices/:deviceId', authenticate, twofaController.removeTrustedDevice);
router.delete('/devices', authenticate, twofaController.removeAllTrustedDevices);

export default router;