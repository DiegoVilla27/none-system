import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, uniquePng, fakeOcr } from './helpers.js';
import { parseCaption } from '../src/modules/whatsapp/caption-instructions.js';
import { WhatsAppMessage } from '../src/modules/whatsapp/whatsapp.types.js';
import { parseCommand, scanTypeFromCaption, parsePeriodRequest } from '../src/modules/whatsapp/whatsapp.service.js';
import { todayInBogota, shiftIsoDate } from '../src/core/utils/dates.js';

let seq = 0;
const text = (from: string, body: string): WhatsAppMessage => ({
  from,
  id: `wamid.${++seq}`,
  timestamp: String(Date.now()),
  type: 'text',
  text: { body },
});

test('reconoce comandos exactos sin confundirlos con gastos', () => {
  assert.equal(parseCommand('RESUMEN'), 'resumen');
  assert.equal(parseCommand('¿Cupo?'), 'cupo');
  assert.equal(parseCommand('Confirmar eliminar'), 'confirmar_eliminar');
  assert.equal(parseCommand('plantas 5000'), null, '"plan" dentro de otra palabra no es un comando');
  assert.equal(scanTypeFromCaption('es una transferencia'), 'transferencia');
  assert.equal(scanTypeFromCaption('recibo del almuerzo'), 'factura');
  assert.equal(scanTypeFromCaption(undefined), 'auto');
});

test('flujo WhatsApp: autorización, gasto manual, deshacer y supresión', async () => {
  const app = await startApp();
  const phone = '573104445566';
  const wa = app.whatsAppService;
  try {
    // 1. Sin autorización no se guarda nada
    await wa.processIncomingMessage(text(phone, 'arroz 5000'), 'Luz');
    assert.match(app.messenger.lastTextTo(phone), /\[ ✅ Acepto \]/);
    const user = await app.userRepo.findByPhone(phone);
    assert.ok(user);
    assert.equal(user!.habeasDataConsent.accepted, false);
    assert.equal((await app.expenseRepo.findAll({ userId: user!.id })).length, 0);

    // 2. Acepta
    await wa.processIncomingMessage(text(phone, 'Acepto'), 'Luz');
    const accepted = await app.userRepo.findByPhone(phone);
    assert.equal(accepted!.habeasDataConsent.accepted, true);
    assert.equal(accepted!.habeasDataConsent.channel, 'whatsapp');

    // 3. Gasto manual con dos conceptos
    await wa.processIncomingMessage(text(phone, 'arroz 5000, aceite 12000'), 'Luz');
    let expenses = await app.expenseRepo.findAll({ userId: user!.id });
    assert.equal(expenses.length, 2);
    assert.ok(expenses.every((e) => e.tipoDocumento === 'manual' && e.isDianCompliant === false && e.source === 'whatsapp'));
    assert.match(app.messenger.lastTextTo(phone), /2 gastos registrados/);

    // No consume cupo
    const sub = await app.subscriptionService.getOrCreateSubscription(phone);
    assert.equal(sub.currentUsage, 0);

    // 4. DESHACER elimina el último lote
    await wa.processIncomingMessage(text(phone, 'deshacer'), 'Luz');
    expenses = await app.expenseRepo.findAll({ userId: user!.id });
    assert.equal(expenses.length, 0);

    // 5. Texto sin monto → ayuda, no gasto
    await wa.processIncomingMessage(text(phone, 'gracias'), 'Luz');
    assert.match(app.messenger.lastTextTo(phone), /No entendí tu mensaje[\s\S]*📊 Resumen del mes/);

    // 6. Supresión con confirmación
    await wa.processIncomingMessage(text(phone, 'taxi 12000'), 'Luz');
    await wa.processIncomingMessage(text(phone, 'CONFIRMAR ELIMINAR'), 'Luz');
    assert.ok(await app.userRepo.findByPhone(phone), 'sin solicitud previa no se elimina');
    await wa.processIncomingMessage(text(phone, 'eliminar mis datos'), 'Luz');
    await wa.processIncomingMessage(text(phone, 'confirmar eliminar'), 'Luz');
    assert.equal(await app.userRepo.findByPhone(phone), null);
    assert.equal((await app.expenseRepo.findAll({ userId: user!.id })).length, 0);
  } finally {
    await app.close();
  }
});

