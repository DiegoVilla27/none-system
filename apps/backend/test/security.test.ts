import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startApp, PNG_BYTES, sessionCookie, uniquePng, fakeOcr } from './helpers.js';
import { env } from '../src/config/env.js';

after(async () => {
  await fs.rm(path.resolve(process.cwd(), env.UPLOAD_DIR), { recursive: true, force: true });
});

test('las rutas de gastos y resúmenes exigen sesión', async () => {
  const app = await startApp();
  try {
    assert.equal((await app.api('GET', '/api/v1/expenses')).status, 401);
    assert.equal((await app.api('GET', '/api/v1/expenses/abc')).status, 401);
    assert.equal((await app.api('DELETE', '/api/v1/expenses/abc')).status, 401);
    assert.equal((await app.api('GET', '/api/v1/summaries/monthly?userId=x')).status, 401);
    assert.equal((await app.api('POST', '/api/v1/subscriptions/checkout', { body: { plan: 'pro' } })).status, 401);
    assert.equal((await app.api('GET', '/api/v1/subscriptions/573001112233')).status, 401);
  } finally {
    await app.close();
  }
});

test('registro exige verificar el número por WhatsApp antes de crear la cuenta', async () => {
  const app = await startApp();
  try {
    const pending = await app.api('POST', '/api/v1/auth/register', {
      body: { email: 'a@test.co', password: 'Clave12345', name: 'Ana', phoneNumber: '300 111 2233', habeasDataAccepted: true, termsAccepted: true },
    });
    assert.equal(pending.status, 202);
    assert.equal(app.messenger.codes.get('573001112233'), pending.json.data.devCode, 'el código se envía al número normalizado con 57');

    // Sin código no hay cuenta
    const login = await app.api('POST', '/api/v1/auth/login', { body: { email: 'a@test.co', password: 'Clave12345' } });
    assert.equal(login.status, 401);

    const wrong = await app.api('POST', '/api/v1/auth/register/confirm', {
      body: { verificationId: pending.json.data.verificationId, code: '000000' === pending.json.data.devCode ? '111111' : '000000' },
    });
    assert.equal(wrong.status, 400);

    const ok = await app.api('POST', '/api/v1/auth/register/confirm', {
      body: { verificationId: pending.json.data.verificationId, code: pending.json.data.devCode },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.json.data.user.phoneVerified, true);
    assert.equal(ok.json.data.user.passwordHash, undefined);

    // El código no se puede reutilizar
    const reuse = await app.api('POST', '/api/v1/auth/register/confirm', {
      body: { verificationId: pending.json.data.verificationId, code: pending.json.data.devCode },
    });
    assert.equal(reuse.status, 400);
  } finally {
    await app.close();
  }
});

test('un usuario no puede ver, editar, borrar ni descargar gastos ajenos', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('ana@test.co', '3001112233');
    const beto = await app.registerUser('beto@test.co', '3004445566');

    const form = new FormData();
    form.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'recibo.png');
    const scan = await app.api('POST', '/api/v1/expenses/scan', { token: ana.token, form });
    assert.equal(scan.status, 201, scan.text);
    const expense = scan.json.data;

    // El archivo en disco está cifrado y con nombre aleatorio
    const filename = expense.imageUrl.replace('/uploads/', '');
    assert.doesNotMatch(filename, /recibo/);
    const onDisk = await fs.readFile(path.resolve(process.cwd(), env.UPLOAD_DIR, filename));
    assert.equal(onDisk.subarray(0, 6).toString(), 'NSENC1');
    assert.equal(onDisk.includes(PNG_BYTES.subarray(0, 8)), false);

    // Dueña: acceso completo (también vía cookie para <img>)
    const own = await app.api('GET', expense.imageUrl, { headers: { Cookie: `none_auth_token=${ana.token}` } });
    assert.equal(own.status, 200);
    assert.equal(own.headers.get('content-type'), 'image/png');

    // Ajeno: 404 en todo
    assert.equal((await app.api('GET', `/api/v1/expenses/${expense.id}`, { token: beto.token })).status, 404);
    assert.equal((await app.api('PUT', `/api/v1/expenses/${expense.id}`, { token: beto.token, body: { total: 1 } })).status, 404);
    assert.equal((await app.api('DELETE', `/api/v1/expenses/${expense.id}`, { token: beto.token })).status, 404);
    assert.equal((await app.api('GET', expense.imageUrl, { token: beto.token })).status, 404);
    assert.equal((await app.api('GET', expense.imageUrl)).status, 401);

    const list = await app.api('GET', '/api/v1/expenses', { token: beto.token });
    assert.equal(list.json.data.length, 0);

    // userId en la query no permite ver datos de otro usuario
    const summary = await app.api('GET', `/api/v1/summaries/monthly?year=2026&month=10&userId=${ana.user.id}`, { token: beto.token });
    assert.equal(summary.json.data.numGastos, 0);

    // Path traversal
    assert.equal((await app.api('GET', '/uploads/..%2F.env', { token: ana.token })).status, 404);
  } finally {
    await app.close();
  }
});

