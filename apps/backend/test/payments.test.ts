import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { startApp } from './helpers.js';
import { env } from '../src/config/env.js';

function signedEvent(tx: { id: string; reference: string; status: string; amount_in_cents: number; currency?: string }) {
  const timestamp = Math.floor(Date.now() / 1000);
  const properties = ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'];
  const checksum = crypto
    .createHash('sha256')
    .update(`${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${env.WOMPI_EVENTS_SECRET}`)
    .digest('hex');
  return {
    event: 'transaction.updated',
    data: { transaction: { currency: 'COP', payment_method_type: 'NEQUI', ...tx } },
    environment: 'test',
    signature: { properties, checksum },
    timestamp,
  };
}

async function startCheckout(app: Awaited<ReturnType<typeof startApp>>, email: string, phone: string) {
  const user = await app.registerUser(email, phone);
  const res = await app.api('POST', '/api/v1/subscriptions/checkout', { token: user.token, body: { plan: 'basico' } });
  return { user, reference: res.json.data.reference as string };
}

test('Wompi: un pago aprobado activa el plan una sola vez', async () => {
  const app = await startApp();
  try {
    const { user, reference } = await startCheckout(app, 'w1@test.co', '3011110000');
    const event = signedEvent({ id: 'tx-1', reference, status: 'APPROVED', amount_in_cents: 1990000 });

    const first = await app.api('POST', '/api/v1/payments/wompi/webhook', { body: event });
    assert.equal(first.status, 200);
    const me = await app.api('GET', '/api/v1/auth/me', { token: user.token });
    assert.equal(me.json.data.subscription.plan, 'basico');
    assert.equal(me.json.data.subscription.monthlyLimit, 50);

    // Consume un comprobante y reenvía el mismo evento: no debe reiniciar el cupo
    await app.subscriptionService.tryConsumeQuota('573011110000');
    await app.api('POST', '/api/v1/payments/wompi/webhook', { body: event });
    const after = await app.api('GET', '/api/v1/auth/me', { token: user.token });
    assert.equal(after.json.data.subscription.currentUsage, 1);

    const payment = await app.api('GET', `/api/v1/payments/${reference}`, { token: user.token });
    assert.equal(payment.json.data.status, 'APPROVED');
    assert.equal(payment.json.data.planApplied, true);
  } finally {
    await app.close();
  }
});

test('Wompi: firma inválida, monto alterado o pago rechazado no activan el plan', async () => {
  const app = await startApp();
  try {
    const { user, reference } = await startCheckout(app, 'w2@test.co', '3012220000');

    const forged = signedEvent({ id: 'tx-2', reference, status: 'APPROVED', amount_in_cents: 1990000 });
    forged.signature.checksum = 'f'.repeat(64);
    assert.equal((await app.api('POST', '/api/v1/payments/wompi/webhook', { body: forged })).status, 401);

    const cheap = signedEvent({ id: 'tx-3', reference, status: 'APPROVED', amount_in_cents: 100 });
    assert.equal((await app.api('POST', '/api/v1/payments/wompi/webhook', { body: cheap })).status, 200);
    let payment = await app.paymentRepo.findByReference(reference);
    assert.equal(payment?.status, 'ERROR');

    const declined = signedEvent({ id: 'tx-4', reference, status: 'DECLINED', amount_in_cents: 1990000 });
    await app.api('POST', '/api/v1/payments/wompi/webhook', { body: declined });
    payment = await app.paymentRepo.findByReference(reference);
    assert.equal(payment?.status, 'DECLINED');

    const me = await app.api('GET', '/api/v1/auth/me', { token: user.token });
    assert.equal(me.json.data.subscription.plan, 'gratuito');

    // Otro usuario no puede consultar el pago
    const other = await app.registerUser('w3@test.co', '3013330000');
    assert.equal((await app.api('GET', `/api/v1/payments/${reference}`, { token: other.token })).status, 404);
  } finally {
    await app.close();
  }
});