test('quien escribe por WhatsApp y luego se registra en la web conserva sus gastos', async () => {
  const app = await startApp();
  const phone = '573207778899';
  try {
    await app.whatsAppService.processIncomingMessage(text(phone, 'acepto'), 'Caro');
    await app.whatsAppService.processIncomingMessage(text(phone, 'almuerzo 25 mil'), 'Caro');
    const waUser = await app.userRepo.findByPhone(phone);

    const { token, user } = await app.registerUser('caro@test.co', '320 777 8899');
    assert.equal(user.id, waUser!.id);
    const list = await app.api('GET', '/api/v1/expenses', { token });
    assert.equal(list.json.data.length, 1);
    assert.equal(list.json.data[0].total, 25000);
  } finally {
    await app.close();
  }
});

test('un número reclamado sin verificar no recibe documentos ajenos', async () => {
  const app = await startApp();
  const phone = '573151112222';
  try {
    const now = new Date().toISOString();
    await app.userRepo.create({
      id: 'usr-legacy',
      email: 'atacante@test.co',
      passwordHash: 'x',
      name: 'Legacy',
      phoneNumber: phone,
      phoneVerified: false,
      sessionVersion: 0,
      role: 'user',
      emailVerified: false,
      habeasDataConsent: { accepted: true },
      createdAt: now,
      updatedAt: now,
    });
    await app.whatsAppService.processIncomingMessage(text(phone, 'arroz 5000'), 'Dueño real');
    assert.equal((await app.expenseRepo.findAll({ userId: 'usr-legacy' })).length, 0);
    assert.match(app.messenger.lastTextTo(phone), /no lo ha verificado/);
  } finally {
    await app.close();
  }
});

test('RESUMEN con periodo', () => {
  const today = '2026-10-03';
  assert.deepEqual(parsePeriodRequest('Resumen septiembre', today), { command: 'resumen', year: 2026, month: 9 });
  assert.deepEqual(parsePeriodRequest('RESUMEN DICIEMBRE', today), { command: 'resumen', year: 2025, month: 12 });
  assert.deepEqual(parsePeriodRequest('resumen oct 2025', today), { command: 'resumen', year: 2025, month: 10 });
  assert.deepEqual(parsePeriodRequest('resumen 2025-10', today), { command: 'resumen', year: 2025, month: 10 });
  assert.deepEqual(parsePeriodRequest('resumen 10/2025', today), { command: 'resumen', year: 2025, month: 10 });
  assert.deepEqual(parsePeriodRequest('resumen mes pasado', today), { command: 'resumen', year: 2026, month: 9 });
  assert.equal(parsePeriodRequest('resumen 2027-01', today), null, 'no se aceptan meses futuros');
  assert.equal(parsePeriodRequest('arroz 5000', today), null);
  assert.deepEqual(parsePeriodRequest('resumen 2025', today), { command: 'resumen', year: 2025, month: null });
  assert.equal(parsePeriodRequest('resumen 2027', today), null);
  assert.deepEqual(parsePeriodRequest('detalle septiembre', today), { command: 'detalle', year: 2026, month: 9 });
  assert.equal(parsePeriodRequest('detalle 2025', today), null, 'DETALLE requiere un mes');
});

