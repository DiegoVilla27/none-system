import { Router } from 'express';
import { SummaryController } from './controllers/summary.controller.js';
import { AuthMiddleware } from '../auth/middlewares/auth.middleware.js';

export const createSummaryRouter = (controller: SummaryController, auth: AuthMiddleware): Router => {
  const router = Router();

  router.use(auth.requireAuth);

  // GET /api/v1/summaries/monthly
  router.get('/monthly', controller.getMonthly);

  // GET /api/v1/summaries/whatsapp-text
  router.get('/whatsapp-text', controller.getWhatsAppFormat);

  return router;
};