test('archivos que no son imagen o PDF reales se rechazan sin consumir cupo', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('ana2@test.co', '3001112299');
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('<script>alert(1)</script>............')], { type: 'image/png' }), 'x.png');
    const scan = await app.api('POST', '/api/v1/expenses/scan', { token: ana.token, form });
    assert.equal(scan.status, 400);
    const me = await app.api('GET', '/api/v1/auth/me', { token: ana.token });
    assert.equal(me.json.data.subscription.currentUsage, 0);
  } finally {
    await app.close();
  }
});

test('el cupo se respeta en el escaneo web', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('cupo@test.co', '3007778899');
    for (let i = 0; i < 5; i++) {
      const form = new FormData();
      form.append('file', new Blob([uniquePng()], { type: 'image/png' }), 'r.png');
      const r = await app.api('POST', '/api/v1/expenses/scan', { token: ana.token, form });
      assert.equal(r.status, 201);
    }
    const form = new FormData();
    form.append('file', new Blob([uniquePng()], { type: 'image/png' }), 'r.png');
    const blocked = await app.api('POST', '/api/v1/expenses/scan', { token: ana.token, form });
    assert.equal(blocked.status, 402);

    // Los gastos escritos tienen su propio cupo
    const manual = await app.api('POST', '/api/v1/expenses/manual', { token: ana.token, body: { descripcion: 'Arroz', total: 5000 } });
    assert.equal(manual.status, 201);
  } finally {
    await app.close();
  }
});

test('gasto manual: sin soporte, nunca deducible y separado en el resumen', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('manual@test.co', '3005550000');
    const created = await app.api('POST', '/api/v1/expenses/manual', {
      token: ana.token,
      body: { descripcion: 'Arroz', total: 5000 },
    });
    assert.equal(created.status, 201);
    const e = created.json.data;
    assert.equal(e.tipoDocumento, 'manual');
    assert.equal(e.imageUrl, null);
    assert.equal(e.isDianCompliant, false);
    assert.equal(e.categoria, 'Supermercado');

    const forced = await app.api('PUT', `/api/v1/expenses/${e.id}`, { token: ana.token, body: { isDianCompliant: true } });
    assert.equal(forced.json.data.isDianCompliant, false);
    const toInvoice = await app.api('PUT', `/api/v1/expenses/${e.id}`, { token: ana.token, body: { tipoDocumento: 'factura' } });
    assert.equal(toInvoice.status, 400);

    const future = await app.api('POST', '/api/v1/expenses/manual', {
      token: ana.token,
      body: { descripcion: 'Taxi', total: 1000, fecha: '2999-01-01' },
    });
    assert.equal(future.status, 400);

    const [year, month] = e.fecha.split('-');
    const summary = await app.api('GET', `/api/v1/summaries/monthly?year=${year}&month=${Number(month)}`, { token: ana.token });
    assert.equal(summary.json.data.numManuales, 1);
    assert.equal(summary.json.data.numFacturas, 0);

    const filtered = await app.api('GET', '/api/v1/expenses?tipoDocumento=manual', { token: ana.token });
    assert.equal(filtered.json.data.length, 1);
  } finally {
    await app.close();
  }
});

test('recuperación de contraseña: respuesta genérica y código por WhatsApp', async () => {
  const app = await startApp();
  try {
    await app.registerUser('reset@test.co', '3001230000');
    const unknown = await app.api('POST', '/api/v1/auth/forgot-password', { body: { email: 'nadie@test.co' } });
    const known = await app.api('POST', '/api/v1/auth/forgot-password', { body: { email: 'reset@test.co' } });
    assert.equal(unknown.status, 200);
    assert.equal(unknown.json.message, known.json.message);
    assert.equal(known.json.data.resetToken, undefined);

    const code = app.messenger.codes.get('573001230000')!;
    const reset = await app.api('POST', '/api/v1/auth/reset-password', {
      body: { email: 'reset@test.co', code, newPassword: 'NuevaClave99' },
    });
    assert.equal(reset.status, 200);
    const login = await app.api('POST', '/api/v1/auth/login', { body: { email: 'reset@test.co', password: 'NuevaClave99' } });
    assert.equal(login.status, 200);
  } finally {
    await app.close();
  }
});

