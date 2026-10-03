import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { CryptoService } from '../../core/security/crypto.service.js';

export type WompiStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';

export interface WompiTransaction {
  id: string;
  reference: string;
  status: WompiStatus;
  amount_in_cents: number;
  currency: string;
  payment_method_type?: string;
  customer_email?: string;
  finalized_at?: string | null;
}

export interface WompiEvent {
  event: string;
  data: { transaction?: WompiTransaction };
  environment?: 'test' | 'prod';
  signature?: { properties: string[]; checksum: string };
  timestamp?: number;
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Integración con Wompi (Bancolombia): Web Checkout + eventos firmados.
 * Documentación: https://docs.wompi.co
 */
export class WompiClient {
  get environment(): 'test' | 'prod' {
    return env.WOMPI_PUBLIC_KEY.startsWith('pub_prod_') ? 'prod' : 'test';
  }

  /** Firma de integridad: SHA256(referencia + monto en centavos + moneda + secreto de integridad). */
  integritySignature(reference: string, amountInCents: number, currency = 'COP'): string {
    return sha256(`${reference}${amountInCents}${currency}${env.WOMPI_INTEGRITY_SECRET}`);
  }

  buildCheckoutUrl(params: {
    reference: string;
    amountInCents: number;
    redirectUrl: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
  }): string {
    const url = new URL('https://checkout.wompi.co/p/');
    url.searchParams.set('public-key', env.WOMPI_PUBLIC_KEY);
    url.searchParams.set('currency', 'COP');
    url.searchParams.set('amount-in-cents', String(params.amountInCents));
    url.searchParams.set('reference', params.reference);
    url.searchParams.set('signature:integrity', this.integritySignature(params.reference, params.amountInCents));
    url.searchParams.set('redirect-url', params.redirectUrl);
    if (params.customerEmail) url.searchParams.set('customer-data:email', params.customerEmail);
    if (params.customerName) url.searchParams.set('customer-data:full-name', params.customerName);
    if (params.customerPhone?.startsWith('57')) {
      url.searchParams.set('customer-data:phone-number-prefix', '+57');
      url.searchParams.set('customer-data:phone-number', params.customerPhone.slice(2));
    }
    return url.toString();
  }

  /**
   * Verifica el checksum de un evento: SHA256(valores de signature.properties + timestamp + secreto de eventos).
   */
  isValidEvent(event: WompiEvent): boolean {
    if (!event?.signature?.properties?.length || !event.signature.checksum || !event.timestamp) return false;
    if (event.environment && event.environment !== this.environment) return false;

    const values = event.signature.properties.map((path) =>
      path.split('.').reduce<unknown>((obj, key) => (obj as Record<string, unknown> | undefined)?.[key], event.data)
    );
    if (values.some((v) => v === undefined || v === null)) return false;

    const expected = sha256(`${values.join('')}${event.timestamp}${env.WOMPI_EVENTS_SECRET}`);
    return CryptoService.safeEqual(expected, event.signature.checksum.toLowerCase());
  }

  /** Consulta pública del estado de una transacción (conciliación). */
  async fetchTransaction(transactionId: string): Promise<WompiTransaction | null> {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(transactionId)) return null;
    const response = await fetch(`${env.WOMPI_API_URL}/transactions/${encodeURIComponent(transactionId)}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: WompiTransaction };
    return body.data ?? null;
  }
}
