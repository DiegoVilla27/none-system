import { Router } from 'express';
import { AuthController } from './controllers/auth.controller.js';
import { requireAuth } from './middlewares/auth.middleware.js';

export const createAuthRouter = (controller: AuthController): Router => {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/verify-email', controller.verifyEmail);
  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);

  // Authenticated routes
  router.post('/change-password', requireAuth, controller.changePassword);
  router.get('/me', requireAuth, controller.getMe);

  return router;
};
