import { Router } from 'express';
import { SummaryController } from './controllers/summary.controller.js';

export const createSummaryRouter = (controller: SummaryController): Router => {
  const router = Router();

  // GET /api/v1/summaries/monthly
  router.get('/monthly', controller.getMonthly);

  // GET /api/v1/summaries/whatsapp-text
  router.get('/whatsapp-text', controller.getWhatsAppFormat);

  return router;
};
