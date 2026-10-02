/**
 * Definiciones de tipos para el Webhook y la API de WhatsApp Cloud (Meta).
 */

export interface WhatsAppMediaObject {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
  filename?: string;
}

export interface WhatsAppTextMessage {
  body: string;
}

export interface WhatsAppMessage {
  from: string; // Número de teléfono del remitente (ej. 573001234567)
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'voice' | 'sticker' | 'unknown';
  text?: WhatsAppTextMessage;
  image?: WhatsAppMediaObject;
  document?: WhatsAppMediaObject;
}

export interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WhatsAppValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: Array<{
    id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: string;
    recipient_id: string;
  }>;
}

export interface WhatsAppChange {
  value: WhatsAppValue;
  field: string;
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry?: WhatsAppEntry[];
}

export interface MetaMediaResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
}