test('RESUMEN avisa de registros con fecha de otros meses y el cupo de escritos se respeta', async () => {
  const app = await startApp();
  const phone = '573159990000';
  const wa = app.whatsAppService;
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Eva');
    // "ayer" puede caer en el mes anterior; se fuerza una fecha de otro mes con un gasto web
    const user = await app.userRepo.findByPhone(phone);
    const lastMonth = shiftIsoDate(todayInBogota().slice(0, 8) + '01', -1);
    await app.expenseRepo.create({
      id: 'exp-otro-mes', userId: user!.id, tipoDocumento: 'transferencia', comercio: 'Nequi', fecha: lastMonth,
      total: 50000, moneda: 'COP', categoria: 'Otros', lineasArticulos: [], confianzaExtraccion: 'alta', estado: 'confirmado',
      source: 'whatsapp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await wa.processIncomingMessage(text(phone, 'arroz 5000'), 'Eva');
    assert.match(app.messenger.lastTextTo(phone), /Te quedan \*29 de 30\*/);

    await wa.processIncomingMessage(text(phone, 'RESUMEN'), 'Eva');
    const resumen = app.messenger.lastTextTo(phone);
    assert.match(resumen, /\(1 registro\)/);
    assert.match(resumen, /1 comprobante con fecha de otros meses\*/);
    assert.match(resumen, /MESES/);

    // DESHACER devuelve el gasto escrito al cupo
    await wa.processIncomingMessage(text(phone, 'deshacer'), 'Eva');
    const sub = await app.subscriptionService.getOrCreateSubscription(phone);
    assert.equal(sub.manualUsage, 0);
  } finally {
    await app.close();
  }
});

test('MESES, DETALLE y RESUMEN anual tienen tamaño acotado aunque haya muchos registros', async () => {
  const app = await startApp();
  const phone = '573167770000';
  const wa = app.whatsAppService;
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Leo');
    const user = (await app.userRepo.findByPhone(phone))!;
    const now = new Date().toISOString();
    // 400 registros repartidos en 20 meses
    for (let i = 0; i < 400; i++) {
      const month = (i % 20);
      const date = new Date(Date.UTC(2025, month, 15)).toISOString().slice(0, 10);
      await app.expenseRepo.create({
        id: `bulk-${i}`, userId: user.id, tipoDocumento: 'manual', comercio: `Comercio con un nombre bastante largo ${i}`, fecha: date,
        total: 1000 + i, moneda: 'COP', categoria: 'Otros', lineasArticulos: [], confianzaExtraccion: 'alta', estado: 'confirmado',
        source: 'web', createdAt: now, updatedAt: now,
      });
    }

    await wa.processIncomingMessage(text(phone, 'MESES'), 'Leo');
    const meses = app.messenger.lastTextTo(phone);
    assert.equal((meses.match(/^• /gm) || []).length, 7, '6 meses + la línea de "meses más"');
    assert.match(meses, /14 meses más/);

    await wa.processIncomingMessage(text(phone, 'resumen 2025'), 'Leo');
    const year = app.messenger.lastTextTo(phone);
    assert.equal((year.match(/^• /gm) || []).length, 12);
    assert.match(year, /Total 2025/);

    await wa.processIncomingMessage(text(phone, 'detalle marzo 2025'), 'Leo');
    const detail = app.messenger.lastTextTo(phone);
    assert.equal((detail.match(/^✍️ /gm) || []).length, 10);
    assert.match(detail, /últimos 10 de 20/);

    for (const { body } of app.messenger.texts) assert.ok(body.length <= 3800, `mensaje de ${body.length} caracteres`);
  } finally {
    await app.close();
  }
});

test('un texto que no es comando ni gasto recibe el mensaje principal', async () => {
  const app = await startApp();
  const phone = '573168880000';
  try {
    await app.whatsAppService.processIncomingMessage(text(phone, 'acepto'), 'Ana');
    for (const body of ['qué tal todo', 'tengo 3 perros', '???']) {
      await app.whatsAppService.processIncomingMessage(text(phone, body), 'Ana');
      assert.match(app.messenger.lastTextTo(phone), /No entendí tu mensaje[\s\S]*📦 Mi cupo/, body);
    }
    const user = (await app.userRepo.findByPhone(phone))!;
    assert.equal((await app.expenseRepo.findAll({ userId: user.id })).length, 0);
  } finally {
    await app.close();
  }
});

const tap = (from: string, id: string): WhatsAppMessage => ({
  from,
  id: `wamid.${++seq}`,
  timestamp: String(Date.now()),
  type: 'interactive',
  interactive: { type: 'list_reply', list_reply: { id, title: id } },
});

