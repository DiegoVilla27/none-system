/** Número oficial del bot de WhatsApp (solo dígitos). Configúralo con NEXT_PUBLIC_WHATSAPP_NUMBER. */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573009999999';
export const BACKOFFICE_URL = process.env.NEXT_PUBLIC_BACKOFFICE_URL || 'http://localhost:3000';

export const whatsappLink = (text: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const WHATSAPP_START_URL = whatsappLink('Hola, quiero empezar mi prueba gratuita con None System');
export const WHATSAPP_SUPPORT_URL = whatsappLink('Hola, necesito soporte o información sobre None System');
