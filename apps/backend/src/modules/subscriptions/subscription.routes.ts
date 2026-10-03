import { Router } from 'express';
import { SubscriptionController } from './subscription.controller.js';
import { AuthMiddleware } from '../auth/middlewares/auth.middleware.js';

export const createSubscriptionRouter = (controller: SubscriptionController, auth: AuthMiddleware): Router => {
  const router = Router();
  const { requireAuth, requireAdmin } = auth;

  router.get('/plans', controller.getPlans);
  router.get('/me', requireAuth, controller.getMine);
  router.post('/checkout', requireAuth, controller.processCheckout);
  router.get('/:phoneNumber', requireAuth, requireAdmin, controller.getSubscriptionByPhone);

  return router;
};