test('CORREGIR: corrige valor, fecha y categoría del último registro con botones y listas', async () => {
  const app = await startApp();
  const phone = '573171112222';
  const wa = app.whatsAppService;
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Sol');
    await wa.processIncomingMessage(text(phone, 'almuerzo 25 mil'), 'Sol');
    assert.match(app.messenger.lastTextTo(phone), /\[ ✏️ Corregir \]\s+\[ 🗑️ Deshacer \]/);
    const user = (await app.userRepo.findByPhone(phone))!;
    const [expense] = await app.expenseRepo.findAll({ userId: user.id });

    // Botón "Corregir" → menú de datos (sin "Tipo" para un gasto escrito)
    await wa.processIncomingMessage(tap(phone, 'fix:start'), 'Sol');
    let msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /¿Qué dato quieres corregir\?/);
    assert.match(msg, /• Descripción/);
    assert.doesNotMatch(msg, /Tipo de documento/);

    // Valor: inválido y luego válido
    await wa.processIncomingMessage(tap(phone, 'fix:field:total'), 'Sol');
    await wa.processIncomingMessage(text(phone, 'mucho'), 'Sol');
    assert.match(app.messenger.lastTextTo(phone), /No entendí el valor/);
    await wa.processIncomingMessage(text(phone, '7 mil'), 'Sol');
    assert.match(app.messenger.lastTextTo(phone), /Actualizado:\* Valor → \$ 7\.000/);
    let saved = (await app.expenseRepo.findById(expense.id))!;
    assert.equal(saved.total, 7000);
    assert.equal(saved.lineasArticulos[0].precio, 7000);

    // "CAMBIAR" lleva al mismo flujo; el dato se puede escribir a mano
    await wa.processIncomingMessage(text(phone, 'cambiar'), 'Sol');
    await wa.processIncomingMessage(text(phone, 'fecha'), 'Sol');
    await wa.processIncomingMessage(text(phone, '2999-01-01'), 'Sol');
    assert.match(app.messenger.lastTextTo(phone), /no puede ser futura/);
    await wa.processIncomingMessage(text(phone, 'ayer'), 'Sol');
    saved = (await app.expenseRepo.findById(expense.id))!;
    assert.equal(saved.fecha, shiftIsoDate(todayInBogota(), -1));

    // Categoría desde la lista
    await wa.processIncomingMessage(text(phone, 'corregir'), 'Sol');
    await wa.processIncomingMessage(tap(phone, 'fix:field:categoria'), 'Sol');
    assert.match(app.messenger.lastTextTo(phone), /Transferencias\/Finanzas/);
    await wa.processIncomingMessage(tap(phone, 'fix:cat:2'), 'Sol'); // Transporte
    saved = (await app.expenseRepo.findById(expense.id))!;
    assert.equal(saved.categoria, 'Transporte');

    // Un comando durante la corrección la cancela y se ejecuta normalmente
    await wa.processIncomingMessage(text(phone, 'corregir'), 'Sol');
    await wa.processIncomingMessage(tap(phone, 'fix:field:comercio'), 'Sol');
    await wa.processIncomingMessage(text(phone, 'RESUMEN'), 'Sol');
    assert.match(app.messenger.lastTextTo(phone), /Resumen ·/);
    assert.equal(await app.whatsAppService['conversation'].getEdit(phone), null);
  } finally {
    await app.close();
  }
});

