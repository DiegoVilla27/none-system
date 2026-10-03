import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addMonthsClamped } from '../src/modules/subscriptions/billing-period.js';
import { fallbackParseManualText, parseAmount, sanitizeManualDrafts } from '../src/modules/expenses/manual/manual-expense.parser.js';
import { CryptoService } from '../src/core/security/crypto.service.js';
import { normalizeDocumentDate } from '../src/core/utils/dates.js';
import { detectFileType } from '../src/core/security/file-signature.js';

test('los ciclos mensuales no se desbordan a fin de mes', () => {
  const jan31 = new Date(2026, 0, 31);
  const feb = addMonthsClamped(jan31, 1, 31);
  assert.equal(feb.getMonth(), 1);
  assert.equal(feb.getDate(), 28);
  const mar = addMonthsClamped(feb, 1, 31);
  assert.equal(mar.getDate(), 31);
});

test('interpreta montos colombianos', () => {
  assert.equal(parseAmount('5.000'), 5000);
  assert.equal(parseAmount('25 mil'), 25000);
  assert.equal(parseAmount('15k'), 15000);
  assert.equal(parseAmount('1,5 millones'), 1500000);
  assert.equal(parseAmount('3.500,50'), 3500.5);
  assert.equal(parseAmount('abc'), null);
});

test('interpreta gastos escritos', () => {
  const today = '2026-10-03';
  const [taxi] = fallbackParseManualText('ayer taxi 12.000', today);
  assert.deepEqual([taxi.descripcion, taxi.monto, taxi.fecha, taxi.categoria], ['Taxi', 12000, '2026-10-02', 'Transporte']);
  assert.equal(fallbackParseManualText('arroz 5000, aceite 12000', today).length, 2);
  assert.equal(fallbackParseManualText('hola', today).length, 0);
});

test('descarta respuestas incoherentes de la IA', () => {
  const today = '2026-10-03';
  const drafts = sanitizeManualDrafts(
    [
      { descripcion: 'Arroz', monto: 5000, fecha: '2999-01-01', categoria: 'Inventada' },
      { descripcion: '', monto: 100, fecha: today, categoria: 'Otros' },
      { descripcion: 'Negativo', monto: -5, fecha: today, categoria: 'Otros' },
    ],
    today
  );
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].fecha, today);
  assert.equal(drafts[0].categoria, 'Supermercado');
});

test('cifrado de archivos detecta alteraciones', () => {
  const enc = CryptoService.encryptBuffer(Buffer.from('soporte contable'));
  assert.equal(CryptoService.decryptBuffer(enc).toString(), 'soporte contable');
  enc[enc.length - 1] ^= 0xff;
  assert.throws(() => CryptoService.decryptBuffer(enc));
});

test('detecta el tipo real del archivo', () => {
  assert.equal(detectFileType(Buffer.from('%PDF-1.7 xxxxxxxxx'))?.mimeType, 'application/pdf');
  assert.equal(detectFileType(Buffer.from('GIF89a..........')), null);
});

test('normaliza fechas de documentos', () => {
  const today = '2026-10-03';
  assert.deepEqual(normalizeDocumentDate('2025/10/29', today), { date: '2025-10-29', needsReview: false });
  assert.equal(normalizeDocumentDate('29/10/2025', today).date, '2025-10-29');
  assert.equal(normalizeDocumentDate('10/29/2025', today).date, '2025-10-29');
  assert.equal(normalizeDocumentDate('SEP 26 2026', today).date, '2026-09-26');
  assert.equal(normalizeDocumentDate('29 de octubre de 2025', today).date, '2025-10-29');
  assert.deepEqual(normalizeDocumentDate('2027-01-01', today), { date: today, needsReview: true });
  assert.deepEqual(normalizeDocumentDate('ilegible', today), { date: today, needsReview: true });
});
