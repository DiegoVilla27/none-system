import { Router } from 'express';
import { PaymentController } from './payment.controller.js';
import { AuthMiddleware } from '../auth/middlewares/auth.middleware.js';

export const createPaymentRouter = (controller: PaymentController, auth: AuthMiddleware): Router => {
  const router = Router();

  router.post('/wompi/webhook', controller.wompiWebhook);
  router.get('/wompi/confirm', auth.requireAuth, controller.confirm);
  router.get('/:reference', auth.requireAuth, controller.getByReference);

  return router;
};
