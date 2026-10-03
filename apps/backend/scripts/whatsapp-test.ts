import crypto from 'node:crypto';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { WhatsAppMessenger } from '../src/modules/whatsapp/whatsapp.messenger.js';

/**
 * Prueba manual del webhook de WhatsApp. No envía mensajes reales: las respuestas
 * del bot se imprimen en consola.
 */
class ConsoleMessenger extends WhatsAppMessenger {
  async sendText(to: string, body: string): Promise<boolean> {
    console.log(`\n💬 [Bot → ${to}]\n${body}\n`);
    return true;
  }
  async sendOtp(to: string, code: string): Promise<boolean> {
    console.log(`\n🔐 [OTP → ${to}] ${code}\n`);
    return true;
  }
}

const PORT = 4002;
const FROM = '573001234567';
let seq = 0;

function signedPost(body: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (env.WHATSAPP_APP_SECRET) {
    headers['X-Hub-Signature-256'] = `sha256=${crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(body).digest('hex')}`;
  }
  return fetch(`http://localhost:${PORT}/api/v1/whatsapp/webhook`, { method: 'POST', headers, body });
}

async function sendText(text: string) {
  const payload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550254415', phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID || '104928472910' },
              contacts: [{ profile: { name: 'Usuario Prueba' }, wa_id: FROM }],
              messages: [{ from: FROM, id: `wamid.test.${Date.now()}.${++seq}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: text } }],
            },
          },
        ],
      },
    ],
  });
  console.log(`\n👤 [${FROM} → Bot] ${text}`);
  const res = await signedPost(payload);
  if (res.status !== 200) throw new Error(`Webhook respondió ${res.status}`);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

async function run() {
  const { app } = createApp({ messenger: new ConsoleMessenger() });
  const server = app.listen(PORT, async () => {
    try {
      const challenge = '1234567890';
      const ok = await fetch(
        `http://localhost:${PORT}/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(env.WHATSAPP_VERIFY_TOKEN)}&hub.challenge=${challenge}`
      );
      if (ok.status !== 200 || (await ok.text()) !== challenge) throw new Error('Fallo en handshake');
      console.log('✅ Handshake de Meta OK');

      const bad = await fetch(`http://localhost:${PORT}/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=falso&hub.challenge=1`);
      if (bad.status !== 403) throw new Error('El token inválido no fue rechazado');
      console.log('✅ Token inválido rechazado');

      for (const text of ['Hola', 'ACEPTO', 'arroz 5000, aceite 12000', 'ayer taxi 12 mil', 'RESUMEN', 'CUPO', 'DESHACER']) {
        await sendText(text);
      }
      console.log('\n🎉 Pruebas del webhook de WhatsApp completadas.');
    } catch (err) {
      console.error('❌ Error en pruebas de WhatsApp:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => process.exit(process.exitCode || 0));
    }
  });
}

run();
