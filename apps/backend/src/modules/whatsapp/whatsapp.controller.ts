import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { env, isProduction } from '../../config/env.js';
import { CryptoService } from '../../core/security/crypto.service.js';
import { maskPhone } from '../../core/security/privacy.js';
import { WhatsAppService } from './whatsapp.service.js';
import { WhatsAppWebhookPayload } from './whatsapp.types.js';
import { IProcessedMessageStore } from './conversation-state.js';

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

/**
 * Verifica la cabecera X-Hub-Signature-256 que Meta firma con el App Secret.
 */
export function isValidMetaSignature(rawBody: Buffer | undefined, header: string | undefined, appSecret: string): boolean {
  if (!rawBody || !header || !header.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  return CryptoService.safeEqual(expected, header);
}

export class WhatsAppController {
  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly processed: IProcessedMessageStore
  ) {}

  /**
   * Endpoint GET /api/v1/whatsapp/webhook
   * Validación del Handshake inicial que solicita Meta al configurar el Webhook.
   */
  verifyWebhook = (req: Request, res: Response): void => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (
      mode === 'subscribe' &&
      typeof token === 'string' &&
      CryptoService.safeEqual(token, env.WHATSAPP_VERIFY_TOKEN) &&
      typeof challenge === 'string' &&
      /^[A-Za-z0-9_-]{1,200}$/.test(challenge)
    ) {
      console.log('✅ Webhook de WhatsApp verificado con éxito por Meta.');
      res.status(200).type('text/plain').send(challenge);
      return;
    }

    console.warn('⚠️ Intento de verificación de Webhook con token inválido.');
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
    if (env.WHATSAPP_APP_SECRET) {
      if (!isValidMetaSignature(req.rawBody, req.header('x-hub-signature-256'), env.WHATSAPP_APP_SECRET)) {
        console.warn('⚠️ Webhook de WhatsApp rechazado: firma X-Hub-Signature-256 inválida.');
        res.status(401).json({ success: false, error: 'Firma inválida' });
        return;
      }
    } else if (isProduction) {
      res.status(503).json({ success: false, error: 'Webhook no configurado' });
      return;
    }

    const body = req.body as WhatsAppWebhookPayload;

    // 1. Responder 200 inmediatamente a Meta para cumplir con el SLA de 5 segundos
    res.status(200).json({ status: 'EVENT_RECEIVED' });

    // 2. Procesar el payload de forma asíncrona en segundo plano
    if (body?.object !== 'whatsapp_business_account' || !Array.isArray(body.entry)) return;

    for (const entry of body.entry) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages' || !change.value?.messages) continue;

        // Ignorar eventos dirigidos a otro número de la cuenta de negocio
        if (env.WHATSAPP_PHONE_NUMBER_ID && change.value.metadata?.phone_number_id !== env.WHATSAPP_PHONE_NUMBER_ID) {
          continue;
        }

        const contactMap = new Map<string, string>();
        (change.value.contacts || []).forEach((c) => contactMap.set(c.wa_id, c.profile?.name));

        for (const message of change.value.messages) {
          if (!message?.id || !message.from) continue;
          const senderName = contactMap.get(message.from)?.slice(0, 80);

          this.processed
            .markIfNew(message.id)
            .then((isNew) => {
              if (!isNew) return;
              console.log(`📩 [WhatsApp] Mensaje ${message.type} de ${maskPhone(message.from)}`);
              return this.whatsAppService.processIncomingMessage(message, senderName);
            })
            .catch((err) => {
              console.error('❌ Error en el procesamiento de mensaje WhatsApp:', (err as Error).message);
            });
        }
      }
    }
  };
}