test('checkout con Wompi: solo el usuario autenticado, con firma de integridad', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('pay@test.co', '3009990000');
    const res = await app.api('POST', '/api/v1/subscriptions/checkout', { token: ana.token, body: { plan: 'pro', phoneNumber: '573000000000' } });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.mode, 'wompi');
    const url = new URL(res.json.data.checkoutUrl);
    assert.equal(url.origin, 'https://checkout.wompi.co');
    assert.equal(url.searchParams.get('amount-in-cents'), '4990000');
    const expected = crypto
      .createHash('sha256')
      .update(`${res.json.data.reference}4990000COP${env.WOMPI_INTEGRITY_SECRET}`)
      .digest('hex');
    assert.equal(url.searchParams.get('signature:integrity'), expected);

    // Hasta que Wompi confirme, el plan no cambia
    const me = await app.api('GET', '/api/v1/auth/me', { token: ana.token });
    assert.equal(me.json.data.subscription.plan, 'gratuito');
  } finally {
    await app.close();
  }
});

test('eliminar la cuenta borra gastos y soportes', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('bye@test.co', '3008880000');
    const form = new FormData();
    form.append('file', new Blob([PNG_BYTES], { type: 'image/png' }), 'r.png');
    const scan = await app.api('POST', '/api/v1/expenses/scan', { token: ana.token, form });
    const filename = scan.json.data.imageUrl.replace('/uploads/', '');

    assert.equal((await app.api('DELETE', '/api/v1/auth/me', { token: ana.token, body: { password: 'mala' } })).status, 400);
    const del = await app.api('DELETE', '/api/v1/auth/me', { token: ana.token, body: { password: 'Clave12345' } });
    assert.equal(del.status, 200);

    await assert.rejects(fs.access(path.resolve(process.cwd(), env.UPLOAD_DIR, filename)));
    assert.equal((await app.api('GET', '/api/v1/auth/me', { token: ana.token })).status, 401);
    assert.equal((await app.expenseRepo.findAll({ userId: ana.user.id })).length, 0);
  } finally {
    await app.close();
  }
});

test('webhook de WhatsApp: rechaza firmas inválidas', async () => {
  const app = await startApp();
  try {
    const payload = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });
    const bad = await fetch(`${app.base}/api/v1/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=deadbeef' },
      body: payload,
    });
    assert.equal(bad.status, 401);

    const signature = `sha256=${crypto.createHmac('sha256', env.WHATSAPP_APP_SECRET).update(payload).digest('hex')}`;
    const good = await fetch(`${app.base}/api/v1/whatsapp/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature },
      body: payload,
    });
    assert.equal(good.status, 200);
  } finally {
    await app.close();
  }
});

