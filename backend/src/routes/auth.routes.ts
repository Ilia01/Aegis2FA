import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.middleware';
import { registerSchema, loginSchema } from '../utils/validators';

const router = Router();

// Public routes
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh); // No validation - token can be in cookies or body
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/revoke-sessions', authenticate, authController.revokeAllSessions);

export default router;