test('CORREGIR: varios gastos en un envío, solo el último envío y aviso del panel web', async () => {
  const app = await startApp();
  const phone = '573172223333';
  const wa = app.whatsAppService;
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Tom');
    await wa.processIncomingMessage(text(phone, 'corregir'), 'Tom');
    assert.match(app.messenger.lastTextTo(phone), /panel web/);

    await wa.processIncomingMessage(text(phone, 'taxi 8000'), 'Tom');
    await wa.processIncomingMessage(text(phone, 'arroz 5000, aceite 12000'), 'Tom');
    const user = (await app.userRepo.findByPhone(phone))!;
    const all = await app.expenseRepo.findAll({ userId: user.id });
    const taxi = all.find((e) => e.comercio === 'Taxi')!;
    const aceite = all.find((e) => e.comercio === 'Aceite')!;

    await wa.processIncomingMessage(text(phone, 'corregir'), 'Tom');
    assert.match(app.messenger.lastTextTo(phone), /¿Cuál de estos gastos/);

    // Un registro de un envío anterior no se puede corregir por WhatsApp
    await wa.processIncomingMessage(tap(phone, `fix:item:${taxi.id}`), 'Tom');
    assert.match(app.messenger.lastTextTo(phone), /último registro que enviaste/);

    await wa.processIncomingMessage(tap(phone, `fix:item:${aceite.id}`), 'Tom');
    await wa.processIncomingMessage(tap(phone, 'fix:field:comercio'), 'Tom');
    await wa.processIncomingMessage(text(phone, 'Aceite de oliva'), 'Tom');
    const saved = (await app.expenseRepo.findById(aceite.id))!;
    assert.equal(saved.comercio, 'Aceite de oliva');
    assert.equal(saved.lineasArticulos[0].descripcion, 'Aceite de oliva');

    await wa.processIncomingMessage(tap(phone, 'fix:done'), 'Tom');
    assert.match(app.messenger.lastTextTo(phone), /Listo/);
  } finally {
    await app.close();
  }
});

test('pie de foto: interpreta categoría, beneficiario, valor, fecha y nota', () => {
  assert.equal(parseCaption('categoria transporte').categoria, 'Transporte');
  assert.equal(parseCaption('Categoría: comida').categoria, 'Restauración');
  const c = parseCaption('remitente Juan Pérez, valor 50 mil, fecha 29/09/2026');
  assert.equal(c.comercio, 'Juan Pérez');
  assert.equal(c.total, 50000);
  assert.equal(c.fecha, '2026-09-29');
  assert.equal(parseCaption('es una transferencia').tipo, 'transferencia');
  assert.equal(parseCaption('categoria transferencias y finanzas').tipo, 'auto', 'la categoría no fuerza el tipo');
  assert.deepEqual(parseCaption('categoria xyz').invalid, [{ field: 'categoria', value: 'xyz' }]);
  assert.deepEqual(parseCaption('pago del arriendo'), { tipo: 'auto', invalid: [] });
});

const photo = (from: string, caption?: string): WhatsAppMessage => ({
  from,
  id: `wamid.${++seq}`,
  timestamp: String(Date.now()),
  type: 'image',
  image: { id: `media-${seq}`, mime_type: 'image/png', caption },
});

test('WhatsApp: el pie de foto prevalece sobre la IA y no se aceptan comprobantes repetidos', async () => {
  const app = await startApp();
  const phone = '573189990000';
  const wa = app.whatsAppService;
  const files = new Map<string, Buffer>();
  // Simula la descarga desde Meta: cada media id devuelve su archivo
  wa.downloadMedia = async (mediaId: string) => {
    if (!files.has(mediaId)) files.set(mediaId, uniquePng());
    return { buffer: files.get(mediaId)!, mimeType: 'image/png' };
  };
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Ana');

    fakeOcr.overrides = { numeroReferencia: 'M-48992015' };
    await wa.processIncomingMessage(photo(phone, 'categoria hogar, beneficiario EPM'), 'Ana');
    let msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /Usé los datos que indicaste: comercio, categoría/);
    const user = (await app.userRepo.findByPhone(phone))!;
    const [saved] = await app.expenseRepo.findAll({ userId: user.id });
    assert.equal(saved.categoria, 'Hogar y Servicios');
    assert.equal(saved.comercio, 'EPM');

    // Mismo archivo reenviado
    const usageBefore = (await app.subscriptionService.getOrCreateSubscription(phone)).currentUsage;
    files.set('again', files.get([...files.keys()][0])!);
    await wa.processIncomingMessage({ ...photo(phone), image: { id: 'again', mime_type: 'image/png' } }, 'Ana');
    msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /Es el mismo archivo que ya enviaste/);

    // Otra foto del mismo comprobante (misma referencia y valor)
    await wa.processIncomingMessage(photo(phone), 'Ana');
    msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /misma referencia \(M-48992015\)/);
    assert.match(msg, /no se descontó de tu cupo/);

    assert.equal((await app.subscriptionService.getOrCreateSubscription(phone)).currentUsage, usageBefore);
    assert.equal((await app.expenseRepo.findAll({ userId: user.id })).length, 1);

    // Categoría que no existe: se informa y se deja la de la IA
    fakeOcr.overrides = { numeroReferencia: 'OTRA-REF-1' };
    await wa.processIncomingMessage(photo(phone, 'categoria xyz'), 'Ana');
    assert.match(app.messenger.lastTextTo(phone), /No entendí la categoría «xyz»/);
  } finally {
    fakeOcr.overrides = {};
    await app.close();
  }
});

