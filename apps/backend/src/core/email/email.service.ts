import { env, isProduction } from '../../config/env.js';
import { maskEmail } from '../security/privacy.js';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envío de correos transaccionales con Resend (https://resend.com).
 * Sin RESEND_API_KEY, en desarrollo los correos se imprimen en consola.
 */
export class EmailService {
  get isConfigured(): boolean {
    return Boolean(env.RESEND_API_KEY);
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (!this.isConfigured) {
      if (!isProduction) {
        console.log(`[Email Mock] Para: ${message.to}\nAsunto: ${message.subject}\n${message.text}\n`);
      }
      return !isProduction;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.EMAIL_FROM,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        console.error(`❌ Error enviando correo a ${maskEmail(message.to)}:`, response.status, (await response.text()).slice(0, 300));
        return false;
      }
      return true;
    } catch (err) {
      console.error(`❌ Excepción enviando correo a ${maskEmail(message.to)}:`, (err as Error).message);
      return false;
    }
  }
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0"><tr><td>
<div style="font-size:20px;font-weight:bold;margin-bottom:24px">none<span style="color:#0891b2">.system</span></div>
<h1 style="font-size:18px;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}
<p style="font-size:12px;color:#6b7280;margin-top:32px">Recibes este correo por tu cuenta en none-system. Si no reconoces esta actividad, responde a este mensaje.</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (url: string, label: string) =>
  `<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="background:#0891b2;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(label)}</a></p>`;

export const EmailTemplates = {
  verifyEmail(name: string, url: string): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Confirma tu correo en none-system',
      text: `Hola ${name},\n\nConfirma tu correo abriendo este enlace (vence en 24 horas):\n${url}\n`,
      html: layout(
        'Confirma tu correo',
        `<p>Hola ${escapeHtml(name)},</p><p>Confirma que este correo es tuyo para proteger tu cuenta.</p>${button(url, 'Confirmar correo')}<p style="font-size:12px;color:#6b7280">El enlace vence en 24 horas.</p>`
      ),
    };
  },
  passwordChanged(name: string): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Tu contraseña de none-system cambió',
      text: `Hola ${name},\n\nLa contraseña de tu cuenta se cambió y cerramos las demás sesiones. Si no fuiste tú, recupera tu cuenta de inmediato desde ${env.BACKOFFICE_URL}/forgot-password\n`,
      html: layout(
        'Tu contraseña cambió',
        `<p>Hola ${escapeHtml(name)},</p><p>La contraseña de tu cuenta se cambió y cerramos las demás sesiones abiertas.</p><p>Si no fuiste tú, recupera tu cuenta de inmediato.</p>${button(`${env.BACKOFFICE_URL}/forgot-password`, 'Recuperar mi cuenta')}`
      ),
    };
  },
  planActivated(name: string, planName: string, amount: string, reference: string, until: string): Omit<EmailMessage, 'to'> {
    return {
      subject: `Pago aprobado: ${planName}`,
      text: `Hola ${name},\n\nRecibimos tu pago de ${amount} (referencia ${reference}). Tu ${planName} está activo hasta el ${until}. No se renueva automáticamente.\n`,
      html: layout(
        'Pago aprobado',
        `<p>Hola ${escapeHtml(name)},</p><p>Recibimos tu pago de <strong>${escapeHtml(amount)}</strong>.</p><ul><li>Plan: ${escapeHtml(planName)}</li><li>Referencia: ${escapeHtml(reference)}</li><li>Vigente hasta: ${escapeHtml(until)}</li></ul><p>El plan no se renueva automáticamente.</p>${button(`${env.BACKOFFICE_URL}/billing`, 'Ver mi plan')}`
      ),
    };
  },
  accountDeleted(name: string): Omit<EmailMessage, 'to'> {
    return {
      subject: 'Eliminamos tu cuenta de none-system',
      text: `Hola ${name},\n\nEliminamos tu cuenta y todos tus comprobantes y gastos de forma permanente. Gracias por usar none-system.\n`,
      html: layout(
        'Cuenta eliminada',
        `<p>Hola ${escapeHtml(name)},</p><p>Eliminamos tu cuenta y todos tus comprobantes, imágenes y gastos de forma permanente, como lo solicitaste.</p><p>Gracias por usar none-system.</p>`
      ),
    };
  },
};
