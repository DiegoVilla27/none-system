import { Router } from 'express';
import { WhatsAppController } from './whatsapp.controller.js';

export const createWhatsAppRouter = (controller: WhatsAppController): Router => {
  const router = Router();

  // Verificación de suscripción del Webhook (Handshake GET de Meta)
  router.get('/webhook', controller.verifyWebhook);

  // Recepción de eventos de mensajes (POST de Meta)
  router.post('/webhook', controller.handleWebhook);

  return router;
};