test('bienvenida una sola vez, autorización con botones, comandos "/" y sugerencias iniciales', async () => {
  const app = await startApp();
  const phone = '573190001111';
  const wa = app.whatsAppService;
  try {
    // Meta avisa que abrió el chat por primera vez
    await wa.processIncomingMessage({ from: phone, id: `wamid.${++seq}`, timestamp: '0', type: 'request_welcome' }, 'Eva');
    assert.match(app.messenger.lastTextTo(phone), /Soy tu asistente contable[\s\S]*\[ ✅ Acepto \]/);
    const user = (await app.userRepo.findByPhone(phone))!;
    assert.ok(user.welcomeSentAt);

    // Un segundo mensaje antes de aceptar: recordatorio corto, sin repetir la bienvenida
    const sentBefore = app.messenger.texts.length;
    await wa.processIncomingMessage(text(phone, 'hola'), 'Eva');
    const reminder = app.messenger.lastTextTo(phone);
    assert.doesNotMatch(reminder, /Soy tu asistente contable/);
    assert.match(reminder, /Toca \*Acepto\*/);
    assert.equal(app.messenger.texts.length, sentBefore + 1);

    // Acepta tocando el botón
    await wa.processIncomingMessage(
      { from: phone, id: `wamid.${++seq}`, timestamp: '0', type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'consent:accept', title: '✅ Acepto' } } },
      'Eva'
    );
    assert.equal((await app.userRepo.findByPhone(phone))!.habeasDataConsent.accepted, true);

    // Comando del menú "/" y sugerencia inicial
    await wa.processIncomingMessage(text(phone, '/cupo'), 'Eva');
    assert.match(app.messenger.lastTextTo(phone), /Estado de tu cuenta/);
    await wa.processIncomingMessage(text(phone, '¿Cómo registro una factura?'), 'Eva');
    assert.match(app.messenger.lastTextTo(phone), /Cómo registrar una factura/);
    await wa.processIncomingMessage(text(phone, '✍️ ¿Cómo anoto un gasto sin recibo?'), 'Eva');
    assert.match(app.messenger.lastTextTo(phone), /Cómo anotar un gasto sin recibo/);

    // Otro evento de bienvenida no repite el mensaje
    const count = app.messenger.texts.length;
    await wa.processIncomingMessage({ from: phone, id: `wamid.${++seq}`, timestamp: '0', type: 'request_welcome' }, 'Eva');
    assert.equal(app.messenger.texts.length, count);
  } finally {
    await app.close();
  }
});

test('menú principal: corto, con opciones tocables que ejecutan el comando', async () => {
  const app = await startApp();
  const phone = '573193334444';
  const wa = app.whatsAppService;
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Mia');
    const menu = app.messenger.lastTextTo(phone);
    assert.match(menu, /¡Listo, Mia! Ya puedes empezar/);
    // El mensaje (sin contar las opciones del menú) es corto
    assert.ok(menu.split('\n\n• ')[0].length < 250, `menú de ${menu.length} caracteres`);
    // Tocar una opción ejecuta el comando
    await wa.processIncomingMessage(tap(phone, 'cmd:cupo'), 'Mia');
    assert.match(app.messenger.lastTextTo(phone), /Estado de tu cuenta/);
    await wa.processIncomingMessage(tap(phone, 'cmd:guia_texto'), 'Mia');
    assert.match(app.messenger.lastTextTo(phone), /Cómo anotar un gasto sin recibo/);
  } finally {
    await app.close();
  }
});

