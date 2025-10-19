import { Router } from 'express';
import * as emailVerificationController from '../controllers/emailVerification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { otpSendLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Protected routes (require authentication)
router.post('/send-verification', authenticate, otpSendLimiter, emailVerificationController.sendVerification);
router.get('/status', authenticate, emailVerificationController.checkVerificationStatus);

// Public route (no auth required, uses token from email)
router.post('/verify', emailVerificationController.verifyEmail);

export default router;
