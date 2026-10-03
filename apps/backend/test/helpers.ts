import { AddressInfo } from 'node:net';
import { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { WhatsAppMessenger } from '../src/modules/whatsapp/whatsapp.messenger.js';
import { ExtractedReceiptData, RequestedScanType } from '../src/providers/ocr/ocr.interface.js';
import { fallbackInterpret, MessageInterpretation } from '../src/modules/expenses/query/expense-query.js';

export class FakeMessenger extends WhatsAppMessenger {
  readonly texts: Array<{ to: string; body: string }> = [];
  readonly codes = new Map<string, string>();

  async sendText(to: string, body: string): Promise<boolean> {
    this.texts.push({ to, body });
    return true;
  }

  async sendOtp(to: string, code: string): Promise<boolean> {
    this.codes.set(to, code);
    return true;
  }

  lastTextTo(to: string): string {
    const found = [...this.texts].reverse().find((t) => t.to === to);
    return found?.body ?? '';
  }
}

export const fakeOcr = {
  calls: 0,
  /** Campos que la próxima lectura devolverá distintos (p. ej. cufe o numeroReferencia). */
  overrides: {} as Partial<ExtractedReceiptData>,
  async extractFromBuffer(_buffer: Buffer, _mime: string, requested: RequestedScanType = 'auto'): Promise<ExtractedReceiptData> {
    this.calls += 1;
    const tipoDocumento = requested === 'transferencia' ? 'transferencia' : 'factura';
    return {
      tipoDocumento,
      comercio: 'Almacenes Éxito S.A.',
      nit: '890.900.608-9',
      cifNif: '890.900.608-9',
      fecha: '2026-10-01',
      subtotal: 100000,
      baseGravable: 100000,
      impuestos: 19000,
      iva: 19000,
      impoconsumo: null,
      total: 119000,
      moneda: 'COP',
      categoria: 'Supermercado',
      lineasArticulos: [{ descripcion: 'Mercado', precio: 119000 }],
      confianzaExtraccion: 'alta',
      isDianCompliant: true,
      ...this.overrides,
    };
  },
  /** En las pruebas la "IA" es el intérprete determinista de respaldo. */
  async interpretMessage(text: string, today: string): Promise<MessageInterpretation> {
    return fallbackInterpret(text, today);
  },
};

// PNG mínimo válido para la detección por "magic bytes"
export const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, 1),
]);

/** Extrae el JWT de la cookie de sesión de una respuesta. */
export function sessionCookie(headers: Headers): string | null {
  const raw = headers.getSetCookie().find((c) => c.startsWith('none_auth_token='));
  if (!raw) return null;
  return decodeURIComponent(raw.split(';')[0].slice('none_auth_token='.length)) || null;
}

/** PNG válido y distinto en cada llamada (huella de archivo diferente). */
let pngSeq = 0;
export function uniquePng(): Buffer {
  return Buffer.concat([PNG_BYTES, Buffer.from(`-${++pngSeq}-${Math.random()}`)]);
}

export async function startApp() {
  const messenger = new FakeMessenger();
  const created = createApp({ usePrisma: false, ocrExtractor: fakeOcr, messenger });
  const server: Server = await new Promise((resolve) => {
    const s = created.app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const api = async (method: string, path: string, opts: { token?: string; body?: unknown; headers?: Record<string, string>; form?: FormData } = {}) => {
    const headers: Record<string, string> = { ...(opts.headers || {}) };
    // Sesión del navegador: cookie HttpOnly + Origin del backoffice (protección CSRF)
    if (opts.token) {
      headers.Cookie = `none_auth_token=${opts.token}`;
      if (!headers.Origin) headers.Origin = 'http://localhost:3000';
    }
    let body: BodyInit | undefined;
    if (opts.form) body = opts.form;
    else if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    const res = await fetch(`${base}${path}`, { method, headers, body });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text, headers: res.headers };
  };

  /** Registra y verifica un usuario completo; devuelve su token. */
  const registerUser = async (email: string, phone: string) => {
    const pending = await api('POST', '/api/v1/auth/register', {
      body: { email, password: 'Clave12345', name: 'Usuaria Prueba', phoneNumber: phone, habeasDataAccepted: true, termsAccepted: true },
    });
    if (pending.status !== 202) throw new Error(`register failed: ${pending.text}`);
    const confirmed = await api('POST', '/api/v1/auth/register/confirm', {
      body: { verificationId: pending.json.data.verificationId, code: pending.json.data.devCode },
    });
    if (confirmed.status !== 201) throw new Error(`confirm failed: ${confirmed.text}`);
    return { token: sessionCookie(confirmed.headers)!, user: confirmed.json.data.user };
  };

  const close = () => new Promise<void>((resolve) => server.close(() => resolve()));

  return { ...created, messenger, api, registerUser, close, base };
}