test('preguntas en lenguaje natural: periodo, categoría, comercio, lista e impuestos', async () => {
  const app = await startApp();
  const phone = '573195556666';
  const wa = app.whatsAppService;
  try {
    await wa.processIncomingMessage(text(phone, 'acepto'), 'Ana');
    const user = (await app.userRepo.findByPhone(phone))!;
    const today = todayInBogota();
    const [y, m] = today.split('-').map(Number);
    const q = Math.ceil(m / 3);
    const prevQ = q === 1 ? { year: y - 1, q: 4 } : { year: y, q: q - 1 };
    const prevQStart = `${prevQ.year}-${String((prevQ.q - 1) * 3 + 1).padStart(2, '0')}-10`;
    const prevQMid = `${prevQ.year}-${String((prevQ.q - 1) * 3 + 2).padStart(2, '0')}-10`;
    const now = new Date().toISOString();
    const base = { userId: user.id, moneda: 'COP' as const, lineasArticulos: [], confianzaExtraccion: 'alta' as const, estado: 'confirmado' as const, source: 'web' as const, createdAt: now, updatedAt: now };
    await app.expenseRepo.create({ ...base, id: 'q1', tipoDocumento: 'factura', comercio: 'Uber Colombia', fecha: prevQStart, total: 30000, categoria: 'Transporte', iva: 4790 });
    await app.expenseRepo.create({ ...base, id: 'q2', tipoDocumento: 'transferencia', comercio: 'Empresas Públicas de Medellín (EPM)', fecha: prevQMid, total: 120000, categoria: 'Hogar y Servicios' });
    await app.expenseRepo.create({ ...base, id: 'q3', tipoDocumento: 'factura', comercio: 'Restaurante La 70', fecha: prevQMid, total: 80000, categoria: 'Restauración', impoconsumo: 5926 });
    await app.expenseRepo.create({ ...base, id: 'q4', tipoDocumento: 'manual', comercio: 'Arroz', fecha: today, total: 5000, categoria: 'Supermercado' });

    await wa.processIncomingMessage(text(phone, 'quiero ver los gastos del último trimestre'), 'Ana');
    let msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /Tus gastos/);
    assert.match(msg, /Total:\* \$ 230\.000 COP \(3 registros\)/);
    assert.match(msg, /Por mes:/);

    await wa.processIncomingMessage(text(phone, '¿cuánto gasté en transporte el trimestre pasado?'), 'Ana');
    msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /🏷️ Transporte/);
    assert.match(msg, /\$ 30\.000 COP \(1 registro\)/);

    await wa.processIncomingMessage(text(phone, 'mis 2 gastos más grandes del trimestre pasado'), 'Ana');
    msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /Tus gastos más grandes/);
    assert.ok(msg.indexOf('Empresas Públicas') < msg.indexOf('Restaurante'), 'ordenado de mayor a menor');
    assert.match(msg, /Mostrando 2 de 3/);

    await wa.processIncomingMessage(text(phone, '¿cuánto IVA pagué el trimestre pasado?'), 'Ana');
    msg = app.messenger.lastTextTo(phone);
    assert.match(msg, /IVA:\* \$ 4\.790/);
    assert.match(msg, /Impoconsumo:\* \$ 5\.926/);

    await wa.processIncomingMessage(text(phone, 'gastos de este mes'), 'Ana');
    assert.match(app.messenger.lastTextTo(phone), /\$ 5\.000 COP \(1 registro\)/);

    // Una consulta no registra gastos ni gasta cupo
    assert.equal((await app.expenseRepo.findAll({ userId: user.id })).length, 4);
    assert.equal((await app.subscriptionService.getOrCreateSubscription(phone)).manualUsage, 0);

    // Sin resultados: mensaje claro
    await wa.processIncomingMessage(text(phone, 'facturas de la semana pasada'), 'Ana');
    assert.match(app.messenger.lastTextTo(phone), /No encontré registros con ese filtro/);
  } finally {
    await app.close();
  }
});
