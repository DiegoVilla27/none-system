import fs from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/app.js';

async function runE2ETest() {
  console.log('🧪 Iniciando prueba End-to-End del Backend con Gemini Flash...\n');

  const { app } = createApp();
  const PORT = 4001;

  const server = app.listen(PORT, async () => {
    try {
      console.log(`1. Servidor de pruebas iniciado en http://localhost:${PORT}`);

      // 1. Verificar Healthcheck
      const healthRes = await fetch(`http://localhost:${PORT}/health`);
      const healthData = await healthRes.json();
      console.log('✅ Healthcheck OK:', healthData.status);

      // 1b. Crear y verificar un usuario (el código OTP se devuelve fuera de producción)
      const base = `http://localhost:${PORT}/api/v1`;
      const pending = await (
        await fetch(`${base}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: `e2e-${Date.now()}@test.co`,
            password: 'Clave12345',
            name: 'Prueba E2E',
            phoneNumber: `3${String(Date.now()).slice(-9)}`,
            habeasDataAccepted: true,
            termsAccepted: true,
          }),
        })
      ).json();
      const confirmRes = await fetch(`${base}/auth/register/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId: pending.data.verificationId, code: pending.data.devCode }),
      });
      // La sesión llega en una cookie HttpOnly; las escrituras requieren el Origin del backoffice
      const sessionCookie = confirmRes.headers.getSetCookie().find((c) => c.startsWith('none_auth_token='))!.split(';')[0];
      const authHeaders = { Cookie: sessionCookie, Origin: 'http://localhost:3000' };
      console.log('✅ Usuario de prueba registrado y verificado');

      // 2. Probar escaneo de ticket con Gemini Flash
      console.log('\n2. Enviando ticket a POST /api/v1/expenses/scan...');
      const imagePath = path.resolve(process.cwd(), 'scripts/sample-ticket.png');
      const fileBuffer = fs.readFileSync(imagePath);

      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'image/png' });
      formData.append('file', blob, 'ticket-mercadona.png');

      const startTime = Date.now();
      const scanRes = await fetch(`http://localhost:${PORT}/api/v1/expenses/scan`, {
        method: 'POST',
        headers: authHeaders,
        body: formData,
      });

      const scanDuration = (Date.now() - startTime) / 1000;
      const scanResult = await scanRes.json();

      if (!scanRes.ok) {
        throw new Error(`Error en scan: ${JSON.stringify(scanResult)}`);
      }

      console.log(`⚡ Extracción completada en ${scanDuration} segundos!`);
      console.log('📄 Resultado parseado por Gemini Flash:');
      console.log(JSON.stringify(scanResult.data, null, 2));

      // 3. Probar listado de gastos
      console.log('\n3. Consultando lista de gastos en GET /api/v1/expenses...');
      const listRes = await fetch(`http://localhost:${PORT}/api/v1/expenses`, { headers: authHeaders });
      const listData = await listRes.json();
      console.log(`✅ Total gastos guardados: ${listData.meta.total}`);

      // 4. Probar resumen mensual y formato para WhatsApp
      console.log('\n4. Generando resumen mensual y mensaje de WhatsApp...');
      const now = new Date();
      const summaryRes = await fetch(
        `http://localhost:${PORT}/api/v1/summaries/whatsapp-text?year=${now.getFullYear()}&month=${now.getMonth() + 1}`,
        { headers: authHeaders }
      );
      const summaryData = await summaryRes.json();

      console.log('\n📱 --- VISTA PREVIA DEL MENSAJE DE WHATSAPP ---');
      console.log(summaryData.data.text);
      console.log('--------------------------------------------------\n');

      console.log('🎉 ¡Todas las pruebas End-to-End pasaron con éxito!');
    } catch (err) {
      console.error('❌ Error durante la prueba E2E:', err);
      process.exitCode = 1;
    } finally {
      server.close(() => {
        console.log('Servidor de pruebas cerrado.');
        process.exit(process.exitCode || 0);
      });
    }
  });
}

runE2ETest();
