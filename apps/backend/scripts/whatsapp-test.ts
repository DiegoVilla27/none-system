import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

async function runWhatsAppTests() {
  console.log('🧪 Iniciando pruebas del Webhook de WhatsApp Cloud API...\n');

  const { app } = createApp();
  const PORT = 4002;

  const server = app.listen(PORT, async () => {
    try {
      console.log(`1. Servidor de pruebas iniciado en http://localhost:${PORT}`);

      // Prueba 1: Handshake exitoso con token válido
      console.log('\n2. Probando Handshake GET /api/v1/whatsapp/webhook con token válido...');
      const challengeCode = '1234567890';
      const verifyUrl = `http://localhost:${PORT}/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${env.WHATSAPP_VERIFY_TOKEN}&hub.challenge=${challengeCode}`;
      
      const handshakeRes = await fetch(verifyUrl);
      const handshakeText = await handshakeRes.text();

      if (handshakeRes.status !== 200 || handshakeText !== challengeCode) {
        throw new Error(`Fallo en handshake exitoso. Status: ${handshakeRes.status}, Body: ${handshakeText}`);
      }
      console.log('✅ Handshake exitoso: Meta recibió HTTP 200 y el código de desafío intacto.');

      // Prueba 2: Handshake rechazado con token inválido
      console.log('\n3. Probando Handshake GET /api/v1/whatsapp/webhook con token INVÁLIDO...');
      const invalidUrl = `http://localhost:${PORT}/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=token_falso&hub.challenge=${challengeCode}`;
      
      const invalidRes = await fetch(invalidUrl);
      if (invalidRes.status !== 403) {
        throw new Error(`Se esperaba 403 Forbidden pero se recibió ${invalidRes.status}`);
      }
      console.log('✅ Token inválido bloqueado correctamente con HTTP 403.');

      // Prueba 3: Recepción de mensaje de texto (Hola / Ayuda)
      console.log('\n4. Enviando payload POST simulado de WhatsApp (Mensaje de texto)...');
      const textPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15550254415',
                    phone_number_id: '104928472910',
                  },
                  contacts: [
                    {
                      profile: { name: 'Diego Villa' },
                      wa_id: '573001234567',
                    },
                  ],
                  messages: [
                    {
                      from: '573001234567',
                      id: 'wamid.HBgLM...',
                      timestamp: '1727892345',
                      type: 'text',
                      text: {
                        body: 'Hola asistente',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const postRes = await fetch(`http://localhost:${PORT}/api/v1/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(textPayload),
      });

      const postData = await postRes.json();
      if (postRes.status !== 200 || postData.status !== 'EVENT_RECEIVED') {
        throw new Error(`Fallo en recepción de evento. Response: ${JSON.stringify(postData)}`);
      }
      console.log('✅ Evento de mensaje recibido y confirmado con HTTP 200 EVENT_RECEIVED.');

      // Prueba 4: Consulta de Resumen ("RESUMEN")
      console.log('\n5. Enviando mensaje de comando "RESUMEN"...');
      const resumenPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15550254415',
                    phone_number_id: '104928472910',
                  },
                  contacts: [
                    {
                      profile: { name: 'Diego Villa' },
                      wa_id: '573001234567',
                    },
                  ],
                  messages: [
                    {
                      from: '573001234567',
                      id: 'wamid.HBgLM2...',
                      timestamp: '1727892346',
                      type: 'text',
                      text: {
                        body: 'RESUMEN',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const resumenRes = await fetch(`http://localhost:${PORT}/api/v1/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resumenPayload),
      });

      const resumenData = await resumenRes.json();
      if (resumenRes.status !== 200) {
        throw new Error(`Error en comando resumen: ${JSON.stringify(resumenData)}`);
      }
      console.log('✅ Comando RESUMEN procesado exitosamente.');

      // Prueba 5: Consulta de Cupo / Saldo ("CUPO")
      console.log('\n6. Enviando mensaje de comando "CUPO"...');
      const cupoPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '15550254415',
                    phone_number_id: '104928472910',
                  },
                  contacts: [
                    {
                      profile: { name: 'Diego Villa' },
                      wa_id: '573001234567',
                    },
                  ],
                  messages: [
                    {
                      from: '573001234567',
                      id: 'wamid.HBgLM3...',
                      timestamp: '1727892347',
                      type: 'text',
                      text: {
                        body: 'CUPO',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const cupoRes = await fetch(`http://localhost:${PORT}/api/v1/whatsapp/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cupoPayload),
      });

      const cupoData = await cupoRes.json();
      if (cupoRes.status !== 200) {
        throw new Error(`Error en comando cupo: ${JSON.stringify(cupoData)}`);
      }
      console.log('✅ Comando CUPO procesado exitosamente.');

      // Esperar 1 segundo para que las promesas asíncronas terminen de loguear
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log('\n🎉 ¡Todas las pruebas del Webhook de WhatsApp pasaron con éxito!');
    } catch (err) {
      console.error('❌ Error en pruebas de WhatsApp:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('Servidor de pruebas cerrado.');
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runWhatsAppTests();