test('sesión: cookie HttpOnly, sin token en el cuerpo y protección CSRF', async () => {
  const app = await startApp();
  try {
    await app.registerUser('cookie@test.co', '3006660000');
    const login = await app.api('POST', '/api/v1/auth/login', { body: { email: 'cookie@test.co', password: 'Clave12345' } });
    assert.equal(login.status, 200);
    assert.equal(login.json.data.token, undefined);
    const setCookie = login.headers.getSetCookie().find((c) => c.startsWith('none_auth_token='))!;
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Lax/i);
    const token = sessionCookie(login.headers)!;

    // Escritura con cookie desde un origen ajeno o sin Origin → bloqueada
    const evil = await app.api('POST', '/api/v1/expenses/manual', {
      token,
      headers: { Origin: 'https://sitio-malicioso.com' },
      body: { descripcion: 'Robo', total: 1 },
    });
    assert.equal(evil.status, 403);
    const noOrigin = await fetch(`${app.base}/api/v1/expenses/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: `none_auth_token=${token}` },
      body: JSON.stringify({ descripcion: 'X', total: 1 }),
    });
    assert.equal(noOrigin.status, 403);

    // Lectura con cookie sí funciona
    assert.equal((await app.api('GET', '/api/v1/expenses', { token })).status, 200);

    // Cerrar sesión en todos los dispositivos invalida el token
    assert.equal((await app.api('POST', '/api/v1/auth/logout-all', { token })).status, 200);
    assert.equal((await app.api('GET', '/api/v1/auth/me', { token })).status, 401);
  } finally {
    await app.close();
  }
});

test('cambiar la contraseña cierra las otras sesiones y mantiene la actual', async () => {
  const app = await startApp();
  try {
    const { token: otherDevice } = await app.registerUser('pwd@test.co', '3006661111');
    const login = await app.api('POST', '/api/v1/auth/login', { body: { email: 'pwd@test.co', password: 'Clave12345' } });
    const current = sessionCookie(login.headers)!;

    const change = await app.api('POST', '/api/v1/auth/change-password', {
      token: current,
      body: { currentPassword: 'Clave12345', newPassword: 'OtraClave99' },
    });
    assert.equal(change.status, 200);
    const renewed = sessionCookie(change.headers)!;

    assert.equal((await app.api('GET', '/api/v1/auth/me', { token: otherDevice })).status, 401);
    assert.equal((await app.api('GET', '/api/v1/auth/me', { token: renewed })).status, 200);
  } finally {
    await app.close();
  }
});

test('plan gratuito: 30 gastos escritos al mes; los pagados son ilimitados', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('manualq@test.co', '3014440000');
    for (let i = 0; i < 30; i++) {
      const r = await app.api('POST', '/api/v1/expenses/manual', { token: ana.token, body: { descripcion: `Gasto ${i}`, total: 1000 } });
      assert.equal(r.status, 201);
    }
    const blocked = await app.api('POST', '/api/v1/expenses/manual', { token: ana.token, body: { descripcion: 'Uno más', total: 1000 } });
    assert.equal(blocked.status, 402);

    const me = await app.api('GET', '/api/v1/auth/me', { token: ana.token });
    assert.equal(me.json.data.subscription.manualUsage, 30);
    assert.equal(me.json.data.subscription.manualMonthlyLimit, 30);
    assert.equal(me.json.data.subscription.monthlyLimit, 5);

    await app.subscriptionService.upgradePlan('573014440000', 'basico');
    const paid = await app.api('POST', '/api/v1/expenses/manual', { token: ana.token, body: { descripcion: 'Ya pago', total: 1000 } });
    assert.equal(paid.status, 201);
    const after = await app.api('GET', '/api/v1/auth/me', { token: ana.token });
    assert.equal(after.json.data.subscription.manualMonthlyLimit, null);
  } finally {
    await app.close();
  }
});

test('duplicados: mismo archivo o mismo CUFE no se guardan ni consumen cupo', async () => {
  const app = await startApp();
  try {
    const ana = await app.registerUser('dup@test.co', '3015550000');
    const scan = (buffer: Buffer) => {
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'image/png' }), 'r.png');
      return app.api('POST', '/api/v1/expenses/scan', { token: ana.token, form });
    };
    const usage = async () => (await app.api('GET', '/api/v1/auth/me', { token: ana.token })).json.data.subscription.currentUsage;

    const file = uniquePng();
    fakeOcr.overrides = { cufe: 'fe8000000a1b2c3d4e5f67890123456789abcdef' };
    assert.equal((await scan(file)).status, 201);
    assert.equal(await usage(), 1);

    // Mismo archivo: se rechaza antes de la IA
    const callsBefore = fakeOcr.calls;
    const sameFile = await scan(file);
    assert.equal(sameFile.status, 409);
    assert.match(sameFile.json.error.message, /ya está registrado/);
    assert.equal(fakeOcr.calls, callsBefore, 'no se gasta una lectura de IA');

    // Otra foto de la misma factura (mismo CUFE): se rechaza y se devuelve el cupo
    const sameCufe = await scan(uniquePng());
    assert.equal(sameCufe.status, 409);
    assert.equal(await usage(), 1);

    // Sin CUFE ni referencia pero mismos datos: se guarda con advertencia
    fakeOcr.overrides = {};
    const first = await scan(uniquePng());
    const similar = await scan(uniquePng());
    assert.equal(first.status, 201);
    assert.equal(similar.status, 201);
    assert.equal(similar.json.warning.code, 'POSSIBLE_DUPLICATE');

    const list = await app.api('GET', '/api/v1/expenses', { token: ana.token });
    assert.equal(list.json.data.length, 3);
  } finally {
    fakeOcr.overrides = {};
    await app.close();
  }
});
