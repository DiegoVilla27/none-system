import { Router } from 'express';
import { AuthController } from './controllers/auth.controller.js';
import { AuthMiddleware } from './middlewares/auth.middleware.js';
import { rateLimit } from '../../core/middlewares/rate-limit.middleware.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

export const createAuthRouter = (controller: AuthController, auth: AuthMiddleware): Router => {
  const router = Router();
  const { requireAuth } = auth;

  // Límites por IP contra fuerza bruta y abuso del envío de códigos
  const loginLimit = rateLimit({ max: 10, windowMs: FIFTEEN_MINUTES, keyPrefix: 'login', message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' });
  const codeLimit = rateLimit({ max: 5, windowMs: FIFTEEN_MINUTES, keyPrefix: 'otp-send' });
  const verifyLimit = rateLimit({ max: 20, windowMs: FIFTEEN_MINUTES, keyPrefix: 'otp-verify' });

  router.post('/register', codeLimit, controller.register);
  router.post('/register/confirm', verifyLimit, controller.confirmRegistration);
  router.post('/login', loginLimit, controller.login);
  router.post('/logout', controller.logout);
  router.post('/verify-email', verifyLimit, controller.verifyEmail);
  router.post('/forgot-password', codeLimit, controller.forgotPassword);
  router.post('/reset-password', verifyLimit, controller.resetPassword);

  // Authenticated routes
  router.post('/logout-all', requireAuth, controller.logoutEverywhere);
  router.post('/email/resend', requireAuth, codeLimit, controller.resendEmailVerification);
  router.post('/change-password', requireAuth, loginLimit, controller.changePassword);
  router.post('/phone/send-code', requireAuth, codeLimit, controller.sendPhoneVerification);
  router.post('/phone/verify', requireAuth, verifyLimit, controller.confirmPhoneVerification);
  router.get('/me', requireAuth, controller.getMe);
  router.delete('/me', requireAuth, loginLimit, controller.deleteAccount);

  return router;
};
