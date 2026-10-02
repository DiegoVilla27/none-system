import { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { WhatsAppService } from './whatsapp.service.js';
import { WhatsAppWebhookPayload } from './whatsapp.types.js';

export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Endpoint GET /api/v1/whatsapp/webhook
   * Validación del Handshake inicial que solicita Meta al configurar el Webhook.
   */
  verifyWebhook = (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
      console.log('✅ Webhook de WhatsApp verificado con éxito por Meta.');
      res.status(200).send(challenge);
      return;
    }

    console.warn('⚠️ Intento de verificación de Webhook con token inválido:', token);
    res.status(403).json({
      success: false,
      error: 'Token de verificación de WhatsApp inválido',
    });
  };

  /**
   * Endpoint POST /api/v1/whatsapp/webhook
   * Recibe eventos de mensajes entrantes (fotos, PDFs, texto) enviados por los usuarios.
   */
  handleWebhook = (req: Request, res: Response): void => {
    const body = req.body as WhatsAppWebhookPayload;

    // 1. Responder 200 inmediatamente a Meta para cumplir con el SLA de 5 segundos
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    // 2. Procesar el payload de forma asíncrona en segundo plano
    if (body.object === 'whatsapp_business_account' && body.entry) {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            const contacts = change.value.contacts || [];
            const contactMap = new Map<string, string>();
            contacts.forEach((c) => contactMap.set(c.wa_id, c.profile.name));

            for (const message of change.value.messages) {
              const senderName = contactMap.get(message.from);
              // Disparar procesamiento asíncrono
              this.whatsAppService
                .processIncomingMessage(message, senderName)
                .catch((err) => {
                  console.error('❌ Error en el procesamiento de mensaje WhatsApp:', err);
                });
            }
          }
        }
      }
    }
  };
}
