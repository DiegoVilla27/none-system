import { Router } from 'express';
import { SubscriptionController } from './subscription.controller.js';

export const createSubscriptionRouter = (controller: SubscriptionController): Router => {
  const router = Router();

  router.get('/plans', controller.getPlans);
  router.get('/:phoneNumber', controller.getSubscriptionByPhone);
  router.post('/checkout', controller.processCheckout);

  return router;
};
