import { env, isWhatsAppConfigured, isProduction } from '../../config/env.js';
import { maskPhone } from '../../core/security/privacy.js';

export interface InteractiveButton {
  id: string;
  title: string; // máx. 20 caracteres
}

export interface InteractiveListRow {
  id: string;
  title: string; // máx. 24 caracteres
  description?: string; // máx. 72 caracteres
}

const INTERACTIVE_BODY_LIMIT = 1024;

const renderButtonsAsText = (body: string, buttons: InteractiveButton[]) =>
  `${body}\n\n${buttons.map((b) => `[ ${b.title} ]`).join('  ')}`;

const renderListAsText = (body: string, rows: InteractiveListRow[], footer?: string) =>
  `${body}\n\n${rows.map((r) => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`).join('\n')}${footer ? `\n\n${footer}` : ''}`;

/**
 * Cliente de salida de la Meta WhatsApp Cloud API.
 * Sin credenciales configuradas, los mensajes se imprimen en consola (modo desarrollo).
 */
export class WhatsAppMessenger {
  private get messagesUrl(): string {
    return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  }

  private async post(body: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch(this.messagesUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', ...body }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Error enviando mensaje por WhatsApp Meta API:', response.status, errorData.slice(0, 500));
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ Excepción al enviar mensaje por WhatsApp:', (err as Error).message);
      return false;
    }
  }

  async sendText(to: string, messageText: string): Promise<boolean> {
    if (!isWhatsAppConfigured) {
      if (!isProduction) {
        console.log(`[WhatsApp Mock Dispatch] Destino: ${maskPhone(to)}\nMensaje:\n${messageText}\n`);
      }
      return true;
    }

    return this.post({
      to,
      type: 'text',
      text: { preview_url: false, body: messageText.slice(0, 4096) },
    });
  }

  /**
   * Mensaje con hasta 3 botones de respuesta rápida. Si el texto supera el límite de los mensajes
   * interactivos (1.024 caracteres) se envía primero como texto y luego los botones con una pregunta corta.
   * Si Meta rechaza el mensaje interactivo, se envía como texto con las opciones escritas.
   */
  async sendButtons(to: string, body: string, buttons: InteractiveButton[]): Promise<boolean> {
    const safeButtons = buttons.slice(0, 3).map((b) => ({ id: b.id.slice(0, 256), title: b.title.slice(0, 20) }));
    let interactiveBody = body;
    if (body.length > INTERACTIVE_BODY_LIMIT) {
      await this.sendText(to, body);
      interactiveBody = '¿Todo quedó bien?';
    }

    if (!isWhatsAppConfigured) return this.sendText(to, renderButtonsAsText(interactiveBody, safeButtons));

    const ok = await this.post({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: interactiveBody },
        action: { buttons: safeButtons.map((b) => ({ type: 'reply', reply: b })) },
      },
    });
    return ok || this.sendText(to, renderButtonsAsText(interactiveBody, safeButtons));
  }

  /**
   * Mensaje con imagen de encabezado + texto + botones. Si falla (imagen no disponible o Meta lo rechaza),
   * se envía sin imagen para que el usuario nunca quede sin respuesta.
   */
  async sendImageButtons(
    to: string,
    image: { id: string } | { link: string } | null,
    body: string,
    buttons: InteractiveButton[]
  ): Promise<boolean> {
    if (!image || !isWhatsAppConfigured || body.length > INTERACTIVE_BODY_LIMIT) {
      if (!isWhatsAppConfigured && image) {
        return this.sendText(to, renderButtonsAsText(`[Imagen de bienvenida]\n\n${body}`, buttons));
      }
      return this.sendButtons(to, body, buttons);
    }
    const ok = await this.post({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        header: { type: 'image', image },
        body: { text: body },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({ type: 'reply', reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) } })),
        },
      },
    });
    return ok || this.sendButtons(to, body, buttons);
  }

  /**
   * Sube un archivo a Meta y devuelve su media id (válido ~30 días) para reutilizarlo en mensajes.
   */
  async uploadMedia(buffer: Buffer, mimeType: string, filename: string): Promise<string | null> {
    if (!isWhatsAppConfigured) return null;
    try {
      const form = new FormData();
      form.append('messaging_product', 'whatsapp');
      form.append('type', mimeType);
      form.append('file', new Blob([buffer], { type: mimeType }), filename);
      const response = await fetch(
        `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/media`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}` },
          body: form,
          signal: AbortSignal.timeout(30000),
        }
      );
      if (!response.ok) {
        console.error('❌ Error subiendo medio a Meta:', response.status, (await response.text()).slice(0, 300));
        return null;
      }
      return ((await response.json()) as { id?: string }).id ?? null;
    } catch (err) {
      console.error('❌ Excepción subiendo medio a Meta:', (err as Error).message);
      return null;
    }
  }

  /**
   * Mensaje de lista (hasta 10 opciones). Si Meta lo rechaza, se envía como texto con las opciones.
   */
  async sendList(to: string, body: string, buttonText: string, rows: InteractiveListRow[], footer?: string): Promise<boolean> {
    const safeRows = rows.slice(0, 10).map((r) => ({
      id: r.id.slice(0, 200),
      title: r.title.slice(0, 24),
      ...(r.description ? { description: r.description.slice(0, 72) } : {}),
    }));

    if (!isWhatsAppConfigured) return this.sendText(to, renderListAsText(body, safeRows, footer));

    const ok = await this.post({
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: body.slice(0, 4096) },
        ...(footer ? { footer: { text: footer.slice(0, 60) } } : {}),
        action: { button: buttonText.slice(0, 20), sections: [{ title: 'Opciones', rows: safeRows }] },
      },
    });
    return ok || this.sendText(to, renderListAsText(body, safeRows, footer));
  }

  /**
   * Envía un código de verificación. Fuera de la ventana de 24 h de conversación,
   * Meta solo permite mensajes de plantilla: en producción debe existir una plantilla
   * de categoría "Authentication" aprobada (WHATSAPP_OTP_TEMPLATE_NAME).
   */
  async sendOtp(to: string, code: string): Promise<boolean> {
    if (isWhatsAppConfigured && env.WHATSAPP_OTP_TEMPLATE_NAME) {
      return this.post({
        to,
        type: 'template',
        template: {
          name: env.WHATSAPP_OTP_TEMPLATE_NAME,
          language: { code: env.WHATSAPP_OTP_TEMPLATE_LANG },
          components: [
            { type: 'body', parameters: [{ type: 'text', text: code }] },
            { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
          ],
        },
      });
    }

    return this.sendText(
      to,
      `🔐 *${code}* es tu código de verificación de none-system.\n\nVence en 10 minutos. No lo compartas con nadie: nuestro equipo nunca te lo pedirá.`
    );
  }
}
