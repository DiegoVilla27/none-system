import { env } from '../src/config/env.js';
import { ICE_BREAKERS, BOT_COMMANDS } from '../src/modules/whatsapp/bot-profile.js';

/**
 * Configura en Meta los componentes conversacionales del número:
 * - Mensaje de bienvenida (evento request_welcome al abrir el chat por primera vez)
 * - Sugerencias iniciales (ice breakers)
 * - Menú de comandos con "/"
 * Uso: pnpm --filter @none-system/backend whatsapp:setup
 */
async function main() {
  if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error('Configura WHATSAPP_API_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env');
  }
  const base = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}`;
  const headers = { Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`, 'Content-Type': 'application/json' };

  const update = await fetch(`${base}/conversational_automation`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      enable_welcome_message: true,
      prompts: [...ICE_BREAKERS],
      commands: BOT_COMMANDS,
    }),
  });
  const updateBody = await update.text();
  if (!update.ok) {
    throw new Error(`Meta rechazó la configuración (${update.status}): ${updateBody}`);
  }
  console.log('✅ Configuración enviada:', updateBody);

  const check = await fetch(`${base}?fields=conversational_automation`, { headers });
  console.log('🔎 Configuración actual en Meta:', JSON.stringify(await check.json(), null, 2));
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
